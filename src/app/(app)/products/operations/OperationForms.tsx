"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createOperationAction,
  updateOperationAction,
  archiveOperationAction,
} from "@/modules/products/actions";
import { operationCostModelLabel } from "@/modules/products/labels";
import type { OperationCostModel } from "@/modules/products/types";

const inputCls =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";

function ModelSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <select name="costModel" required defaultValue={defaultValue ?? ""} className={inputCls}>
      {!defaultValue && (
        <option value="" disabled>
          نموذج التكلفة *
        </option>
      )}
      {Object.entries(operationCostModelLabel).map(([k, v]) => (
        <option key={k} value={k}>
          {v}
        </option>
      ))}
    </select>
  );
}

export function AddOperationForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: String(f.get("name") ?? ""),
      category: String(f.get("category") ?? ""),
      costModel: String(f.get("costModel") ?? ""),
      standardCost: String(f.get("standardCost") ?? ""),
      description: String(f.get("description") ?? ""),
    };
    setError(null);
    startTransition(async () => {
      const res = await createOperationAction(payload);
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
        + إضافة عملية
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
        <input name="name" required placeholder="اسم العملية * (قص/لحام…)" className={inputCls} />
        <input name="category" placeholder="التصنيف" className={inputCls} />
        <ModelSelect />
        <input
          name="standardCost"
          required
          placeholder="التكلفة المعيارية *"
          dir="ltr"
          className={inputCls}
        />
        <input name="description" placeholder="وصف" className={`${inputCls} sm:col-span-2`} />
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

export interface OperationRowData {
  id: string;
  name: string;
  category: string | null;
  costModel: OperationCostModel;
  standardCost: string;
}

export function OperationRow({ operation }: { operation: OperationRowData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: String(f.get("name") ?? ""),
      category: String(f.get("category") ?? ""),
      costModel: String(f.get("costModel") ?? ""),
      standardCost: String(f.get("standardCost") ?? ""),
    };
    setError(null);
    startTransition(async () => {
      const res = await updateOperationAction(operation.id, payload);
      if (res.success) {
        setEditing(false);
        router.refresh();
      } else setError(res.error?.message ?? "تعذّر الحفظ");
    });
  }

  function onArchive() {
    if (!confirm("أرشفة العملية؟")) return;
    startTransition(async () => {
      const res = await archiveOperationAction(operation.id);
      if (res.success) router.refresh();
      else alert(res.error?.message ?? "تعذّرت الأرشفة");
    });
  }

  if (editing) {
    return (
      <form
        onSubmit={onSave}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-4"
      >
        {error && <div className="w-full text-sm text-red-600">{error}</div>}
        <input name="name" required defaultValue={operation.name} className={inputCls} />
        <input
          name="category"
          defaultValue={operation.category ?? ""}
          placeholder="التصنيف"
          className={inputCls}
        />
        <ModelSelect defaultValue={operation.costModel} />
        <input
          name="standardCost"
          required
          defaultValue={operation.standardCost}
          dir="ltr"
          className={inputCls}
        />
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
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line bg-white px-4 py-3">
      <span className="font-semibold text-ink">{operation.name}</span>
      {operation.category && <span className="text-xs text-muted">{operation.category}</span>}
      <span className="text-xs text-muted">{operationCostModelLabel[operation.costModel]}</span>
      <span className="text-sm text-ink" dir="ltr">
        {operation.standardCost}
      </span>
      <span className="ms-auto flex gap-2">
        <button
          onClick={() => setEditing(true)}
          className="text-xs font-semibold text-muted hover:text-brand"
        >
          تعديل
        </button>
        <button
          onClick={onArchive}
          disabled={pending}
          className="text-xs font-semibold text-muted hover:text-red-600"
        >
          أرشفة
        </button>
      </span>
    </div>
  );
}
