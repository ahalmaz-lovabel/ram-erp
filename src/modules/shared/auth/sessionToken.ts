import { randomBytes, createHash } from "node:crypto";

// أدوات التوكن النقية (بدون كوكيز/قاعدة بيانات) — قابلة للاختبار مباشرة.
// مبدأ أمني: التوكن الخام يعيش في كوكي العميل فقط، وقاعدة البيانات تخزّن
// hash له فقط — فلو تسرّب الجدول، ما ينفعش يُستخدم كتوكن جلسة.

/** مدة صلاحية الجلسة الافتراضية (بالأيام). */
export const SESSION_TTL_DAYS = 7;

/** اسم كوكي الجلسة. */
export const SESSION_COOKIE_NAME = "ram_session";

/** توكن عشوائي 256-bit بصيغة صالحة للكوكي (base64url). */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 للتوكن — هو اللي بيتخزّن في قاعدة البيانات. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** تاريخ انتهاء الجلسة انطلاقًا من الآن. */
export function computeSessionExpiry(
  from: Date = new Date(),
  ttlDays: number = SESSION_TTL_DAYS
): Date {
  return new Date(from.getTime() + ttlDays * 24 * 60 * 60 * 1000);
}

/** هل الجلسة منتهية عند لحظة معيّنة؟ */
export function isExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}
