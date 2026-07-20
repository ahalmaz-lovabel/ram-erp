import { describe, it, expect } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { computeLineTotal, computeQuoteTotals } from "./quoteTotals";

const D = (v: number | string) => new Prisma.Decimal(v);

describe("computeLineTotal", () => {
  it("يحسب إجمالي البند بدون خصم", () => {
    expect(
      computeLineTotal({ quantity: D(3), unitPrice: D(100), discountPercent: D(0) }).toString()
    ).toBe("300");
  });

  it("يطبّق خصم البند", () => {
    // 2 × 200 = 400، خصم 10% ⇒ 360
    expect(
      computeLineTotal({ quantity: D(2), unitPrice: D(200), discountPercent: D(10) }).toString()
    ).toBe("360");
  });

  it("يتعامل مع كميات كسرية بدقة", () => {
    // 1.5 × 33.33 = 49.995
    expect(
      computeLineTotal({
        quantity: D("1.5"),
        unitPrice: D("33.33"),
        discountPercent: D(0),
      }).toString()
    ).toBe("49.995");
  });
});

describe("computeQuoteTotals", () => {
  it("يجمع البنود ويطبّق خصم العرض والضريبة بالترتيب", () => {
    // بندان: 300 + 360 = 660
    // خصم عرض 10% ⇒ 66 ⇒ بعد الخصم 594
    // ضريبة 14% على 594 ⇒ 83.16 ⇒ الإجمالي 677.16
    const t = computeQuoteTotals({
      lines: [
        { quantity: D(3), unitPrice: D(100), discountPercent: D(0) },
        { quantity: D(2), unitPrice: D(200), discountPercent: D(10) },
      ],
      discountPercent: D(10),
      taxPercent: D(14),
    });
    expect(t.subtotal.toString()).toBe("660");
    expect(t.discountAmount.toString()).toBe("66");
    expect(t.taxAmount.toString()).toBe("83.16");
    expect(t.grandTotal.toString()).toBe("677.16");
  });

  it("عرض فارغ ⇒ كل الإجماليات صفر", () => {
    const t = computeQuoteTotals({ lines: [], discountPercent: D(0), taxPercent: D(0) });
    expect(t.subtotal.toString()).toBe("0");
    expect(t.grandTotal.toString()).toBe("0");
  });

  it("بدون ضريبة ولا خصم عرض ⇒ الإجمالي = مجموع البنود", () => {
    const t = computeQuoteTotals({
      lines: [{ quantity: D(1), unitPrice: D("1250.75"), discountPercent: D(0) }],
      discountPercent: D(0),
      taxPercent: D(0),
    });
    expect(t.grandTotal.toString()).toBe("1250.75");
  });
});
