"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDealAction } from "@/modules/customers/actions";
import { dealTypeLabel, customerSourceLabel } from "@/modules/customers/labels";

const inputCls =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";

export function AddDealForm({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: String(f.get("name") ?? ""),
      type: String(f.get("type") ?? ""),
      source: String(f.get("source") ?? "") || undefined,
      estimatedValue: String(f.get("estimatedValue") ?? "") || undefined,
      expectedCloseDate: String(f.get("expectedCloseDate") ?? "") || undefined,
      notes: String(f.get("notes") ?? ""),
    };
    setError(null);
    startTransition(async () => {
      const res = await createDealAction(customerId, payload);
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
        + إضافة صفقة
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
        <input name="name" required placeholder="اسم الصفقة *" className={inputCls} />
        <select name="type" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            النوع *
          </option>
          {Object.entries(dealTypeLabel).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select name="source" defaultValue="" className={inputCls}>
          <option value="">المصدر —</option>
          {Object.entries(customerSourceLabel).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input
          name="estimatedValue"
          placeholder="القيمة التقديرية"
          dir="ltr"
          className={inputCls}
        />
        <label className="flex flex-col gap-1 text-xs text-muted">
          تاريخ الإغلاق المتوقع
          <input name="expectedCloseDate" type="date" className={inputCls} />
        </label>
      </div>
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
