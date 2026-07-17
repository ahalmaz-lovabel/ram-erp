import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/modules/shared/permissions";
import { recordAuditLog } from "@/modules/shared/audit";
import { AppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { nextFormattedSequence } from "@/modules/shared/services/sequenceGenerator";
import { CustomersPermissions } from "../permissions";
import { CustomersErrorCodes } from "../errors";
import type { DealView } from "../types";
import type { CreateDealInput, UpdateDealInput, ChangeDealStatusInput } from "./customersSchemas";

/**
 * الصفقات (§6). رقم الصفقة تسلسلي آمن من التعارض عبر sequenceGenerator داخل
 * نفس المعاملة. جهة التواصل (إن حُدّدت) لازم تتبع نفس العميل.
 */

async function assertContactBelongsToCustomer(
  tx: Prisma.TransactionClient,
  contactId: string,
  customerId: string
): Promise<void> {
  const contact = await tx.customerContact.findUnique({
    where: { id: contactId },
    select: { customerId: true },
  });
  if (!contact) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "جهة التواصل غير موجودة", 404);
  }
  if (contact.customerId !== customerId) {
    throw new AppError(
      CustomersErrorCodes.CONTACT_WRONG_CUSTOMER,
      "جهة التواصل تتبع عميلًا آخر",
      400
    );
  }
}

export async function createDeal(
  actorUserId: string,
  customerId: string,
  input: CreateDealInput
): Promise<DealView> {
  await requirePermission(actorUserId, CustomersPermissions.createDeal);

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true },
  });
  if (!customer) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "العميل غير موجود", 404);
  }

  return prisma.$transaction(async (tx) => {
    if (input.contactId) {
      await assertContactBelongsToCustomer(tx, input.contactId, customerId);
    }
    const number = await nextFormattedSequence(tx, "deal", { prefix: "DEAL" });
    const deal = await tx.deal.create({
      data: {
        number,
        name: input.name,
        customerId,
        contactId: input.contactId ?? null,
        responsibleUserId: input.responsibleUserId ?? null,
        source: input.source ?? null,
        type: input.type,
        estimatedValue: input.estimatedValue ?? null,
        expectedCloseDate: input.expectedCloseDate ?? null,
      },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "customers",
        action: "create_deal",
        entityId: deal.id,
        newValue: { number: deal.number, name: deal.name, customerId },
      },
      tx
    );
    return deal;
  });
}

export async function updateDeal(
  actorUserId: string,
  dealId: string,
  input: UpdateDealInput
): Promise<DealView> {
  await requirePermission(actorUserId, CustomersPermissions.updateDeal);

  const existing = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!existing) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "الصفقة غير موجودة", 404);
  }

  return prisma.$transaction(async (tx) => {
    if (input.contactId) {
      await assertContactBelongsToCustomer(tx, input.contactId, existing.customerId);
    }
    const deal = await tx.deal.update({
      where: { id: dealId },
      data: {
        name: input.name,
        type: input.type,
        contactId: input.contactId,
        responsibleUserId: input.responsibleUserId,
        source: input.source,
        estimatedValue: input.estimatedValue,
        expectedCloseDate: input.expectedCloseDate,
        notes: input.notes,
      },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "customers",
        action: "update_deal",
        entityId: dealId,
        newValue: { name: deal.name },
      },
      tx
    );
    return deal;
  });
}

export async function changeDealStatus(
  actorUserId: string,
  dealId: string,
  input: ChangeDealStatusInput
): Promise<DealView> {
  await requirePermission(actorUserId, CustomersPermissions.changeDealStatus);

  const existing = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!existing) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "الصفقة غير موجودة", 404);
  }

  return prisma.$transaction(async (tx) => {
    const deal = await tx.deal.update({
      where: { id: dealId },
      data: { status: input.status },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "customers",
        action: "change_deal_status",
        entityId: dealId,
        oldValue: { status: existing.status },
        newValue: { status: deal.status, reason: input.reason ?? null },
      },
      tx
    );
    return deal;
  });
}
