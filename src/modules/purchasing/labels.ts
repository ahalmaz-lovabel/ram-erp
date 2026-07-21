// مسميات عربية لحالات المشتريات ووحدات القياس وطرق الدفع (للعرض في الواجهة).
// type-only imports (آمن للعميل).

import type { SupplierStatus, PurchaseOrderStatus, PaymentMethod, MeasurementUnit } from "./types";

export const supplierStatusLabel: Record<SupplierStatus, string> = {
  active: "نشط",
  suspended: "موقوف",
  archived: "مؤرشف",
};

export const purchaseOrderStatusLabel: Record<PurchaseOrderStatus, string> = {
  draft: "مسودة",
  sent: "مُرسل",
  received: "مستلَم",
  cancelled: "ملغى",
};

export const purchaseOrderStatusBadge: Record<PurchaseOrderStatus, { bg: string; color: string }> =
  {
    draft: { bg: "oklch(0.9 0.01 30)", color: "oklch(0.4 0.01 30)" },
    sent: { bg: "oklch(0.92 0.06 60)", color: "oklch(0.4 0.1 60)" },
    received: { bg: "oklch(0.92 0.06 150)", color: "oklch(0.35 0.12 150)" },
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

export const measurementUnitLabel: Record<MeasurementUnit, string> = {
  ton: "طن",
  kg: "كجم",
  gram: "جرام",
  meter: "متر",
  cm: "سم",
  mm: "مم",
  squareMeter: "م²",
  squareCm: "سم²",
  cubicMeter: "م³",
  cubicCm: "سم³",
  liter: "لتر",
  ml: "مل",
  roll: "رول",
  box: "علبة",
  piece: "قطعة",
};
