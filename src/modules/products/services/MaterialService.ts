import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/modules/shared/permissions";
import { recordAuditLog } from "@/modules/shared/audit";
import { AppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { isUniqueConstraintError } from "@/modules/shared/errors/prismaErrors";
import { ProductsPermissions } from "../permissions";
import { ProductsErrorCodes } from "../errors";
import type { MaterialView } from "../types";
import { computeBaseUnitPrice } from "./productsRules";
import { recomputeProductsUsingMaterialTx } from "./ProductService";
import type {
  CreateMaterialInput,
  UpdateMaterialInput,
  UpdateMaterialPriceInput,
} from "./productsSchemas";

/**
 * مكتبة الخامات (تحليل §8). تعديل السعر عملية حساسة تُسجَّل في سجل الأسعار
 * (MaterialPriceHistory) وتُحسب منها سعر أقل وحدة تلقائيًا. الحذف ممنوع —
 * أرشفة فقط (قاعدة CLAUDE #16).
 */

// لقطة JSON-آمنة لسجل العمليات (Decimal → نص عشان يتخزّن نظيف).
function materialSnapshot(m: {
  code: string;
  name: string;
  category: string;
  purchaseUnitPrice: { toString(): string };
  baseUnitPrice: { toString(): string };
  status: string;
}) {
  return {
    code: m.code,
    name: m.name,
    category: m.category,
    purchaseUnitPrice: m.purchaseUnitPrice.toString(),
    baseUnitPrice: m.baseUnitPrice.toString(),
    status: m.status,
  };
}

export async function createMaterial(
  actorUserId: string,
  input: CreateMaterialInput
): Promise<MaterialView> {
  await requirePermission(actorUserId, ProductsPermissions.createMaterial);

  const baseUnitPrice = computeBaseUnitPrice(input.purchaseUnitPrice, input.conversionFactor);

  try {
    return await prisma.$transaction(async (tx) => {
      const material = await tx.material.create({
        data: {
          code: input.code,
          name: input.name,
          category: input.category,
          description: input.description ?? null,
          imageUrl: input.imageUrl ?? null,
          purchaseUnit: input.purchaseUnit,
          baseUnit: input.baseUnit,
          conversionFactor: input.conversionFactor,
          purchaseUnitPrice: input.purchaseUnitPrice,
          baseUnitPrice,
          lastPurchasePrice: input.purchaseUnitPrice,
        },
      });

      await recordAuditLog(
        {
          userId: actorUserId,
          module: "products",
          action: "create_material",
          entityId: material.id,
          newValue: materialSnapshot(material),
        },
        tx
      );

      return material;
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new AppError(ProductsErrorCodes.MATERIAL_CODE_TAKEN, "كود الخامة مستخدم بالفعل", 409);
    }
    throw err;
  }
}

export async function updateMaterial(
  actorUserId: string,
  materialId: string,
  input: UpdateMaterialInput
): Promise<MaterialView> {
  await requirePermission(actorUserId, ProductsPermissions.updateMaterial);

  const existing = await prisma.material.findUnique({ where: { id: materialId } });
  if (!existing) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "الخامة غير موجودة", 404);
  }

  return prisma.$transaction(async (tx) => {
    const material = await tx.material.update({
      where: { id: materialId },
      data: {
        name: input.name,
        category: input.category,
        description: input.description,
        imageUrl: input.imageUrl,
      },
    });

    await recordAuditLog(
      {
        userId: actorUserId,
        module: "products",
        action: "update_material",
        entityId: material.id,
        oldValue: materialSnapshot(existing),
        newValue: materialSnapshot(material),
      },
      tx
    );

    return material;
  });
}

/**
 * تعديل سعر شراء الخامة (§8). يعيد حساب سعر أقل وحدة، ويسجّل التغيير في
 * سجل الأسعار. ملاحظة: إعادة حساب تكلفة المنتجات المتأثرة تأتي في المرحلة 1ب.
 */
export async function updateMaterialPrice(
  actorUserId: string,
  materialId: string,
  input: UpdateMaterialPriceInput
): Promise<MaterialView> {
  await requirePermission(actorUserId, ProductsPermissions.updateMaterialPrice);

  const existing = await prisma.material.findUnique({ where: { id: materialId } });
  if (!existing) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "الخامة غير موجودة", 404);
  }

  const newBaseUnitPrice = computeBaseUnitPrice(
    input.newPurchaseUnitPrice,
    existing.conversionFactor
  );

  return prisma.$transaction(async (tx) => {
    await tx.materialPriceHistory.create({
      data: {
        materialId,
        oldPurchaseUnitPrice: existing.purchaseUnitPrice,
        newPurchaseUnitPrice: input.newPurchaseUnitPrice,
        oldBaseUnitPrice: existing.baseUnitPrice,
        newBaseUnitPrice,
        reason: input.reason ?? null,
        changedByUserId: actorUserId,
      },
    });

    const material = await tx.material.update({
      where: { id: materialId },
      data: {
        purchaseUnitPrice: input.newPurchaseUnitPrice,
        baseUnitPrice: newBaseUnitPrice,
        lastPurchasePrice: input.newPurchaseUnitPrice,
      },
    });

    // تتالي التكلفة: أعِد حساب تكلفة كل المنتجات التي تستخدم هذه الخامة (§8).
    // لا يغيّر سعر بيعها تلقائيًا (§11) — يُسجَّل في سجل التكلفة فقط.
    const affected = await recomputeProductsUsingMaterialTx(tx, materialId, actorUserId);

    await recordAuditLog(
      {
        userId: actorUserId,
        module: "products",
        action: "update_material_price",
        entityId: materialId,
        oldValue: { purchaseUnitPrice: existing.purchaseUnitPrice.toString() },
        newValue: {
          purchaseUnitPrice: material.purchaseUnitPrice.toString(),
          reason: input.reason ?? null,
          affectedProducts: affected,
        },
      },
      tx
    );

    return material;
  });
}

export async function archiveMaterial(
  actorUserId: string,
  materialId: string
): Promise<MaterialView> {
  await requirePermission(actorUserId, ProductsPermissions.archiveMaterial);

  const existing = await prisma.material.findUnique({ where: { id: materialId } });
  if (!existing) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "الخامة غير موجودة", 404);
  }

  return prisma.$transaction(async (tx) => {
    const material = await tx.material.update({
      where: { id: materialId },
      data: { status: "archived" },
    });

    await recordAuditLog(
      {
        userId: actorUserId,
        module: "products",
        action: "archive_material",
        entityId: materialId,
        oldValue: { status: existing.status },
        newValue: { status: material.status },
      },
      tx
    );

    return material;
  });
}
