// صلاحيات موديول users نفسه (إدارة المستخدمين والأدوار). بتتسجل في الـ registry
// المركزي عبر register.ts. مبنية على docs/analysis/users-analysis.md (§6، §16، §18).
//
// ملاحظة: دي صلاحيات *إدارة* المستخدمين والأدوار. الصلاحيات الحساسة الخاصة
// بأقسام تانية (رؤية التكلفة، اعتماد فاتورة...) بتتعرّف في موديولات تلك الأقسام.

export const UsersPermissions = {
  // إدارة المستخدمين
  viewUsers: "users.view",
  createUser: "users.create",
  updateUser: "users.update",
  suspendUser: "users.suspend", // إيقاف/إعادة تفعيل/قفل
  archiveUser: "users.archive",
  resetPassword: "users.reset_password",
  managePermissions: "users.manage_permissions", // منح/سحب صلاحيات لمستخدم
  viewAuditLog: "users.view_audit", // الاطلاع على سجل العمليات (§15)

  // إدارة الأدوار
  viewRoles: "roles.view",
  createRole: "roles.create",
  updateRole: "roles.update",
  archiveRole: "roles.archive",
} as const;

export type UsersPermission = (typeof UsersPermissions)[keyof typeof UsersPermissions];

/** وصف بشري لكل صلاحية — يظهر في شجرة الصلاحيات بالواجهة. */
export const UsersPermissionLabels: Record<keyof typeof UsersPermissions, string> = {
  viewUsers: "عرض المستخدمين",
  createUser: "إضافة مستخدم",
  updateUser: "تعديل مستخدم",
  suspendUser: "إيقاف/تفعيل مستخدم",
  archiveUser: "أرشفة مستخدم",
  resetPassword: "إعادة تعيين كلمة المرور",
  managePermissions: "منح/سحب صلاحيات",
  viewAuditLog: "عرض سجل العمليات",
  viewRoles: "عرض الأدوار",
  createRole: "إضافة دور",
  updateRole: "تعديل دور",
  archiveRole: "أرشفة دور",
};
