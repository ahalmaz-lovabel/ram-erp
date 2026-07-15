import { AppError } from "../errors/AppError";

/**
 * السجل المركزي لكل صلاحيات النظام.
 *
 * كل موديول يعرّف صلاحياته في `permissions.ts` بتاعه (مثلاً
 * { view: "users.view", create: "users.create" })، وبيسجّلها هنا عبر
 * `registerModulePermissions()`. الفايدة:
 *   - مصدر واحد لكل الصلاحيات المتاحة (لبناء شجرة الصلاحيات في الواجهة).
 *   - منع تعارض: نفس المفتاح ما يتسجّلش من موديولين.
 *
 * ملاحظة: ده *سجل* الصلاحيات المتاحة فقط — مش فحص صلاحية مستخدم معيّن.
 * الفحص وقت التشغيل في `requirePermission()` (ملف index.ts).
 */
export interface PermissionDefinition {
  /** المفتاح الكامل، مثال: "users.create" */
  key: string;
  /** اسم الموديول، مثال: "users" */
  module: string;
  /** اسم الإجراء داخل الموديول، مثال: "create" */
  action: string;
  /** وصف بشري اختياري يظهر في شجرة الصلاحيات بالواجهة */
  label?: string;
}

const registry = new Map<string, PermissionDefinition>();

/**
 * تسجيل كل صلاحيات موديول واحد في السجل المركزي.
 * `permissions` هو نفس الكائن المُعرّف في `<module>/permissions.ts`
 * (قيمه هي المفاتيح الكاملة زي "users.create").
 */
export function registerModulePermissions(
  module: string,
  permissions: Record<string, string>,
  labels: Record<string, string> = {}
): void {
  for (const [action, key] of Object.entries(permissions)) {
    const existing = registry.get(key);
    if (existing && existing.module !== module) {
      throw new AppError(
        "PERMISSION_ALREADY_REGISTERED",
        `صلاحية مسجّلة مسبقًا بنفس المفتاح: ${key}`,
        500,
        { key, existingModule: existing.module, newModule: module }
      );
    }
    registry.set(key, { key, module, action, label: labels[action] });
  }
}

/** هل المفتاح ده صلاحية معروفة ومسجّلة؟ */
export function isRegisteredPermission(key: string): boolean {
  return registry.has(key);
}

/** كل الصلاحيات المسجّلة (لبناء شجرة الصلاحيات في الواجهة). */
export function getAllPermissions(): PermissionDefinition[] {
  return [...registry.values()];
}

/** صلاحيات موديول محدد. */
export function getModulePermissions(module: string): PermissionDefinition[] {
  return [...registry.values()].filter((p) => p.module === module);
}
