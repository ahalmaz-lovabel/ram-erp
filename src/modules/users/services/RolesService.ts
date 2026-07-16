import { prisma } from "@/lib/prisma";
import { requirePermission, isRegisteredPermission } from "@/modules/shared/permissions";
import { recordAuditLog } from "@/modules/shared/audit";
import { AppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import {
  isUniqueConstraintError,
  uniqueConstraintFields,
} from "@/modules/shared/errors/prismaErrors";
import { UsersPermissions } from "../permissions";
import { UsersErrorCodes } from "../errors";
import type { RoleView } from "../types";
import type { CreateRoleInput, UpdateRoleInput } from "./usersSchemas";

/**
 * إدارة الأدوار (القوالب الصلاحية). كل الصلاحيات المربوطة بالدور لازم تكون
 * مفاتيح معروفة في الـ registry المركزي. الأدوار النظامية الثابتة محمية من
 * التعديل البنيوي والأرشفة (تحليل §5، §18، §19).
 */

/**
 * يحوّل تعارض القيد الفريد على الدور (name/key) — الناتج من سباق تزامن رغم
 * الفحص المُسبق — لخطأ عمل واضح بدل خطأ 500 عام. يعيد الرمي لو مش تعارض فريد.
 */
function rethrowRoleUniqueError(err: unknown): never {
  if (isUniqueConstraintError(err)) {
    const fields = uniqueConstraintFields(err);
    if (fields.includes("key")) {
      throw new AppError(UsersErrorCodes.ROLE_KEY_TAKEN, "معرّف الدور مستخدم بالفعل", 409);
    }
    if (fields.includes("name")) {
      throw new AppError(UsersErrorCodes.ROLE_NAME_TAKEN, "اسم الدور مستخدم بالفعل", 409);
    }
    // قيد فريد آخر (مثل RolePermission) — ما نلبّسهوش خطأ اسم/معرّف الدور.
  }
  throw err;
}

function assertPermissionsAreKnown(permissionKeys: string[]): void {
  for (const key of permissionKeys) {
    if (!isRegisteredPermission(key)) {
      throw new AppError(
        UsersErrorCodes.UNKNOWN_PERMISSION,
        `صلاحية غير معروفة ضمن الدور: ${key}`,
        400,
        { permissionKey: key }
      );
    }
  }
}

export async function createRole(actorUserId: string, input: CreateRoleInput): Promise<RoleView> {
  await requirePermission(actorUserId, UsersPermissions.createRole);

  // إزالة تكرار المفاتيح قبل الكتابة (يمنع ضرب @@unique(roleId, permissionKey)).
  const permissionKeys = [...new Set(input.permissionKeys)];
  assertPermissionsAreKnown(permissionKeys);

  const [nameClash, keyClash] = await Promise.all([
    prisma.role.findUnique({ where: { name: input.name }, select: { id: true } }),
    prisma.role.findUnique({ where: { key: input.key }, select: { id: true } }),
  ]);
  if (nameClash) {
    throw new AppError(UsersErrorCodes.ROLE_NAME_TAKEN, "اسم الدور مستخدم بالفعل", 409);
  }
  if (keyClash) {
    throw new AppError(UsersErrorCodes.ROLE_KEY_TAKEN, "معرّف الدور مستخدم بالفعل", 409);
  }

  try {
    const role = await prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          name: input.name,
          key: input.key,
          description: input.description ?? null,
          department: input.department ?? null,
          // الأدوار المُنشأة عبر الإدارة مخصصة (غير نظامية) ومستوى تشغيلي.
          level: "standard",
          isSystem: false,
          permissions: {
            create: permissionKeys.map((permissionKey) => ({ permissionKey })),
          },
        },
        include: { permissions: true, _count: { select: { users: true } } },
      });

      await recordAuditLog(
        {
          userId: actorUserId,
          module: "users",
          action: "create_role",
          entityId: created.id,
          newValue: {
            name: created.name,
            key: created.key,
            permissionKeys,
          },
        },
        tx
      );

      return created;
    });

    return toRoleView(role);
  } catch (err) {
    rethrowRoleUniqueError(err);
  }
}

