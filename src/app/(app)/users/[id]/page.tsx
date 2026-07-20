import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { isAppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { getAllPermissions } from "@/modules/shared/permissions";
import { getUser } from "@/modules/users/services/UsersService";
import { listRoles } from "@/modules/users/services/RolesService";
import { viewUserPermissions } from "@/modules/users/services/PermissionService";
import { UserManage } from "./UserManage";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");
  const { id } = await params;

  let target: Awaited<ReturnType<typeof getUser>>;
  try {
    target = await getUser(actor.id, id);
  } catch (e) {
    if (isAppError(e) && e.code === CommonErrorCodes.NOT_FOUND) notFound();
    if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) {
      return (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا تملك صلاحية عرض المستخدمين.
        </div>
      );
    }
    throw e;
  }

  const roles = (await listRoles(actor.id).catch(() => [])).filter(
    (r) => r.level === "standard" && r.status === "active"
  );

  // تفصيل الصلاحيات الفعّالة (دور + منح + سحب). قد يكون بصلاحية منفصلة.
  const breakdown = await viewUserPermissions(actor.id, id).catch((e) => {
    if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) return null;
    throw e;
  });

  const allPermissions = getAllPermissions()
    .map((p) => ({ key: p.key, module: p.module, label: p.label ?? p.action }))
    .sort((a, b) => a.key.localeCompare(b.key));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/users" className="text-sm text-muted hover:text-brand">
          ← المستخدمون
        </Link>
        <h1 className="mt-1 text-[26px] font-extrabold text-ink">{target.fullName}</h1>
        <p className="mt-1 text-sm text-muted" dir="ltr">
          {target.email}
        </p>
      </div>

      <UserManage
        user={{
          id: target.id,
          fullName: target.fullName,
          phone: target.phone,
          whatsapp: target.whatsapp,
          department: target.department,
          jobTitle: target.jobTitle,
          roleId: target.roleId,
          status: target.status,
          isSystemOwner: target.isSystemOwner,
          mustChangePassword: target.mustChangePassword,
          adminNotes: target.adminNotes,
          lastLoginAt: target.lastLoginAt ? target.lastLoginAt.toISOString() : null,
        }}
        roles={roles.map((r) => ({ id: r.id, name: r.name }))}
        breakdown={breakdown}
        allPermissions={allPermissions}
        isSelf={actor.id === target.id}
      />
    </div>
  );
}
