import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePermission, isRegisteredPermission } from "@/modules/shared/permissions";
import { recordAuditLog } from "@/modules/shared/audit";
import { AppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { UsersPermissions } from "../permissions";
import { UsersErrorCodes } from "../errors";
import type { SafeUser } from "../types";
import { assertCanManageTarget, assertPermissionKeyIsKnown } from "./PermissionService";
import type {
  CreateUserInput,
  UpdateUserInput,
  SuspendUserInput,
  ArchiveUserInput,
  ResetPasswordInput,
  SetUserPermissionInput,
} from "./usersSchemas";

/**
 * منطق العمل لموديول users. كل قرار عمل هنا — مش في الـ action أو الـ UI.
 * الأخطاء دايمًا AppError، والعمليات متعددة الخطوات داخل prisma.$transaction،
 * وكل عملية حساسة تُسجَّل في سجل العمليات (recordAuditLog) داخل نفس المعاملة.
 * قاعدة أمنية: passwordHash لا يظهر أبدًا في القيم المُرجعة ولا في سجل العمليات.
 */

const SALT_ROUNDS = 10;

// الحقول الآمنة للإرجاع/التسجيل — بدون passwordHash إطلاقًا.
const safeUserSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  whatsapp: true,
  department: true,
  jobTitle: true,
  roleId: true,
  status: true,
  isSystemOwner: true,
  mustChangePassword: true,
  lastLoginAt: true,
  lastPasswordChangeAt: true,
  adminNotes: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** يحمّل الحساب المنفّذ للتحقق من قواعد السلطة (حماية المالك). */
async function loadActor(actorUserId: string): Promise<{ isSystemOwner: boolean }> {
  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { isSystemOwner: true },
  });
  if (!actor) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "الحساب المنفّذ غير موجود", 404);
  }
  return actor;
}

export async function createUser(actorUserId: string, input: CreateUserInput): Promise<SafeUser> {
  await requirePermission(actorUserId, UsersPermissions.createUser);

  const role = await prisma.role.findUnique({ where: { id: input.roleId } });
  if (!role) {
    throw new AppError(UsersErrorCodes.ROLE_NOT_FOUND, "الدور المحدد غير موجود", 404);
  }
  if (role.status !== "active") {
    throw new AppError(UsersErrorCodes.ROLE_INACTIVE, "لا يمكن ربط مستخدم بدور غير نشط", 400);
  }

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(UsersErrorCodes.EMAIL_TAKEN, "بريد الدخول مستخدم بالفعل لحساب آخر", 409);
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone ?? null,
        whatsapp: input.whatsapp ?? null,
        department: input.department ?? null,
        jobTitle: input.jobTitle ?? null,
        roleId: input.roleId,
        passwordHash,
        mustChangePassword: input.mustChangePassword,
        adminNotes: input.adminNotes ?? null,
        // ملاحظة: إنشاء المستخدمين عبر هذه الدالة لا يمنح صفة المالك أبدًا.
        // مالك النظام يُبذَر مرة واحدة عبر سكربت seed منفصل (خارج نطاق هذه الدفعة).
      },
      select: safeUserSelect,
    });

    await recordAuditLog(
      {
        userId: actorUserId,
        module: "users",
        action: "create",
        entityId: user.id,
        newValue: user,
      },
      tx
    );

    return user;
  });

  return created;
}

export async function updateUser(
  actorUserId: string,
  targetUserId: string,
  input: UpdateUserInput
): Promise<SafeUser> {
  await requirePermission(actorUserId, UsersPermissions.updateUser);

  const [actor, target] = await Promise.all([
    loadActor(actorUserId),
    prisma.user.findUnique({ where: { id: targetUserId }, select: safeUserSelect }),
  ]);
  if (!target) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "المستخدم غير موجود", 404);
  }
  assertCanManageTarget(actor, target);

  if (input.roleId && input.roleId !== target.roleId) {
    const role = await prisma.role.findUnique({ where: { id: input.roleId } });
    if (!role) {
      throw new AppError(UsersErrorCodes.ROLE_NOT_FOUND, "الدور المحدد غير موجود", 404);
    }
    if (role.status !== "active") {
      throw new AppError(UsersErrorCodes.ROLE_INACTIVE, "لا يمكن ربط مستخدم بدور غير نشط", 400);
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: targetUserId },
      data: {
        fullName: input.fullName,
        phone: input.phone,
        whatsapp: input.whatsapp,
        department: input.department,
        jobTitle: input.jobTitle,
        roleId: input.roleId,
        adminNotes: input.adminNotes,
      },
      select: safeUserSelect,
    });

    await recordAuditLog(
      {
        userId: actorUserId,
        module: "users",
        action: "update",
        entityId: user.id,
        oldValue: target,
        newValue: user,
      },
      tx
    );

    return user;
  });

  return updated;
}

