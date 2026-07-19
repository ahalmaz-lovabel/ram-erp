"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logCommunicationAction } from "@/modules/customers/actions";
import { communicationTypeLabel } from "@/modules/customers/labels";

const inputCls =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";

export function AddCommunicationForm({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      type: String(f.get("type") ?? ""),
      summary: String(f.get("summary") ?? ""),
      nextStep: String(f.get("nextStep") ?? ""),
      nextFollowUpDate: String(f.get("nextFollowUpDate") ?? "") || undefined,
    };
    setError(null);
    startTransition(async () => {
      const res = await logCommunicationAction(customerId, payload);
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
        + تسجيل متابعة
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
        <select name="type" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            نوع التواصل *
          </option>
          {Object.entries(communicationTypeLabel).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <label className="flex flex-col gap-1 text-xs text-muted">
          موعد المتابعة القادمة
          <input name="nextFollowUpDate" type="date" className={inputCls} />
        </label>
      </div>
      <textarea name="summary" required rows={2} placeholder="ملخص ما حدث *" className={inputCls} />
      <input name="nextStep" placeholder="الخطوة التالية" className={inputCls} />
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
