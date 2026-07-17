import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/modules/shared/permissions";
import { recordAuditLog } from "@/modules/shared/audit";
import { AppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { isUniqueConstraintError } from "@/modules/shared/errors/prismaErrors";
import { CustomersPermissions } from "../permissions";
import { CustomersErrorCodes } from "../errors";
import type { CustomerView } from "../types";
import type { CreateCustomerInput, UpdateCustomerInput } from "./customersSchemas";

/**
 * العملاء (§4). الحذف ممنوع افتراضيًا — أرشفة فقط (§2، CLAUDE #16). المستندات
 * الرسمية تحفظ بيانات العميل وقت الإصدار (snapshot) في موديولاتها.
 */

export async function createCustomer(
  actorUserId: string,
  input: CreateCustomerInput
): Promise<CustomerView> {
  await requirePermission(actorUserId, CustomersPermissions.createCustomer);

  try {
    return await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          code: input.code,
          name: input.name,
          type: input.type,
          isImportant: input.isImportant,
          phone: input.phone ?? null,
          whatsapp: input.whatsapp ?? null,
          email: input.email ?? null,
          address: input.address ?? null,
          city: input.city ?? null,
          country: input.country ?? null,
          taxNumber: input.taxNumber ?? null,
          commercialRegister: input.commercialRegister ?? null,
          source: input.source ?? null,
          notes: input.notes ?? null,
          responsibleUserId: input.responsibleUserId ?? null,
        },
      });
      await recordAuditLog(
        {
          userId: actorUserId,
          module: "customers",
          action: "create",
          entityId: customer.id,
          newValue: { code: customer.code, name: customer.name, type: customer.type },
        },
        tx
      );
      return customer;
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new AppError(CustomersErrorCodes.CUSTOMER_CODE_TAKEN, "كود العميل مستخدم بالفعل", 409);
    }
    throw err;
  }
}

export async function updateCustomer(
  actorUserId: string,
  customerId: string,
  input: UpdateCustomerInput
): Promise<CustomerView> {
  await requirePermission(actorUserId, CustomersPermissions.updateCustomer);

  const existing = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!existing) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "العميل غير موجود", 404);
  }

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.update({
      where: { id: customerId },
      data: {
        name: input.name,
        type: input.type,
        isImportant: input.isImportant,
        phone: input.phone,
        whatsapp: input.whatsapp,
        email: input.email,
        address: input.address,
        city: input.city,
        country: input.country,
        taxNumber: input.taxNumber,
        commercialRegister: input.commercialRegister,
        source: input.source,
        notes: input.notes,
        responsibleUserId: input.responsibleUserId,
      },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "customers",
        action: "update",
        entityId: customerId,
        newValue: { name: customer.name, type: customer.type },
      },
      tx
    );
    return customer;
  });
}

export async function archiveCustomer(
  actorUserId: string,
  customerId: string
): Promise<CustomerView> {
  await requirePermission(actorUserId, CustomersPermissions.archiveCustomer);

  const existing = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!existing) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "العميل غير موجود", 404);
  }

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.update({
      where: { id: customerId },
      data: { status: "archived" },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "customers",
        action: "archive",
        entityId: customerId,
        oldValue: { status: existing.status },
        newValue: { status: customer.status },
      },
      tx
    );
    return customer;
  });
}
