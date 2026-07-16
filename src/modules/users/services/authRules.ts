// قواعد المصادقة النقية (بدون قاعدة بيانات) — قابلة للاختبار مباشرة.
// القفل الأمني بعد محاولات دخول فاشلة متكررة (تحليل §13).

/** عدد المحاولات الفاشلة اللي بعدها يتقفل الحساب مؤقتًا. */
export const LOCKOUT_THRESHOLD = 5;

/** نافذة حساب المحاولات الفاشلة (بالدقائق). */
export const LOCKOUT_WINDOW_MINUTES = 15;

/** بداية نافذة حساب المحاولات الفاشلة انطلاقًا من الآن. */
export function lockoutWindowStart(now: Date = new Date()): Date {
  return new Date(now.getTime() - LOCKOUT_WINDOW_MINUTES * 60 * 1000);
}

/** هل الحساب مقفول مؤقتًا بناءً على عدد المحاولات الفاشلة داخل النافذة؟ */
export function isLockedOut(
  recentFailedCount: number,
  threshold: number = LOCKOUT_THRESHOLD
): boolean {
  return recentFailedCount >= threshold;
}
