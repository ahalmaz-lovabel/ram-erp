import { describe, it, expect } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { derivePaymentStatus, remainingAmount, isOverdue } from "./paymentStatus";

const D = (v: number | string) => new Prisma.Decimal(v);

describe("derivePaymentStatus", () => {
  it("لا دفعات ⇒ غير مدفوعة", () => {
    expect(derivePaymentStatus(D(1000), D(0))).toBe("unpaid");
  });
  it("دفعة جزئية ⇒ مدفوعة جزئيًا", () => {
    expect(derivePaymentStatus(D(1000), D(500))).toBe("partiallyPaid");
  });
  it("دفع كامل ⇒ مدفوعة", () => {
    expect(derivePaymentStatus(D(1000), D(1000))).toBe("paid");
  });
  it("دفع زائد (تقريبًا) ⇒ مدفوعة", () => {
    expect(derivePaymentStatus(D(1000), D(1000.5))).toBe("paid");
  });
  it("مبلغ سالب/صفري يُعامَل كغير مدفوع", () => {
    expect(derivePaymentStatus(D(1000), D(0))).toBe("unpaid");
  });
});

describe("remainingAmount", () => {
  it("يحسب المتبقّي", () => {
    expect(remainingAmount(D(1000), D(300)).toString()).toBe("700");
  });
  it("لا يقل عن صفر عند الدفع الزائد", () => {
    expect(remainingAmount(D(1000), D(1200)).toString()).toBe("0");
  });
});

describe("isOverdue", () => {
  const past = new Date("2026-01-01");
  const future = new Date("2027-01-01");
  const now = new Date("2026-07-01");

  it("غير مدفوعة وتجاوزت الاستحقاق ⇒ متأخرة", () => {
    expect(isOverdue("unpaid", past, now)).toBe(true);
  });
  it("مدفوعة جزئيًا وتجاوزت الاستحقاق ⇒ متأخرة", () => {
    expect(isOverdue("partiallyPaid", past, now)).toBe(true);
  });
  it("لم تتجاوز الاستحقاق ⇒ ليست متأخرة", () => {
    expect(isOverdue("unpaid", future, now)).toBe(false);
  });
  it("مدفوعة بالكامل ⇒ ليست متأخرة", () => {
    expect(isOverdue("paid", past, now)).toBe(false);
  });
  it("بلا تاريخ استحقاق ⇒ ليست متأخرة", () => {
    expect(isOverdue("unpaid", null, now)).toBe(false);
  });
});
