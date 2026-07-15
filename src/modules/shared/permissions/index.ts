import { AppError, CommonErrorCodes } from "../errors/AppError";

export * from "./registry";

/**
 * محرك فحص الصلاحيات (server-side دايمًا).
 *
 * تقسيم المسؤولية:
 *   - إنفاذ الصلاحية (allow/deny) + رمي الخطأ الموحّد → هنا (shared).
 *   - *كيفية* استخراج صلاحيات مستخدم معيّن (أدوار، صلاحيات مباشرة،
 *     super-admin...) → قرار خاص بموديول `users` ومبني على تحليله. عشان
 *     كده الاستخراج بيتحقن من بره عبر `setPermissionResolver()` بدل ما
 *     نفترض هنا شكل جدول الأدوار قبل التحليل.
 *
 * لغاية ما موديول users يسجّل الـ resolver الحقيقي، أي فحص بيرفض بشكل
 * آمن (deny by default) — مفيش صلاحية بتتمنح ضمنيًا.
 */
export type PermissionResolver = (userId: string) => Promise<Set<string>>;

let resolver: PermissionResolver | null = null;

/** موديول users بينادي دي مرة واحدة عشان يوصّل منطق استخراج الصلاحيات. */
export function setPermissionResolver(fn: PermissionResolver): void {
  resolver = fn;
}

/**
 * يتأكد إن المستخدم يملك الصلاحية المطلوبة، وإلا يرمي AppError.
 * يُستدعى في أول كل دالة service حساسة.
 */
export async function requirePermission(userId: string, permission: string): Promise<void> {
  if (!resolver) {
    throw new AppError(
      "PERMISSIONS_NOT_CONFIGURED",
      "منظومة الصلاحيات لم تُهيّأ بعد — موديول users لسه مش جاهز",
      500
    );
  }

  const granted = await resolver(userId);
  if (!granted.has(permission)) {
    throw new AppError(
      CommonErrorCodes.PERMISSION_DENIED,
      "لا تملك صلاحية تنفيذ هذا الإجراء",
      403,
      { permission }
    );
  }
}
