import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/modules/shared/permissions";
import { recordAuditLog } from "@/modules/shared/audit";
import { AppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { nextFormattedSequence } from "@/modules/shared/services/sequenceGenerator";
import { QuotesPermissions } from "../permissions";
import { QuotesErrorCodes } from "../errors";
import type { QuoteView, QuoteStatus } from "../types";
import { computeLineTotal, computeQuoteTotals } from "./quoteTotals";
import type {
  CreateQuoteInput,
  UpdateQuoteInput,
  AddQuoteLineInput,
  UpdateQuoteLineInput,
  RejectQuoteInput,
} from "./quotesSchemas";

/**
 * منطق عمل عروض الأسعار (§7 تحليل العملاء + §16 تحليل المنتجات).
 * كل قرار هنا — مش في الـ action أو الـ UI. الأخطاء AppError، والعمليات متعددة
 * الخطوات داخل $transaction، وكل عملية حساسة تُسجَّل في recordAuditLog.
 *
 * دورة الحياة: draft → sent → (accepted | rejected | expired) ؛ sent → underRevision
 * → sent ؛ أي حالة (عدا converted) → archived. التعديل مسموح فقط في draft/underRevision.
 * الاعتماد (approve) يختم العرض بالمعتمِد دون تغيير حالة سير العمل.
 */

const EDITABLE: QuoteStatus[] = ["draft", "underRevision"];

function assertEditable(status: QuoteStatus): void {
  if (!EDITABLE.includes(status)) {
    throw new AppError(
      QuotesErrorCodes.QUOTE_NOT_EDITABLE,
      "لا يمكن تعديل العرض في حالته الحالية — أعِده لحالة التعديل أولًا",
      409
    );
  }
}

/** يعيد حساب إجماليات العرض من بنوده وخصمه وضريبته داخل معاملة قائمة. */
async function recomputeTotalsTx(tx: Prisma.TransactionClient, quoteId: string): Promise<void> {
  const quote = await tx.quote.findUniqueOrThrow({
    where: { id: quoteId },
    select: { discountPercent: true, taxPercent: true },
  });
  const lines = await tx.quoteLine.findMany({
    where: { quoteId },
    select: { quantity: true, unitPrice: true, discountPercent: true },
  });
  const totals = computeQuoteTotals({
    lines,
    discountPercent: quote.discountPercent,
    taxPercent: quote.taxPercent,
  });
  await tx.quote.update({
    where: { id: quoteId },
    data: {
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      grandTotal: totals.grandTotal,
    },
  });
}

// ===== قراءة =====

export async function listQuotes(actorUserId: string, customerId?: string): Promise<QuoteView[]> {
  await requirePermission(actorUserId, QuotesPermissions.view);
  return prisma.quote.findMany({
    where: customerId ? { customerId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getQuoteDetail(actorUserId: string, quoteId: string) {
  await requirePermission(actorUserId, QuotesPermissions.view);
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });
  if (!quote) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "عرض السعر غير موجود", 404);
  }
  return quote;
}

// ===== إنشاء =====

export async function createQuote(
  actorUserId: string,
  input: CreateQuoteInput
): Promise<QuoteView> {
  await requirePermission(actorUserId, QuotesPermissions.create);

  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
    select: { id: true, name: true },
  });
  if (!customer) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "العميل غير موجود", 404);
  }

  // لو العرض من صفقة، لازم تتبع نفس العميل (§7).
  if (input.dealId) {
    const deal = await prisma.deal.findUnique({
      where: { id: input.dealId },
      select: { customerId: true },
    });
    if (!deal) {
      throw new AppError(CommonErrorCodes.NOT_FOUND, "الصفقة غير موجودة", 404);
    }
    if (deal.customerId !== input.customerId) {
      throw new AppError(
        QuotesErrorCodes.DEAL_WRONG_CUSTOMER,
        "الصفقة المحددة لا تتبع هذا العميل",
        400
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const quoteNumber = await nextFormattedSequence(tx, "quote", { prefix: "QUOTE" });
    const quote = await tx.quote.create({
      data: {
        quoteNumber,
        customerId: input.customerId,
        customerNameSnapshot: customer.name,
        dealId: input.dealId ?? null,
        validUntil: input.validUntil ?? null,
        notes: input.notes ?? null,
        terms: input.terms ?? null,
        createdByUserId: actorUserId,
      },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "quotes",
        action: "create",
        entityId: quote.id,
        newValue: { quoteNumber, customerId: input.customerId },
      },
      tx
    );
    return quote;
  });
}

// ===== البنود =====

