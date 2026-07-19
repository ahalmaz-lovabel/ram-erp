"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateContactAction, removeContactAction } from "@/modules/customers/actions";
import { contactDepartmentLabel } from "@/modules/customers/labels";

const inputCls =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";

export interface ContactData {
  id: string;
  name: string;
  jobTitle: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  isPrimary: boolean;
  department: string | null;
}

export function ContactRow({ contact }: { contact: ContactData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSave(e: React.FormEvent<HTMLFormElement>) {
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
    };
    setError(null);
    startTransition(async () => {
      const res = await updateContactAction(contact.id, payload);
      if (res.success) {
        setEditing(false);
        router.refresh();
      } else setError(res.error?.message ?? "تعذّر الحفظ");
    });
  }

  function onRemove() {
    if (!confirm("حذف جهة التواصل؟")) return;
    startTransition(async () => {
      const res = await removeContactAction(contact.id);
      if (res.success) router.refresh();
      else alert(res.error?.message ?? "تعذّر الحذف");
    });
  }

  if (editing) {
    return (
      <form
        onSubmit={onSave}
        className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4"
      >
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            name="name"
            required
            defaultValue={contact.name}
            placeholder="الاسم *"
            className={inputCls}
          />
          <input
            name="jobTitle"
            defaultValue={contact.jobTitle ?? ""}
            placeholder="المسمى"
            className={inputCls}
          />
          <input
            name="phone"
            defaultValue={contact.phone ?? ""}
            placeholder="الهاتف"
            dir="ltr"
            className={inputCls}
          />
          <input
            name="whatsapp"
            defaultValue={contact.whatsapp ?? ""}
            placeholder="واتساب"
            dir="ltr"
            className={inputCls}
          />
          <input
            name="email"
            type="email"
            defaultValue={contact.email ?? ""}
            placeholder="البريد"
            dir="ltr"
            className={inputCls}
          />
          <select name="department" defaultValue={contact.department ?? ""} className={inputCls}>
            <option value="">القسم —</option>
            {Object.entries(contactDepartmentLabel).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            name="isPrimary"
            type="checkbox"
            defaultChecked={contact.isPrimary}
            className="h-4 w-4 accent-[oklch(0.45_0.2_25)]"
          />
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
            onClick={() => setEditing(false)}
            className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink"
          >
            إلغاء
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-line bg-white px-4 py-3">
      <span className="font-semibold text-ink">{contact.name}</span>
      {contact.isPrimary && (
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
          style={{ background: "var(--color-brand)" }}
        >
          أساسية
        </span>
      )}
      {contact.jobTitle && <span className="text-sm text-muted">{contact.jobTitle}</span>}
      {contact.department && (
        <span className="text-xs text-muted">
          · {contactDepartmentLabel[contact.department as keyof typeof contactDepartmentLabel]}
        </span>
      )}
      {contact.phone && (
        <span className="text-sm text-muted" dir="ltr">
          {contact.phone}
        </span>
      )}
      <span className="ms-auto flex gap-2">
        <button
          onClick={() => setEditing(true)}
          className="text-xs font-semibold text-muted hover:text-brand"
        >
          تعديل
        </button>
        <button
          onClick={onRemove}
          disabled={pending}
          className="text-xs font-semibold text-muted hover:text-red-600"
        >
          حذف
        </button>
      </span>
    </div>
  );
}
