// أنواع بيانات موديول quotes. المصدر النهائي للحقول هو schema.prisma.
// مبني على: تحليل العملاء §7 (حالات العرض + snapshot) + تحليل المنتجات §16
// (بنود من الكتالوج بنسخة snapshot: كود/اسم/وصف/سمات/سعر/تكلفة/هامش/ضمان).
// الحقول غير المذكورة صراحةً في التحليل موثّقة كافتراضات مؤقتة في README.
// كل المبالغ Prisma.Decimal (ممنوع number للأموال).

import type { Prisma, QuoteStatus } from "@/generated/prisma/client";

export type { QuoteStatus };

/** رأس عرض السعر. */
export interface QuoteView {
  id: string;
  quoteNumber: string;
  customerId: string;
  customerNameSnapshot: string;
  dealId: string | null;
  status: QuoteStatus;
  issuedAt: Date | null;
  validUntil: Date | null;
  // الإجماليات المالية (محسوبة في الخدمة ومخزّنة).
  subtotal: Prisma.Decimal;
  discountPercent: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxPercent: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
  notes: string | null;
  terms: string | null;
  createdByUserId: string;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** بند عرض السعر — بيانات المنتج محفوظة snapshot وقت الإضافة/الإصدار (§16). */
export interface QuoteLineView {
  id: string;
  quoteId: string;
  productId: string | null;
  productCodeSnapshot: string;
  productNameSnapshot: string;
  productDescriptionSnapshot: string | null;
  attributesSnapshot: Prisma.JsonValue;
  warrantyMonthsSnapshot: number | null;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  unitCostSnapshot: Prisma.Decimal;
  discountPercent: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  sortOrder: number;
  createdAt: Date;
}
