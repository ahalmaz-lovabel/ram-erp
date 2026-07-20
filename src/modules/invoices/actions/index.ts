"use server";

// نقطة الدخول الوحيدة من الواجهة لموديول invoices. كل action: يستخرج هوية
// المنفّذ من الجلسة server-side (requireCurrentUserId)، يتحقق بـ Zod، ينادي
// service، ويلف كله بـ wrapAction لرد موحّد.

import { wrapAction } from "@/modules/shared/errors/handleError";
import { requireCurrentUserId } from "@/modules/shared/auth/session";
import {
  createInvoice,
  createInvoiceFromQuote,
  updateInvoice,
  addInvoiceLine,
  updateInvoiceLine,
  removeInvoiceLine,
  recordPayment,
  deletePayment,
  cancelInvoice,
} from "../services/InvoicesService";
import {
  createInvoiceSchema,
  convertQuoteSchema,
  updateInvoiceSchema,
  addInvoiceLineSchema,
  updateInvoiceLineSchema,
  recordPaymentSchema,
  cancelInvoiceSchema,
} from "../services/invoicesSchemas";

// ===== الفاتورة =====

export async function createInvoiceAction(raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return createInvoice(actorUserId, createInvoiceSchema.parse(raw));
  });
}

export async function convertQuoteToInvoiceAction(quoteId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return createInvoiceFromQuote(actorUserId, quoteId, convertQuoteSchema.parse(raw));
  });
}

export async function updateInvoiceAction(invoiceId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return updateInvoice(actorUserId, invoiceId, updateInvoiceSchema.parse(raw));
  });
}

// ===== البنود =====

export async function addInvoiceLineAction(invoiceId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return addInvoiceLine(actorUserId, invoiceId, addInvoiceLineSchema.parse(raw));
  });
}

export async function updateInvoiceLineAction(invoiceId: string, lineId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return updateInvoiceLine(actorUserId, invoiceId, lineId, updateInvoiceLineSchema.parse(raw));
  });
}

export async function removeInvoiceLineAction(invoiceId: string, lineId: string) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return removeInvoiceLine(actorUserId, invoiceId, lineId);
  });
}

// ===== الدفعات =====

export async function recordPaymentAction(invoiceId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return recordPayment(actorUserId, invoiceId, recordPaymentSchema.parse(raw));
  });
}

export async function deletePaymentAction(invoiceId: string, paymentId: string) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return deletePayment(actorUserId, invoiceId, paymentId);
  });
}

// ===== الإلغاء =====

export async function cancelInvoiceAction(invoiceId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return cancelInvoice(actorUserId, invoiceId, cancelInvoiceSchema.parse(raw));
  });
}
