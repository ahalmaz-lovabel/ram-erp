// صلاحيات موديول accounting. تتسجّل في الـ registry المركزي عبر register.ts.
// المرحلة الحالية للقراءة فقط (كشف الحساب + المستحقات). عمليات الكتابة
// (مرتجعات/تسويات/ردّ مبالغ) تأتي لاحقًا بصلاحياتها.

export const AccountingPermissions = {
  viewStatement: "accounting.view_statement", // كشف حساب العميل (§9)
  viewReceivables: "accounting.view_receivables", // المستحقات والأعمار (§10)
} as const;

export type AccountingPermission =
  (typeof AccountingPermissions)[keyof typeof AccountingPermissions];

/** وصف بشري لكل صلاحية — يظهر في شجرة الصلاحيات بالواجهة. */
export const AccountingPermissionLabels: Record<keyof typeof AccountingPermissions, string> = {
  viewStatement: "عرض كشف حساب العميل",
  viewReceivables: "عرض المستحقات المالية",
};
