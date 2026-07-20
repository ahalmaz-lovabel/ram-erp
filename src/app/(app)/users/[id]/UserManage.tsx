"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateUserAction,
  suspendUserAction,
  reactivateUserAction,
  archiveUserAction,
  resetPasswordAction,
  setUserPermissionAction,
} from "@/modules/users/actions";
import {
  departmentOptions,
  departmentLabel,
  userStatusLabel,
  userStatusBadge,
  moduleLabel,
} from "@/modules/users/labels";
import type { Department, UserStatus } from "@/modules/users/types";
import type { EffectivePermissionsBreakdown } from "@/modules/users/types";

const inputCls =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";
const btnPrimary =
  "rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition hover:opacity-90";
const btnGhost =
  "rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-brand";
const brand = { background: "var(--color-brand)" };

interface UserData {
  id: string;
  fullName: string;
  phone: string | null;
  whatsapp: string | null;
  department: Department | null;
  jobTitle: string | null;
  roleId: string;
  status: UserStatus;
  isSystemOwner: boolean;
  mustChangePassword: boolean;
  adminNotes: string | null;
  lastLoginAt: string | null;
}
interface RoleOpt {
  id: string;
  name: string;
}
interface PermDef {
  key: string;
  module: string;
  label: string;
}

interface Props {
  user: UserData;
  roles: RoleOpt[];
  breakdown: EffectivePermissionsBreakdown | null;
  allPermissions: PermDef[];
  isSelf: boolean;
}

export function UserManage({ user, roles, breakdown, allPermissions, isSelf }: Props) {
  const badge = userStatusBadge[user.status];
  const canManage = !user.isSystemOwner && !isSelf;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ background: badge.bg, color: badge.color }}
        >
          {userStatusLabel[user.status]}
        </span>
        {user.isSystemOwner && (
          <span className="text-xs font-semibold text-brand">مالك النظام (محمي)</span>
        )}
        {user.lastLoginAt && (
          <span className="text-xs text-muted">
            آخر دخول: {new Date(user.lastLoginAt).toLocaleString("ar-EG")}
          </span>
        )}
      </div>

      <InfoPanel user={user} roles={roles} />

      {canManage && <StatusPanel userId={user.id} status={user.status} />}

      {canManage && <PasswordPanel userId={user.id} />}

      <PermissionsPanel
        userId={user.id}
        breakdown={breakdown}
        allPermissions={allPermissions}
        canManage={canManage}
      />
    </div>
  );
}

// ===== البيانات + التعديل =====

