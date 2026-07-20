import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/modules/shared/permissions";
import { recordAuditLog } from "@/modules/shared/audit";
import { AppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { nextFormattedSequence } from "@/modules/shared/services/sequenceGenerator";
import { computeLineTotal, computeDocumentTotals } from "@/modules/shared/services/documentTotals";
import { InvoicesPermissions } from "../permissions";
import { InvoicesErrorCodes } from "../errors";
import type { InvoiceView, InvoiceStatus } from "../types";
import { derivePaymentStatus, remainingAmount } from "./paymentStatus";
import type {
  CreateInvoiceInput,
  ConvertQuoteInput,
  UpdateInvoiceInput,
  AddInvoiceLineInput,
  UpdateInvoiceLineInput,
  RecordPaymentInput,
  CancelInvoiceInput,
} from "./invoicesSchemas";

/**
 * منطق عمل الفواتير والدفعات (§8 تحليل العملاء + §17 تحليل المنتجات).
 * كل قرار هنا — مش في الـ action أو الـ UI. الأخطاء AppError، العمليات متعددة
 * الخطوات داخل $transaction، وكل عملية حساسة تُسجَّل في recordAuditLog.
 *
 * التعديل (بنود/خصم/ضريبة) مسموح فقط قبل أي دفعة وقبل الإلغاء. حالة السداد
 * تُشتق آليًا من المدفوع (derivePaymentStatus). حالة overdue تُحسب عند العرض.
 */

interface EditableState {
  status: InvoiceStatus;
  paidAmount: Prisma.Decimal;
}

function assertEditable(inv: EditableState): void {
  if (inv.status === "cancelled") {
    throw new AppError(InvoicesErrorCodes.INVOICE_CANCELLED, "الفاتورة ملغاة", 409);
  }
  if (!inv.paidAmount.lessThanOrEqualTo(0)) {
    throw new AppError(
      InvoicesErrorCodes.INVOICE_NOT_EDITABLE,
      "لا يمكن تعديل فاتورة سُجِّلت عليها دفعات",
      409
    );
  }
}

/** يعيد حساب الإجماليات ويشتق حالة السداد داخل معاملة قائمة. */
async function applyTotalsTx(tx: Prisma.TransactionClient, invoiceId: string): Promise<void> {
  const inv = await tx.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    select: { discountPercent: true, taxPercent: true, paidAmount: true, status: true },
  });
  const lines = await tx.invoiceLine.findMany({
    where: { invoiceId },
    select: { quantity: true, unitPrice: true, discountPercent: true },
  });
  const totals = computeDocumentTotals({
    lines,
    discountPercent: inv.discountPercent,
    taxPercent: inv.taxPercent,
  });
  // حالة السداد تُشتق من المدفوع، إلا لو الفاتورة ملغاة فتبقى كما هي.
  const status: InvoiceStatus =
    inv.status === "cancelled"
      ? "cancelled"
      : derivePaymentStatus(totals.grandTotal, inv.paidAmount);
  await tx.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      grandTotal: totals.grandTotal,
      status,
    },
  });
}

// ===== قراءة =====

export async function listInvoices(
  actorUserId: string,
  customerId?: string
): Promise<InvoiceView[]> {
  await requirePermission(actorUserId, InvoicesPermissions.view);
  return prisma.invoice.findMany({
    where: customerId ? { customerId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getInvoiceDetail(actorUserId: string, invoiceId: string) {
  await requirePermission(actorUserId, InvoicesPermissions.view);
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      lines: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
    },
  });
  if (!invoice) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "الفاتورة غير موجودة", 404);
  }
  return invoice;
}

// ===== إنشاء =====

