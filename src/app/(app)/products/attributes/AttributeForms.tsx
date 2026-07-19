"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAttributeAction, archiveAttributeAction } from "@/modules/products/actions";
import { attributeTypeLabel, unitOptions } from "@/modules/products/labels";
import type { AttributeType } from "@/modules/products/types";

const inputCls =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";

const flags: { name: string; label: string }[] = [
  { name: "isRequired", label: "إجبارية" },
  { name: "showInQuotes", label: "تظهر في العروض" },
  { name: "showOnWebsite", label: "تظهر في الموقع" },
  { name: "usedInFilter", label: "تُستخدم في الفلترة" },
  { name: "internalOnly", label: "داخلية فقط" },
];

export function AddAttributeForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const values = String(f.get("values") ?? "")
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      name: String(f.get("name") ?? ""),
      type: String(f.get("type") ?? ""),
      unit: String(f.get("unit") ?? "") || undefined,
      isRequired: f.get("isRequired") === "on",
      showInQuotes: f.get("showInQuotes") === "on",
      showOnWebsite: f.get("showOnWebsite") === "on",
      usedInFilter: f.get("usedInFilter") === "on",
      internalOnly: f.get("internalOnly") === "on",
      values,
    };
    setError(null);
    startTransition(async () => {
      const res = await createAttributeAction(payload);
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
        + إضافة سمة
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
        <input
          name="name"
          required
          placeholder="اسم السمة * (اللون/المقاس…)"
          className={inputCls}
        />
        <select
          name="type"
          required
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={inputCls}
        >
          <option value="" disabled>
            النوع *
          </option>
          {Object.entries(attributeTypeLabel).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select name="unit" defaultValue="" className={inputCls}>
          <option value="">وحدة القياس —</option>
          {unitOptions.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </div>
      {type === "list" && (
        <textarea
          name="values"
          rows={3}
          placeholder="القيم المسموحة (قيمة في كل سطر) — مطلوبة لنوع القائمة"
          className={inputCls}
        />
      )}
      <div className="flex flex-wrap gap-4">
        {flags.map((fl) => (
          <label key={fl.name} className="flex items-center gap-2 text-sm text-ink">
            <input name={fl.name} type="checkbox" className="h-4 w-4 accent-[oklch(0.45_0.2_25)]" />
            {fl.label}
          </label>
        ))}
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

export interface AttributeRowData {
  id: string;
  name: string;
  type: AttributeType;
  values: string[];
  internalOnly: boolean;
}

export function AttributeRow({ attribute }: { attribute: AttributeRowData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onArchive() {
    if (!confirm("أرشفة السمة؟")) return;
    startTransition(async () => {
      const res = await archiveAttributeAction(attribute.id);
      if (res.success) router.refresh();
      else alert(res.error?.message ?? "تعذّرت الأرشفة");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line bg-white px-4 py-3">
      <span className="font-semibold text-ink">{attribute.name}</span>
      <span className="text-xs text-muted">{attributeTypeLabel[attribute.type]}</span>
      {attribute.internalOnly && <span className="text-[10px] text-muted">· داخلية</span>}
      {attribute.values.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {attribute.values.map((v) => (
            <span key={v} className="rounded bg-canvas px-1.5 py-0.5 text-[11px] text-ink">
              {v}
            </span>
          ))}
        </span>
      )}
      <button
        onClick={onArchive}
        disabled={pending}
        className="ms-auto text-xs font-semibold text-muted hover:text-red-600"
      >
        أرشفة
      </button>
    </div>
  );
}
