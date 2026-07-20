// أنواع بيانات موديول invoices. المصدر النهائي للحقول هو schema.prisma.
// مبني على تحليل العملاء §8 (حالات الفاتورة + الدفعة + نظام 50/50) + تحليل
// المنتجات §17 (تحويل العرض لفاتورة بنقل الأسعار والتكلفة وقت البيع).
// الحقول غير المذكورة صراحةً موثّقة كافتراضات مؤقتة في README.
// كل المبالغ Prisma.Decimal (ممنوع number للأموال — CLAUDE #3).

import type { Prisma, InvoiceStatus, PaymentMethod } from "@/generated/prisma/client";

export type { InvoiceStatus, PaymentMethod };

export interface InvoiceView {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerNameSnapshot: string;
  sourceQuoteId: string | null;
  status: InvoiceStatus;
  issuedAt: Date | null;
  dueDate: Date | null;
  subtotal: Prisma.Decimal;
  discountPercent: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxPercent: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  notes: string | null;
  terms: string | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLineView {
  id: string;
  invoiceId: string;
  productId: string | null;
  productCodeSnapshot: string;
  productNameSnapshot: string;
  productDescriptionSnapshot: string | null;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  unitCostSnapshot: Prisma.Decimal;
  discountPercent: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  sortOrder: number;
  createdAt: Date;
}

export interface PaymentView {
  id: string;
  invoiceId: string;
  amount: Prisma.Decimal;
  method: PaymentMethod;
  paidAt: Date;
  reference: string | null;
  notes: string | null;
  receivedByUserId: string;
  createdAt: Date;
}