export async function updateRole(
  actorUserId: string,
  roleId: string,
  input: UpdateRoleInput
): Promise<RoleView> {
  await requirePermission(actorUserId, UsersPermissions.updateRole);

  const existing = await prisma.role.findUnique({
    where: { id: roleId },
    include: { permissions: true },
  });
  if (!existing) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "الدور غير موجود", 404);
  }

  const permissionKeys = input.permissionKeys ? [...new Set(input.permissionKeys)] : undefined;
  if (permissionKeys) {
    assertPermissionsAreKnown(permissionKeys);
  }

  if (input.name && input.name !== existing.name) {
    const clash = await prisma.role.findUnique({
      where: { name: input.name },
      select: { id: true },
    });
    if (clash) {
      throw new AppError(UsersErrorCodes.ROLE_NAME_TAKEN, "اسم الدور مستخدم بالفعل", 409);
    }
  }

  const oldPermissionKeys = existing.permissions.map((p) => p.permissionKey);

  try {
    const role = await prisma.$transaction(async (tx) => {
      // تحديث الصلاحيات = استبدال كامل للمجموعة لو اتبعتت.
      if (permissionKeys) {
        await tx.rolePermission.deleteMany({ where: { roleId } });
        if (permissionKeys.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionKeys.map((permissionKey) => ({
              roleId,
              permissionKey,
            })),
          });
        }
      }

      const updated = await tx.role.update({
        where: { id: roleId },
        data: {
          name: input.name,
          description: input.description,
          department: input.department,
        },
        include: { permissions: true, _count: { select: { users: true } } },
      });

      await recordAuditLog(
        {
          userId: actorUserId,
          module: "users",
          action: "update_role",
          entityId: roleId,
          oldValue: {
            name: existing.name,
            permissionKeys: oldPermissionKeys,
          },
          newValue: {
            name: updated.name,
            permissionKeys: updated.permissions.map((p) => p.permissionKey),
          },
        },
        tx
      );

      return updated;
    });

    return toRoleView(role);
  } catch (err) {
    rethrowRoleUniqueError(err);
  }
}

export async function archiveRole(actorUserId: string, roleId: string): Promise<RoleView> {
  await requirePermission(actorUserId, UsersPermissions.archiveRole);

  const existing = await prisma.role.findUnique({
    where: { id: roleId },
    include: { permissions: true, _count: { select: { users: true } } },
  });
  if (!existing) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "الدور غير موجود", 404);
  }
  if (existing.isSystem) {
    throw new AppError(UsersErrorCodes.SYSTEM_ROLE_LOCKED, "لا يمكن أرشفة دور نظامي ثابت", 400);
  }

  // منع أرشفة دور مرتبط بمستخدمين نشطين حتى لا يفقدوا صلاحياتهم فجأة (تحليل §18).
  const activeUsers = await prisma.user.count({
    where: { roleId, status: { not: "archived" } },
  });
  if (activeUsers > 0) {
    throw new AppError(
      UsersErrorCodes.ROLE_HAS_USERS,
      "لا يمكن أرشفة دور مرتبط بمستخدمين — انقل المستخدمين لدور آخر أولًا",
      409,
      { activeUsers }
    );
  }

  const role = await prisma.$transaction(async (tx) => {
    const updated = await tx.role.update({
      where: { id: roleId },
      data: { status: "archived" },
      include: { permissions: true, _count: { select: { users: true } } },
    });

    await recordAuditLog(
      {
        userId: actorUserId,
        module: "users",
        action: "archive_role",
        entityId: roleId,
        oldValue: { status: existing.status },
        newValue: { status: updated.status },
      },
      tx
    );

    return updated;
  });

  return toRoleView(role);
}

type RoleWithRelations = {
  id: string;
  name: string;
  key: string;
  description: string | null;
  department: RoleView["department"];
  level: RoleView["level"];
  isSystem: boolean;
  status: RoleView["status"];
  createdAt: Date;
  updatedAt: Date;
  permissions: { permissionKey: string }[];
  _count: { users: number };
};

function toRoleView(role: RoleWithRelations): RoleView {
  return {
    id: role.id,
    name: role.name,
    key: role.key,
    description: role.description,
    department: role.department,
    level: role.level,
    isSystem: role.isSystem,
    status: role.status,
    permissionKeys: role.permissions.map((p) => p.permissionKey),
    userCount: role._count.users,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}
