"use server";

// نقطة الدخول الوحيدة من الواجهة لموديول users. كل action: يستخرج هوية المنفّذ
// من الجلسة server-side (مش من مدخلات العميل)، يتحقق بـ Zod، ينادي service،
// ويلف كله بـ wrapAction لرد موحّد { success, data | error }.
//
// أمان: actorUserId ييجي من requireCurrentUserId() (الجلسة) — مستحيل العميل
// ينتحل هوية غيره. لو مفيش جلسة صالحة يرجع خطأ UNAUTHENTICATED (401).

import { wrapAction } from "@/modules/shared/errors/handleError";
import { requireCurrentUserId } from "@/modules/shared/auth/session";
import {
  createUser,
  updateUser,
  suspendUser,
  reactivateUser,
  archiveUser,
  resetPassword,
  setUserPermission,
} from "../services/UsersService";
import { createRole, updateRole, archiveRole } from "../services/RolesService";
import { viewUserPermissions } from "../services/PermissionService";
import {
  createUserSchema,
  updateUserSchema,
  suspendUserSchema,
  archiveUserSchema,
  resetPasswordSchema,
  setUserPermissionSchema,
  createRoleSchema,
  updateRoleSchema,
} from "../services/usersSchemas";

// ===== المستخدمون =====

export async function createUserAction(raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    const input = createUserSchema.parse(raw);
    return createUser(actorUserId, input);
  });
}

export async function updateUserAction(targetUserId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    const input = updateUserSchema.parse(raw);
    return updateUser(actorUserId, targetUserId, input);
  });
}

export async function suspendUserAction(targetUserId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    const input = suspendUserSchema.parse(raw);
    return suspendUser(actorUserId, targetUserId, input);
  });
}

export async function reactivateUserAction(targetUserId: string) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return reactivateUser(actorUserId, targetUserId);
  });
}

export async function archiveUserAction(targetUserId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    const input = archiveUserSchema.parse(raw);
    return archiveUser(actorUserId, targetUserId, input);
  });
}

export async function resetPasswordAction(targetUserId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    const input = resetPasswordSchema.parse(raw);
    return resetPassword(actorUserId, targetUserId, input);
  });
}

export async function setUserPermissionAction(targetUserId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    const input = setUserPermissionSchema.parse(raw);
    return setUserPermission(actorUserId, targetUserId, input);
  });
}

export async function getUserPermissionsAction(targetUserId: string) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return viewUserPermissions(actorUserId, targetUserId);
  });
}

// ===== الأدوار =====

export async function createRoleAction(raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    const input = createRoleSchema.parse(raw);
    return createRole(actorUserId, input);
  });
}

export async function updateRoleAction(roleId: string, raw: unknown) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    const input = updateRoleSchema.parse(raw);
    return updateRole(actorUserId, roleId, input);
  });
}

export async function archiveRoleAction(roleId: string) {
  return wrapAction(async () => {
    const actorUserId = await requireCurrentUserId();
    return archiveRole(actorUserId, roleId);
  });
}
