// أكواد أخطاء خاصة بموديول users فقط (غير الأكواد المشتركة في
// modules/shared/errors/AppError.ts زي PERMISSION_DENIED أو NOT_FOUND).
// مبنية على قواعد العمل في docs/analysis/users-analysis.md.

export const UsersErrorCodes = {
  EMAIL_TAKEN: "EMAIL_TAKEN", // بريد الدخول مستخدم بالفعل
  ROLE_NOT_FOUND: "ROLE_NOT_FOUND",
  ROLE_INACTIVE: "ROLE_INACTIVE", // لا يمكن ربط مستخدم بدور موقوف/مؤرشف
  OWNER_PROTECTED: "OWNER_PROTECTED", // لا يمكن تعديل/إيقاف مالك النظام من حساب آخر (§4، §10)
  ROLE_LEVEL_NOT_ASSIGNABLE: "ROLE_LEVEL_NOT_ASSIGNABLE", // لا يمكن ربط دور بمستوى مالك/مدير نظام عبر هذا المسار (§4، §21)
  ROLE_KEY_TAKEN: "ROLE_KEY_TAKEN", // معرّف الدور (key) مستخدم بالفعل
  ROLE_NAME_TAKEN: "ROLE_NAME_TAKEN",
  ROLE_HAS_USERS: "ROLE_HAS_USERS", // لا يمكن أرشفة دور مرتبط بمستخدمين نشطين (§18)
  SYSTEM_ROLE_LOCKED: "SYSTEM_ROLE_LOCKED", // لا يمكن أرشفة/تعديل بنية دور نظامي ثابت
  UNKNOWN_PERMISSION: "UNKNOWN_PERMISSION", // مفتاح صلاحية غير مسجّل في الـ registry
  REASON_REQUIRED: "REASON_REQUIRED", // العملية الحساسة تحتاج سببًا مكتوبًا (§11، §21)
  CANNOT_MODIFY_SELF_PERMISSIONS: "CANNOT_MODIFY_SELF_PERMISSIONS", // لا يعدّل المستخدم صلاحياته بنفسه (§21)
  CANNOT_SUSPEND_SELF: "CANNOT_SUSPEND_SELF", // منع إيقاف/أرشفة المستخدم لحسابه (تجنّب حبس النفس)
} as const;

export type UsersErrorCode = (typeof UsersErrorCodes)[keyof typeof UsersErrorCodes];