export async function createInvoice(
  actorUserId: string,
  input: CreateInvoiceInput
): Promise<InvoiceView> {
  await requirePermission(actorUserId, InvoicesPermissions.create);

  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
    select: { name: true },
  });
  if (!customer) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "العميل غير موجود", 404);
  }

  return prisma.$transaction(async (tx) => {
    const invoiceNumber = await nextFormattedSequence(tx, "invoice", { prefix: "INV" });
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        customerId: input.customerId,
        customerNameSnapshot: customer.name,
        dueDate: input.dueDate ?? null,
        notes: input.notes ?? null,
        terms: input.terms ?? null,
        issuedAt: new Date(),
        createdByUserId: actorUserId,
      },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "invoices",
        action: "create",
        entityId: invoice.id,
        newValue: { invoiceNumber, customerId: input.customerId },
      },
      tx
    );
    return invoice;
  });
}

/**
 * تحويل عرض مقبول لفاتورة (§17): تنتقل البنود والأسعار والتكلفة كـ snapshot،
 * ويُختم العرض بحالة converted. العرض لا بد أن يكون "مقبولًا" ولم يُحوَّل بعد.
 */
export async function createInvoiceFromQuote(
  actorUserId: string,
  quoteId: string,
  input: ConvertQuoteInput
): Promise<InvoiceView> {
  await requirePermission(actorUserId, InvoicesPermissions.create);

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lines: { orderBy: { sortOrder: "asc" } }, invoice: { select: { id: true } } },
  });
  if (!quote) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "عرض السعر غير موجود", 404);
  }
  if (quote.invoice) {
    throw new AppError(
      InvoicesErrorCodes.QUOTE_ALREADY_CONVERTED,
      "هذا العرض محوّل لفاتورة بالفعل",
      409
    );
  }
  if (quote.status !== "accepted") {
    throw new AppError(
      InvoicesErrorCodes.QUOTE_NOT_CONVERTIBLE,
      "لا يمكن تحويل العرض لفاتورة إلا بعد قبوله",
      409
    );
  }
  if (quote.lines.length === 0) {
    throw new AppError(InvoicesErrorCodes.INVOICE_EMPTY, "العرض بلا بنود", 400);
  }

  return prisma.$transaction(async (tx) => {
    const invoiceNumber = await nextFormattedSequence(tx, "invoice", { prefix: "INV" });
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        customerId: quote.customerId,
        customerNameSnapshot: quote.customerNameSnapshot,
        sourceQuoteId: quote.id,
        status: "unpaid",
        issuedAt: new Date(),
        dueDate: input.dueDate ?? null,
        discountPercent: quote.discountPercent,
        taxPercent: quote.taxPercent,
        subtotal: quote.subtotal,
        discountAmount: quote.discountAmount,
        taxAmount: quote.taxAmount,
        grandTotal: quote.grandTotal,
        notes: quote.notes,
        terms: quote.terms,
        createdByUserId: actorUserId,
        lines: {
          create: quote.lines.map((l) => ({
            productId: l.productId,
            productCodeSnapshot: l.productCodeSnapshot,
            productNameSnapshot: l.productNameSnapshot,
            productDescriptionSnapshot: l.productDescriptionSnapshot,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            unitCostSnapshot: l.unitCostSnapshot,
            discountPercent: l.discountPercent,
            lineTotal: l.lineTotal,
            sortOrder: l.sortOrder,
          })),
        },
      },
    });
    // ختم العرض بحالة محوّل (§7).
    await tx.quote.update({ where: { id: quoteId }, data: { status: "converted" } });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "invoices",
        action: "create_from_quote",
        entityId: invoice.id,
        newValue: { invoiceNumber, quoteId, quoteNumber: quote.quoteNumber },
      },
      tx
    );
    return invoice;
  });
}

// ===== البنود =====

async function loadEditableInvoice(invoiceId: string): Promise<EditableState> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { status: true, paidAmount: true },
  });
  if (!invoice) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "الفاتورة غير موجودة", 404);
  }
  assertEditable(invoice);
  return invoice;
}

