"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupplierAction } from "@/modules/purchasing/actions";

const inputCls =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";

export function CreateSupplierForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      code: String(f.get("code") ?? ""),
      name: String(f.get("name") ?? ""),
      phone: String(f.get("phone") ?? "") || undefined,
      whatsapp: String(f.get("whatsapp") ?? "") || undefined,
      email: String(f.get("email") ?? "") || undefined,
      address: String(f.get("address") ?? "") || undefined,
      contactPerson: String(f.get("contactPerson") ?? "") || undefined,
      taxNumber: String(f.get("taxNumber") ?? "") || undefined,
      notes: String(f.get("notes") ?? "") || undefined,
    };
    setError(null);
    startTransition(async () => {
      const res = await createSupplierAction(payload);
      if (res.success) {
        setOpen(false);
        router.refresh();
      } else setError(res.error?.message ?? "تعذّر الإنشاء");
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ background: "var(--color-brand)" }}
        className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
      >
        + مورد جديد
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full flex-col gap-3 rounded-xl border border-line bg-surface p-5"
    >
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input name="code" required placeholder="كود المورد *" className={inputCls} />
        <input name="name" required placeholder="اسم المورد *" className={inputCls} />
        <input name="phone" placeholder="الهاتف" dir="ltr" className={inputCls} />
        <input name="whatsapp" placeholder="واتساب" dir="ltr" className={inputCls} />
        <input name="email" type="email" placeholder="البريد" dir="ltr" className={inputCls} />
        <input name="contactPerson" placeholder="مسؤول التواصل" className={inputCls} />
        <input name="taxNumber" placeholder="الرقم الضريبي" dir="ltr" className={inputCls} />
        <input name="address" placeholder="العنوان" className={inputCls} />
      </div>
      <input name="notes" placeholder="ملاحظات (اختياري)" className={inputCls} />
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
