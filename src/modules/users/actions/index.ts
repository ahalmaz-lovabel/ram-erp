"use server";

// نقطة الدخول الوحيدة من الواجهة لموديول users. كل action: يتحقق بـ Zod،
// ينادي service، ويلف كله بـ wrapAction لرد موحّد { success, data | error }.
//
// ملاحظة: actorUserId (منفّذ العملية) يجي حاليًا كوسيط. لما تتبني طبقة
// الجلسات/المصادقة، يتحوّل لاستخراجه من الجلسة server-side بدل تمريره.

import { wrapAction } from "@/modules/shared/errors/handleError";
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

export async function createUserAction(actorUserId: string, raw: unknown) {
  return wrapAction(async () => {
    const input = createUserSchema.parse(raw);
    return createUser(actorUserId, input);
  });
}

export async function updateUserAction(actorUserId: string, targetUserId: string, raw: unknown) {
  return wrapAction(async () => {
    const input = updateUserSchema.parse(raw);
    return updateUser(actorUserId, targetUserId, input);
  });
}

export async function suspendUserAction(actorUserId: string, targetUserId: string, raw: unknown) {
  return wrapAction(async () => {
    const input = suspendUserSchema.parse(raw);
    return suspendUser(actorUserId, targetUserId, input);
  });
}

export async function reactivateUserAction(actorUserId: string, targetUserId: string) {
  return wrapAction(async () => reactivateUser(actorUserId, targetUserId));
}

export async function archiveUserAction(actorUserId: string, targetUserId: string, raw: unknown) {
  return wrapAction(async () => {
    const input = archiveUserSchema.parse(raw);
    return archiveUser(actorUserId, targetUserId, input);
  });
}

export async function resetPasswordAction(actorUserId: string, targetUserId: string, raw: unknown) {
  return wrapAction(async () => {
    const input = resetPasswordSchema.parse(raw);
    return resetPassword(actorUserId, targetUserId, input);
  });
}

export async function setUserPermissionAction(
  actorUserId: string,
  targetUserId: string,
  raw: unknown
) {
  return wrapAction(async () => {
    const input = setUserPermissionSchema.parse(raw);
    return setUserPermission(actorUserId, targetUserId, input);
  });
}

export async function getUserPermissionsAction(actorUserId: string, targetUserId: string) {
  return wrapAction(async () => viewUserPermissions(actorUserId, targetUserId));
}

// ===== الأدوار =====

export async function createRoleAction(actorUserId: string, raw: unknown) {
  return wrapAction(async () => {
    const input = createRoleSchema.parse(raw);
    return createRole(actorUserId, input);
  });
}

export async function updateRoleAction(actorUserId: string, roleId: string, raw: unknown) {
  return wrapAction(async () => {
    const input = updateRoleSchema.parse(raw);
    return updateRole(actorUserId, roleId, input);
  });
}

export async function archiveRoleAction(actorUserId: string, roleId: string) {
  return wrapAction(async () => archiveRole(actorUserId, roleId));
}