function InfoPanel({ user, roles }: { user: UserData; roles: RoleOpt[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      fullName: String(f.get("fullName") ?? ""),
      phone: String(f.get("phone") ?? ""),
      whatsapp: String(f.get("whatsapp") ?? ""),
      department: String(f.get("department") ?? ""),
      jobTitle: String(f.get("jobTitle") ?? ""),
      roleId: String(f.get("roleId") ?? ""),
      adminNotes: String(f.get("adminNotes") ?? ""),
    };
    setError(null);
    startTransition(async () => {
      const res = await updateUserAction(user.id, payload);
      if (res.success) {
        setEditing(false);
        router.refresh();
      } else setError(res.error?.message ?? "تعذّر الحفظ");
    });
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">البيانات</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-brand hover:underline"
          >
            تعديل
          </button>
        )}
      </div>

      {!editing ? (
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
          <Field label="الاسم" value={user.fullName} />
          <Field label="الهاتف" value={user.phone ?? "—"} ltr />
          <Field label="واتساب" value={user.whatsapp ?? "—"} ltr />
          <Field label="القسم" value={user.department ? departmentLabel[user.department] : "—"} />
          <Field label="المسمى الوظيفي" value={user.jobTitle ?? "—"} />
          <Field label="ملاحظات إدارية" value={user.adminNotes ?? "—"} />
        </dl>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              name="fullName"
              required
              defaultValue={user.fullName}
              placeholder="الاسم"
              className={inputCls}
            />
            <input
              name="phone"
              defaultValue={user.phone ?? ""}
              placeholder="الهاتف"
              dir="ltr"
              className={inputCls}
            />
            <input
              name="whatsapp"
              defaultValue={user.whatsapp ?? ""}
              placeholder="واتساب"
              dir="ltr"
              className={inputCls}
            />
            <select name="department" defaultValue={user.department ?? ""} className={inputCls}>
              <option value="">القسم —</option>
              {departmentOptions.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <input
              name="jobTitle"
              defaultValue={user.jobTitle ?? ""}
              placeholder="المسمى الوظيفي"
              className={inputCls}
            />
            <select name="roleId" defaultValue={user.roleId} className={inputCls}>
              {roles.every((r) => r.id !== user.roleId) && (
                <option value={user.roleId}>الدور الحالي (غير قابل للتغيير هنا)</option>
              )}
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <input
            name="adminNotes"
            defaultValue={user.adminNotes ?? ""}
            placeholder="ملاحظات إدارية"
            className={inputCls}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={pending} style={brand} className={btnPrimary}>
              {pending ? "…" : "حفظ"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={btnGhost}>
              إلغاء
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function Field({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="mt-0.5 text-ink" dir={ltr ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}

// ===== الحالة (إيقاف/تفعيل/أرشفة) =====

function StatusPanel({ userId, status }: { userId: string; status: UserStatus }) {
  const router = useRouter();
  const [action, setAction] = useState<"suspend" | "archive" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ success: boolean; error?: { message?: string } }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.success) {
        setAction(null);
        router.refresh();
      } else setError(res.error?.message ?? "تعذّر التنفيذ");
    });
  }

  function onReasonSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
    if (action === "suspend") run(() => suspendUserAction(userId, { reason }));
    else if (action === "archive") run(() => archiveUserAction(userId, { reason }));
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-lg font-bold text-ink">الحالة</h2>
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}

      {action ? (
        <form onSubmit={onReasonSubmit} className="mt-3 flex flex-col gap-3">
          <input
            name="reason"
            required
            placeholder={action === "suspend" ? "سبب الإيقاف *" : "سبب الأرشفة *"}
            className={inputCls}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={pending} style={brand} className={btnPrimary}>
              {pending ? "…" : "تأكيد"}
            </button>
            <button type="button" onClick={() => setAction(null)} className={btnGhost}>
              إلغاء
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {status === "active" ? (
            <button onClick={() => setAction("suspend")} className={btnGhost}>
              إيقاف مؤقت
            </button>
          ) : status === "suspended" || status === "locked" ? (
            <button
              onClick={() => run(() => reactivateUserAction(userId))}
              disabled={pending}
              style={brand}
              className={btnPrimary}
            >
              إعادة تفعيل
            </button>
          ) : null}
          {status !== "archived" && (
            <button
              onClick={() => setAction("archive")}
              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              أرشفة
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// ===== إعادة تعيين كلمة المرور =====

function PasswordPanel({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      newPassword: String(f.get("newPassword") ?? ""),
      mustChangePassword: f.get("mustChangePassword") === "on",
    };
    setError(null);
    startTransition(async () => {
      const res = await resetPasswordAction(userId, payload);
      if (res.success) {
        setOpen(false);
        setDone(true);
        router.refresh();
      } else setError(res.error?.message ?? "تعذّر التنفيذ");
    });
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">كلمة المرور</h2>
        {!open && (
          <button
            onClick={() => {
              setOpen(true);
              setDone(false);
            }}
            className="text-xs font-semibold text-brand hover:underline"
          >
            إعادة تعيين
          </button>
        )}
      </div>
      {done && <div className="mt-2 text-sm text-green-700">تم تعيين كلمة مرور جديدة.</div>}
      {open && (
        <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-3">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <input
            name="newPassword"
            required
            type="text"
            placeholder="كلمة المرور الجديدة * (8 أحرف على الأقل)"
            dir="ltr"
            className={inputCls}
          />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input name="mustChangePassword" type="checkbox" defaultChecked className="h-4 w-4" />
            يجب تغييرها عند أول دخول
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} style={brand} className={btnPrimary}>
              {pending ? "…" : "تعيين"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
              إلغاء
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

// ===== الصلاحيات الفعّالة + الاستثناءات =====

function PermissionsPanel({
  userId,
  breakdown,
  allPermissions,
  canManage,
}: {
  userId: string;
  breakdown: EffectivePermissionsBreakdown | null;
  allPermissions: PermDef[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<{ key: string; effect: "grant" | "revoke" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const fromRole = useMemo(() => new Set(breakdown?.fromRole ?? []), [breakdown]);
  const granted = useMemo(() => new Set(breakdown?.granted ?? []), [breakdown]);
  const revoked = useMemo(() => new Set(breakdown?.revoked ?? []), [breakdown]);
  const effective = useMemo(() => new Set(breakdown?.effective ?? []), [breakdown]);

  const byModule = useMemo(() => {
    const map = new Map<string, PermDef[]>();
    for (const p of allPermissions) {
      const arr = map.get(p.module) ?? [];
      arr.push(p);
      map.set(p.module, arr);
    }
    return [...map.entries()];
  }, [allPermissions]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!target) return;
    const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
    setError(null);
    startTransition(async () => {
      const res = await setUserPermissionAction(userId, {
        permissionKey: target.key,
        effect: target.effect,
        reason,
      });
      if (res.success) {
        setTarget(null);
        router.refresh();
      } else setError(res.error?.message ?? "تعذّر التنفيذ");
    });
  }

  if (!breakdown) {
    return (
      <section className="rounded-xl border border-line bg-surface p-5 text-sm text-muted">
        لا تملك صلاحية عرض صلاحيات المستخدمين.
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-lg font-bold text-ink">الصلاحيات الفعّالة</h2>
      <p className="mt-1 text-xs text-muted">
        الأساس من الدور، مع إمكانية منح إضافي أو سحب استثنائي لكل مستخدم.
      </p>

      {target && (
        <form onSubmit={onSubmit} className="mt-3 rounded-lg border border-line bg-white p-4">
          <div className="text-sm text-ink">
            {target.effect === "grant" ? "منح" : "سحب"} صلاحية:{" "}
            <span className="font-mono" dir="ltr">
              {target.key}
            </span>
          </div>
          {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              name="reason"
              required
              placeholder="سبب التغيير *"
              className={`${inputCls} flex-1`}
            />
            <button type="submit" disabled={pending} style={brand} className={btnPrimary}>
              {pending ? "…" : "تأكيد"}
            </button>
            <button type="button" onClick={() => setTarget(null)} className={btnGhost}>
              إلغاء
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 flex flex-col gap-5">
        {byModule.map(([mod, perms]) => (
          <div key={mod}>
            <div className="mb-2 text-sm font-bold text-ink">{moduleLabel[mod] ?? mod}</div>
            <div className="flex flex-col gap-1.5">
              {perms.map((p) => {
                const isEffective = effective.has(p.key);
                const source = revoked.has(p.key)
                  ? { text: "مسحوبة", cls: "text-red-600" }
                  : granted.has(p.key)
                    ? { text: "ممنوحة إضافيًا", cls: "text-green-700" }
                    : fromRole.has(p.key)
                      ? { text: "من الدور", cls: "text-muted" }
                      : { text: "غير مفعّلة", cls: "text-muted" };
                return (
                  <div
                    key={p.key}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-white px-3 py-2"
                  >
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${isEffective ? "bg-green-500" : "bg-gray-300"}`}
                    />
                    <span className="text-sm text-ink">{p.label}</span>
                    <span className="font-mono text-[10px] text-muted" dir="ltr">
                      {p.key}
                    </span>
                    <span className={`text-[11px] ${source.cls}`}>{source.text}</span>
                    {canManage && (
                      <span className="ms-auto flex gap-2">
                        <button
                          onClick={() => setTarget({ key: p.key, effect: "grant" })}
                          className="text-[11px] font-semibold text-green-700 hover:underline"
                        >
                          منح
                        </button>
                        <button
                          onClick={() => setTarget({ key: p.key, effect: "revoke" })}
                          className="text-[11px] font-semibold text-red-600 hover:underline"
                        >
                          سحب
                        </button>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
