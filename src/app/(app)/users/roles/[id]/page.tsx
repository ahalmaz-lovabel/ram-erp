import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { isAppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { getAllPermissions } from "@/modules/shared/permissions";
import { getRole } from "@/modules/users/services/RolesService";
import { roleLevelLabel, moduleLabel } from "@/modules/users/labels";
import { RoleForm } from "../RoleForm";

export default async function RoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  let role: Awaited<ReturnType<typeof getRole>>;
  try {
    role = await getRole(user.id, id);
  } catch (e) {
    if (isAppError(e) && e.code === CommonErrorCodes.NOT_FOUND) notFound();
    if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) {
      return (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا تملك صلاحية عرض الأدوار.
        </div>
      );
    }
    throw e;
  }

  const allPermissions = getAllPermissions()
    .map((p) => ({ key: p.key, module: p.module, label: p.label ?? p.action }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const selected = new Set(role.permissionKeys);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/users/roles" className="text-sm text-muted hover:text-brand">
          ← الأدوار
        </Link>
        <h1 className="mt-1 text-[26px] font-extrabold text-ink">{role.name}</h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted">
          <span className="font-mono" dir="ltr">
            {role.key}
          </span>
          <span>· {roleLevelLabel[role.level]}</span>
          <span>· {role.userCount} مستخدم</span>
        </p>
      </div>

      {role.isSystem ? (
        // الأدوار النظامية محمية من التعديل البنيوي — عرض للقراءة فقط.
        <div className="flex flex-col gap-4">
          <div className="rounded-lg bg-canvas px-4 py-3 text-sm text-muted">
            هذا دور نظامي محمي — صلاحياته ثابتة ولا يمكن تعديلها.
          </div>
          <PermissionsReadOnly allPermissions={allPermissions} selected={selected} />
        </div>
      ) : (
        <RoleForm
          allPermissions={allPermissions}
          existing={{
            id: role.id,
            name: role.name,
            description: role.description,
            department: role.department,
            permissionKeys: role.permissionKeys,
          }}
        />
      )}
    </div>
  );
}

function PermissionsReadOnly({
  allPermissions,
  selected,
}: {
  allPermissions: { key: string; module: string; label: string }[];
  selected: Set<string>;
}) {
  const byModule = new Map<string, { key: string; module: string; label: string }[]>();
  for (const p of allPermissions) {
    const arr = byModule.get(p.module) ?? [];
    arr.push(p);
    byModule.set(p.module, arr);
  }
  return (
    <div className="flex flex-col gap-4">
      {[...byModule.entries()].map(([mod, perms]) => (
        <div key={mod} className="rounded-lg border border-line bg-surface p-4">
          <div className="mb-2 text-sm font-bold text-ink">{moduleLabel[mod] ?? mod}</div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {perms.map((p) => (
              <div key={p.key} className="flex items-center gap-2 text-sm">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${selected.has(p.key) ? "bg-green-500" : "bg-gray-300"}`}
                />
                <span className={selected.has(p.key) ? "text-ink" : "text-muted"}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
