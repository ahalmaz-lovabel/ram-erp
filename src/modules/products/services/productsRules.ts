// قواعد حسابية نقية لموديول products — قابلة للاختبار مباشرة.
// كل الحسابات المالية بـ Prisma.Decimal (ممنوع number — قاعدة CLAUDE #3).

import { Prisma } from "@/generated/prisma/client";
import { AppError } from "@/modules/shared/errors/AppError";
import { ProductsErrorCodes } from "../errors";

type DecimalInput = Prisma.Decimal | number | string;

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
