import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/modules/shared/audit";
import { AppError } from "@/modules/shared/errors/AppError";
import {
  createSession,
  setSessionCookie,
  clearSessionCookie,
  revokeCurrentSession,
  revokeAllUserSessions,
} from "@/modules/shared/auth/session";
import { UsersErrorCodes } from "../errors";
import { isLockedOut, lockoutWindowStart } from "./authRules";
import type { LoginInput, ChangePasswordInput } from "./authSchemas";

/**
 * منطق المصادقة: تسجيل الدخول/الخروج وتغيير كلمة المرور. كل قرار عمل هنا.
 * قواعد أمنية:
 *  - رسالة موحّدة عند فشل الدخول (لا تفرّق بين "بريد غير موجود" و"كلمة مرور
 *    خطأ") لمنع تعداد الحسابات.
 *  - قفل مؤقت بعد محاولات فاشلة متكررة (§13).
 *  - كلمة المرور تُقارَن بـ bcrypt، ولا تُحفظ ولا تُسجَّل كنص صريح.
 */

const SALT_ROUNDS = 10;

export interface LoginResult {
  userId: string;
  mustChangePassword: boolean;
}

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export async function login(input: LoginInput, meta: RequestMeta = {}): Promise<LoginResult> {
  // قفل مؤقت: لو عدّى حد المحاولات الفاشلة داخل النافذة، ارفض قبل أي فحص.
  const recentFailures = await prisma.loginAttempt.count({
    where: {
      email: input.email,
      success: false,
      createdAt: { gte: lockoutWindowStart() },
    },
  });
  if (isLockedOut(recentFailures)) {
    throw new AppError(
      UsersErrorCodes.ACCOUNT_LOCKED,
      "تم قفل الحساب مؤقتًا بسبب محاولات دخول فاشلة متكررة، حاول لاحقًا",
      429
    );
  }

  const user = await prisma.user.findUnique({ where: { email: input.email } });

  const passwordOk = user ? await bcrypt.compare(input.password, user.passwordHash) : false;

  if (!user || !passwordOk) {
    await recordLoginAttempt(input.email, false, meta);
    // رسالة موحّدة تمنع تعداد الحسابات.
    throw new AppError(
      UsersErrorCodes.INVALID_CREDENTIALS,
      "بريد الدخول أو كلمة المرور غير صحيحة",
      401
    );
  }

  if (user.status !== "active") {
    await recordLoginAttempt(input.email, false, meta);
    throw new AppError(UsersErrorCodes.ACCOUNT_INACTIVE, "الحساب غير نشط، تواصل مع الإدارة", 403);
  }

  // نجاح: أنشئ جلسة، سجّل المحاولة الناجحة، وحدّث آخر دخول.
  const { token, expiresAt } = await createSession(user.id, meta);
  await setSessionCookie(token, expiresAt);

  await prisma.$transaction([
    prisma.loginAttempt.create({
      data: {
        email: input.email,
        success: true,
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      },
    }),
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
  ]);

  await recordAuditLog({
    userId: user.id,
    module: "users",
    action: "login",
    entityId: user.id,
  });

  return { userId: user.id, mustChangePassword: user.mustChangePassword };
}

export async function logout(userId: string): Promise<void> {
  await revokeCurrentSession();
  await clearSessionCookie();
  await recordAuditLog({
    userId,
    module: "users",
    action: "logout",
    entityId: userId,
  });
}

/**
 * تغيير المستخدم لكلمة مروره بنفسه (تحليل §21). يتحقق من كلمة المرور الحالية،
 * يمسح إجبار التغيير، ويُنهي كل الجلسات الأخرى للأمان.
 */
export async function changeOwnPassword(userId: string, input: ChangePasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(UsersErrorCodes.INVALID_CREDENTIALS, "الحساب غير موجود", 401);
  }

  const ok = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!ok) {
    throw new AppError(
      UsersErrorCodes.INVALID_CURRENT_PASSWORD,
      "كلمة المرور الحالية غير صحيحة",
      400
    );
  }

  const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false, lastPasswordChangeAt: new Date() },
  });

  // إنهاء كل الجلسات (بما فيها الحالية) بعد تغيير كلمة المرور للأمان (§14).
  await revokeAllUserSessions(userId);
  await clearSessionCookie();

  await recordAuditLog({
    userId,
    module: "users",
    action: "change_password",
    entityId: userId,
  });
}

async function recordLoginAttempt(
  email: string,
  success: boolean,
  meta: RequestMeta
): Promise<void> {
  await prisma.loginAttempt.create({
    data: { email, success, ip: meta.ip ?? null, userAgent: meta.userAgent ?? null },
  });
}
