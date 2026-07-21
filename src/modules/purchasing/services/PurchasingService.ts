import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/modules/shared/permissions";
import { recordAuditLog } from "@/modules/shared/audit";
import { AppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { isUniqueConstraintError } from "@/modules/shared/errors/prismaErrors";
import { nextFormattedSequence } from "@/modules/shared/services/sequenceGenerator";
import { computeDocumentTotals } from "@/modules/shared/services/documentTotals";
import { PurchasingPermissions } from "../permissions";
import { PurchasingErrorCodes } from "../errors";
import {
  remainingAmount,
  assertCanEditOrder,
  assertCanSend,
  assertCanReceive,
  assertCanCancel,
  assertCanPay,
  assertPaymentWithinRemaining,
  assertCanDeletePayment,
} from "./poRules";
import type { SupplierView, SupplierStatus, PurchaseOrderLineView } from "../types";
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  AddOrderLineInput,
  UpdateOrderLineInput,
  RecordSupplierPaymentInput,
  CancelOrderInput,
} from "./purchasingSchemas";

/**
 * منطق عمل المشتريات والموردين (§7 ترتيب البناء — لا يوجد تحليل معتمد؛
 * النموذج بالكامل افتراضات موثّقة في README بموافقة صريحة).
 *
 * دورة أمر الشراء: draft (قابل للتعديل) → sent (مُرسل للمورد) → received
 * (تم الاستلام). الإلغاء من draft/sent فقط وقبل تسجيل أي دفعة. التعديل
 * (بنود/خصم/ضريبة) مسموح فقط في حالة draft. مدفوعات المورد مسموحة بعد
 * الإرسال (sent/received) وبحدود المتبقّي. كل عملية حساسة تُسجَّل في Audit.
 */

// ===== أدوات داخلية =====

/** يعيد حساب إجماليات أمر الشراء من بنوده داخل معاملة قائمة. */
async function applyOrderTotalsTx(
  tx: Prisma.TransactionClient,
  purchaseOrderId: string
): Promise<void> {
  const order = await tx.purchaseOrder.findUniqueOrThrow({
    where: { id: purchaseOrderId },
    select: { discountPercent: true, taxPercent: true },
  });
  const lines = await tx.purchaseOrderLine.findMany({
    where: { purchaseOrderId },
    select: { quantity: true, unitPrice: true },
  });
  // بنود الشراء بلا خصم على مستوى البند (الخصم على مستوى الأمر فقط).
  const totals = computeDocumentTotals({
    lines: lines.map((l) => ({
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPercent: new Prisma.Decimal(0),
    })),
    discountPercent: order.discountPercent,
    taxPercent: order.taxPercent,
  });
  await tx.purchaseOrder.update({
    where: { id: purchaseOrderId },
    data: {
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      grandTotal: totals.grandTotal,
    },
  });
}

async function loadEditableOrder(purchaseOrderId: string): Promise<void> {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    select: { status: true },
  });
  if (!order) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "أمر الشراء غير موجود", 404);
  }
  assertCanEditOrder(order.status);
}

// ===== الموردون =====

export type SupplierListItem = SupplierView & { ordersCount: number };

export async function listSuppliers(
  actorUserId: string,
  filters: { search?: string; status?: SupplierStatus } = {}
): Promise<SupplierListItem[]> {
  await requirePermission(actorUserId, PurchasingPermissions.viewSuppliers);

  const where: Prisma.SupplierWhereInput = {};
  if (filters.status) where.status = filters.status;
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

  const rows = await prisma.supplier.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { _count: { select: { purchaseOrders: true } } },
  });
  return rows.map((r) => ({ ...r, ordersCount: r._count.purchaseOrders }));
}

export async function getSupplierProfile(actorUserId: string, supplierId: string) {
  await requirePermission(actorUserId, PurchasingPermissions.viewSuppliers);
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      purchaseOrders: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });
  if (!supplier) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "المورد غير موجود", 404);
  }
  return supplier;
}

