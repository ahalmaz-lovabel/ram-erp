// دوال التسعير والربحية النقية (§11، §12). كل الحسابات Prisma.Decimal.

import { Prisma } from "@/generated/prisma/client";

type D = Prisma.Decimal | number | string;

/**
 * التكلفة الفعّالة = التكلفة اليدوية إن وُجدت، وإلا تكلفة الإنتاج المحسوبة (§12).
 */
export function effectiveCost(productionCost: D, manualCost?: D | null): Prisma.Decimal {
  if (manualCost !== null && manualCost !== undefined) {
    return new Prisma.Decimal(manualCost);
  }
  return new Prisma.Decimal(productionCost);
}

/** الربح المتوقع = سعر البيع − التكلفة (§11). */
export function computeProfit(salePrice: D, cost: D): Prisma.Decimal {
  return new Prisma.Decimal(salePrice).minus(new Prisma.Decimal(cost));
}

/** هامش الربح = (الربح ÷ سعر البيع) × 100. سعر بيع ≤ 0 ⇒ 0 (تجنّب القسمة). */
export function computeMargin(salePrice: D, cost: D): Prisma.Decimal {
  const sp = new Prisma.Decimal(salePrice);
  if (sp.lessThanOrEqualTo(0)) return new Prisma.Decimal(0);
  return computeProfit(sp, cost).dividedBy(sp).times(100);
}

/** هل الهامش أقل من الحد الأدنى المطلوب (لتنبيه §21)؟ */
export function isBelowMinMargin(margin: D, minMargin?: D | null): boolean {
  if (minMargin === null || minMargin === undefined) return false;
  return new Prisma.Decimal(margin).lessThan(new Prisma.Decimal(minMargin));
}
