"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCustomerAction } from "@/modules/customers/actions";
import { customerTypeLabel, customerSourceLabel } from "@/modules/customers/labels";

const inputCls =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";

export interface EditableCustomer {
  id: string;
  name: string;
  type: string;
  isImportant: boolean;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  address: string | null;
  taxNumber: string | null;
  source: string | null;
  notes: string | null;
}

export function EditCustomerForm({ customer }: { customer: EditableCustomer }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: String(f.get("name") ?? ""),
      type: String(f.get("type") ?? ""),
      isImportant: f.get("isImportant") === "on",
      phone: String(f.get("phone") ?? ""),
      whatsapp: String(f.get("whatsapp") ?? ""),
      email: String(f.get("email") ?? ""),
      city: String(f.get("city") ?? ""),
      country: String(f.get("country") ?? ""),
      address: String(f.get("address") ?? ""),
      taxNumber: String(f.get("taxNumber") ?? ""),
      source: String(f.get("source") ?? "") || undefined,
      notes: String(f.get("notes") ?? ""),
    };
    setError(null);
    startTransition(async () => {
      const res = await updateCustomerAction(customer.id, payload);
      if (res.success) router.push(`/customers/${customer.id}`);
      else setError(res.error?.message ?? "تعذّر الحفظ");
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-6"
    >
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="اسم العميل *">
          <input name="name" required defaultValue={customer.name} className={inputCls} />
        </Field>
        <Field label="النوع *">
          <select name="type" required defaultValue={customer.type} className={inputCls}>
            {Object.entries(customerTypeLabel).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="المصدر">
          <select name="source" defaultValue={customer.source ?? ""} className={inputCls}>
            <option value="">—</option>
            {Object.entries(customerSourceLabel).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="الهاتف">
          <input name="phone" defaultValue={customer.phone ?? ""} dir="ltr" className={inputCls} />
        </Field>
        <Field label="واتساب">
          <input
            name="whatsapp"
            defaultValue={customer.whatsapp ?? ""}
            dir="ltr"
            className={inputCls}
          />
        </Field>
        <Field label="البريد">
          <input
            name="email"
            type="email"
            defaultValue={customer.email ?? ""}
            dir="ltr"
            className={inputCls}
          />
        </Field>
        <Field label="المدينة">
          <input name="city" defaultValue={customer.city ?? ""} className={inputCls} />
        </Field>
        <Field label="الدولة">
          <input name="country" defaultValue={customer.country ?? ""} className={inputCls} />
        </Field>
        <Field label="الرقم الضريبي">
          <input
            name="taxNumber"
            defaultValue={customer.taxNumber ?? ""}
            dir="ltr"
            className={inputCls}
          />
        </Field>
      </div>
      <Field label="العنوان">
        <input name="address" defaultValue={customer.address ?? ""} className={inputCls} />
      </Field>
      <Field label="ملاحظات">
        <textarea name="notes" rows={3} defaultValue={customer.notes ?? ""} className={inputCls} />
      </Field>
      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input
          name="isImportant"
          type="checkbox"
          defaultChecked={customer.isImportant}
          className="h-4 w-4 accent-[oklch(0.45_0.2_25)]"
        />
        عميل مهم
      </label>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          style={{ background: "var(--color-brand)" }}
          className="rounded-lg px-5 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "جارٍ الحفظ…" : "حفظ التعديلات"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/customers/${customer.id}`)}
          className="rounded-lg border border-line bg-white px-5 py-2.5 font-semibold text-ink hover:bg-canvas"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
