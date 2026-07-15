import { z } from "zod";

// تحقّق مدخلات موديول users. الـ action بينادي .parse()، والـ service بيستقبل
// بيانات موثوقة. القيم مطابقة لـ enums في schema.prisma (تحليل §3، §5، §11).

const departmentSchema = z.enum([
  "sales",
  "accounts",
  "warehouse",
  "production",
  "purchasing",
  "management",
  "shipping",
  "website",
]);

const permissionEffectSchema = z.enum(["grant", "revoke"]);

// افتراض مؤقت (موثّق في README): الحد الأدنى لطول كلمة المرور 8 — التحليل
// اشترط تشفيرها لكن لم يحدد سياسة طول صريحة.
const passwordSchema = z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل");

const optionalTrimmed = z
  .string()
  .trim()
  .min(1)
  .optional()
  .or(z.literal("").transform(() => undefined));

// ===== المستخدمون =====

export const createUserSchema = z.object({
  fullName: z.string().trim().min(1, "الاسم الكامل مطلوب"),
  email: z.string().trim().toLowerCase().email("بريد الدخول غير صحيح"),
  phone: optionalTrimmed,
  whatsapp: optionalTrimmed,
  department: departmentSchema.optional(),
  jobTitle: optionalTrimmed,
  roleId: z.string().min(1, "الدور الأساسي مطلوب"),
  password: passwordSchema,
  mustChangePassword: z.boolean().default(true),
  adminNotes: optionalTrimmed,
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  phone: optionalTrimmed,
  whatsapp: optionalTrimmed,
  department: departmentSchema.optional(),
  jobTitle: optionalTrimmed,
  roleId: z.string().min(1).optional(),
  adminNotes: optionalTrimmed,
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// العمليات الحساسة تحتاج سببًا مكتوبًا (تحليل §11، §21).
export const suspendUserSchema = z.object({
  reason: z.string().trim().min(1, "سبب الإيقاف مطلوب"),
});
export type SuspendUserInput = z.infer<typeof suspendUserSchema>;

export const archiveUserSchema = z.object({
  reason: z.string().trim().min(1, "سبب الأرشفة مطلوب"),
});
export type ArchiveUserInput = z.infer<typeof archiveUserSchema>;

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
  mustChangePassword: z.boolean().default(true),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// منح/سحب صلاحية لمستخدم — السبب مطلوب دائمًا (تحليل §11).
export const setUserPermissionSchema = z.object({
  permissionKey: z.string().trim().min(1),
  effect: permissionEffectSchema,
  reason: z.string().trim().min(1, "سبب تغيير الصلاحية مطلوب"),
});
export type SetUserPermissionInput = z.infer<typeof setUserPermissionSchema>;

// ===== الأدوار =====

export const createRoleSchema = z.object({
  name: z.string().trim().min(1, "اسم الدور مطلوب"),
  key: z
    .string()
    .trim()
    .min(1, "معرّف الدور مطلوب")
    .regex(/^[a-z0-9-]+$/, "معرّف الدور يسمح بحروف إنجليزية صغيرة وأرقام وشرطة فقط"),
  description: optionalTrimmed,
  department: departmentSchema.optional(),
  permissionKeys: z.array(z.string().trim().min(1)).default([]),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: optionalTrimmed,
  department: departmentSchema.optional(),
  permissionKeys: z.array(z.string().trim().min(1)).optional(),
});
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
