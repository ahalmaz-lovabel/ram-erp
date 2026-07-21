"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPurchaseOrderAction } from "@/modules/purchasing/actions";

const inputCls =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";

interface SupplierOpt {
  id: string;
  name: string;
  code: string;
}

export function CreatePurchaseOrderForm({ suppliers }: { suppliers: SupplierOpt[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      supplierId: String(f.get("supplierId") ?? ""),
      expectedDate: String(f.get("expectedDate") ?? "") || undefined,
      notes: String(f.get("notes") ?? "") || undefined,
    };
    setError(null);
    startTransition(async () => {
      const res = await createPurchaseOrderAction(payload);
      if (res.success && res.data) {
        router.push(`/purchasing/${res.data.id}`);
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
        + أمر شراء جديد
      </button>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface p-5 text-sm text-muted">
        لا يوجد موردون نشطون — أضِف موردًا أولًا.{" "}
        <button onClick={() => setOpen(false)} className="text-brand hover:underline">
          إغلاق
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full flex-col gap-3 rounded-xl border border-line bg-surface p-5"
    >
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <select name="supplierId" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            المورد *
          </option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs text-muted">
          التوريد المتوقّع
          <input name="expectedDate" type="date" dir="ltr" className={`${inputCls} flex-1`} />
        </label>
      </div>
      <input name="notes" placeholder="ملاحظات (اختياري)" className={inputCls} />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          style={{ background: "var(--color-brand)" }}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "…" : "إنشاء ومتابعة"}
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
