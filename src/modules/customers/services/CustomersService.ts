import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/modules/shared/permissions";
import { recordAuditLog } from "@/modules/shared/audit";
import { AppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { isUniqueConstraintError } from "@/modules/shared/errors/prismaErrors";
import { CustomersPermissions } from "../permissions";
import { CustomersErrorCodes } from "../errors";
import type { CustomerView, CustomerStatus, CustomerType } from "../types";
import type { CreateCustomerInput, UpdateCustomerInput } from "./customersSchemas";

/** عنصر في قائمة العملاء (مع جهة التواصل الأساسية وعدّادات التواصل والصفقات). */
export type CustomerListItem = CustomerView & {
  contactsCount: number;
  dealsCount: number;
  primaryContactName: string | null;
};

/**
 * قائمة العملاء مع بحث وفلترة (§2). فحص صلاحية العرض server-side.
 */
export async function listCustomers(
  actorUserId: string,
  filters: { search?: string; status?: CustomerStatus; type?: CustomerType } = {}
): Promise<CustomerListItem[]> {
  await requirePermission(actorUserId, CustomersPermissions.viewCustomers);

  const where: Prisma.CustomerWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.type) where.type = filters.type;
  if (filters.search) {
    const s = filters.search.trim();
    where.OR = [
      { name: { contains: s, mode: "insensitive" } },
      { code: { contains: s, mode: "insensitive" } },
      { phone: { contains: s } },
      { whatsapp: { contains: s } },
      { email: { contains: s, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      _count: { select: { contacts: true, deals: true } },
      // جهة التواصل الأساسية للعرض في الجدول (§2).
      contacts: { where: { isPrimary: true }, take: 1, select: { name: true } },
    },
  });

  return rows.map(({ _count, contacts, ...r }) => ({
    ...r,
    contactsCount: _count.contacts,
    dealsCount: _count.deals,
    primaryContactName: contacts[0]?.name ?? null,
  }));
}

/** ملف العميل الكامل: بياناته + جهات التواصل + الصفقات (§3). */
export async function getCustomerProfile(actorUserId: string, customerId: string) {
  await requirePermission(actorUserId, CustomersPermissions.viewCustomers);
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      deals: { orderBy: { createdAt: "desc" } },
      communications: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!customer) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "العميل غير موجود", 404);
  }
  return customer;
}

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
