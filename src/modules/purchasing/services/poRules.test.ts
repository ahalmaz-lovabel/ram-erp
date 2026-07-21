import { describe, it, expect } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { AppError } from "@/modules/shared/errors/AppError";
import { PurchasingErrorCodes } from "../errors";
import {
  remainingAmount,
  assertCanEditOrder,
  assertCanSend,
  assertCanReceive,
  assertCanCancel,
  assertCanPay,
  assertPaymentWithinRemaining,
  assertCanDeletePayment,
} from "./poRules";

const D = (v: number | string) => new Prisma.Decimal(v);

/** يتأكد إن الاستدعاء يرمي AppError بالكود المتوقّع (CLAUDE #11). */
function expectAppError(fn: () => void, code: string) {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe(code);
    return;
  }
  throw new Error("توقّعنا AppError لكن لم يُرمَ أي خطأ");
}

describe("remainingAmount", () => {
  it("يحسب المتبقّي = الإجمالي − المدفوع", () => {
    expect(remainingAmount(D(1000), D(300)).toString()).toBe("700");
  });
});

describe("assertCanEditOrder", () => {
  it("مسودة ⇒ مسموح", () => {
    expect(() => assertCanEditOrder("draft")).not.toThrow();
  });
  it("مُرسل/مستلَم/ملغى ⇒ PO_NOT_EDITABLE", () => {
    for (const s of ["sent", "received", "cancelled"] as const) {
      expectAppError(() => assertCanEditOrder(s), PurchasingErrorCodes.PO_NOT_EDITABLE);
    }
  });
});

describe("assertCanSend", () => {
  it("مسودة بها بنود ⇒ مسموح", () => {
    expect(() => assertCanSend("draft", 2)).not.toThrow();
  });
  it("مسودة بلا بنود ⇒ PO_EMPTY", () => {
    expectAppError(() => assertCanSend("draft", 0), PurchasingErrorCodes.PO_EMPTY);
  });
  it("غير مسودة ⇒ INVALID_STATUS_TRANSITION", () => {
    expectAppError(() => assertCanSend("sent", 2), PurchasingErrorCodes.INVALID_STATUS_TRANSITION);
  });
});

describe("assertCanReceive", () => {
  it("مسودة/مُرسل بها بنود ⇒ مسموح", () => {
    expect(() => assertCanReceive("draft", 1)).not.toThrow();
    expect(() => assertCanReceive("sent", 1)).not.toThrow();
  });
  it("ملغى ⇒ PO_CANCELLED", () => {
    expectAppError(() => assertCanReceive("cancelled", 1), PurchasingErrorCodes.PO_CANCELLED);
  });
  it("مستلَم بالفعل ⇒ INVALID_STATUS_TRANSITION", () => {
    expectAppError(
      () => assertCanReceive("received", 1),
      PurchasingErrorCodes.INVALID_STATUS_TRANSITION
    );
  });
  it("بلا بنود ⇒ PO_EMPTY", () => {
    expectAppError(() => assertCanReceive("sent", 0), PurchasingErrorCodes.PO_EMPTY);
  });
});

describe("assertCanCancel", () => {
  it("مسودة/مُرسل بلا دفعات ⇒ مسموح", () => {
    expect(() => assertCanCancel("draft", D(0))).not.toThrow();
    expect(() => assertCanCancel("sent", D(0))).not.toThrow();
  });
  it("ملغى بالفعل ⇒ PO_CANCELLED", () => {
    expectAppError(() => assertCanCancel("cancelled", D(0)), PurchasingErrorCodes.PO_CANCELLED);
  });
  it("مستلَم ⇒ INVALID_STATUS_TRANSITION", () => {
    expectAppError(
      () => assertCanCancel("received", D(0)),
      PurchasingErrorCodes.INVALID_STATUS_TRANSITION
    );
  });
  it("به دفعات ⇒ CANNOT_CANCEL_WITH_PAYMENTS", () => {
    expectAppError(
      () => assertCanCancel("sent", D(100)),
      PurchasingErrorCodes.CANNOT_CANCEL_WITH_PAYMENTS
    );
  });
});

describe("assertCanPay", () => {
  it("مُرسل/مستلَم ⇒ مسموح", () => {
    expect(() => assertCanPay("sent")).not.toThrow();
    expect(() => assertCanPay("received")).not.toThrow();
  });
  it("ملغى ⇒ PO_CANCELLED", () => {
    expectAppError(() => assertCanPay("cancelled"), PurchasingErrorCodes.PO_CANCELLED);
  });
  it("مسودة ⇒ INVALID_STATUS_TRANSITION", () => {
    expectAppError(() => assertCanPay("draft"), PurchasingErrorCodes.INVALID_STATUS_TRANSITION);
  });
});

describe("assertPaymentWithinRemaining", () => {
  it("دفعة ضمن المتبقّي ⇒ مسموح", () => {
    expect(() => assertPaymentWithinRemaining(D(300), D(500))).not.toThrow();
    expect(() => assertPaymentWithinRemaining(D(500), D(500))).not.toThrow();
  });
  it("دفعة تتجاوز المتبقّي ⇒ PAYMENT_EXCEEDS_REMAINING", () => {
    expectAppError(
      () => assertPaymentWithinRemaining(D(600), D(500)),
      PurchasingErrorCodes.PAYMENT_EXCEEDS_REMAINING
    );
  });
});

describe("assertCanDeletePayment", () => {
  it("غير ملغى ⇒ مسموح", () => {
    expect(() => assertCanDeletePayment("received")).not.toThrow();
  });
  it("ملغى ⇒ PO_CANCELLED", () => {
    expectAppError(() => assertCanDeletePayment("cancelled"), PurchasingErrorCodes.PO_CANCELLED);
  });
});
