"use server";

// نقطة الدخول من الواجهة لموديول customers. الهوية من الجلسة server-side.

import { wrapAction } from "@/modules/shared/errors/handleError";
import { requireCurrentUserId } from "@/modules/shared/auth/session";
import { createCustomer, updateCustomer, archiveCustomer } from "../services/CustomersService";
import { addContact, updateContact, removeContact } from "../services/ContactService";
import { createDeal, updateDeal, changeDealStatus } from "../services/DealService";
import {
  createCustomerSchema,
  updateCustomerSchema,
  addContactSchema,
  updateContactSchema,
  createDealSchema,
  updateDealSchema,
  changeDealStatusSchema,
} from "../services/customersSchemas";

// ===== العملاء =====

export async function createCustomerAction(raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return createCustomer(actorUserId, createCustomerSchema.parse(raw));
  });
}

export async function updateCustomerAction(customerId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return updateCustomer(actorUserId, customerId, updateCustomerSchema.parse(raw));
  });
}

export async function archiveCustomerAction(customerId: string) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return archiveCustomer(actorUserId, customerId);
  });
}

// ===== جهات التواصل =====

export async function addContactAction(customerId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return addContact(actorUserId, customerId, addContactSchema.parse(raw));
  });
}

export async function updateContactAction(contactId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return updateContact(actorUserId, contactId, updateContactSchema.parse(raw));
  });
}

export async function removeContactAction(contactId: string) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    await removeContact(actorUserId, contactId);
    return { success: true };
  });
}

// ===== الصفقات =====

export async function createDealAction(customerId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return createDeal(actorUserId, customerId, createDealSchema.parse(raw));
  });
}

export async function updateDealAction(dealId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return updateDeal(actorUserId, dealId, updateDealSchema.parse(raw));
  });
}

export async function changeDealStatusAction(dealId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return changeDealStatus(actorUserId, dealId, changeDealStatusSchema.parse(raw));
  });
}
