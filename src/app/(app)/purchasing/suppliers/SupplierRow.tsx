"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSupplierAction, archiveSupplierAction } from "@/modules/purchasing/actions";
import type { SupplierStatus } from "@/modules/purchasing/types";

const inputCls =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";

interface SupplierData {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  contactPerson: string | null;
  taxNumber: string | null;
  notes: string | null;
  status: SupplierStatus;
  statusLabel: string;
  ordersCount: number;
}

const statusStyle: Record<SupplierStatus, { bg: string; color: string }> = {
  active: { bg: "oklch(0.92 0.06 150)", color: "oklch(0.35 0.12 150)" },
  suspended: { bg: "oklch(0.92 0.06 60)", color: "oklch(0.4 0.1 60)" },
  archived: { bg: "oklch(0.88 0.01 30)", color: "oklch(0.45 0.01 30)" },
};

export function SupplierRow({ supplier }: { supplier: SupplierData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: String(f.get("name") ?? ""),
      phone: String(f.get("phone") ?? ""),
      whatsapp: String(f.get("whatsapp") ?? ""),
      email: String(f.get("email") ?? ""),
      contactPerson: String(f.get("contactPerson") ?? ""),
      taxNumber: String(f.get("taxNumber") ?? ""),
      address: String(f.get("address") ?? ""),
      notes: String(f.get("notes") ?? ""),
    };
    setError(null);
    startTransition(async () => {
      const res = await updateSupplierAction(supplier.id, payload);
      if (res.success) {
        setEditing(false);
        router.refresh();
      } else setError(res.error?.message ?? "تعذّر الحفظ");
    });
  }

  function onArchive() {
    if (!confirm("أرشفة المورد؟ لن يظهر في قائمة الموردين النشطين.")) return;
    setError(null);
    startTransition(async () => {
      const res = await archiveSupplierAction(supplier.id);
      if (res.success) router.refresh();
      else setError(res.error?.message ?? "تعذّر الأرشفة");
    });
  }

  if (editing) {
    const formId = `supplier-${supplier.id}`;
    return (
      <tr className="border-b border-line last:border-0">
        <td className="px-4 py-2 font-mono text-muted" dir="ltr">
          {supplier.code}
        </td>
        <td className="px-4 py-2" colSpan={5}>
          <form id={formId} onSubmit={onSave} />
          {error && <div className="mb-2 text-xs text-red-600">{error}</div>}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <input
              form={formId}
              name="name"
              defaultValue={supplier.name}
              placeholder="الاسم"
              className={inputCls}
            />
            <input
              form={formId}
              name="phone"
              defaultValue={supplier.phone ?? ""}
              placeholder="الهاتف"
              dir="ltr"
              className={inputCls}
            />
            <input
              form={formId}
              name="whatsapp"
              defaultValue={supplier.whatsapp ?? ""}
              placeholder="واتساب"
              dir="ltr"
              className={inputCls}
            />
            <input
              form={formId}
              name="email"
              defaultValue={supplier.email ?? ""}
              placeholder="البريد"
              dir="ltr"
              className={inputCls}
            />
            <input
              form={formId}
              name="contactPerson"
              defaultValue={supplier.contactPerson ?? ""}
              placeholder="مسؤول التواصل"
              className={inputCls}
            />
            <input
              form={formId}
              name="taxNumber"
              defaultValue={supplier.taxNumber ?? ""}
              placeholder="الرقم الضريبي"
              dir="ltr"
              className={inputCls}
            />
            <input
              form={formId}
              name="address"
              defaultValue={supplier.address ?? ""}
              placeholder="العنوان"
              className={inputCls}
            />
            <input
              form={formId}
              name="notes"
              defaultValue={supplier.notes ?? ""}
              placeholder="ملاحظات"
              className={inputCls}
            />
          </div>
        </td>
        <td className="px-4 py-2 text-left align-top">
          <button
            form={formId}
            type="submit"
            disabled={pending}
            className="text-xs font-semibold text-brand hover:underline"
          >
            حفظ
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="ms-2 text-xs text-muted hover:underline"
          >
            إلغاء
          </button>
        </td>
      </tr>
    );
  }

  const st = statusStyle[supplier.status];
  return (
    <tr className="border-b border-line last:border-0 hover:bg-canvas">
      <td className="px-4 py-3 font-mono text-ink" dir="ltr">
        {supplier.code}
      </td>
      <td className="px-4 py-3 text-ink">
        {supplier.name}
        {supplier.email && (
          <span className="ms-2 text-[11px] text-muted" dir="ltr">
            {supplier.email}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-muted" dir="ltr">
        {supplier.phone ?? "—"}
      </td>
      <td className="px-4 py-3 text-muted">{supplier.contactPerson ?? "—"}</td>
      <td className="px-4 py-3 text-muted" dir="ltr">
        {supplier.ordersCount}
      </td>
      <td className="px-4 py-3">
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: st.bg, color: st.color }}
        >
          {supplier.statusLabel}
        </span>
      </td>
      <td className="px-4 py-3 text-left">
        {error && <div className="text-xs text-red-600">{error}</div>}
        <button
          onClick={() => setEditing(true)}
          className="text-xs font-semibold text-muted hover:text-brand"
        >
          تعديل
        </button>
        {supplier.status !== "archived" && (
          <button
            onClick={onArchive}
            disabled={pending}
            className="ms-2 text-xs font-semibold text-muted hover:text-red-600"
          >
            أرشفة
          </button>
        )}
      </td>
    </tr>
  );
}
