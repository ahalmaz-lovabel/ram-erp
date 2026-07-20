// مسميات عربية لحالات الفاتورة وطرق الدفع (للعرض في الواجهة).

import type { InvoiceStatus, PaymentMethod } from "./types";

export const invoiceStatusLabel: Record<InvoiceStatus, string> = {
  unpaid: "غير مدفوعة",
  partiallyPaid: "مدفوعة جزئيًا",
  paid: "مدفوعة",
  overdue: "متأخرة",
  cancelled: "ملغاة",
};

export const invoiceStatusBadge: Record<InvoiceStatus, { bg: string; color: string }> = {
  unpaid: { bg: "oklch(0.9 0.01 30)", color: "oklch(0.4 0.01 30)" },
  partiallyPaid: { bg: "oklch(0.92 0.06 60)", color: "oklch(0.4 0.1 60)" },
  paid: { bg: "oklch(0.92 0.06 150)", color: "oklch(0.35 0.12 150)" },
  overdue: { bg: "oklch(0.9 0.08 25)", color: "oklch(0.4 0.15 25)" },
  cancelled: { bg: "oklch(0.88 0.01 30)", color: "oklch(0.45 0.01 30)" },
};

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  cash: "نقدًا",
  transfer: "تحويل بنكي",
  card: "بطاقة",
  cheque: "شيك",
};

export const paymentMethodOptions: { value: PaymentMethod; label: string }[] = (
  Object.keys(paymentMethodLabel) as PaymentMethod[]
).map((m) => ({ value: m, label: paymentMethodLabel[m] }));
