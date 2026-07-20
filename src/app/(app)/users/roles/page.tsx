import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { isAppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { getAllPermissions } from "@/modules/shared/permissions";
import { listRoles } from "@/modules/users/services/RolesService";
import { roleLevelLabel, roleStatusLabel, departmentLabel } from "@/modules/users/labels";
import { CreateRolePanel } from "./CreateRolePanel";

export default async function RolesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let roles: Awaited<ReturnType<typeof listRoles>> = [];
  let denied = false;
  try {
    roles = await listRoles(user.id);
  } catch (e) {
    if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) denied = true;
    else throw e;
  }

  const allPermissions = getAllPermissions()
    .map((p) => ({ key: p.key, module: p.module, label: p.label ?? p.action }))
    .sort((a, b) => a.key.localeCompare(b.key));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/users" className="text-sm text-muted hover:text-brand">
            ← المستخدمون
          </Link>
          <h1 className="mt-1 text-[26px] font-extrabold text-ink">الأدوار والصلاحيات</h1>
          <p className="mt-1 text-sm text-muted">قوالب الصلاحيات التي تُسند للمستخدمين</p>
        </div>
        {!denied && <CreateRolePanel allPermissions={allPermissions} />}
      </div>

      {denied ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا تملك صلاحية عرض الأدوار.
        </div>
      ) : roles.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا توجد أدوار بعد.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {roles.map((r) => (
            <Link
              key={r.id}
              href={`/users/roles/${r.id}`}
              className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-ink">{r.name}</span>
                <span className="font-mono text-[11px] text-muted" dir="ltr">
                  {r.key}
                </span>
              </div>
              {r.description && <p className="text-xs text-muted">{r.description}</p>}
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                <span>{roleLevelLabel[r.level]}</span>
                {r.isSystem && <span className="text-brand">دور نظامي</span>}
                {r.department && <span>· {departmentLabel[r.department]}</span>}
                <span>· {roleStatusLabel[r.status]}</span>
                <span>· {r.permissionKeys.length} صلاحية</span>
                <span>· {r.userCount} مستخدم</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
