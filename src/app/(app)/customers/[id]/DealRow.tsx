"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateDealAction, changeDealStatusAction } from "@/modules/customers/actions";
import { dealStatusLabel, dealTypeLabel, customerSourceLabel } from "@/modules/customers/labels";

const inputCls =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";

export interface DealData {
  id: string;
  number: string;
  name: string;
  type: string;
  status: string;
  source: string | null;
  estimatedValue: string | null;
  expectedCloseDate: string | null; // yyyy-mm-dd
}

export function DealRow({ deal }: { deal: DealData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function changeStatus(status: string) {
    startTransition(async () => {
      const res = await changeDealStatusAction(deal.id, { status });
      if (res.success) router.refresh();
      else alert(res.error?.message ?? "تعذّر التغيير");
    });
  }

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: String(f.get("name") ?? ""),
      type: String(f.get("type") ?? ""),
      source: String(f.get("source") ?? "") || undefined,
      estimatedValue: String(f.get("estimatedValue") ?? "") || undefined,
      expectedCloseDate: String(f.get("expectedCloseDate") ?? "") || undefined,
    };
    setError(null);
    startTransition(async () => {
      const res = await updateDealAction(deal.id, payload);
      if (res.success) {
        setEditing(false);
        router.refresh();
      } else setError(res.error?.message ?? "تعذّر الحفظ");
    });
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-line bg-white p-4">
        <form onSubmit={onSave} className="flex flex-col gap-3">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              name="name"
              required
              defaultValue={deal.name}
              placeholder="الاسم *"
              className={inputCls}
            />
            <select name="type" required defaultValue={deal.type} className={inputCls}>
              {Object.entries(dealTypeLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select name="source" defaultValue={deal.source ?? ""} className={inputCls}>
              <option value="">المصدر —</option>
              {Object.entries(customerSourceLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              name="estimatedValue"
              defaultValue={deal.estimatedValue ?? ""}
              placeholder="القيمة التقديرية"
              dir="ltr"
              className={inputCls}
            />
            <input
              name="expectedCloseDate"
              type="date"
              defaultValue={deal.expectedCloseDate ?? ""}
              className={inputCls}
            />
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
              onClick={() => setEditing(false)}
              className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line bg-white px-4 py-3">
      <span className="font-slug text-sm text-muted" dir="ltr">
        {deal.number}
      </span>
      <span className="font-semibold text-ink">{deal.name}</span>
      <span className="text-xs text-muted">
        {dealTypeLabel[deal.type as keyof typeof dealTypeLabel]}
      </span>
      <select
        value={deal.status}
        onChange={(e) => changeStatus(e.target.value)}
        disabled={pending}
        className="rounded-lg border border-line bg-canvas px-2 py-1 text-xs font-semibold text-ink outline-none focus:border-brand"
      >
        {Object.entries(dealStatusLabel).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <button
        onClick={() => setEditing(true)}
        className="ms-auto text-xs font-semibold text-muted hover:text-brand"
      >
        تعديل
      </button>
    </div>
  );
}
