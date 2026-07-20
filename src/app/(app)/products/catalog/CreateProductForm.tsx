"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProductAction } from "@/modules/products/actions";

const inputCls =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";

export function CreateProductForm() {
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
    };
    setError(null);
    startTransition(async () => {
      const res = await createProductAction(payload);
      if (res.success && res.data) {
        router.push(`/products/catalog/${res.data.id}`);
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
        + منتج جديد
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5"
    >
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input name="code" required placeholder="كود المنتج *" dir="ltr" className={inputCls} />
        <input name="name" required placeholder="اسم المنتج *" className={inputCls} />
      </div>
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
