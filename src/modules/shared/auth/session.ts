import { cookies } from "next/headers";
// أثر جانبي: يضمن تسجيل صلاحيات الموديولات وحقن الـ resolver في سياق التطبيق
// قبل أي فحص صلاحية (getCurrentUser/requireCurrentUserId يسبقان requirePermission).
import "@/modules/bootstrap";
import { prisma } from "@/lib/prisma";
import { AppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import type { UserStatus } from "@/generated/prisma/client";
import {
  SESSION_COOKIE_NAME,
  computeSessionExpiry,
  generateSessionToken,
  hashSessionToken,
  isExpired,
} from "./sessionToken";

/**
 * حدود المصادقة المركزية للنظام. أي عملية server-side بتعرف "مين المنفّذ"
 * من الجلسة هنا — مش من مدخلات العميل. ده اللي بيخلّي requirePermission حقيقي.
 */

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  roleId: string;
  status: UserStatus;
  isSystemOwner: boolean;
  mustChangePassword: boolean;
}

const sessionUserSelect = {
  id: true,
  fullName: true,
  email: true,
  roleId: true,
  status: true,
  isSystemOwner: true,
  mustChangePassword: true,
} as const;

// كل ما تمر هذه المدة على lastUsedAt نحدّثها فقط — نتجنّب كتابة على كل قراءة.
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * ينشئ جلسة جديدة للمستخدم ويعيد التوكن الخام (اللي هيتحط في الكوكي).
 * قاعدة البيانات تخزّن hash التوكن فقط.
 */
export async function createSession(
  userId: string,
  meta: { ip?: string; userAgent?: string } = {}
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = computeSessionExpiry();
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
    },
  });
  return { token, expiresAt };
}

/** يضبط كوكي الجلسة (httpOnly + Secure في الإنتاج). يُستدعى من server action فقط. */
export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** يمسح كوكي الجلسة. يُستدعى من server action فقط. */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

/** التوكن الخام من الكوكي (لو موجود). */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/**
 * يتحقق من توكن خام ويعيد المستخدم لو الجلسة صالحة، وإلا null. معزول عن قراءة
 * الكوكي عشان يكون قابل للاختبار مباشرة. جلسة غير موجودة/منتهية/ملغاة، أو حساب
 * غير نشط ⇒ null (لا هوية).
 */
export async function validateSessionToken(token: string): Promise<SessionUser | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: { select: sessionUserSelect } },
  });

  if (!session || session.revokedAt || isExpired(session.expiresAt)) return null;
  // حساب موقوف/مقفل/مؤرشف لا يملك جلسة فعّالة (تحليل §10، §13).
  if (session.user.status !== "active") return null;

  // تحديث lastUsedAt بشكل مُقنَّن (مش على كل قراءة) — best-effort.
  if (Date.now() - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
    await prisma.session
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});
  }

  return session.user;
}

/**
 * المستخدم الحالي من كوكي الجلسة، أو null لو مفيش جلسة صالحة.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await getSessionToken();
  if (!token) return null;
  return validateSessionToken(token);
}

/** المستخدم الحالي أو خطأ 401 لو مش مسجّل دخول. */
export async function requireCurrentUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError(
      CommonErrorCodes.UNAUTHENTICATED,
      "يجب تسجيل الدخول لتنفيذ هذا الإجراء",
      401
    );
  }
  return user;
}

/** معرّف المستخدم الحالي أو خطأ 401. نقطة الدخول اللي تستخدمها الـ actions. */
export async function requireCurrentUserId(): Promise<string> {
  return (await requireCurrentUser()).id;
}

/** يلغي الجلسة الحالية (تسجيل خروج من الجهاز الحالي). */
export async function revokeCurrentSession(): Promise<void> {
  const token = await getSessionToken();
  if (!token) return;
  await prisma.session.updateMany({
    where: { tokenHash: hashSessionToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** يلغي كل جلسات المستخدم (تسجيل خروج من كل الأجهزة — تحليل §14). */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
