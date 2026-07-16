import { z } from "zod";

// تحقّق مدخلات المصادقة (تسجيل الدخول، تغيير كلمة المرور).

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("بريد الدخول غير صحيح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "كلمة المرور الحالية مطلوبة"),
  newPassword: z.string().min(8, "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل"),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
