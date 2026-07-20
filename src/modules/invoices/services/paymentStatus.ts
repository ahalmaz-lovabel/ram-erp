import { Prisma } from "@/generated/prisma/client";
import type { InvoiceStatus } from "../types";

/**
 * اشتقاق حالة السداد من الإجمالي والمدفوع — دالة نقية قابلة للاختبار (§8).
 * لا تُرجع overdue (يُحسب اشتقاقًا من dueDate عند العرض) ولا cancelled
 * (حالة إدارية منفصلة). المقارنات بـ Prisma.Decimal (دقة مالية — CLAUDE #3).
 */
export function derivePaymentStatus(
  grandTotal: Prisma.Decimal,
  paidAmount: Prisma.Decimal
): Extract<InvoiceStatus, "unpaid" | "partiallyPaid" | "paid"> {
  if (paidAmount.lessThanOrEqualTo(0)) return "unpaid";
  if (paidAmount.greaterThanOrEqualTo(grandTotal)) return "paid";
  return "partiallyPaid";
}

/** المتبقّي من الفاتورة (لا يقل عن صفر). */
export function remainingAmount(
  grandTotal: Prisma.Decimal,
  paidAmount: Prisma.Decimal
): Prisma.Decimal {
  const rem = grandTotal.minus(paidAmount);
  return rem.greaterThan(0) ? rem : new Prisma.Decimal(0);
}

/**
 * هل الفاتورة متأخرة؟ (unpaid/partiallyPaid وتجاوزت تاريخ الاستحقاق).
 * يُحسب عند العرض — لا يُخزَّن (التحويل التلقائي لحالة overdue مؤجّل لمهمة مجدولة).
 */
export function isOverdue(
  status: InvoiceStatus,
  dueDate: Date | null,
  now: Date = new Date()
): boolean {
  if (dueDate === null) return false;
  if (status !== "unpaid" && status !== "partiallyPaid") return false;
  return dueDate.getTime() < now.getTime();
}