export async function createSupplier(
  actorUserId: string,
  input: CreateSupplierInput
): Promise<SupplierView> {
  await requirePermission(actorUserId, PurchasingPermissions.createSupplier);

  try {
    return await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.create({
        data: {
          code: input.code,
          name: input.name,
          phone: input.phone ?? null,
          whatsapp: input.whatsapp ?? null,
          email: input.email ?? null,
          address: input.address ?? null,
          contactPerson: input.contactPerson ?? null,
          taxNumber: input.taxNumber ?? null,
          notes: input.notes ?? null,
        },
      });
      await recordAuditLog(
        {
          userId: actorUserId,
          module: "purchasing",
          action: "create_supplier",
          entityId: supplier.id,
          newValue: { code: supplier.code, name: supplier.name },
        },
        tx
      );
      return supplier;
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new AppError(PurchasingErrorCodes.SUPPLIER_CODE_TAKEN, "كود المورد مستخدم بالفعل", 409);
    }
    throw err;
  }
}

export async function updateSupplier(
  actorUserId: string,
  supplierId: string,
  input: UpdateSupplierInput
): Promise<SupplierView> {
  await requirePermission(actorUserId, PurchasingPermissions.updateSupplier);

  const existing = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!existing) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "المورد غير موجود", 404);
  }

  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.update({
      where: { id: supplierId },
      data: {
        name: input.name,
        phone: input.phone,
        whatsapp: input.whatsapp,
        email: input.email,
        address: input.address,
        contactPerson: input.contactPerson,
        taxNumber: input.taxNumber,
        notes: input.notes,
      },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "purchasing",
        action: "update_supplier",
        entityId: supplierId,
      },
      tx
    );
    return supplier;
  });
}

/** أرشفة مورد (حذف ممنوع — CLAUDE #16). */
export async function archiveSupplier(
  actorUserId: string,
  supplierId: string
): Promise<SupplierView> {
  await requirePermission(actorUserId, PurchasingPermissions.archiveSupplier);

  const existing = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { status: true },
  });
  if (!existing) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "المورد غير موجود", 404);
  }
  if (existing.status === "archived") {
    throw new AppError(CommonErrorCodes.ALREADY_ARCHIVED, "المورد مؤرشف بالفعل", 409);
  }

  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.update({
      where: { id: supplierId },
      data: { status: "archived" },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "purchasing",
        action: "archive_supplier",
        entityId: supplierId,
      },
      tx
    );
    return supplier;
  });
}

// ===== أوامر الشراء: قراءة =====

export async function listPurchaseOrders(actorUserId: string, supplierId?: string) {
  await requirePermission(actorUserId, PurchasingPermissions.viewOrders);
  return prisma.purchaseOrder.findMany({
    where: supplierId ? { supplierId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getPurchaseOrderDetail(actorUserId: string, purchaseOrderId: string) {
  await requirePermission(actorUserId, PurchasingPermissions.viewOrders);
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    include: {
      supplier: { select: { id: true, code: true, name: true } },
      lines: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
    },
  });
  if (!order) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "أمر الشراء غير موجود", 404);
  }
  return order;
}

// ===== أوامر الشراء: إنشاء =====

export async function createPurchaseOrder(actorUserId: string, input: CreatePurchaseOrderInput) {
  await requirePermission(actorUserId, PurchasingPermissions.createOrder);

  const supplier = await prisma.supplier.findUnique({
    where: { id: input.supplierId },
    select: { name: true, status: true },
  });
  if (!supplier) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "المورد غير موجود", 404);
  }
  if (supplier.status === "archived") {
    throw new AppError(
      PurchasingErrorCodes.INVALID_STATUS_TRANSITION,
      "لا يمكن إنشاء أمر شراء لمورد مؤرشف",
      409
    );
  }

  return prisma.$transaction(async (tx) => {
    const poNumber = await nextFormattedSequence(tx, "purchaseOrder", { prefix: "PO" });
    const order = await tx.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: input.supplierId,
        supplierNameSnapshot: supplier.name,
        expectedDate: input.expectedDate ?? null,
        notes: input.notes ?? null,
        terms: input.terms ?? null,
        orderDate: new Date(),
        createdByUserId: actorUserId,
      },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "purchasing",
        action: "create_order",
        entityId: order.id,
        newValue: { poNumber, supplierId: input.supplierId },
      },
      tx
    );
    return order;
  });
}

// ===== البنود =====

