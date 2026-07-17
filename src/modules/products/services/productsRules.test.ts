import { describe, it, expect } from "vitest";
import { computeBaseUnitPrice, unitDimension, sameDimension } from "./productsRules";
import { isAppError } from "@/modules/shared/errors/AppError";
import { ProductsErrorCodes } from "../errors";

describe("computeBaseUnitPrice (§8)", () => {
  it("مثال التحليل: طن بـ 40000 ومعامل 1000 ⇒ سعر الكيلو 40", () => {
    expect(computeBaseUnitPrice(40000, 1000).toString()).toBe("40");
  });

  it("يقبل نصوصًا ويحافظ على الدقة العشرية", () => {
    expect(computeBaseUnitPrice("100", "3").toFixed(4)).toBe("33.3333");
  });

  it("معامل تحويل = 0 يرمي INVALID_CONVERSION_FACTOR", () => {
    expect.assertions(2);
    try {
      computeBaseUnitPrice(100, 0);
    } catch (err) {
      expect(isAppError(err)).toBe(true);
      if (isAppError(err)) expect(err.code).toBe(ProductsErrorCodes.INVALID_CONVERSION_FACTOR);
    }
  });

  it("معامل تحويل سالب يرمي خطأ", () => {
    expect(() => computeBaseUnitPrice(100, -5)).toThrow();
  });
});

describe("unitDimension / sameDimension (توافق وحدات الـ BOM)", () => {
  it("يصنّف الوحدات لأبعادها الصحيحة", () => {
    expect(unitDimension("kg")).toBe("weight");
    expect(unitDimension("meter")).toBe("length");
    expect(unitDimension("squareMeter")).toBe("area");
    expect(unitDimension("cubicMeter")).toBe("volume");
    expect(unitDimension("piece")).toBe("count");
    expect(unitDimension("liter")).toBe("capacity");
  });

  it("متر و سم نفس البُعد (طول) — قابلين للتحويل", () => {
    expect(sameDimension("meter", "cm")).toBe(true);
  });

  it("متر و متر مربع أبعاد مختلفة — غير قابلين للتحويل", () => {
    expect(sameDimension("meter", "squareMeter")).toBe(false);
  });
});
