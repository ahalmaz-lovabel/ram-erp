import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/modules/shared/permissions";
import { recordAuditLog } from "@/modules/shared/audit";
import { AppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { isUniqueConstraintError } from "@/modules/shared/errors/prismaErrors";
import { ProductsPermissions } from "../permissions";
import { ProductsErrorCodes } from "../errors";
import type { ProductView } from "../types";
import { computeProductionCost, type CostComponentInput } from "./costEngine";
import { effectiveCost, computeProfit, computeMargin, isBelowMinMargin } from "./pricing";
import type { UpdateProductPricingInput } from "./productsSchemas";

/**
 * المنتج: هيكله، شجرة مكوّناته، تكلفته المجمّعة، وتسعيره وربحيته (§6، §11–§14).
 * التكلفة تُحسب من محرك التكلفة (roll-up) وتُخزَّن cached، مع تتالٍ عند تغيّر
 * سعر خامة. سعر البيع لا يتغيّر تلقائيًا مع التكلفة (§11).
 */

type ComponentRow = Prisma.ComponentGetPayload<{
  include: {
    materials: { include: { material: { select: { baseUnitPrice: true; baseUnit: true } } } };
    operations: true;
  };
}>;

/** يبني مدخلات محرك التكلفة من مكوّنات مسطّحة (شجرة في الذاكرة). */
function buildRootInput(components: ComponentRow[]): CostComponentInput {
  const childrenByParent = new Map<string, ComponentRow[]>();
  const roots: ComponentRow[] = [];
  for (const c of components) {
    if (c.parentId) {
      const arr = childrenByParent.get(c.parentId) ?? [];
      arr.push(c);
      childrenByParent.set(c.parentId, arr);
    } else {
      roots.push(c);
    }
  }
  const toInput = (c: ComponentRow): CostComponentInput => ({
    quantity: c.quantity,
    materials: c.materials.map((m) => ({
      quantity: m.quantity,
      quantityUnit: m.unit,
      baseUnitPrice: m.material.baseUnitPrice,
      materialBaseUnit: m.material.baseUnit,
      wastePercent: m.wastePercent,
    })),
    operations: c.operations.map((o) => ({
      costModel: o.costModel,
      standardCost: o.standardCost,
      param: o.param,
    })),
    children: (childrenByParent.get(c.id) ?? []).map(toInput),
  });
  return { quantity: 1, children: roots.map(toInput) };
}

/**
 * يعيد حساب تكلفة منتج داخل معاملة قائمة، يخزّنها، ويسجّل سجل التكلفة عند
 * التغيّر (§14). مشترك بين إعادة الحساب اليدوية والتتالي.
 */
async function recomputeProductCostTx(
  tx: Prisma.TransactionClient,
  productId: string,
  actorUserId: string,
  source: string
): Promise<Prisma.Decimal> {
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: { productionCost: true },
  });
  if (!product) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "المنتج غير موجود", 404);
  }

  const components = await tx.component.findMany({
    where: { productId },
    include: {
      materials: { include: { material: { select: { baseUnitPrice: true, baseUnit: true } } } },
      operations: true,
    },
  });

  const newCost = computeProductionCost(buildRootInput(components));

  await tx.product.update({
    where: { id: productId },
    data: { productionCost: newCost, costUpdatedAt: new Date() },
  });

  if (!newCost.equals(product.productionCost)) {
    await tx.productCostHistory.create({
      data: {
        productId,
        oldCost: product.productionCost,
        newCost,
        source,
        changedByUserId: actorUserId,
      },
    });
  }
  return newCost;
}

/**
 * تتالي التكلفة: يعيد حساب كل المنتجات التي تستخدم خامة معيّنة (§8).
 * يُستدعى من داخل معاملة تعديل سعر الخامة.
 */
export async function recomputeProductsUsingMaterialTx(
  tx: Prisma.TransactionClient,
  materialId: string,
  actorUserId: string
): Promise<number> {
  const affected = await tx.product.findMany({
    where: { components: { some: { materials: { some: { materialId } } } } },
    select: { id: true },
  });
  for (const p of affected) {
    await recomputeProductCostTx(tx, p.id, actorUserId, "material_price");
  }
  return affected.length;
}

/** قائمة المنتجات (§4). فحص صلاحية العرض. */
export async function listProducts(actorUserId: string): Promise<ProductView[]> {
  await requirePermission(actorUserId, ProductsPermissions.viewProducts);
  return prisma.product.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
}

/** تفاصيل المنتج مع شجرة المكوّنات (خامات + عمليات لكل مكوّن). */
export async function getProductDetail(actorUserId: string, productId: string) {
  await requirePermission(actorUserId, ProductsPermissions.viewProducts);
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      components: {
        orderBy: { sortOrder: "asc" },
        include: {
          materials: {
            include: { material: { select: { code: true, name: true, baseUnit: true } } },
          },
          operations: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
  if (!product) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "المنتج غير موجود", 404);
  }
  return product;
}