export async function addQuoteLine(
  actorUserId: string,
  quoteId: string,
  input: AddQuoteLineInput
): Promise<void> {
  await requirePermission(actorUserId, QuotesPermissions.update);

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { status: true },
  });
  if (!quote) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "عرض السعر غير موجود", 404);
  }
  assertEditable(quote.status);

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: {
      id: true,
      code: true,
      name: true,
      salePrice: true,
      manualCost: true,
      productionCost: true,
    },
  });
  if (!product) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "المنتج غير موجود", 404);
  }

  // سعر الوحدة: المُدخل، وإلا سعر بيع المنتج. لا بد من سعر ما (§16).
  const unitPrice = input.unitPrice ?? product.salePrice ?? undefined;
  if (unitPrice === undefined) {
    throw new AppError(
      QuotesErrorCodes.QUOTE_NOT_EDITABLE,
      "المنتج بلا سعر بيع — حدّد سعر الوحدة يدويًا",
      400
    );
  }
  // تكلفة الوحدة snapshot: التكلفة اليدوية إن وُجدت وإلا تكلفة الإنتاج (§16).
  const unitCost = product.manualCost ?? product.productionCost;

  await prisma.$transaction(async (tx) => {
    const last = await tx.quoteLine.findFirst({
      where: { quoteId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const lineTotal = computeLineTotal({
      quantity: input.quantity,
      unitPrice,
      discountPercent: input.discountPercent,
    });
    const line = await tx.quoteLine.create({
      data: {
        quoteId,
        productId: product.id,
        productCodeSnapshot: product.code,
        productNameSnapshot: product.name,
        // افتراض موثّق: المنتج لا يملك حقول وصف/سمات مختارة/ضمان بعد، لذا تُترك
        // null حتى تُضاف تلك الحقول لموديول المنتجات (README §افتراضات).
        quantity: input.quantity,
        unitPrice,
        unitCostSnapshot: unitCost,
        discountPercent: input.discountPercent,
        lineTotal,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
    await recomputeTotalsTx(tx, quoteId);
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "quotes",
        action: "add_line",
        entityId: quoteId,
        newValue: { lineId: line.id, productId: product.id, lineTotal: lineTotal.toString() },
      },
      tx
    );
  });
}

export async function updateQuoteLine(
  actorUserId: string,
  quoteId: string,
  lineId: string,
  input: UpdateQuoteLineInput
): Promise<void> {
  await requirePermission(actorUserId, QuotesPermissions.update);

  const line = await prisma.quoteLine.findUnique({
    where: { id: lineId },
    include: { quote: { select: { status: true } } },
  });
  if (!line || line.quoteId !== quoteId) {
    throw new AppError(QuotesErrorCodes.LINE_NOT_FOUND, "البند غير موجود في هذا العرض", 404);
  }
  assertEditable(line.quote.status);

  const quantity = input.quantity ?? line.quantity;
  const unitPrice = input.unitPrice ?? line.unitPrice;
  const discountPercent = input.discountPercent ?? line.discountPercent;
  const lineTotal = computeLineTotal({ quantity, unitPrice, discountPercent });

  await prisma.$transaction(async (tx) => {
    await tx.quoteLine.update({
      where: { id: lineId },
      data: { quantity, unitPrice, discountPercent, lineTotal },
    });
    await recomputeTotalsTx(tx, quoteId);
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "quotes",
        action: "update_line",
        entityId: quoteId,
        newValue: { lineId, lineTotal: lineTotal.toString() },
      },
      tx
    );
  });
}

export async function removeQuoteLine(
  actorUserId: string,
  quoteId: string,
  lineId: string
): Promise<void> {
  await requirePermission(actorUserId, QuotesPermissions.update);

  const line = await prisma.quoteLine.findUnique({
    where: { id: lineId },
    include: { quote: { select: { status: true } } },
  });
  if (!line || line.quoteId !== quoteId) {
    throw new AppError(QuotesErrorCodes.LINE_NOT_FOUND, "البند غير موجود في هذا العرض", 404);
  }
  assertEditable(line.quote.status);

  await prisma.$transaction(async (tx) => {
    await tx.quoteLine.delete({ where: { id: lineId } });
    await recomputeTotalsTx(tx, quoteId);
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "quotes",
        action: "remove_line",
        entityId: quoteId,
        oldValue: { lineId },
      },
      tx
    );
  });
}

// ===== تعديل الرأس =====