/** تغيير حالة مستخدم (إيقاف/تفعيل/أرشفة) مع تطبيق قواعد الحماية. */
async function changeStatus(
  actorUserId: string,
  targetUserId: string,
  nextStatus: "active" | "suspended" | "archived",
  action: string,
  reason?: string
): Promise<SafeUser> {
  const [actor, target] = await Promise.all([
    loadActor(actorUserId),
    prisma.user.findUnique({ where: { id: targetUserId }, select: safeUserSelect }),
  ]);
  if (!target) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "المستخدم غير موجود", 404);
  }
  assertCanManageTarget(actor, target);

  // منع المستخدم من إيقاف/أرشفة حسابه بنفسه (تجنّب حبس النفس خارج النظام).
  if (targetUserId === actorUserId && nextStatus !== "active") {
    throw new AppError(
      UsersErrorCodes.CANNOT_SUSPEND_SELF,
      "لا يمكنك إيقاف أو أرشفة حسابك بنفسك",
      400
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: targetUserId },
      data: { status: nextStatus },
      select: safeUserSelect,
    });

    await recordAuditLog(
      {
        userId: actorUserId,
        module: "users",
        action,
        entityId: user.id,
        oldValue: { status: target.status, reason },
        newValue: { status: user.status },
      },
      tx
    );

    return user;
  });

  return updated;
}

export async function suspendUser(
  actorUserId: string,
  targetUserId: string,
  input: SuspendUserInput
): Promise<SafeUser> {
  await requirePermission(actorUserId, UsersPermissions.suspendUser);
  return changeStatus(actorUserId, targetUserId, "suspended", "suspend", input.reason);
}

export async function reactivateUser(actorUserId: string, targetUserId: string): Promise<SafeUser> {
  await requirePermission(actorUserId, UsersPermissions.suspendUser);
  return changeStatus(actorUserId, targetUserId, "active", "reactivate");
}

export async function archiveUser(
  actorUserId: string,
  targetUserId: string,
  input: ArchiveUserInput
): Promise<SafeUser> {
  await requirePermission(actorUserId, UsersPermissions.archiveUser);
  return changeStatus(actorUserId, targetUserId, "archived", "archive", input.reason);
}

export async function resetPassword(
  actorUserId: string,
  targetUserId: string,
  input: ResetPasswordInput
): Promise<SafeUser> {
  await requirePermission(actorUserId, UsersPermissions.resetPassword);

  const [actor, target] = await Promise.all([
    loadActor(actorUserId),
    prisma.user.findUnique({ where: { id: targetUserId }, select: safeUserSelect }),
  ]);
  if (!target) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "المستخدم غير موجود", 404);
  }
  assertCanManageTarget(actor, target);

  const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: targetUserId },
      data: {
        passwordHash,
        mustChangePassword: input.mustChangePassword,
        lastPasswordChangeAt: new Date(),
      },
      select: safeUserSelect,
    });

    // ملاحظة أمنية: لا نسجّل كلمة المرور أو الـ hash في سجل العمليات.
    await recordAuditLog(
      {
        userId: actorUserId,
        module: "users",
        action: "reset_password",
        entityId: user.id,
      },
      tx
    );

    return user;
  });

  return updated;
}

/**
 * منح صلاحية إضافية لمستخدم أو سحب صلاحية من دوره استثناءً (تحليل §11).
 * السبب مطلوب دائمًا، والمستخدم لا يعدّل صلاحيات نفسه (تحليل §21).
 */
export async function setUserPermission(
  actorUserId: string,
  targetUserId: string,
  input: SetUserPermissionInput
): Promise<void> {
  await requirePermission(actorUserId, UsersPermissions.managePermissions);

  if (targetUserId === actorUserId) {
    throw new AppError(
      UsersErrorCodes.CANNOT_MODIFY_SELF_PERMISSIONS,
      "لا يمكنك تعديل صلاحياتك بنفسك",
      403
    );
  }

  assertPermissionKeyIsKnown(input.permissionKey, isRegisteredPermission);

  const [actor, target] = await Promise.all([
    loadActor(actorUserId),
    prisma.user.findUnique({ where: { id: targetUserId }, select: safeUserSelect }),
  ]);
  if (!target) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "المستخدم غير موجود", 404);
  }
  assertCanManageTarget(actor, target);

  await prisma.$transaction(async (tx) => {
    await tx.userPermissionGrant.upsert({
      where: {
        userId_permissionKey: {
          userId: targetUserId,
          permissionKey: input.permissionKey,
        },
      },
      create: {
        userId: targetUserId,
        permissionKey: input.permissionKey,
        effect: input.effect,
        reason: input.reason,
        createdByUserId: actorUserId,
      },
      update: {
        effect: input.effect,
        reason: input.reason,
        createdByUserId: actorUserId,
      },
    });

    await recordAuditLog(
      {
        userId: actorUserId,
        module: "users",
        action: "set_permission",
        entityId: targetUserId,
        newValue: {
          permissionKey: input.permissionKey,
          effect: input.effect,
          reason: input.reason,
        },
      },
      tx
    );
  });
}