export async function createProduct(
  actorUserId: string,
  input: { code: string; name: string }
): Promise<ProductView> {
  await requirePermission(actorUserId, ProductsPermissions.createProduct);
  try {
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: { code: input.code, name: input.name },
      });
      await recordAuditLog(
        {
          userId: actorUserId,
          module: "products",
          action: "create_product",
          entityId: product.id,
          newValue: { code: product.code, name: product.name },
        },
        tx
      );
      return product;
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new AppError(ProductsErrorCodes.PRODUCT_CODE_TAKEN, "كود المنتج مستخدم بالفعل", 409);
    }
    throw err;
  }
}

export async function recalculateProductCost(
  actorUserId: string,
  productId: string
): Promise<{ productionCost: string }> {
  await requirePermission(actorUserId, ProductsPermissions.manageProductBom);
  const cost = await prisma.$transaction(async (tx) => {
    const c = await recomputeProductCostTx(tx, productId, actorUserId, "recalc");
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "products",
        action: "recalc_cost",
        entityId: productId,
        newValue: { productionCost: c.toString() },
      },
      tx
    );
    return c;
  });
  return { productionCost: cost.toString() };
}

export interface ProductPricingView {
  productionCost: string;
  manualCost: string | null;
  effectiveCost: string;
  salePrice: string | null;
  minSalePrice: string | null;
  minMarginPercent: string | null;
  profit: string | null;
  margin: string | null;
  belowMinMargin: boolean;
}

/** يبني عرض التسعير والربحية من صف المنتج (§12). */
function toPricingView(p: {
  productionCost: Prisma.Decimal;
  manualCost: Prisma.Decimal | null;
  salePrice: Prisma.Decimal | null;
  minSalePrice: Prisma.Decimal | null;
  minMarginPercent: Prisma.Decimal | null;
}): ProductPricingView {
  const eff = effectiveCost(p.productionCost, p.manualCost);
  const profit = p.salePrice ? computeProfit(p.salePrice, eff) : null;
  const margin = p.salePrice ? computeMargin(p.salePrice, eff) : null;
  return {
    productionCost: p.productionCost.toString(),
    manualCost: p.manualCost?.toString() ?? null,
    effectiveCost: eff.toString(),
    salePrice: p.salePrice?.toString() ?? null,
    minSalePrice: p.minSalePrice?.toString() ?? null,
    minMarginPercent: p.minMarginPercent?.toString() ?? null,
    profit: profit?.toString() ?? null,
    margin: margin?.toString() ?? null,
    belowMinMargin: margin ? isBelowMinMargin(margin, p.minMarginPercent) : false,
  };
}

export async function getProductPricing(
  actorUserId: string,
  productId: string
): Promise<ProductPricingView> {
  await requirePermission(actorUserId, ProductsPermissions.viewProductProfit);
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "المنتج غير موجود", 404);
  }
  return toPricingView(product);
}

/**
 * تعديل تسعير المنتج (§12، §13): سعر البيع، أقل سعر، حد الهامش، التكلفة اليدوية.
 * يسجّل التغيير في سجل الأسعار، ولا يغيّر التكلفة المحسوبة. تغيير التكلفة
 * اليدوية يُسجَّل في سجل التكلفة (source: manual).
 */
export async function updateProductPricing(
  actorUserId: string,
  productId: string,
  input: UpdateProductPricingInput
): Promise<ProductPricingView> {
  await requirePermission(actorUserId, ProductsPermissions.updateProductPrice);

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "المنتج غير موجود", 404);
  }

  const pick = <T>(next: T | undefined, current: T): T => (next !== undefined ? next : current);

  const nextManualCost = pick(input.manualCost, product.manualCost);
  const oldEff = effectiveCost(product.productionCost, product.manualCost);
  const newEff = effectiveCost(product.productionCost, nextManualCost);
  const oldMargin = product.salePrice ? computeMargin(product.salePrice, oldEff) : null;
  const nextSalePrice = pick(input.salePrice, product.salePrice);
  const newMargin = nextSalePrice ? computeMargin(nextSalePrice, newEff) : null;

  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.product.update({
      where: { id: productId },
      data: {
        salePrice: input.salePrice,
        minSalePrice: input.minSalePrice,
        minMarginPercent: input.minMarginPercent,
        manualCost: input.manualCost,
        priceUpdatedAt: new Date(),
      },
    });

    await tx.productPriceHistory.create({
      data: {
        productId,
        oldSalePrice: product.salePrice,
        newSalePrice: p.salePrice,
        oldMinSalePrice: product.minSalePrice,
        newMinSalePrice: p.minSalePrice,
        productionCostAtChange: newEff,
        marginBefore: oldMargin,
        marginAfter: newMargin,
        reason: input.reason ?? null,
        changedByUserId: actorUserId,
      },
    });

    // تغيّر التكلفة الفعّالة بسبب التكلفة اليدوية ⇒ سجل تكلفة (§14).
    if (!newEff.equals(oldEff)) {
      await tx.productCostHistory.create({
        data: {
          productId,
          oldCost: oldEff,
          newCost: newEff,
          source: "manual",
          changedByUserId: actorUserId,
        },
      });
    }

    await recordAuditLog(
      {
        userId: actorUserId,
        module: "products",
        action: "update_pricing",
        entityId: productId,
        oldValue: { salePrice: product.salePrice?.toString() ?? null },
        newValue: { salePrice: p.salePrice?.toString() ?? null, reason: input.reason ?? null },
      },
      tx
    );

    return p;
  });

  return toPricingView(updated);
}
