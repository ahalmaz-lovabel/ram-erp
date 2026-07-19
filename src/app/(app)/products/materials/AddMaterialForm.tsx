"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMaterialAction } from "@/modules/products/actions";
import { unitOptions } from "@/modules/products/labels";

const inputCls =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";

export function AddMaterialForm() {
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
      category: String(f.get("category") ?? ""),
      purchaseUnit: String(f.get("purchaseUnit") ?? ""),
      baseUnit: String(f.get("baseUnit") ?? ""),
      conversionFactor: String(f.get("conversionFactor") ?? ""),
      purchaseUnitPrice: String(f.get("purchaseUnitPrice") ?? ""),
    };
    setError(null);
    startTransition(async () => {
      const res = await createMaterialAction(payload);
      if (res.success) {
        setOpen(false);
        router.refresh();
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
        + إضافة خامة
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5"
    >
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input name="code" required placeholder="كود الخامة *" dir="ltr" className={inputCls} />
        <input name="name" required placeholder="الاسم *" className={inputCls} />
        <input name="category" required placeholder="التصنيف * (حديد/صاج…)" className={inputCls} />
        <label className="flex flex-col gap-1 text-xs text-muted">
          وحدة الشراء *
          <select name="purchaseUnit" required defaultValue="" className={inputCls}>
            <option value="" disabled>
              اختر
            </option>
            {unitOptions.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          أقل وحدة حساب *
          <select name="baseUnit" required defaultValue="" className={inputCls}>
            <option value="" disabled>
              اختر
            </option>
            {unitOptions.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          معامل التحويل * (كام وحدة حساب في وحدة الشراء)
          <input
            name="conversionFactor"
            required
            placeholder="مثال: 1000"
            dir="ltr"
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          سعر وحدة الشراء *
          <input
            name="purchaseUnitPrice"
            required
            placeholder="مثال: 40000"
            dir="ltr"
            className={inputCls}
          />
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          style={{ background: "var(--color-brand)" }}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "…" : "حفظ الخامة"}
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