export async function updateQuote(
  actorUserId: string,
  quoteId: string,
  input: UpdateQuoteInput
): Promise<QuoteView> {
  await requirePermission(actorUserId, QuotesPermissions.update);

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { status: true },
  });
  if (!quote) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "عرض السعر غير موجود", 404);
  }
  assertEditable(quote.status);

  return prisma.$transaction(async (tx) => {
    await tx.quote.update({
      where: { id: quoteId },
      data: {
        discountPercent: input.discountPercent,
        taxPercent: input.taxPercent,
        validUntil: input.validUntil,
        notes: input.notes,
        terms: input.terms,
      },
    });
    await recomputeTotalsTx(tx, quoteId);
    await recordAuditLog(
      { userId: actorUserId, module: "quotes", action: "update", entityId: quoteId },
      tx
    );
    return tx.quote.findUniqueOrThrow({ where: { id: quoteId } });
  });
}

// ===== انتقالات الحالة =====

/** يبدّل حالة العرض بعد التحقق من صحة الانتقال، ويسجّل العملية. */
async function transition(
  actorUserId: string,
  quoteId: string,
  permission: string,
  from: QuoteStatus[],
  to: QuoteStatus,
  action: string,
  extra?: Prisma.QuoteUpdateInput,
  before?: () => Promise<void> | void
): Promise<QuoteView> {
  await requirePermission(actorUserId, permission);
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, select: { status: true } });
  if (!quote) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "عرض السعر غير موجود", 404);
  }
  if (!from.includes(quote.status)) {
    throw new AppError(
      QuotesErrorCodes.INVALID_STATUS_TRANSITION,
      "لا يمكن تنفيذ هذا الإجراء على العرض في حالته الحالية",
      409
    );
  }
  await before?.();

  return prisma.$transaction(async (tx) => {
    const updated = await tx.quote.update({
      where: { id: quoteId },
      data: { status: to, ...extra },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "quotes",
        action,
        entityId: quoteId,
        oldValue: { status: quote.status },
        newValue: { status: to },
      },
      tx
    );
    return updated;
  });
}

/** إرسال العرض: يجمّد الـ snapshot ويسجّل وقت الإصدار (§7). */
export async function sendQuote(actorUserId: string, quoteId: string): Promise<QuoteView> {
  return transition(
    actorUserId,
    quoteId,
    QuotesPermissions.send,
    ["draft", "underRevision"],
    "sent",
    "send",
    { issuedAt: new Date() },
    async () => {
      const count = await prisma.quoteLine.count({ where: { quoteId } });
      if (count === 0) {
        throw new AppError(QuotesErrorCodes.QUOTE_EMPTY, "لا يمكن إرسال عرض بلا بنود", 400);
      }
    }
  );
}

/** إعادة العرض المُرسل لحالة التعديل (§7: تحت التعديل). */
export async function reviseQuote(actorUserId: string, quoteId: string): Promise<QuoteView> {
  return transition(
    actorUserId,
    quoteId,
    QuotesPermissions.update,
    ["sent"],
    "underRevision",
    "revise"
  );
}

export async function acceptQuote(actorUserId: string, quoteId: string): Promise<QuoteView> {
  return transition(
    actorUserId,
    quoteId,
    QuotesPermissions.respond,
    ["sent"],
    "accepted",
    "accept"
  );
}

export async function rejectQuote(
  actorUserId: string,
  quoteId: string,
  input: RejectQuoteInput
): Promise<QuoteView> {
  return transition(
    actorUserId,
    quoteId,
    QuotesPermissions.respond,
    ["sent"],
    "rejected",
    "reject",
    input.reason ? { notes: input.reason } : undefined
  );
}

/** أرشفة العرض (بدل الحذف — CLAUDE #16). */
export async function archiveQuote(actorUserId: string, quoteId: string): Promise<QuoteView> {
  return transition(
    actorUserId,
    quoteId,
    QuotesPermissions.archive,
    ["draft", "underRevision", "sent", "accepted", "rejected", "expired"],
    "archived",
    "archive"
  );
}

/**
 * اعتماد العرض (تحليل المستخدمين: اعتماد عرض سعر). يختم العرض بالمعتمِد ووقته
 * دون تغيير حالة سير العمل. مسموح على المسودة/تحت التعديل/المُرسل فقط.
 */
export async function approveQuote(actorUserId: string, quoteId: string): Promise<QuoteView> {
  await requirePermission(actorUserId, QuotesPermissions.approve);
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, select: { status: true } });
  if (!quote) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "عرض السعر غير موجود", 404);
  }
  const approvable: QuoteStatus[] = ["draft", "underRevision", "sent"];
  if (!approvable.includes(quote.status)) {
    throw new AppError(
      QuotesErrorCodes.INVALID_STATUS_TRANSITION,
      "لا يمكن اعتماد العرض في حالته الحالية",
      409
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.quote.update({
      where: { id: quoteId },
      data: { approvedByUserId: actorUserId, approvedAt: new Date() },
    });
    await recordAuditLog(
      { userId: actorUserId, module: "quotes", action: "approve", entityId: quoteId },
      tx
    );
    return updated;
  });
}