export async function addOrderLine(
  actorUserId: string,
  purchaseOrderId: string,
  input: AddOrderLineInput
): Promise<PurchaseOrderLineView> {
  await requirePermission(actorUserId, PurchasingPermissions.updateOrder);
  await loadEditableOrder(purchaseOrderId);

  const material = await prisma.material.findUnique({
    where: { id: input.materialId },
    select: { id: true, code: true, name: true, purchaseUnit: true, purchaseUnitPrice: true },
  });
  if (!material) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "الخامة غير موجودة", 404);
  }
  const unit = input.unit ?? material.purchaseUnit;
  const unitPrice = input.unitPrice ?? material.purchaseUnitPrice;
  const lineTotal = input.quantity.times(unitPrice);

  return prisma.$transaction(async (tx) => {
    const last = await tx.purchaseOrderLine.findFirst({
      where: { purchaseOrderId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const line = await tx.purchaseOrderLine.create({
      data: {
        purchaseOrderId,
        materialId: material.id,
        materialCodeSnapshot: material.code,
        materialNameSnapshot: material.name,
        quantity: input.quantity,
        unit,
        unitPrice,
        lineTotal,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
    await applyOrderTotalsTx(tx, purchaseOrderId);
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "purchasing",
        action: "add_line",
        entityId: purchaseOrderId,
        newValue: { lineId: line.id, materialId: material.id, lineTotal: lineTotal.toString() },
      },
      tx
    );
    return line;
  });
}

export async function updateOrderLine(
  actorUserId: string,
  purchaseOrderId: string,
  lineId: string,
  input: UpdateOrderLineInput
): Promise<void> {
  await requirePermission(actorUserId, PurchasingPermissions.updateOrder);

  const line = await prisma.purchaseOrderLine.findUnique({
    where: { id: lineId },
    include: { purchaseOrder: { select: { status: true } } },
  });
  if (!line || line.purchaseOrderId !== purchaseOrderId) {
    throw new AppError(PurchasingErrorCodes.LINE_NOT_FOUND, "البند غير موجود في هذا الأمر", 404);
  }
  assertCanEditOrder(line.purchaseOrder.status);

  const quantity = input.quantity ?? line.quantity;
  const unitPrice = input.unitPrice ?? line.unitPrice;
  const unit = input.unit ?? line.unit;
  const lineTotal = quantity.times(unitPrice);

  await prisma.$transaction(async (tx) => {
    await tx.purchaseOrderLine.update({
      where: { id: lineId },
      data: { quantity, unitPrice, unit, lineTotal },
    });
    await applyOrderTotalsTx(tx, purchaseOrderId);
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "purchasing",
        action: "update_line",
        entityId: purchaseOrderId,
        newValue: { lineId, lineTotal: lineTotal.toString() },
      },
      tx
    );
  });
}

export async function removeOrderLine(
  actorUserId: string,
  purchaseOrderId: string,
  lineId: string
): Promise<void> {
  await requirePermission(actorUserId, PurchasingPermissions.updateOrder);

  const line = await prisma.purchaseOrderLine.findUnique({
    where: { id: lineId },
    include: { purchaseOrder: { select: { status: true } } },
  });
  if (!line || line.purchaseOrderId !== purchaseOrderId) {
    throw new AppError(PurchasingErrorCodes.LINE_NOT_FOUND, "البند غير موجود في هذا الأمر", 404);
  }
  assertCanEditOrder(line.purchaseOrder.status);

  await prisma.$transaction(async (tx) => {
    await tx.purchaseOrderLine.delete({ where: { id: lineId } });
    await applyOrderTotalsTx(tx, purchaseOrderId);
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "purchasing",
        action: "remove_line",
        entityId: purchaseOrderId,
        oldValue: { lineId },
      },
      tx
    );
  });
}

// ===== تعديل الرأس =====

export async function updatePurchaseOrder(
  actorUserId: string,
  purchaseOrderId: string,
  input: UpdatePurchaseOrderInput
) {
  await requirePermission(actorUserId, PurchasingPermissions.updateOrder);
  await loadEditableOrder(purchaseOrderId);

  return prisma.$transaction(async (tx) => {
    await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        discountPercent: input.discountPercent,
        taxPercent: input.taxPercent,
        expectedDate: input.expectedDate,
        notes: input.notes,
        terms: input.terms,
      },
    });
    await applyOrderTotalsTx(tx, purchaseOrderId);
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "purchasing",
        action: "update_order",
        entityId: purchaseOrderId,
      },
      tx
    );
    return tx.purchaseOrder.findUniqueOrThrow({ where: { id: purchaseOrderId } });
  });
}

