"use server";

// نقطة الدخول الوحيدة من الواجهة (UI) لموديول purchasing. كل action: يستخرج
// هوية المنفّذ من الجلسة server-side (requireCurrentUserId)، يتحقق بـ Zod،
// ينادي service، ويلف كله بـ wrapAction لرد موحّد { success, data } / { success, error }.

import { wrapAction } from "@/modules/shared/errors/handleError";
import { requireCurrentUserId } from "@/modules/shared/auth/session";
import {
  createSupplier,
  updateSupplier,
  archiveSupplier,
  createPurchaseOrder,
  updatePurchaseOrder,
  addOrderLine,
  updateOrderLine,
  removeOrderLine,
  markOrderSent,
  receiveOrder,
  cancelOrder,
  recordSupplierPayment,
  deleteSupplierPayment,
} from "../services/PurchasingService";
import {
  createSupplierSchema,
  updateSupplierSchema,
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  addOrderLineSchema,
  updateOrderLineSchema,
  recordSupplierPaymentSchema,
  cancelOrderSchema,
} from "../services/purchasingSchemas";

// ===== الموردون =====

export async function createSupplierAction(raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return createSupplier(actorUserId, createSupplierSchema.parse(raw));
  });
}

export async function updateSupplierAction(supplierId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return updateSupplier(actorUserId, supplierId, updateSupplierSchema.parse(raw));
  });
}

export async function archiveSupplierAction(supplierId: string) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return archiveSupplier(actorUserId, supplierId);
  });
}

// ===== أوامر الشراء =====

export async function createPurchaseOrderAction(raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return createPurchaseOrder(actorUserId, createPurchaseOrderSchema.parse(raw));
  });
}

export async function updatePurchaseOrderAction(purchaseOrderId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return updatePurchaseOrder(actorUserId, purchaseOrderId, updatePurchaseOrderSchema.parse(raw));
  });
}

// ===== البنود =====

export async function addOrderLineAction(purchaseOrderId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return addOrderLine(actorUserId, purchaseOrderId, addOrderLineSchema.parse(raw));
  });
}

export async function updateOrderLineAction(purchaseOrderId: string, lineId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return updateOrderLine(actorUserId, purchaseOrderId, lineId, updateOrderLineSchema.parse(raw));
  });
}

export async function removeOrderLineAction(purchaseOrderId: string, lineId: string) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return removeOrderLine(actorUserId, purchaseOrderId, lineId);
  });
}

// ===== انتقالات الحالة =====

export async function markOrderSentAction(purchaseOrderId: string) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return markOrderSent(actorUserId, purchaseOrderId);
  });
}

export async function receiveOrderAction(purchaseOrderId: string) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return receiveOrder(actorUserId, purchaseOrderId);
  });
}

export async function cancelOrderAction(purchaseOrderId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return cancelOrder(actorUserId, purchaseOrderId, cancelOrderSchema.parse(raw));
  });
}

// ===== مدفوعات المورد =====

export async function recordSupplierPaymentAction(purchaseOrderId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return recordSupplierPayment(
      actorUserId,
      purchaseOrderId,
      recordSupplierPaymentSchema.parse(raw)
    );
  });
}

export async function deleteSupplierPaymentAction(purchaseOrderId: string, paymentId: string) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return deleteSupplierPayment(actorUserId, purchaseOrderId, paymentId);
  });
}
