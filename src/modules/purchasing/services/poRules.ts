import { Prisma } from "@/generated/prisma/client";
import { AppError } from "@/modules/shared/errors/AppError";
import { PurchasingErrorCodes } from "../errors";
import type { PurchaseOrderStatus } from "../types";

/**
 * قواعد انتقال حالة أمر الشراء — دوال نقية (بدون قاعدة بيانات) قابلة للاختبار،
 * تفصل قرار العمل عن استعلامات prisma في PurchasingService. كل قاعدة تفشل
 * ترمي AppError بالكود المناسب.
 *
 * الدورة: draft (قابل للتعديل) → sent (مُرسل) → received (مستلَم).
 * الإلغاء من draft/sent فقط وقبل أي دفعة.
 */

/** المتبقّي على المورد = الإجمالي − المدفوع. */
export function remainingAmount(
  grandTotal: Prisma.Decimal,
  paidAmount: Prisma.Decimal
): Prisma.Decimal {
  return grandTotal.minus(paidAmount);
}

/** التعديل (بنود/خصم/ضريبة) مسموح فقط والأمر مسودة. */
export function assertCanEditOrder(status: PurchaseOrderStatus): void {
  if (status !== "draft") {
    throw new AppError(
      PurchasingErrorCodes.PO_NOT_EDITABLE,
      "لا يمكن تعديل أمر شراء بعد إرساله أو استلامه أو إلغائه",
      409
    );
  }
}

/** الإرسال: draft → sent، ولا بد من بند واحد على الأقل. */
export function assertCanSend(status: PurchaseOrderStatus, lineCount: number): void {
  if (status !== "draft") {
    throw new AppError(
      PurchasingErrorCodes.INVALID_STATUS_TRANSITION,
      "لا يمكن إرسال أمر إلا وهو مسودة",
      409
    );
  }
  if (lineCount === 0) {
    throw new AppError(PurchasingErrorCodes.PO_EMPTY, "لا يمكن إرسال أمر بلا بنود", 400);
  }
}

/** الاستلام: draft/sent → received، بشرط وجود بنود وعدم الإلغاء أو الاستلام المسبق. */
export function assertCanReceive(status: PurchaseOrderStatus, lineCount: number): void {
  if (status === "cancelled") {
    throw new AppError(PurchasingErrorCodes.PO_CANCELLED, "أمر الشراء ملغى", 409);
  }
  if (status === "received") {
    throw new AppError(
      PurchasingErrorCodes.INVALID_STATUS_TRANSITION,
      "أمر الشراء مستلَم بالفعل",
      409
    );
  }
  if (lineCount === 0) {
    throw new AppError(PurchasingErrorCodes.PO_EMPTY, "لا يمكن استلام أمر بلا بنود", 400);
  }
}

/** الإلغاء: draft/sent → cancelled، ممنوع بعد الاستلام أو مع وجود دفعات. */
export function assertCanCancel(status: PurchaseOrderStatus, paidAmount: Prisma.Decimal): void {
  if (status === "cancelled") {
    throw new AppError(PurchasingErrorCodes.PO_CANCELLED, "أمر الشراء ملغى بالفعل", 409);
  }
  if (status === "received") {
    throw new AppError(
      PurchasingErrorCodes.INVALID_STATUS_TRANSITION,
      "لا يمكن إلغاء أمر تم استلامه",
      409
    );
  }
  if (paidAmount.greaterThan(0)) {
    throw new AppError(
      PurchasingErrorCodes.CANNOT_CANCEL_WITH_PAYMENTS,
      "لا يمكن إلغاء أمر به دفعات — احذف الدفعات أولًا",
      409
    );
  }
}

/** تسجيل دفعة: مسموح بعد الإرسال (sent/received)، ممنوع على مسودة أو ملغى. */
export function assertCanPay(status: PurchaseOrderStatus): void {
  if (status === "cancelled") {
    throw new AppError(PurchasingErrorCodes.PO_CANCELLED, "أمر الشراء ملغى", 409);
  }
  if (status === "draft") {
    throw new AppError(
      PurchasingErrorCodes.INVALID_STATUS_TRANSITION,
      "لا تُسجَّل دفعة قبل إرسال أمر الشراء",
      409
    );
  }
}

/** الدفعة يجب ألا تتجاوز المتبقّي. */
export function assertPaymentWithinRemaining(
  amount: Prisma.Decimal,
  remaining: Prisma.Decimal
): void {
  if (amount.greaterThan(remaining)) {
    throw new AppError(
      PurchasingErrorCodes.PAYMENT_EXCEEDS_REMAINING,
      `الدفعة تتجاوز المتبقّي (${remaining.toString()})`,
      400
    );
  }
}

/** حذف دفعة: ممنوع على أمر ملغى. */
export function assertCanDeletePayment(status: PurchaseOrderStatus): void {
  if (status === "cancelled") {
    throw new AppError(PurchasingErrorCodes.PO_CANCELLED, "أمر الشراء ملغى", 409);
  }
}
