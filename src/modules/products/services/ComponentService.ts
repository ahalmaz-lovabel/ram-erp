import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/modules/shared/permissions";
import { recordAuditLog } from "@/modules/shared/audit";
import { AppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { ProductsPermissions } from "../permissions";
import { ProductsErrorCodes } from "../errors";
import { sameDimension } from "./productsRules";
import type {
  AddComponentInput,
  AddComponentMaterialInput,
  AddComponentOperationInput,
} from "./productsSchemas";

/**
 * بناء شجرة مكوّنات المنتج (مرحلة 1ب-2). كل تعديل على البنية يتطلب صلاحية
 * manage_bom الحساسة (§20). لا يعيد حساب التكلفة تلقائيًا — يُستدعى
 * recalculateProductCost صراحةً بعد إتمام البناء.
 */

export async function addComponent(
  actorUserId: string,
  productId: string,
  input: AddComponentInput
) {
  await requirePermission(actorUserId, ProductsPermissions.manageProductBom);

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "المنتج غير موجود", 404);
  }

  if (input.parentId) {
    const parent = await prisma.component.findUnique({
      where: { id: input.parentId },
      select: { productId: true },
    });
    if (!parent) {
      throw new AppError(CommonErrorCodes.NOT_FOUND, "المكوّن الأب غير موجود", 404);
    }
    if (parent.productId !== productId) {
      throw new AppError(
        ProductsErrorCodes.COMPONENT_PARENT_MISMATCH,
        "المكوّن الأب يتبع منتجًا آخر",
        400
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const component = await tx.component.create({
      data: {
        productId,
        parentId: input.parentId ?? null,
        name: input.name,
        quantity: input.quantity,
        lengthCm: input.lengthCm ?? null,
        widthCm: input.widthCm ?? null,
        thicknessMm: input.thicknessMm ?? null,
        weightKg: input.weightKg ?? null,
        notes: input.notes ?? null,
        sortOrder: input.sortOrder,
      },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "products",
        action: "add_component",
        entityId: productId,
        newValue: { componentId: component.id, name: component.name },
      },
      tx
    );
    return component;
  });
}

export async function addComponentMaterial(
  actorUserId: string,
  componentId: string,
  input: AddComponentMaterialInput
) {
  await requirePermission(actorUserId, ProductsPermissions.manageProductBom);

  const component = await prisma.component.findUnique({
    where: { id: componentId },
    select: { id: true, productId: true },
  });
  if (!component) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "المكوّن غير موجود", 404);
  }

  const material = await prisma.material.findUnique({
    where: { id: input.materialId },
    select: { baseUnit: true, status: true },
  });
  if (!material) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "الخامة غير موجودة", 404);
  }
  if (material.status === "archived") {
    throw new AppError(
      ProductsErrorCodes.MATERIAL_ARCHIVED,
      "لا يمكن استخدام خامة مؤرشفة في الوصفة",
      400
    );
  }
  // وحدة الكمية لازم تكون نفس بُعد وحدة حساب الخامة (طول/مساحة/حجم/وزن...).
  if (!sameDimension(input.unit, material.baseUnit)) {
    throw new AppError(
      ProductsErrorCodes.INCOMPATIBLE_UNITS,
      "وحدة الكمية لا تطابق بُعد وحدة حساب الخامة",
      400,
      { quantityUnit: input.unit, materialBaseUnit: material.baseUnit }
    );
  }

  return prisma.$transaction(async (tx) => {
    const bomItem = await tx.componentMaterial.create({
      data: {
        componentId,
        materialId: input.materialId,
        quantity: input.quantity,
        unit: input.unit,
        wastePercent: input.wastePercent,
      },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "products",
        action: "add_component_material",
        entityId: component.productId,
        newValue: {
          componentId,
          materialId: input.materialId,
          quantity: input.quantity.toString(),
          unit: input.unit,
        },
      },
      tx
    );
    return bomItem;
  });
}

export async function addComponentOperation(
  actorUserId: string,
  componentId: string,
  input: AddComponentOperationInput
) {
  await requirePermission(actorUserId, ProductsPermissions.manageProductBom);

  const component = await prisma.component.findUnique({
    where: { id: componentId },
    select: { id: true, productId: true },
  });
  if (!component) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "المكوّن غير موجود", 404);
  }

  // مصدر تكلفة العملية: من المكتبة أو استثنائية inline.
  let snapshot: {
    operationId: string | null;
    name: string;
    costModel: AddComponentOperationInput["costModel"];
    standardCost: NonNullable<AddComponentOperationInput["standardCost"]>;
  };

  if (input.operationId) {
    const op = await prisma.operation.findUnique({ where: { id: input.operationId } });
    if (!op) {
      throw new AppError(CommonErrorCodes.NOT_FOUND, "عملية التصنيع غير موجودة", 404);
    }
    snapshot = {
      operationId: op.id,
      name: op.name,
      costModel: op.costModel,
      standardCost: op.standardCost,
    };
  } else {
    // عملية استثنائية inline — لازم اسم + نموذج + تكلفة.
    if (!input.name || !input.costModel || !input.standardCost) {
      throw new AppError(
        ProductsErrorCodes.INLINE_OPERATION_INCOMPLETE,
        "العملية الاستثنائية تحتاج اسمًا ونموذج تكلفة وقيمة",
        400
      );
    }
    snapshot = {
      operationId: null,
      name: input.name,
      costModel: input.costModel,
      standardCost: input.standardCost,
    };
  }

  return prisma.$transaction(async (tx) => {
    // حفظ العملية الاستثنائية في المكتبة لإعادة الاستخدام (اختياري).
    if (!input.operationId && input.saveToLibrary) {
      const saved = await tx.operation.create({
        data: {
          name: snapshot.name,
          costModel: snapshot.costModel!,
          standardCost: snapshot.standardCost,
        },
      });
      snapshot.operationId = saved.id;
    }

    const applied = await tx.componentOperation.create({
      data: {
        componentId,
        operationId: snapshot.operationId,
        name: snapshot.name,
        costModel: snapshot.costModel!,
        standardCost: snapshot.standardCost,
        param: input.param,
        sortOrder: input.sortOrder,
      },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "products",
        action: "add_component_operation",
        entityId: component.productId,
        newValue: { componentId, name: snapshot.name, costModel: snapshot.costModel },
      },
      tx
    );
    return applied;
  });
}
