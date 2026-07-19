// مسميات عربية لقيم enums موديول products (للعرض في الواجهة). type-only imports.

import type {
  MeasurementUnit,
  MaterialStatus,
  AttributeType,
  OperationCostModel,
  ProductStatus,
} from "./types";

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

export const materialStatusLabel: Record<MaterialStatus, string> = {
  active: "نشطة",
  suspended: "موقوفة",
  archived: "مؤرشفة",
};

export const attributeTypeLabel: Record<AttributeType, string> = {
  text: "نص",
  number: "رقم",
  list: "قائمة",
  boolean: "نعم/لا",
  unit: "وحدة قياس",
  color: "لون",
  file: "ملف",
  image: "صورة",
};

export const operationCostModelLabel: Record<OperationCostModel, string> = {
  fixed: "مبلغ ثابت",
  perTime: "حسب الزمن",
  perQuantity: "حسب الكمية",
  percentage: "نسبة من الخامات",
};

export const productStatusLabel: Record<ProductStatus, string> = {
  active: "نشط",
  inactive: "غير نشط",
  suspended: "موقوف",
  archived: "مؤرشف",
};

export const materialStatusBadge: Record<MaterialStatus, { bg: string; color: string }> = {
  active: { bg: "oklch(0.92 0.06 150)", color: "oklch(0.35 0.12 150)" },
  suspended: { bg: "oklch(0.92 0.06 60)", color: "oklch(0.4 0.1 60)" },
  archived: { bg: "oklch(0.88 0.01 30)", color: "oklch(0.4 0.01 30)" },
};

// قائمة الوحدات للاختيار في النماذج، مجمّعة بالبُعد.
export const unitOptions: { value: MeasurementUnit; label: string }[] = (
  Object.keys(measurementUnitLabel) as MeasurementUnit[]
).map((u) => ({ value: u, label: measurementUnitLabel[u] }));
