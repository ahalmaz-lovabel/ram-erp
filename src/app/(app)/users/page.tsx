import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { isAppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { listUsers } from "@/modules/users/services/UsersService";
import { listRoles } from "@/modules/users/services/RolesService";
import { userStatusLabel, userStatusBadge, departmentLabel } from "@/modules/users/labels";
import { CreateUserForm } from "./CreateUserForm";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let users: Awaited<ReturnType<typeof listUsers>> = [];
  let denied = false;
  try {
    users = await listUsers(user.id);
  } catch (e) {
    if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) denied = true;
    else throw e;
  }

  // أدوار الإسناد المتاحة (تشغيلية نشطة) لنموذج الإنشاء. قد تكون بصلاحية منفصلة.
  const roles = await listRoles(user.id).catch((e) => {
    if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) return [];
    throw e;
  });
  const assignableRoles = roles
    .filter((r) => r.level === "standard" && r.status === "active")
    .map((r) => ({ id: r.id, name: r.name }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold text-ink">المستخدمون</h1>
          <p className="mt-1 text-sm text-muted">حسابات الموظفين وأدوارهم وصلاحياتهم</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/users/roles"
            className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:border-brand"
          >
            الأدوار
          </Link>
          {!denied && <CreateUserForm roles={assignableRoles} />}
        </div>
      </div>

      {denied ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا تملك صلاحية عرض المستخدمين.
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا يوجد مستخدمون بعد.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-right text-xs text-muted">
                <th className="px-4 py-3 font-semibold">الاسم</th>
                <th className="px-4 py-3 font-semibold">البريد</th>
                <th className="px-4 py-3 font-semibold">القسم</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const badge = userStatusBadge[u.status];
                return (
                  <tr key={u.id} className="border-b border-line last:border-0 hover:bg-canvas">
                    <td className="px-4 py-3 font-semibold text-ink">
                      {u.fullName}
                      {u.isSystemOwner && (
                        <span className="ms-2 text-[10px] text-brand">مالك النظام</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted" dir="ltr">
                      {u.email}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {u.department ? departmentLabel[u.department] : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        {userStatusLabel[u.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <Link
                        href={`/users/${u.id}`}
                        className="text-xs font-semibold text-brand hover:underline"
                      >
                        إدارة ←
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
