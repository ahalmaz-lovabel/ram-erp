import { prisma } from "@/lib/prisma";
import { getAllPermissions, requirePermission } from "@/modules/shared/permissions";
import { AppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { UsersPermissions } from "../permissions";
import type { EffectivePermissionsBreakdown } from "../types";
import { computeEffectivePermissions } from "./permissionRules";

// إعادة تصدير القواعد النقية عشان باقي الـ services تستوردها من مكان واحد.
export {
  computeEffectivePermissions,
  assertCanManageTarget,
  assertPermissionKeyIsKnown,
} from "./permissionRules";

/**
 * الـ resolver اللي بيتحقن في shared/permissions عبر setPermissionResolver.
 * `requirePermission()` بيعتمد عليه لمعرفة صلاحيات المستخدم الفعّالة.
 */
export async function resolveUserPermissions(userId: string): Promise<Set<string>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: { include: { permissions: true } },
      directPermissions: true,
    },
  });

  // مستخدم غير معروف ⇐ لا صلاحيات (منع افتراضي).
  if (!user) return new Set();

  return computeEffectivePermissions({
    isSystemOwner: user.isSystemOwner,
    roleLevel: user.role.level,
    status: user.status,
    rolePermissionKeys: user.role.permissions.map((p) => p.permissionKey),
    grants: user.directPermissions.map((g) => ({
      permissionKey: g.permissionKey,
      effect: g.effect,
    })),
    allRegisteredKeys: getAllPermissions().map((p) => p.key),
  });
}

/**
 * تفصيل مصادر صلاحيات المستخدم للعرض في الواجهة (تحليل §11، §17).
 */
export async function getEffectivePermissionsBreakdown(
  userId: string
): Promise<EffectivePermissionsBreakdown> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: { include: { permissions: true } },
      directPermissions: true,
    },
  });
  if (!user) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "المستخدم غير موجود", 404);
  }

  const fromRole = user.role.permissions.map((p) => p.permissionKey);
  const granted = user.directPermissions
    .filter((g) => g.effect === "grant")
    .map((g) => g.permissionKey);
  const revoked = user.directPermissions
    .filter((g) => g.effect === "revoke")
    .map((g) => g.permissionKey);

  const effective = [
    ...computeEffectivePermissions({
      isSystemOwner: user.isSystemOwner,
      roleLevel: user.role.level,
      status: user.status,
      rolePermissionKeys: fromRole,
      grants: user.directPermissions.map((g) => ({
        permissionKey: g.permissionKey,
        effect: g.effect,
      })),
      allRegisteredKeys: getAllPermissions().map((p) => p.key),
    }),
  ];

  return { fromRole, granted, revoked, effective };
}

/**
 * قراءة تفصيل صلاحيات مستخدم مع فحص صلاحية العرض (تحليل §16، §17).
 * نقطة الدخول اللي يستدعيها الـ action — الفحص هنا مش في الـ action.
 */
export async function viewUserPermissions(
  actorUserId: string,
  targetUserId: string
): Promise<EffectivePermissionsBreakdown> {
  await requirePermission(actorUserId, UsersPermissions.viewUsers);
  return getEffectivePermissionsBreakdown(targetUserId);
}
