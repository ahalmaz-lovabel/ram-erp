"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addContactAction } from "@/modules/customers/actions";
import { contactDepartmentLabel } from "@/modules/customers/labels";

const inputCls =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";

export function AddContactForm({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: String(f.get("name") ?? ""),
      jobTitle: String(f.get("jobTitle") ?? ""),
      phone: String(f.get("phone") ?? ""),
      whatsapp: String(f.get("whatsapp") ?? ""),
      email: String(f.get("email") ?? ""),
      department: String(f.get("department") ?? "") || undefined,
      isPrimary: f.get("isPrimary") === "on",
      notes: String(f.get("notes") ?? ""),
    };
    setError(null);
    startTransition(async () => {
      const res = await addContactAction(customerId, payload);
      if (res.success) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error?.message ?? "تعذّر الحفظ");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas"
      >
        + إضافة جهة تواصل
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 flex flex-col gap-3 rounded-lg border border-line bg-white p-4"
    >
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input name="name" required placeholder="الاسم *" className={inputCls} />
        <input name="jobTitle" placeholder="المسمى الوظيفي" className={inputCls} />
        <input name="phone" placeholder="الهاتف" dir="ltr" className={inputCls} />
        <input name="whatsapp" placeholder="واتساب" dir="ltr" className={inputCls} />
        <input name="email" type="email" placeholder="البريد" dir="ltr" className={inputCls} />
        <select name="department" defaultValue="" className={inputCls}>
          <option value="">القسم —</option>
          {Object.entries(contactDepartmentLabel).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input name="isPrimary" type="checkbox" className="h-4 w-4 accent-[oklch(0.45_0.2_25)]" />
        جهة تواصل أساسية
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          style={{ background: "var(--color-brand)" }}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "…" : "حفظ"}
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
