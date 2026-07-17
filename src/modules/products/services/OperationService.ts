import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/modules/shared/permissions";
import { recordAuditLog } from "@/modules/shared/audit";
import { AppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { isUniqueConstraintError } from "@/modules/shared/errors/prismaErrors";
import { ProductsPermissions } from "../permissions";
import { ProductsErrorCodes } from "../errors";
import type { OperationView } from "../types";
import type { CreateOperationInput, UpdateOperationInput } from "./productsSchemas";

/**
 * مكتبة عمليات التصنيع (تحليل §10). عمليات معيارية قابلة لإعادة الاستخدام
 * تُطبَّق على مكوّنات المنتج لاحقًا. الحذف ممنوع — أرشفة فقط (archivedAt).
 */

export async function createOperation(
  actorUserId: string,
  input: CreateOperationInput
): Promise<OperationView> {
  await requirePermission(actorUserId, ProductsPermissions.createOperation);

  try {
    return await prisma.$transaction(async (tx) => {
      const operation = await tx.operation.create({
        data: {
          name: input.name,
          category: input.category ?? null,
          costModel: input.costModel,
          standardCost: input.standardCost,
          description: input.description ?? null,
        },
      });

      await recordAuditLog(
        {
          userId: actorUserId,
          module: "products",
          action: "create_operation",
          entityId: operation.id,
          newValue: {
            name: operation.name,
            costModel: operation.costModel,
            standardCost: operation.standardCost.toString(),
          },
        },
        tx
      );

      return operation;
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new AppError(
        ProductsErrorCodes.OPERATION_NAME_TAKEN,
        "اسم عملية التصنيع مستخدم بالفعل",
        409
      );
    }
    throw err;
  }
}

export async function updateOperation(
  actorUserId: string,
  operationId: string,
  input: UpdateOperationInput
): Promise<OperationView> {
  await requirePermission(actorUserId, ProductsPermissions.updateOperation);

  const existing = await prisma.operation.findUnique({ where: { id: operationId } });
  if (!existing) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "عملية التصنيع غير موجودة", 404);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const operation = await tx.operation.update({
        where: { id: operationId },
        data: {
          name: input.name,
          category: input.category,
          costModel: input.costModel,
          standardCost: input.standardCost,
          description: input.description,
        },
      });

      await recordAuditLog(
        {
          userId: actorUserId,
          module: "products",
          action: "update_operation",
          entityId: operationId,
          oldValue: {
            costModel: existing.costModel,
            standardCost: existing.standardCost.toString(),
          },
          newValue: {
            costModel: operation.costModel,
            standardCost: operation.standardCost.toString(),
          },
        },
        tx
      );

      return operation;
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new AppError(
        ProductsErrorCodes.OPERATION_NAME_TAKEN,
        "اسم عملية التصنيع مستخدم بالفعل",
        409
      );
    }
    throw err;
  }
}

export async function archiveOperation(
  actorUserId: string,
  operationId: string
): Promise<OperationView> {
  await requirePermission(actorUserId, ProductsPermissions.archiveOperation);

  const existing = await prisma.operation.findUnique({ where: { id: operationId } });
  if (!existing) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "عملية التصنيع غير موجودة", 404);
  }

  return prisma.$transaction(async (tx) => {
    const operation = await tx.operation.update({
      where: { id: operationId },
      data: { archivedAt: new Date() },
    });

    await recordAuditLog(
      {
        userId: actorUserId,
        module: "products",
        action: "archive_operation",
        entityId: operationId,
      },
      tx
    );

    return operation;
  });
}
