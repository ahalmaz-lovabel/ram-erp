"use server";

// نقطة الدخول الوحيدة من الواجهة لموديول quotes. كل action: يستخرج هوية المنفّذ
// من الجلسة server-side (requireCurrentUserId — مش من العميل)، يتحقق بـ Zod،
// ينادي service، ويلف كله بـ wrapAction لرد موحّد.

import { wrapAction } from "@/modules/shared/errors/handleError";
import { requireCurrentUserId } from "@/modules/shared/auth/session";
import {
  createQuote,
  updateQuote,
  addQuoteLine,
  updateQuoteLine,
  removeQuoteLine,
  sendQuote,
  reviseQuote,
  acceptQuote,
  rejectQuote,
  approveQuote,
  archiveQuote,
} from "../services/QuotesService";
import {
  createQuoteSchema,
  updateQuoteSchema,
  addQuoteLineSchema,
  updateQuoteLineSchema,
  rejectQuoteSchema,
} from "../services/quotesSchemas";

// ===== الرأس =====

export async function createQuoteAction(raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return createQuote(actorUserId, createQuoteSchema.parse(raw));
  });
}

export async function updateQuoteAction(quoteId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return updateQuote(actorUserId, quoteId, updateQuoteSchema.parse(raw));
  });
}

// ===== البنود =====

export async function addQuoteLineAction(quoteId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return addQuoteLine(actorUserId, quoteId, addQuoteLineSchema.parse(raw));
  });
}

export async function updateQuoteLineAction(quoteId: string, lineId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return updateQuoteLine(actorUserId, quoteId, lineId, updateQuoteLineSchema.parse(raw));
  });
}

export async function removeQuoteLineAction(quoteId: string, lineId: string) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return removeQuoteLine(actorUserId, quoteId, lineId);
  });
}

// ===== انتقالات الحالة =====

export async function sendQuoteAction(quoteId: string) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return sendQuote(actorUserId, quoteId);
  });
}

export async function reviseQuoteAction(quoteId: string) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return reviseQuote(actorUserId, quoteId);
  });
}

export async function acceptQuoteAction(quoteId: string) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return acceptQuote(actorUserId, quoteId);
  });
}

export async function rejectQuoteAction(quoteId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return rejectQuote(actorUserId, quoteId, rejectQuoteSchema.parse(raw));
  });
}

export async function approveQuoteAction(quoteId: string) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return approveQuote(actorUserId, quoteId);
  });
}

export async function archiveQuoteAction(quoteId: string) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return archiveQuote(actorUserId, quoteId);
  });
}