export async function addInvoiceLine(
  actorUserId: string,
  invoiceId: string,
  input: AddInvoiceLineInput
): Promise<void> {
  await requirePermission(actorUserId, InvoicesPermissions.update);
  await loadEditableInvoice(invoiceId);

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
  const unitPrice = input.unitPrice ?? product.salePrice ?? undefined;
  if (unitPrice === undefined) {
    throw new AppError(
      InvoicesErrorCodes.INVOICE_NOT_EDITABLE,
      "المنتج بلا سعر بيع — حدّد سعر الوحدة يدويًا",
      400
    );
  }
  const unitCost = product.manualCost ?? product.productionCost;

  await prisma.$transaction(async (tx) => {
    const last = await tx.invoiceLine.findFirst({
      where: { invoiceId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const lineTotal = computeLineTotal({
      quantity: input.quantity,
      unitPrice,
      discountPercent: input.discountPercent,
    });
    const line = await tx.invoiceLine.create({
      data: {
        invoiceId,
        productId: product.id,
        productCodeSnapshot: product.code,
        productNameSnapshot: product.name,
        quantity: input.quantity,
        unitPrice,
        unitCostSnapshot: unitCost,
        discountPercent: input.discountPercent,
        lineTotal,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
    await applyTotalsTx(tx, invoiceId);
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "invoices",
        action: "add_line",
        entityId: invoiceId,
        newValue: { lineId: line.id, productId: product.id, lineTotal: lineTotal.toString() },
      },
      tx
    );
  });
}

export async function updateInvoiceLine(
  actorUserId: string,
  invoiceId: string,
  lineId: string,
  input: UpdateInvoiceLineInput
): Promise<void> {
  await requirePermission(actorUserId, InvoicesPermissions.update);

  const line = await prisma.invoiceLine.findUnique({
    where: { id: lineId },
    include: { invoice: { select: { status: true, paidAmount: true } } },
  });
  if (!line || line.invoiceId !== invoiceId) {
    throw new AppError(InvoicesErrorCodes.LINE_NOT_FOUND, "البند غير موجود في هذه الفاتورة", 404);
  }
  assertEditable(line.invoice);

  const quantity = input.quantity ?? line.quantity;
  const unitPrice = input.unitPrice ?? line.unitPrice;
  const discountPercent = input.discountPercent ?? line.discountPercent;
  const lineTotal = computeLineTotal({ quantity, unitPrice, discountPercent });

  await prisma.$transaction(async (tx) => {
    await tx.invoiceLine.update({
      where: { id: lineId },
      data: { quantity, unitPrice, discountPercent, lineTotal },
    });
    await applyTotalsTx(tx, invoiceId);
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "invoices",
        action: "update_line",
        entityId: invoiceId,
        newValue: { lineId, lineTotal: lineTotal.toString() },
      },
      tx
    );
  });
}

export async function removeInvoiceLine(
  actorUserId: string,
  invoiceId: string,
  lineId: string
): Promise<void> {
  await requirePermission(actorUserId, InvoicesPermissions.update);

  const line = await prisma.invoiceLine.findUnique({
    where: { id: lineId },
    include: { invoice: { select: { status: true, paidAmount: true } } },
  });
  if (!line || line.invoiceId !== invoiceId) {
    throw new AppError(InvoicesErrorCodes.LINE_NOT_FOUND, "البند غير موجود في هذه الفاتورة", 404);
  }
  assertEditable(line.invoice);

  await prisma.$transaction(async (tx) => {
    await tx.invoiceLine.delete({ where: { id: lineId } });
    await applyTotalsTx(tx, invoiceId);
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "invoices",
        action: "remove_line",
        entityId: invoiceId,
        oldValue: { lineId },
      },
      tx
    );
  });
}

// ===== تعديل الرأس =====

export async function updateInvoice(
  actorUserId: string,
  invoiceId: string,
  input: UpdateInvoiceInput
): Promise<InvoiceView> {
  await requirePermission(actorUserId, InvoicesPermissions.update);
  await loadEditableInvoice(invoiceId);

  return prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        discountPercent: input.discountPercent,
        taxPercent: input.taxPercent,
        dueDate: input.dueDate,
        notes: input.notes,
        terms: input.terms,
      },
    });
    await applyTotalsTx(tx, invoiceId);
    await recordAuditLog(
      { userId: actorUserId, module: "invoices", action: "update", entityId: invoiceId },
      tx
    );
    return tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  });
}

// ===== الدفعات =====

