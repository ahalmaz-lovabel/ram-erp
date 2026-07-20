"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUserAction } from "@/modules/users/actions";
import { departmentOptions } from "@/modules/users/labels";

const inputCls =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";

interface RoleOpt {
  id: string;
  name: string;
}

export function CreateUserForm({ roles }: { roles: RoleOpt[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      fullName: String(f.get("fullName") ?? ""),
      email: String(f.get("email") ?? ""),
      phone: String(f.get("phone") ?? "") || undefined,
      whatsapp: String(f.get("whatsapp") ?? "") || undefined,
      department: String(f.get("department") ?? "") || undefined,
      jobTitle: String(f.get("jobTitle") ?? "") || undefined,
      roleId: String(f.get("roleId") ?? ""),
      password: String(f.get("password") ?? ""),
      mustChangePassword: f.get("mustChangePassword") === "on",
      adminNotes: String(f.get("adminNotes") ?? "") || undefined,
    };
    setError(null);
    startTransition(async () => {
      const res = await createUserAction(payload);
      if (res.success && res.data) {
        router.push(`/users/${res.data.id}`);
      } else setError(res.error?.message ?? "تعذّر الحفظ");
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ background: "var(--color-brand)" }}
        className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
      >
        + مستخدم جديد
      </button>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface p-5 text-sm text-muted">
        لا توجد أدوار تشغيلية متاحة — أنشئ دورًا أولًا من{" "}
        <span className="font-semibold">الأدوار</span>.{" "}
        <button onClick={() => setOpen(false)} className="text-brand hover:underline">
          إغلاق
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5"
    >
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input name="fullName" required placeholder="الاسم الكامل *" className={inputCls} />
        <input
          name="email"
          required
          type="email"
          placeholder="بريد الدخول *"
          dir="ltr"
          className={inputCls}
        />
        <input name="phone" placeholder="الهاتف" dir="ltr" className={inputCls} />
        <input name="whatsapp" placeholder="واتساب" dir="ltr" className={inputCls} />
        <select name="department" defaultValue="" className={inputCls}>
          <option value="">القسم —</option>
          {departmentOptions.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <input name="jobTitle" placeholder="المسمى الوظيفي" className={inputCls} />
        <select name="roleId" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            الدور الأساسي *
          </option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <input
          name="password"
          required
          type="text"
          placeholder="كلمة مرور مبدئية * (8 أحرف على الأقل)"
          dir="ltr"
          className={inputCls}
        />
      </div>
      <input name="adminNotes" placeholder="ملاحظات إدارية" className={inputCls} />
      <label className="flex items-center gap-2 text-sm text-ink">
        <input name="mustChangePassword" type="checkbox" defaultChecked className="h-4 w-4" />
        يجب تغيير كلمة المرور عند أول دخول
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          style={{ background: "var(--color-brand)" }}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "…" : "إنشاء"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
