// قواعد حسابية نقية لموديول products — قابلة للاختبار مباشرة.
// كل الحسابات المالية بـ Prisma.Decimal (ممنوع number — قاعدة CLAUDE #3).

import { Prisma } from "@/generated/prisma/client";
import type { MeasurementUnit } from "@/generated/prisma/client";
import { AppError } from "@/modules/shared/errors/AppError";
import { ProductsErrorCodes } from "../errors";

type DecimalInput = Prisma.Decimal | number | string;

/** البُعد الفيزيائي للوحدة — يحدد أي كميات قابلة للتحويل مع بعضها. */
export type Dimension = "count" | "length" | "area" | "volume" | "weight" | "capacity";

const UNIT_DIMENSION: Record<MeasurementUnit, Dimension> = {
  ton: "weight",
  kg: "weight",
  gram: "weight",
  meter: "length",
  cm: "length",
  mm: "length",
  squareMeter: "area",
  squareCm: "area",
  cubicMeter: "volume",
  cubicCm: "volume",
  liter: "capacity",
  ml: "capacity",
  roll: "count",
  box: "count",
  piece: "count",
};

/** بُعد وحدة قياس معيّنة. */
export function unitDimension(unit: MeasurementUnit): Dimension {
  return UNIT_DIMENSION[unit];
}

/**
 * هل الوحدتان من نفس البُعد (فيصح التحويل بينهما)؟ تُستخدم لاحقًا للتحقق إن
 * كمية الخامة في الـ BOM بوحدة متوافقة مع وحدة حساب الخامة.
 */
export function sameDimension(a: MeasurementUnit, b: MeasurementUnit): boolean {
  return unitDimension(a) === unitDimension(b);
}

// معامل كل وحدة إلى الوحدة القياسية الصغرى في بُعدها (وزن=جرام، طول=مم،
// مساحة=مم²، حجم=مم³، سعة=مل). وحدات العدد لا تتحوّل لبعضها.
const TO_CANONICAL: Partial<Record<MeasurementUnit, string>> = {
  ton: "1000000",
  kg: "1000",
  gram: "1",
  meter: "1000",
  cm: "10",
  mm: "1",
  squareMeter: "1000000",
  squareCm: "100",
  cubicMeter: "1000000000",
  cubicCm: "1000",
  liter: "1000",
  ml: "1",
};

/**
 * يحوّل كمية من وحدة لأخرى داخل نفس البُعد. وحدات العدد (قطعة/علبة/رول) لا
 * تتحوّل لبعضها — لازم تطابق تام. أبعاد مختلفة ⇒ خطأ INCOMPATIBLE_UNITS.
 */
export function convertQuantity(
  quantity: DecimalInput,
  from: MeasurementUnit,
  to: MeasurementUnit
): Prisma.Decimal {
  if (!sameDimension(from, to)) {
    throw new AppError(
      ProductsErrorCodes.INCOMPATIBLE_UNITS,
      `لا يمكن تحويل وحدة (${from}) إلى (${to}) — بُعدان مختلفان`,
      400,
      { from, to }
    );
  }
  const qty = new Prisma.Decimal(quantity);
  if (unitDimension(from) === "count") {
    if (from !== to) {
      throw new AppError(
        ProductsErrorCodes.INCOMPATIBLE_UNITS,
        `وحدات العدد لا تتحوّل لبعضها (${from} ≠ ${to})`,
        400,
        { from, to }
      );
    }
    return qty;
  }
  const f = new Prisma.Decimal(TO_CANONICAL[from]!);
  const t = new Prisma.Decimal(TO_CANONICAL[to]!);
  return qty.times(f).dividedBy(t);
}

/**
 * سعر أقل وحدة حساب = سعر وحدة الشراء ÷ معامل التحويل (تحليل §8).
 * مثال: طن بسعر 40000، معامل التحويل 1000 (كجم في الطن) ⇒ سعر الكجم = 40.
 * معامل التحويل يجب أن يكون أكبر من صفر.
 */
export function computeBaseUnitPrice(
  purchaseUnitPrice: DecimalInput,
  conversionFactor: DecimalInput
): Prisma.Decimal {
  const factor = new Prisma.Decimal(conversionFactor);
  if (factor.lessThanOrEqualTo(0)) {
    throw new AppError(
      ProductsErrorCodes.INVALID_CONVERSION_FACTOR,
      "معامل التحويل يجب أن يكون أكبر من صفر",
      400,
      { conversionFactor: factor.toString() }
    );
  }
  return new Prisma.Decimal(purchaseUnitPrice).dividedBy(factor);
}
