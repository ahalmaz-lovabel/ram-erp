"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRoleAction, updateRoleAction } from "@/modules/users/actions";
import { departmentOptions, moduleLabel } from "@/modules/users/labels";
import type { Department } from "@/modules/users/types";

const inputCls =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";
const btnPrimary =
  "rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition hover:opacity-90";
const btnGhost =
  "rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-brand";
const brand = { background: "var(--color-brand)" };

interface PermDef {
  key: string;
  module: string;
  label: string;
}
interface ExistingRole {
  id: string;
  name: string;
  description: string | null;
  department: Department | null;
  permissionKeys: string[];
}

export function RoleForm({
  allPermissions,
  existing,
  onDone,
}: {
  allPermissions: PermDef[];
  existing?: ExistingRole;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(existing?.permissionKeys ?? [])
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const byModule = useMemo(() => {
    const map = new Map<string, PermDef[]>();
    for (const p of allPermissions) {
      const arr = map.get(p.module) ?? [];
      arr.push(p);
      map.set(p.module, arr);
    }
    return [...map.entries()];
  }, [allPermissions]);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleModule(perms: PermDef[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of perms) {
        if (on) next.add(p.key);
        else next.delete(p.key);
      }
      return next;
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const permissionKeys = [...selected];
    setError(null);
    startTransition(async () => {
      const res = existing
        ? await updateRoleAction(existing.id, {
            name: String(f.get("name") ?? ""),
            description: String(f.get("description") ?? "") || undefined,
            department: String(f.get("department") ?? "") || undefined,
            permissionKeys,
          })
        : await createRoleAction({
            name: String(f.get("name") ?? ""),
            key: String(f.get("key") ?? ""),
            description: String(f.get("description") ?? "") || undefined,
            department: String(f.get("department") ?? "") || undefined,
            permissionKeys,
          });
      if (res.success) {
        if (onDone) onDone();
        if (!existing && res.data && typeof res.data === "object" && "id" in res.data) {
          router.push(`/users/roles/${(res.data as { id: string }).id}`);
        } else router.refresh();
      } else setError(res.error?.message ?? "تعذّر الحفظ");
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5"
    >
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          name="name"
          required
          defaultValue={existing?.name}
          placeholder="اسم الدور *"
          className={inputCls}
        />
        {!existing && (
          <input
            name="key"
            required
            placeholder="معرّف الدور * (حروف إنجليزية صغيرة وأرقام وشرطة)"
            dir="ltr"
            className={inputCls}
          />
        )}
        <select name="department" defaultValue={existing?.department ?? ""} className={inputCls}>
          <option value="">القسم —</option>
          {departmentOptions.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <input
          name="description"
          defaultValue={existing?.description ?? ""}
          placeholder="وصف الدور"
          className={`${inputCls} sm:col-span-2`}
        />
      </div>

      <div>
        <div className="mb-2 text-sm font-bold text-ink">الصلاحيات ({selected.size} مختارة)</div>
        <div className="flex flex-col gap-4">
          {byModule.map(([mod, perms]) => {
            const allOn = perms.every((p) => selected.has(p.key));
            return (
              <div key={mod} className="rounded-lg border border-line bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{moduleLabel[mod] ?? mod}</span>
                  <button
                    type="button"
                    onClick={() => toggleModule(perms, !allOn)}
                    className="text-[11px] font-semibold text-brand hover:underline"
                  >
                    {allOn ? "إلغاء الكل" : "تحديد الكل"}
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {perms.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={selected.has(p.key)}
                        onChange={() => toggle(p.key)}
                        className="h-4 w-4"
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={pending} style={brand} className={btnPrimary}>
          {pending ? "…" : existing ? "حفظ التعديلات" : "إنشاء الدور"}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className={btnGhost}>
            إلغاء
          </button>
        )}
      </div>
    </form>
  );
}
