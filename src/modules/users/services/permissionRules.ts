// قواعد الصلاحيات النقية (بدون قاعدة بيانات) — أهم منطق عمل في الموديول،
// معزول هنا عشان يكون قابل للاختبار مباشرة. مبني على docs/analysis/users-analysis.md.

import { AppError } from "@/modules/shared/errors/AppError";
import { UsersErrorCodes } from "../errors";
import type { PermissionEffect, RoleLevel, UserStatus } from "../types";

export interface EffectiveInput {
  isSystemOwner: boolean;
  roleLevel: RoleLevel;
  status: UserStatus;
  rolePermissionKeys: string[];
  grants: { permissionKey: string; effect: PermissionEffect }[];
  /** كل مفاتيح الصلاحيات المسجّلة — يحصل عليها المالك بالكامل. */
  allRegisteredKeys: string[];
}

/**
 * حساب الصلاحيات الفعّالة لمستخدم — دالة نقية. أهم قاعدة عمل في الموديول:
 *
 *   - حساب غير نشط (موقوف/مقفل/مؤرشف) ⇐ لا صلاحيات إطلاقًا (تحليل §10، §13).
 *   - مالك النظام ⇐ كل الصلاحيات المسجّلة (تحليل §4).
 *   - غير ذلك: صلاحيات الدور + المنح الإضافي − السحب الاستثنائي (تحليل §11).
 *
 * المنع الافتراضي: أي صلاحية مش موجودة في النتيجة = ممنوعة.
 */
export function computeEffectivePermissions(input: EffectiveInput): Set<string> {
  if (input.status !== "active") {
    return new Set();
  }

  if (input.isSystemOwner || input.roleLevel === "owner") {
    return new Set(input.allRegisteredKeys);
  }

  const effective = new Set(input.rolePermissionKeys);
  for (const g of input.grants) {
    if (g.effect === "grant") effective.add(g.permissionKey);
  }
  for (const g of input.grants) {
    if (g.effect === "revoke") effective.delete(g.permissionKey);
  }
  return effective;
}

/**
 * حماية مالك النظام: لا يمكن لأي حساب غير المالك نفسه تعديل/إيقاف/أرشفة أو
 * تغيير صلاحيات حساب مالك (تحليل §4، §10).
 */
export function assertCanManageTarget(
  actor: { isSystemOwner: boolean },
  target: { isSystemOwner: boolean }
): void {
  if (target.isSystemOwner && !actor.isSystemOwner) {
    throw new AppError(
      UsersErrorCodes.OWNER_PROTECTED,
      "لا يمكن لأي حساب آخر تعديل أو إيقاف مالك النظام",
      403
    );
  }
}

/** يتأكد إن مفتاح الصلاحية معروف ومسجّل قبل منحه/سحبه أو ربطه بدور. */
export function assertPermissionKeyIsKnown(
  permissionKey: string,
  isRegistered: (key: string) => boolean
): void {
  if (!isRegistered(permissionKey)) {
    throw new AppError(
      UsersErrorCodes.UNKNOWN_PERMISSION,
      `صلاحية غير معروفة: ${permissionKey}`,
      400,
      { permissionKey }
    );
  }
}
