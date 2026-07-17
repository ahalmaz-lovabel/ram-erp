import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/modules/shared/permissions";
import { recordAuditLog } from "@/modules/shared/audit";
import { AppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { CustomersPermissions } from "../permissions";
import type { ContactView } from "../types";
import type { AddContactInput, UpdateContactInput } from "./customersSchemas";

/**
 * جهات التواصل داخل العميل (§5). العميل قد يكون مؤسسة بأكثر من جهة، وجهة
 * واحدة فقط تكون "أساسية" في كل وقت.
 */

export async function addContact(
  actorUserId: string,
  customerId: string,
  input: AddContactInput
): Promise<ContactView> {
  await requirePermission(actorUserId, CustomersPermissions.manageContacts);

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true },
  });
  if (!customer) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "العميل غير موجود", 404);
  }

  return prisma.$transaction(async (tx) => {
    if (input.isPrimary) {
      await tx.customerContact.updateMany({
        where: { customerId, isPrimary: true },
        data: { isPrimary: false },
      });
    }
    const contact = await tx.customerContact.create({
      data: {
        customerId,
        name: input.name,
        jobTitle: input.jobTitle ?? null,
        phone: input.phone ?? null,
        whatsapp: input.whatsapp ?? null,
        email: input.email ?? null,
        isPrimary: input.isPrimary,
        department: input.department ?? null,
        notes: input.notes ?? null,
      },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "customers",
        action: "add_contact",
        entityId: customerId,
        newValue: { contactId: contact.id, name: contact.name },
      },
      tx
    );
    return contact;
  });
}

export async function updateContact(
  actorUserId: string,
  contactId: string,
  input: UpdateContactInput
): Promise<ContactView> {
  await requirePermission(actorUserId, CustomersPermissions.manageContacts);

  const existing = await prisma.customerContact.findUnique({
    where: { id: contactId },
    select: { id: true, customerId: true },
  });
  if (!existing) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "جهة التواصل غير موجودة", 404);
  }

  return prisma.$transaction(async (tx) => {
    // ضبط الجهة الأساسية: عند تعيينها أساسية، أزِل الصفة عن الباقين.
    if (input.isPrimary === true) {
      await tx.customerContact.updateMany({
        where: { customerId: existing.customerId, isPrimary: true, id: { not: contactId } },
        data: { isPrimary: false },
      });
    }
    const contact = await tx.customerContact.update({
      where: { id: contactId },
      data: {
        name: input.name,
        jobTitle: input.jobTitle,
        phone: input.phone,
        whatsapp: input.whatsapp,
        email: input.email,
        isPrimary: input.isPrimary,
        department: input.department,
        notes: input.notes,
      },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "customers",
        action: "update_contact",
        entityId: existing.customerId,
        newValue: { contactId, name: contact.name },
      },
      tx
    );
    return contact;
  });
}

export async function removeContact(actorUserId: string, contactId: string): Promise<void> {
  await requirePermission(actorUserId, CustomersPermissions.manageContacts);

  const existing = await prisma.customerContact.findUnique({
    where: { id: contactId },
    select: { id: true, customerId: true },
  });
  if (!existing) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "جهة التواصل غير موجودة", 404);
  }

  await prisma.$transaction(async (tx) => {
    // فكّ ارتباط الصفقات بهذه الجهة قبل الحذف (لا نحذف الصفقات).
    await tx.deal.updateMany({
      where: { contactId },
      data: { contactId: null },
    });
    await tx.customerContact.delete({ where: { id: contactId } });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "customers",
        action: "remove_contact",
        entityId: existing.customerId,
        oldValue: { contactId },
      },
      tx
    );
  });
}
