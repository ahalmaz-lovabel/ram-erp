"use server";

// نقطة الدخول من الواجهة لموديول products (مرحلة 1أ: الخامات والسمات).
// هوية المنفّذ من الجلسة server-side (requireCurrentUserId) — مش من العميل.

import { wrapAction } from "@/modules/shared/errors/handleError";
import { requireCurrentUserId } from "@/modules/shared/auth/session";
import {
  createMaterial,
  updateMaterial,
  updateMaterialPrice,
  archiveMaterial,
} from "../services/MaterialService";
import { createAttribute, updateAttribute, archiveAttribute } from "../services/AttributeService";
import {
  createMaterialSchema,
  updateMaterialSchema,
  updateMaterialPriceSchema,
  createAttributeSchema,
  updateAttributeSchema,
} from "../services/productsSchemas";

// ===== مكتبة الخامات =====

export async function createMaterialAction(raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return createMaterial(actorUserId, createMaterialSchema.parse(raw));
  });
}

export async function updateMaterialAction(materialId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return updateMaterial(actorUserId, materialId, updateMaterialSchema.parse(raw));
  });
}

export async function updateMaterialPriceAction(materialId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return updateMaterialPrice(actorUserId, materialId, updateMaterialPriceSchema.parse(raw));
  });
}

export async function archiveMaterialAction(materialId: string) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return archiveMaterial(actorUserId, materialId);
  });
}

// ===== مكتبة السمات =====

export async function createAttributeAction(raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return createAttribute(actorUserId, createAttributeSchema.parse(raw));
  });
}

export async function updateAttributeAction(attributeId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return updateAttribute(actorUserId, attributeId, updateAttributeSchema.parse(raw));
  });
}

export async function archiveAttributeAction(attributeId: string) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return archiveAttribute(actorUserId, attributeId);
  });
}
