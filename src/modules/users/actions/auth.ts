"use server";

// نقاط دخول المصادقة من الواجهة. login/logout بيلمسوا كوكي الجلسة (server action).

import { headers } from "next/headers";
import { wrapAction } from "@/modules/shared/errors/handleError";
import { getCurrentUser, requireCurrentUserId } from "@/modules/shared/auth/session";
import { login, logout, changeOwnPassword } from "../services/AuthService";
import { loginSchema, changePasswordSchema } from "../services/authSchemas";

/** يستخرج IP والمتصفح من ترويسات الطلب (للتسجيل والقفل الأمني). */
async function requestMeta(): Promise<{ ip?: string; userAgent?: string }> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  const userAgent = h.get("user-agent") || undefined;
  return { ip, userAgent };
}

export async function loginAction(raw: unknown) {
  return wrapAction(async () => {
    const input = loginSchema.parse(raw);
    const result = await login(input, await requestMeta());
    // لا نُرجّع معرّف المستخدم للعميل — بس نعلمه إن كان لازم يغيّر كلمة المرور.
    return { mustChangePassword: result.mustChangePassword };
  });
}

export async function logoutAction() {
  return wrapAction(async () => {
    const user = await getCurrentUser();
    if (user) await logout(user.id);
    return { success: true };
  });
}

export async function changePasswordAction(raw: unknown) {
  return wrapAction(async () => {
    const userId = await requireCurrentUserId();
    const input = changePasswordSchema.parse(raw);
    await changeOwnPassword(userId, input);
    return { success: true };
  });
}
