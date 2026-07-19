"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMaterialPriceAction, archiveMaterialAction } from "@/modules/products/actions";
import {
  measurementUnitLabel,
  materialStatusLabel,
  materialStatusBadge,
} from "@/modules/products/labels";
import type { MeasurementUnit, MaterialStatus } from "@/modules/products/types";

export interface MaterialRowData {
  id: string;
  code: string;
  name: string;
  category: string;
  purchaseUnit: MeasurementUnit;
  baseUnit: MeasurementUnit;
  purchaseUnitPrice: string;
  baseUnitPrice: string;
  status: MaterialStatus;
}

const inputCls =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";

export function MaterialRow({ material }: { material: MaterialRowData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const b = materialStatusBadge[material.status];

  function onSavePrice(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      newPurchaseUnitPrice: String(f.get("newPurchaseUnitPrice") ?? ""),
      reason: String(f.get("reason") ?? ""),
    };
    setError(null);
    startTransition(async () => {
      const res = await updateMaterialPriceAction(material.id, payload);
      if (res.success) {
        setEditing(false);
        router.refresh();
      } else setError(res.error?.message ?? "تعذّر الحفظ");
    });
  }

  function onArchive() {
    if (!confirm("أرشفة الخامة؟")) return;
    startTransition(async () => {
      const res = await archiveMaterialAction(material.id);
      if (res.success) router.refresh();
      else alert(res.error?.message ?? "تعذّرت الأرشفة");
    });
  }

  return (
    <div className="rounded-lg border border-line bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-slug text-xs text-muted" dir="ltr">
          {material.code}
        </span>
        <span className="font-semibold text-ink">{material.name}</span>
        <span className="text-xs text-muted">{material.category}</span>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: b.bg, color: b.color }}
        >
          {materialStatusLabel[material.status]}
        </span>
        <span className="text-sm text-ink">
          سعر الوحدة: <b dir="ltr">{material.baseUnitPrice}</b> /{" "}
          {measurementUnitLabel[material.baseUnit]}
        </span>
        <span className="text-xs text-muted" dir="ltr">
          (شراء {material.purchaseUnitPrice}/{measurementUnitLabel[material.purchaseUnit]})
        </span>
        <span className="ms-auto flex gap-2">
          <button
            onClick={() => setEditing((v) => !v)}
            className="text-xs font-semibold text-muted hover:text-brand"
          >
            تعديل السعر
          </button>
          {material.status !== "archived" && (
            <button
              onClick={onArchive}
              disabled={pending}
              className="text-xs font-semibold text-muted hover:text-red-600"
            >
              أرشفة
            </button>
          )}
        </span>
      </div>

      {editing && (
        <form
          onSubmit={onSavePrice}
          className="mt-3 flex flex-wrap items-end gap-3 border-t border-line pt-3"
        >
          {error && <div className="w-full text-sm text-red-600">{error}</div>}
          <label className="flex flex-col gap-1 text-xs text-muted">
            سعر الشراء الجديد
            <input name="newPurchaseUnitPrice" required dir="ltr" className={inputCls} />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
            السبب
            <input name="reason" placeholder="ارتفاع خامات…" className={inputCls} />
          </label>
          <button
            type="submit"
            disabled={pending}
            style={{ background: "var(--color-brand)" }}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "…" : "حفظ"}
          </button>
        </form>
      )}
    </div>
  );
}
