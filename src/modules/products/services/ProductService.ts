import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/modules/shared/permissions";
import { recordAuditLog } from "@/modules/shared/audit";
import { AppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { isUniqueConstraintError } from "@/modules/shared/errors/prismaErrors";
import { ProductsPermissions } from "../permissions";
import { ProductsErrorCodes } from "../errors";
import type { ProductView } from "../types";
import { computeProductionCost, type CostComponentInput } from "./costEngine";

/**
 * المنتج وشجرة مكوّناته (مرحلة 1ب-2). التكلفة تُحسب من محرك التكلفة (roll-up)
 * وتُخزَّن cached على المنتج. التسعير والربحية تأتي في 1ب-3.
 */

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

/**
 * يعيد حساب تكلفة الإنتاج من شجرة المكوّنات ويخزّنها cached على المنتج.
 * يحمّل كل المكوّنات مسطّحة ويبني الشجرة في الذاكرة (استعلام واحد)، ثم
 * يمرّرها لمحرك التكلفة النقي.
 */
export async function recalculateProductCost(
  actorUserId: string,
  productId: string
): Promise<{ productionCost: string }> {
  await requirePermission(actorUserId, ProductsPermissions.manageProductBom);

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "المنتج غير موجود", 404);
  }

  const components = await prisma.component.findMany({
    where: { productId },
    include: {
      materials: {
        include: {
          material: { select: { baseUnitPrice: true, baseUnit: true } },
        },
      },
      operations: true,
    },
  });

  type Row = (typeof components)[number];
  const childrenByParent = new Map<string, Row[]>();
  const roots: Row[] = [];
  for (const c of components) {
    if (c.parentId) {
      const arr = childrenByParent.get(c.parentId) ?? [];
      arr.push(c);
      childrenByParent.set(c.parentId, arr);
    } else {
      roots.push(c);
    }
  }

  const toInput = (c: Row): CostComponentInput => ({
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

  const root: CostComponentInput = { quantity: 1, children: roots.map(toInput) };
  const cost = computeProductionCost(root);

  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.product.update({
      where: { id: productId },
      data: { productionCost: cost, costUpdatedAt: new Date() },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "products",
        action: "recalc_cost",
        entityId: productId,
        oldValue: { productionCost: product.productionCost.toString() },
        newValue: { productionCost: p.productionCost.toString() },
      },
      tx
    );
    return p;
  });

  return { productionCost: updated.productionCost.toString() };
}
