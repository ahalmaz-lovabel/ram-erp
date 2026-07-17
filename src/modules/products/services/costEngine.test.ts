import { describe, it, expect } from "vitest";
import { rollUpComponentCost, computeProductionCost, type CostComponentInput } from "./costEngine";
import { convertQuantity } from "./productsRules";
import { isAppError } from "@/modules/shared/errors/AppError";
import { ProductsErrorCodes } from "../errors";

describe("convertQuantity", () => {
  it("يحوّل داخل نفس البُعد (200 سم = 2 متر)", () => {
    expect(convertQuantity(200, "cm", "meter").toString()).toBe("2");
  });
  it("يحوّل المساحة (1 م² = 10000 سم²)", () => {
    expect(convertQuantity(1, "squareMeter", "squareCm").toString()).toBe("10000");
  });
  it("نفس الوحدة = نفس القيمة", () => {
    expect(convertQuantity(35, "kg", "kg").toString()).toBe("35");
  });
  it("أبعاد مختلفة ⇒ INCOMPATIBLE_UNITS", () => {
    expect.assertions(2);
    try {
      convertQuantity(1, "kg", "meter");
    } catch (e) {
      expect(isAppError(e)).toBe(true);
      if (isAppError(e)) expect(e.code).toBe(ProductsErrorCodes.INCOMPATIBLE_UNITS);
    }
  });
  it("وحدات عدد مختلفة (علبة ≠ قطعة) ⇒ خطأ", () => {
    expect(() => convertQuantity(1, "box", "piece")).toThrow();
  });
});

describe("rollUpComponentCost", () => {
  it("خامة + هالك: 10كجم × 5 × (1+10%) = 55", () => {
    const node: CostComponentInput = {
      quantity: 1,
      materials: [
        {
          quantity: 10,
          quantityUnit: "kg",
          baseUnitPrice: 5,
          materialBaseUnit: "kg",
          wastePercent: 10,
        },
      ],
    };
    expect(rollUpComponentCost(node).total.toString()).toBe("55");
  });

  it("تحويل وحدة: 200سم بسعر 2/متر = 4", () => {
    const node: CostComponentInput = {
      quantity: 1,
      materials: [
        { quantity: 200, quantityUnit: "cm", baseUnitPrice: 2, materialBaseUnit: "meter" },
      ],
    };
    expect(rollUpComponentCost(node).total.toString()).toBe("4");
  });

  it("العمليات: ثابت 50 + كمية(3×4)=12 + نسبة(10% من 100)=10 ⇒ 172", () => {
    const node: CostComponentInput = {
      quantity: 1,
      materials: [
        { quantity: 1, quantityUnit: "piece", baseUnitPrice: 100, materialBaseUnit: "piece" },
      ],
      operations: [
        { costModel: "fixed", standardCost: 50 },
        { costModel: "perQuantity", standardCost: 3, param: 4 },
        { costModel: "percentage", standardCost: 10 },
      ],
    };
    const b = rollUpComponentCost(node);
    expect(b.materialsCost.toString()).toBe("100");
    expect(b.operationsCost.toString()).toBe("72");
    expect(b.total.toString()).toBe("172");
  });

  it("شجرة متداخلة + مضاعف كمية (ابن ×3)", () => {
    const A: CostComponentInput = {
      quantity: 1,
      materials: [{ quantity: 10, quantityUnit: "kg", baseUnitPrice: 5, materialBaseUnit: "kg" }],
    }; // 50
    const B: CostComponentInput = {
      quantity: 3,
      materials: [
        { quantity: 200, quantityUnit: "cm", baseUnitPrice: 2, materialBaseUnit: "meter" },
      ],
    }; // 4 each
    const node: CostComponentInput = {
      quantity: 1,
      materials: [
        { quantity: 1, quantityUnit: "piece", baseUnitPrice: 10, materialBaseUnit: "piece" },
      ],
      operations: [{ costModel: "percentage", standardCost: 10 }], // 10% of 10 = 1
      children: [A, B],
    };
    const b = rollUpComponentCost(node);
    // 10 (mat) + 1 (op) + [50×1 + 4×3] = 10 + 1 + 62 = 73
    expect(b.childrenCost.toString()).toBe("62");
    expect(b.total.toString()).toBe("73");
  });
});

describe("computeProductionCost — مثال عارضة التوازن (شجرة هرمية)", () => {
  it("جسم ×1 (550) + رجل ×2 (95 لكل) = 740", () => {
    const body: CostComponentInput = {
      quantity: 1,
      materials: [
        { quantity: 5, quantityUnit: "meter", baseUnitPrice: 100, materialBaseUnit: "meter" },
      ], // 500
      operations: [{ costModel: "fixed", standardCost: 50 }], // 50
    }; // 550

    const legInternal: CostComponentInput = {
      quantity: 1,
      children: [
        {
          quantity: 1,
          materials: [
            { quantity: 50, quantityUnit: "cm", baseUnitPrice: 30, materialBaseUnit: "meter" },
          ], // 15
        },
        {
          quantity: 1,
          materials: [
            { quantity: 1, quantityUnit: "piece", baseUnitPrice: 20, materialBaseUnit: "piece" },
          ], // 20
        },
      ],
    }; // 35

    const legExternal: CostComponentInput = {
      quantity: 1,
      children: [
        {
          quantity: 1,
          materials: [
            { quantity: 80, quantityUnit: "cm", baseUnitPrice: 25, materialBaseUnit: "meter" },
          ], // 20
        },
        {
          quantity: 1,
          materials: [
            { quantity: 1, quantityUnit: "piece", baseUnitPrice: 40, materialBaseUnit: "piece" },
          ], // 40
        },
      ],
    }; // 60

    const leg: CostComponentInput = {
      quantity: 2, // رجل يمين + يسار — تُدخَل مرة، كمية 2
      children: [legInternal, legExternal],
    }; // 95 each

    const beam: CostComponentInput = {
      quantity: 1,
      children: [body, leg],
    };

    expect(computeProductionCost(beam).toString()).toBe("740");
  });
});
