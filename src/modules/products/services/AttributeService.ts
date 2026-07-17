import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/modules/shared/permissions";
import { recordAuditLog } from "@/modules/shared/audit";
import { AppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { isUniqueConstraintError } from "@/modules/shared/errors/prismaErrors";
import { ProductsPermissions } from "../permissions";
import { ProductsErrorCodes } from "../errors";
import type { AttributeView } from "../types";
import type { CreateAttributeInput, UpdateAttributeInput } from "./productsSchemas";

/**
 * مكتبة السمات (تحليل §7). سمة "اختيار من قائمة" تتطلب قيمًا. الحذف ممنوع —
 * أرشفة فقط عبر archivedAt (قاعدة CLAUDE #16).
 */

const withValues = {
  values: { orderBy: { displayOrder: "asc" } },
} as const;

// إزالة تكرار القيم مع الحفاظ على الترتيب.
function dedupeValues(values: string[]): string[] {
  return [...new Set(values)];
}

export async function createAttribute(
  actorUserId: string,
  input: CreateAttributeInput
): Promise<AttributeView> {
  await requirePermission(actorUserId, ProductsPermissions.createAttribute);

  const values = dedupeValues(input.values);
  if (input.type === "list" && values.length === 0) {
    throw new AppError(
      ProductsErrorCodes.LIST_ATTRIBUTE_NEEDS_VALUES,
      "سمة من نوع (اختيار من قائمة) تحتاج قيمة واحدة على الأقل",
      400
    );
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const attribute = await tx.attribute.create({
        data: {
          name: input.name,
          type: input.type,
          unit: input.unit ?? null,
          isRequired: input.isRequired,
          showInQuotes: input.showInQuotes,
          showOnWebsite: input.showOnWebsite,
          usedInFilter: input.usedInFilter,
          internalOnly: input.internalOnly,
          displayOrder: input.displayOrder,
          values: {
            create: values.map((value, i) => ({ value, displayOrder: i })),
          },
        },
        include: withValues,
      });

      await recordAuditLog(
        {
          userId: actorUserId,
          module: "products",
          action: "create_attribute",
          entityId: attribute.id,
          newValue: { name: attribute.name, type: attribute.type, values },
        },
        tx
      );

      return attribute;
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new AppError(ProductsErrorCodes.ATTRIBUTE_NAME_TAKEN, "اسم السمة مستخدم بالفعل", 409);
    }
    throw err;
  }
}

export async function updateAttribute(
  actorUserId: string,
  attributeId: string,
  input: UpdateAttributeInput
): Promise<AttributeView> {
  await requirePermission(actorUserId, ProductsPermissions.updateAttribute);

  const existing = await prisma.attribute.findUnique({
    where: { id: attributeId },
    include: withValues,
  });
  if (!existing) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "السمة غير موجودة", 404);
  }

  const values = input.values ? dedupeValues(input.values) : undefined;
  // لو النوع list ونستبدل القيم بمجموعة فاضية ⇒ ممنوع.
  if (existing.type === "list" && values && values.length === 0) {
    throw new AppError(
      ProductsErrorCodes.LIST_ATTRIBUTE_NEEDS_VALUES,
      "سمة من نوع (اختيار من قائمة) تحتاج قيمة واحدة على الأقل",
      400
    );
  }

  try {
    return await prisma.$transaction(async (tx) => {
      if (values) {
        await tx.attributeValue.deleteMany({ where: { attributeId } });
        if (values.length > 0) {
          await tx.attributeValue.createMany({
            data: values.map((value, i) => ({ attributeId, value, displayOrder: i })),
          });
        }
      }

      const attribute = await tx.attribute.update({
        where: { id: attributeId },
        data: {
          name: input.name,
          unit: input.unit,
          isRequired: input.isRequired,
          showInQuotes: input.showInQuotes,
          showOnWebsite: input.showOnWebsite,
          usedInFilter: input.usedInFilter,
          internalOnly: input.internalOnly,
          displayOrder: input.displayOrder,
        },
        include: withValues,
      });

      await recordAuditLog(
        {
          userId: actorUserId,
          module: "products",
          action: "update_attribute",
          entityId: attributeId,
          newValue: {
            name: attribute.name,
            values: attribute.values.map((v) => v.value),
          },
        },
        tx
      );

      return attribute;
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new AppError(ProductsErrorCodes.ATTRIBUTE_NAME_TAKEN, "اسم السمة مستخدم بالفعل", 409);
    }
    throw err;
  }
}

export async function archiveAttribute(
  actorUserId: string,
  attributeId: string
): Promise<AttributeView> {
  await requirePermission(actorUserId, ProductsPermissions.archiveAttribute);

  const existing = await prisma.attribute.findUnique({
    where: { id: attributeId },
    include: withValues,
  });
  if (!existing) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "السمة غير موجودة", 404);
  }

  return prisma.$transaction(async (tx) => {
    const attribute = await tx.attribute.update({
      where: { id: attributeId },
      data: { archivedAt: new Date() },
      include: withValues,
    });

    await recordAuditLog(
      {
        userId: actorUserId,
        module: "products",
        action: "archive_attribute",
        entityId: attributeId,
      },
      tx
    );

    return attribute;
  });
}
