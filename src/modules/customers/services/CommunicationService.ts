import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/modules/shared/permissions";
import { recordAuditLog } from "@/modules/shared/audit";
import { AppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { CustomersPermissions } from "../permissions";
import { CustomersErrorCodes } from "../errors";
import type { CommunicationView } from "../types";
import type { LogCommunicationInput } from "./customersSchemas";

/**
 * سجل التواصل والمتابعة داخل ملف العميل (§14): توثيق ما تم والخطوة التالية
 * وموعد المتابعة القادمة. جهة التواصل (إن حُدّدت) لازم تتبع نفس العميل.
 */

export async function logCommunication(
  actorUserId: string,
  customerId: string,
  input: LogCommunicationInput
): Promise<CommunicationView> {
  await requirePermission(actorUserId, CustomersPermissions.logCommunication);

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true },
  });
  if (!customer) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "العميل غير موجود", 404);
  }

  if (input.contactId) {
    const contact = await prisma.customerContact.findUnique({
      where: { id: input.contactId },
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

  return prisma.$transaction(async (tx) => {
    const comm = await tx.customerCommunication.create({
      data: {
        customerId,
        contactId: input.contactId ?? null,
        type: input.type,
        summary: input.summary,
        nextStep: input.nextStep ?? null,
        nextFollowUpDate: input.nextFollowUpDate ?? null,
        createdByUserId: actorUserId,
      },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "customers",
        action: "log_communication",
        entityId: customerId,
        newValue: { communicationId: comm.id, type: comm.type },
      },
      tx
    );
    return comm;
  });
}
