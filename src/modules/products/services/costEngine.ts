// محرك حساب تكلفة المنتج — دالة نقية (بدون قاعدة بيانات). أهم منطق في الموديول،
// معزول ومختبَر مباشرة. مبني على مذكرة التصميم الهرمي (mBOM + Routing + Roll-up).
//
// المبدأ: تكلفة كل مكوّن (نسخة واحدة) = خاماته (بعد التحويل والهالك) + عملياته
// + Σ(تكلفة كل ابن × كميته). التجميع bottom-up عبر الشجرة.

import { Prisma } from "@/generated/prisma/client";
import type { MeasurementUnit, OperationCostModel } from "@/generated/prisma/client";
import { convertQuantity } from "./productsRules";

/** بند خامة داخل مكوّن (leaf BOM item). */
export interface BomMaterialInput {
  /** الكمية بوحدة الإدخال. */
  quantity: Prisma.Decimal | number | string;
  /** وحدة الكمية المُدخلة (لازم نفس بُعد وحدة حساب الخامة). */
  quantityUnit: MeasurementUnit;
  /** سعر أقل وحدة حساب للخامة (من مكتبة الخامات). */
  baseUnitPrice: Prisma.Decimal | number | string;
  /** وحدة حساب الخامة اللي السعر متعلّق بيها. */
  materialBaseUnit: MeasurementUnit;
  /** نسبة الهالك (%) — 0 افتراضيًا. */
  wastePercent?: Prisma.Decimal | number | string;
}

/** عملية تصنيع مُطبّقة على مكوّن (snapshot لتكلفتها). */
export interface AppliedOperationInput {
  costModel: OperationCostModel;
  /** القيمة المعيارية (تفسيرها حسب costModel). */
  standardCost: Prisma.Decimal | number | string;
  /** الكمية/الزمن لـ perQuantity/perTime (1 افتراضيًا؛ يُتجاهَل لغيرهما). */
  param?: Prisma.Decimal | number | string;
}

/** مكوّن في شجرة المنتج (تجميعة أو قطعة). */
export interface CostComponentInput {
  /** كم نسخة من هذا المكوّن داخل أبيه (مثال: رجل ×2). */
  quantity: Prisma.Decimal | number | string;
  materials?: BomMaterialInput[];
  operations?: AppliedOperationInput[];
  children?: CostComponentInput[];
}

/** تفصيل تكلفة نسخة واحدة من مكوّن. */
export interface CostBreakdown {
  materialsCost: Prisma.Decimal;
  operationsCost: Prisma.Decimal;
  childrenCost: Prisma.Decimal;
  /** تكلفة نسخة واحدة = خامات + عمليات + أبناء. */
  total: Prisma.Decimal;
}

const HUNDRED = new Prisma.Decimal(100);

/** تكلفة بند خامة واحد: (الكمية بعد التحويل × سعر الوحدة) × (1 + الهالك%). */
function materialCost(m: BomMaterialInput): Prisma.Decimal {
  const converted = convertQuantity(m.quantity, m.quantityUnit, m.materialBaseUnit);
  const base = converted.times(new Prisma.Decimal(m.baseUnitPrice));
  const waste = new Prisma.Decimal(m.wastePercent ?? 0);
  return base.times(HUNDRED.plus(waste)).dividedBy(HUNDRED);
}

/** تكلفة عملية مُطبّقة حسب نموذجها. percentage تُحسب من تكلفة خامات المكوّن. */
function operationCost(op: AppliedOperationInput, materialsCost: Prisma.Decimal): Prisma.Decimal {
  const std = new Prisma.Decimal(op.standardCost);
  const param = new Prisma.Decimal(op.param ?? 1);
  switch (op.costModel) {
    case "fixed":
      return std;
    case "perQuantity":
    case "perTime":
      return std.times(param);
    case "percentage":
      return std.dividedBy(HUNDRED).times(materialsCost);
    default:
      return new Prisma.Decimal(0);
  }
}

/**
 * يحسب تكلفة نسخة واحدة من مكوّن (recursive، bottom-up).
 * الأب يضرب الناتج في كمية الابن.
 */
export function rollUpComponentCost(node: CostComponentInput): CostBreakdown {
  const materialsCost = (node.materials ?? []).reduce(
    (sum, m) => sum.plus(materialCost(m)),
    new Prisma.Decimal(0)
  );

  const operationsCost = (node.operations ?? []).reduce(
    (sum, op) => sum.plus(operationCost(op, materialsCost)),
    new Prisma.Decimal(0)
  );

  const childrenCost = (node.children ?? []).reduce((sum, child) => {
    const childOne = rollUpComponentCost(child).total;
    return sum.plus(childOne.times(new Prisma.Decimal(child.quantity)));
  }, new Prisma.Decimal(0));

  return {
    materialsCost,
    operationsCost,
    childrenCost,
    total: materialsCost.plus(operationsCost).plus(childrenCost),
  };
}

/**
 * تكلفة إنتاج المنتج = تكلفة الجذر (مكوّناته الرئيسية بكمياتها).
 * الجذر يُمثّل التجميع النهائي للمنتج (كمية = 1).
 */
export function computeProductionCost(root: CostComponentInput): Prisma.Decimal {
  return rollUpComponentCost(root).total;
}