// ===== انتقالات الحالة =====

/** إرسال أمر شراء للمورد: draft → sent. لا بد من وجود بند واحد على الأقل. */
export async function markOrderSent(actorUserId: string, purchaseOrderId: string) {
  await requirePermission(actorUserId, PurchasingPermissions.updateOrder);

  const order = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    select: { status: true, _count: { select: { lines: true } } },
  });
  if (!order) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "أمر الشراء غير موجود", 404);
  }
  assertCanSend(order.status, order._count.lines);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { status: "sent" },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "purchasing",
        action: "send_order",
        entityId: purchaseOrderId,
      },
      tx
    );
    return updated;
  });
}

/** تأكيد استلام أمر شراء: draft/sent → received. */
export async function receiveOrder(actorUserId: string, purchaseOrderId: string) {
  await requirePermission(actorUserId, PurchasingPermissions.receiveOrder);

  const order = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    select: { status: true, _count: { select: { lines: true } } },
  });
  if (!order) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "أمر الشراء غير موجود", 404);
  }
  assertCanReceive(order.status, order._count.lines);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { status: "received", receivedAt: new Date() },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "purchasing",
        action: "receive_order",
        entityId: purchaseOrderId,
      },
      tx
    );
    return updated;
  });
}

/** إلغاء أمر شراء: draft/sent → cancelled، وقبل تسجيل أي دفعة. */
export async function cancelOrder(
  actorUserId: string,
  purchaseOrderId: string,
  input: CancelOrderInput
) {
  await requirePermission(actorUserId, PurchasingPermissions.cancelOrder);

  const order = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    select: { status: true, paidAmount: true },
  });
  if (!order) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "أمر الشراء غير موجود", 404);
  }
  assertCanCancel(order.status, order.paidAmount);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { status: "cancelled" },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "purchasing",
        action: "cancel_order",
        entityId: purchaseOrderId,
        newValue: { reason: input.reason },
      },
      tx
    );
    return updated;
  });
}

// ===== مدفوعات المورد =====

export async function recordSupplierPayment(
  actorUserId: string,
  purchaseOrderId: string,
  input: RecordSupplierPaymentInput
) {
  await requirePermission(actorUserId, PurchasingPermissions.recordPayment);

  const order = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    select: { status: true, grandTotal: true, paidAmount: true },
  });
  if (!order) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "أمر الشراء غير موجود", 404);
  }
  assertCanPay(order.status);
  assertPaymentWithinRemaining(input.amount, remainingAmount(order.grandTotal, order.paidAmount));

  return prisma.$transaction(async (tx) => {
    await tx.supplierPayment.create({
      data: {
        purchaseOrderId,
        amount: input.amount,
        method: input.method,
        paidAt: input.paidAt,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        paidByUserId: actorUserId,
      },
    });
    const newPaid = order.paidAmount.plus(input.amount);
    const updated = await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { paidAmount: newPaid },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "purchasing",
        action: "record_payment",
        entityId: purchaseOrderId,
        newValue: { amount: input.amount.toString(), method: input.method },
      },
      tx
    );
    return updated;
  });
}

export async function deleteSupplierPayment(
  actorUserId: string,
  purchaseOrderId: string,
  paymentId: string
) {
  await requirePermission(actorUserId, PurchasingPermissions.deletePayment);

  const payment = await prisma.supplierPayment.findUnique({
    where: { id: paymentId },
    include: { purchaseOrder: { select: { id: true, status: true, paidAmount: true } } },
  });
  if (!payment || payment.purchaseOrderId !== purchaseOrderId) {
    throw new AppError(PurchasingErrorCodes.PAYMENT_NOT_FOUND, "الدفعة غير موجودة", 404);
  }
  assertCanDeletePayment(payment.purchaseOrder.status);

  return prisma.$transaction(async (tx) => {
    await tx.supplierPayment.delete({ where: { id: paymentId } });
    const newPaid = payment.purchaseOrder.paidAmount.minus(payment.amount);
    const clampedPaid = newPaid.greaterThan(0) ? newPaid : new Prisma.Decimal(0);
    const updated = await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { paidAmount: clampedPaid },
    });
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "purchasing",
        action: "delete_payment",
        entityId: purchaseOrderId,
        oldValue: { paymentId, amount: payment.amount.toString() },
      },
      tx
    );
    return updated;
  });
}