export async function recordPayment(
  actorUserId: string,
  invoiceId: string,
  input: RecordPaymentInput
): Promise<InvoiceView> {
  await requirePermission(actorUserId, InvoicesPermissions.recordPayment);

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { status: true, grandTotal: true, paidAmount: true },
  });
  if (!invoice) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "الفاتورة غير موجودة", 404);
  }
  if (invoice.status === "cancelled") {
    throw new AppError(InvoicesErrorCodes.INVOICE_CANCELLED, "الفاتورة ملغاة", 409);
  }
  const remaining = remainingAmount(invoice.grandTotal, invoice.paidAmount);
  if (input.amount.greaterThan(remaining)) {
    throw new AppError(
      InvoicesErrorCodes.PAYMENT_EXCEEDS_REMAINING,
      `الدفعة تتجاوز المتبقّي (${remaining.toString()})`,
      400
    );
  }

  return prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        invoiceId,
        amount: input.amount,
        method: input.method,
        paidAt: input.paidAt,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        receivedByUserId: actorUserId,
      },
    });
    const newPaid = invoice.paidAmount.plus(input.amount);
    const status = derivePaymentStatus(invoice.grandTotal, newPaid);
    const updated = await tx.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount: newPaid, status },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "invoices",
        action: "record_payment",
        entityId: invoiceId,
        newValue: { amount: input.amount.toString(), method: input.method, status },
      },
      tx
    );
    return updated;
  });
}

/**
 * حذف دفعة (صلاحية حساسة — تحليل المستخدمين "تسجيل أو حذف دفعة"). يُعاد احتساب
 * المدفوع والحالة. مسموح على غير الملغاة.
 */
export async function deletePayment(
  actorUserId: string,
  invoiceId: string,
  paymentId: string
): Promise<InvoiceView> {
  await requirePermission(actorUserId, InvoicesPermissions.deletePayment);

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      invoice: { select: { id: true, status: true, grandTotal: true, paidAmount: true } },
    },
  });
  if (!payment || payment.invoiceId !== invoiceId) {
    throw new AppError(InvoicesErrorCodes.PAYMENT_NOT_FOUND, "الدفعة غير موجودة", 404);
  }
  if (payment.invoice.status === "cancelled") {
    throw new AppError(InvoicesErrorCodes.INVOICE_CANCELLED, "الفاتورة ملغاة", 409);
  }

  return prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id: paymentId } });
    const newPaid = payment.invoice.paidAmount.minus(payment.amount);
    const clampedPaid = newPaid.greaterThan(0) ? newPaid : new Prisma.Decimal(0);
    const status = derivePaymentStatus(payment.invoice.grandTotal, clampedPaid);
    const updated = await tx.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount: clampedPaid, status },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "invoices",
        action: "delete_payment",
        entityId: invoiceId,
        oldValue: { paymentId, amount: payment.amount.toString() },
        newValue: { status },
      },
      tx
    );
    return updated;
  });
}

// ===== الإلغاء =====

export async function cancelInvoice(
  actorUserId: string,
  invoiceId: string,
  input: CancelInvoiceInput
): Promise<InvoiceView> {
  await requirePermission(actorUserId, InvoicesPermissions.cancel);

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { status: true, paidAmount: true },
  });
  if (!invoice) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "الفاتورة غير موجودة", 404);
  }
  if (invoice.status === "cancelled") {
    throw new AppError(InvoicesErrorCodes.INVOICE_CANCELLED, "الفاتورة ملغاة بالفعل", 409);
  }
  // لا يُلغى مستند به دفعات إلا بعد ردّها (منطق الرد في accounting لاحقًا).
  if (invoice.paidAmount.greaterThan(0)) {
    throw new AppError(
      InvoicesErrorCodes.CANNOT_CANCEL_WITH_PAYMENTS,
      "لا يمكن إلغاء فاتورة بها دفعات — احذف الدفعات أولًا",
      409
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: "cancelled" },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "invoices",
        action: "cancel",
        entityId: invoiceId,
        newValue: { reason: input.reason },
      },
      tx
    );
    return updated;
  });
}
