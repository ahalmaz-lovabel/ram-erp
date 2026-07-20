// صلاحيات موديول quotes. تتسجّل في الـ registry المركزي عبر register.ts.
// مبنية على تحليل العملاء §7 وتحليل المستخدمين (اعتماد عرض سعر).

export const QuotesPermissions = {
  view: "quotes.view",
  create: "quotes.create",
  update: "quotes.update", // تعديل الرأس/البنود (مسودة أو تحت التعديل)
  send: "quotes.send", // إرسال العرض (تجميد الـ snapshot)
  respond: "quotes.respond", // تسجيل قبول/رفض العميل
  approve: "quotes.approve", // اعتماد العرض (تحليل المستخدمين §)
  archive: "quotes.archive", // أرشفة (بدل الحذف — CLAUDE #16)
} as const;

export type QuotesPermission = (typeof QuotesPermissions)[keyof typeof QuotesPermissions];

/** وصف بشري لكل صلاحية — يظهر في شجرة الصلاحيات بالواجهة. */
export const QuotesPermissionLabels: Record<keyof typeof QuotesPermissions, string> = {
  view: "عرض عروض الأسعار",
  create: "إنشاء عرض سعر",
  update: "تعديل عرض سعر",
  send: "إرسال عرض سعر",
  respond: "تسجيل رد العميل (قبول/رفض)",
  approve: "اعتماد عرض سعر",
  archive: "أرشفة عرض سعر",
};
