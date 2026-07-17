import { describe, it, expect } from "vitest";
import { effectiveCost, computeProfit, computeMargin, isBelowMinMargin } from "./pricing";

describe("pricing (§11، §12)", () => {
  it("التكلفة الفعّالة: اليدوية تتفوّق على المحسوبة", () => {
    expect(effectiveCost(100, 80).toString()).toBe("80");
    expect(effectiveCost(100, null).toString()).toBe("100");
    expect(effectiveCost(100).toString()).toBe("100");
  });

  it("الربح = سعر البيع − التكلفة", () => {
    expect(computeProfit(1000, 740).toString()).toBe("260");
  });

  it("الهامش = (الربح ÷ السعر) × 100", () => {
    expect(computeMargin(1000, 740).toString()).toBe("26");
    expect(computeMargin(200, 150).toString()).toBe("25");
  });

  it("سعر بيع صفر ⇒ هامش 0 (بدون قسمة على صفر)", () => {
    expect(computeMargin(0, 100).toString()).toBe("0");
  });

  it("تنبيه الهامش المنخفض", () => {
    expect(isBelowMinMargin(20, 25)).toBe(true);
    expect(isBelowMinMargin(30, 25)).toBe(false);
    expect(isBelowMinMargin(20, null)).toBe(false); // بدون حد ⇒ لا تنبيه
  });
});
