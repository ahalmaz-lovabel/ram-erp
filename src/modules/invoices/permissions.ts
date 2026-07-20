// صلاحيات موديول invoices. تتسجّل في الـ registry المركزي عبر register.ts.
// مبنية على تحليل المستخدمين (إلغاء فاتورة · تسجيل أو حذف دفعة — صلاحيات حساسة).

export const InvoicesPermissions = {
  view: "invoices.view",
  create: "invoices.create",
  update: "invoices.update", // تعديل الرأس/البنود (قبل أي دفعة)
  cancel: "invoices.cancel", // إلغاء فاتورة (حساسة)
  recordPayment: "payments.record", // تسجيل دفعة
  deletePayment: "payments.delete", // حذف دفعة (حساسة)
} as const;

export type InvoicesPermission = (typeof InvoicesPermissions)[keyof typeof InvoicesPermissions];

/** وصف بشري لكل صلاحية — يظهر في شجرة الصلاحيات بالواجهة. */
export const InvoicesPermissionLabels: Record<keyof typeof InvoicesPermissions, string> = {
  view: "عرض الفواتير",
  create: "إنشاء فاتورة",
  update: "تعديل فاتورة",
  cancel: "إلغاء فاتورة",
  recordPayment: "تسجيل دفعة",
  deletePayment: "حذف دفعة",
};
