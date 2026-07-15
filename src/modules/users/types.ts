// أنواع بيانات موديول users. مبنية على docs/analysis/users-analysis.md
// المصدر النهائي للحقول هو schema.prisma (نماذج User/Role/RolePermission/UserPermissionGrant).

import type {
  Department,
  UserStatus,
  RoleStatus,
  RoleLevel,
  PermissionEffect,
} from "@/generated/prisma/client";

export type { Department, UserStatus, RoleStatus, RoleLevel, PermissionEffect };

/**
 * تمثيل آمن للمستخدم للعرض/الإرجاع — بدون passwordHash إطلاقًا.
 * أي دالة بترجع مستخدم لازم ترجّع الشكل ده مش الصف الخام من قاعدة البيانات.
 */
export interface SafeUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  department: Department | null;
  jobTitle: string | null;
  roleId: string;
  status: UserStatus;
  isSystemOwner: boolean;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  lastPasswordChangeAt: Date | null;
  adminNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** استثناء صلاحية على مستوى مستخدم واحد (منح إضافي أو سحب). */
export interface UserPermissionGrantView {
  permissionKey: string;
  effect: PermissionEffect;
  reason: string | null;
}

/** تفصيل الصلاحيات الفعّالة لمستخدم — لعرض الفرق في الواجهة (تحليل §11، §17). */
export interface EffectivePermissionsBreakdown {
  /** الصلاحيات الآتية من الدور الأساسي. */
  fromRole: string[];
  /** الصلاحيات الإضافية الممنوحة مباشرة. */
  granted: string[];
  /** الصلاحيات المسحوبة استثناءً رغم وجودها في الدور. */
  revoked: string[];
  /** النتيجة النهائية بعد الدمج والسحب. */
  effective: string[];
}

export interface RoleView {
  id: string;
  name: string;
  key: string;
  description: string | null;
  department: Department | null;
  level: RoleLevel;
  isSystem: boolean;
  status: RoleStatus;
  permissionKeys: string[];
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
}
