import { Prisma } from "@/generated/prisma/client";

/**
 * حساب إجماليات مستند بيع (عرض سعر أو فاتورة) — دالة نقية (بدون قاعدة بيانات)
 * قابلة للاختبار. مشتركة بين quotes وinvoices (نفس منطق البنود والخصم والضريبة).
 * كل الحسابات بـ Prisma.Decimal (دقة مالية — CLAUDE #3).
 *
 * الترتيب (افتراض موثّق في README):
 *   lineTotal = quantity × unitPrice × (1 − lineDiscount%/100)
 *   subtotal  = Σ lineTotal
 *   discountAmount = subtotal × discountPercent/100        (خصم على مستوى العرض)
 *   afterDiscount  = subtotal − discountAmount
 *   taxAmount      = afterDiscount × taxPercent/100         (ضريبة اختيارية)
 *   grandTotal     = afterDiscount + taxAmount
 */

const HUNDRED = new Prisma.Decimal(100);

export interface LineForTotal {
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  discountPercent: Prisma.Decimal;
}

/** إجمالي بند واحد بعد خصم البند. */
export function computeLineTotal(line: LineForTotal): Prisma.Decimal {
  const gross = line.quantity.times(line.unitPrice);
  const factor = HUNDRED.minus(line.discountPercent).dividedBy(HUNDRED);
  return gross.times(factor);
}

export interface DocumentTotalsInput {
  lines: LineForTotal[];
  discountPercent: Prisma.Decimal;
  taxPercent: Prisma.Decimal;
}

export interface DocumentTotals {
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
}

export function computeDocumentTotals(input: DocumentTotalsInput): DocumentTotals {
  const subtotal = input.lines.reduce(
    (sum, l) => sum.plus(computeLineTotal(l)),
    new Prisma.Decimal(0)
  );
  const discountAmount = subtotal.times(input.discountPercent).dividedBy(HUNDRED);
  const afterDiscount = subtotal.minus(discountAmount);
  const taxAmount = afterDiscount.times(input.taxPercent).dividedBy(HUNDRED);
  const grandTotal = afterDiscount.plus(taxAmount);
  return { subtotal, discountAmount, taxAmount, grandTotal };
}
