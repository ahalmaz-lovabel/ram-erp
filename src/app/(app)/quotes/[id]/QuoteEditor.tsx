"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateQuoteAction,
  addQuoteLineAction,
  updateQuoteLineAction,
  removeQuoteLineAction,
  sendQuoteAction,
  reviseQuoteAction,
  acceptQuoteAction,
  rejectQuoteAction,
  approveQuoteAction,
  archiveQuoteAction,
} from "@/modules/quotes/actions";
import { quoteStatusLabel, quoteStatusBadge } from "@/modules/quotes/labels";
import type { QuoteStatus } from "@/modules/quotes/types";

const inputCls =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";
const btnPrimary =
  "rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition hover:opacity-90";
const btnGhost =
  "rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-brand";
const brand = { background: "var(--color-brand)" };

type ActionResult = { success: boolean; error?: { message?: string } };

interface Line {
  id: string;
  productCode: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  unitCost: string;
  discountPercent: string;
  lineTotal: string;
}
interface QuoteData {
  id: string;
  status: QuoteStatus;
  issuedAt: string | null;
  validUntil: string | null;
  approvedAt: string | null;
  discountPercent: string;
  taxPercent: string;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  grandTotal: string;
  notes: string | null;
  terms: string | null;
  lines: Line[];
}
interface ProductOpt {
  id: string;
  code: string;
  name: string;
  salePrice: string | null;
}

export function QuoteEditor({ quote, products }: { quote: QuoteData; products: ProductOpt[] }) {
  const editable = quote.status === "draft" || quote.status === "underRevision";

  return (
    <div className="flex flex-col gap-6">
      <StatusBar quote={quote} />
      <LinesSection
        quoteId={quote.id}
        lines={quote.lines}
        products={products}
        editable={editable}
      />
      <TotalsPanel quote={quote} editable={editable} />
      {(quote.notes || quote.terms) && (
        <section className="rounded-xl border border-line bg-surface p-5 text-sm">
          {quote.notes && (
            <div className="mb-2">
              <span className="text-xs font-semibold text-muted">ملاحظات: </span>
              <span className="text-ink">{quote.notes}</span>
            </div>
          )}
          {quote.terms && (
            <div>
              <span className="text-xs font-semibold text-muted">الشروط: </span>
              <span className="text-ink">{quote.terms}</span>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ===== شريط الحالة + إجراءات دورة الحياة =====

function StatusBar({ quote }: { quote: QuoteData }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const badge = quoteStatusBadge[quote.status];

  function run(fn: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.success) {
        setRejecting(false);
        router.refresh();
      } else setError(res.error?.message ?? "تعذّر التنفيذ");
    });
  }

  function onReject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
    run(() => rejectQuoteAction(quote.id, { reason: reason || undefined }));
  }

  const s = quote.status;
  const canEdit = s === "draft" || s === "underRevision";
  const canApprove = s === "draft" || s === "underRevision" || s === "sent";
  const canArchive = !["archived", "converted"].includes(s);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ background: badge.bg, color: badge.color }}
        >
          {quoteStatusLabel[quote.status]}
        </span>
        {quote.approvedAt && (
          <span className="text-xs font-semibold text-green-700">
            معتمد · {new Date(quote.approvedAt).toLocaleDateString("ar-EG")}
          </span>
        )}
        {quote.issuedAt && (
          <span className="text-xs text-muted">
            أُرسل: {new Date(quote.issuedAt).toLocaleDateString("ar-EG")}
          </span>
        )}
        {quote.validUntil && (
          <span className="text-xs text-muted">
            صالح حتى: {new Date(quote.validUntil).toLocaleDateString("ar-EG")}
          </span>
        )}
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {rejecting ? (
        <form onSubmit={onReject} className="flex flex-wrap items-center gap-2">
          <input name="reason" placeholder="سبب الرفض (اختياري)" className={`${inputCls} flex-1`} />
          <button type="submit" disabled={pending} style={brand} className={btnPrimary}>
            تأكيد الرفض
          </button>
          <button type="button" onClick={() => setRejecting(false)} className={btnGhost}>
            إلغاء
          </button>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <button
              onClick={() => run(() => sendQuoteAction(quote.id))}
              disabled={pending}
              style={brand}
              className={btnPrimary}
            >
              إرسال
            </button>
          )}
          {s === "sent" && (
            <>
              <button
                onClick={() => run(() => acceptQuoteAction(quote.id))}
                disabled={pending}
                className="rounded-lg border border-green-200 bg-white px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
              >
                قبول
              </button>
              <button
                onClick={() => setRejecting(true)}
                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                رفض
              </button>
              <button
                onClick={() => run(() => reviseQuoteAction(quote.id))}
                disabled={pending}
                className={btnGhost}
              >
                إعادة للتعديل
              </button>
            </>
          )}
          {canApprove && !quote.approvedAt && (
            <button
              onClick={() => run(() => approveQuoteAction(quote.id))}
              disabled={pending}
              className={btnGhost}
            >
              اعتماد
            </button>
          )}
          {canArchive && (
            <button
              onClick={() => run(() => archiveQuoteAction(quote.id))}
              disabled={pending}
              className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-muted hover:text-red-600"
            >
              أرشفة
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// ===== البنود =====

function LinesSection({
  quoteId,
  lines,
  products,
  editable,
}: {
  quoteId: string;
  lines: Line[];
  products: ProductOpt[];
  editable: boolean;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-ink">البنود</h2>
      {lines.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-6 text-center text-sm text-muted">
          لا توجد بنود بعد.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-line text-right text-xs text-muted">
                <th className="px-4 py-3 font-semibold">المنتج</th>
                <th className="px-4 py-3 font-semibold">الكمية</th>
                <th className="px-4 py-3 font-semibold">سعر الوحدة</th>
                <th className="px-4 py-3 font-semibold">خصم %</th>
                <th className="px-4 py-3 font-semibold">الإجمالي</th>
                {editable && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <LineRow key={l.id} quoteId={quoteId} line={l} editable={editable} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editable && <AddLineForm quoteId={quoteId} products={products} />}
    </section>
  );
}

function LineRow({ quoteId, line, editable }: { quoteId: string; line: Line; editable: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      quantity: String(f.get("quantity") ?? ""),
      unitPrice: String(f.get("unitPrice") ?? ""),
      discountPercent: String(f.get("discountPercent") ?? "") || 0,
    };
    setError(null);
    startTransition(async () => {
      const res = await updateQuoteLineAction(quoteId, line.id, payload);
      if (res.success) {
        setEditing(false);
        router.refresh();
      } else setError(res.error?.message ?? "تعذّر الحفظ");
    });
  }

  function onRemove() {
    if (!confirm("حذف البند؟")) return;
    startTransition(async () => {
      const res = await removeQuoteLineAction(quoteId, line.id);
      if (res.success) router.refresh();
      else setError(res.error?.message ?? "تعذّر الحذف");
    });
  }

  if (editing) {
    return (
      <tr className="border-b border-line last:border-0">
        <td className="px-4 py-2 text-ink">{line.productName}</td>
        <td className="px-4 py-2">
          <form id={`line-${line.id}`} onSubmit={onSave} />
          <input
            form={`line-${line.id}`}
            name="quantity"
            defaultValue={line.quantity}
            dir="ltr"
            className={`${inputCls} w-20`}
          />
        </td>
        <td className="px-4 py-2">
          <input
            form={`line-${line.id}`}
            name="unitPrice"
            defaultValue={line.unitPrice}
            dir="ltr"
            className={`${inputCls} w-24`}
          />
        </td>
        <td className="px-4 py-2">
          <input
            form={`line-${line.id}`}
            name="discountPercent"
            defaultValue={line.discountPercent}
            dir="ltr"
            className={`${inputCls} w-16`}
          />
        </td>
        <td className="px-4 py-2 text-muted" dir="ltr">
          {line.lineTotal}
        </td>
        <td className="px-4 py-2 text-left">
          {error && <div className="text-xs text-red-600">{error}</div>}
          <button
            form={`line-${line.id}`}
            type="submit"
            disabled={pending}
            className="text-xs font-semibold text-brand hover:underline"
          >
            حفظ
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="ms-2 text-xs text-muted hover:underline"
          >
            إلغاء
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-line last:border-0 hover:bg-canvas">
      <td className="px-4 py-3 text-ink">
        {line.productName}
        <span className="ms-2 font-mono text-[11px] text-muted" dir="ltr">
          {line.productCode}
        </span>
      </td>
      <td className="px-4 py-3 text-ink" dir="ltr">
        {line.quantity}
      </td>
      <td className="px-4 py-3 text-ink" dir="ltr">
        {line.unitPrice}
      </td>
      <td className="px-4 py-3 text-muted" dir="ltr">
        {line.discountPercent}%
      </td>
      <td className="px-4 py-3 font-semibold text-ink" dir="ltr">
        {line.lineTotal}
      </td>
      {editable && (
        <td className="px-4 py-3 text-left">
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-muted hover:text-brand"
          >
            تعديل
          </button>
          <button
            onClick={onRemove}
            disabled={pending}
            className="ms-2 text-xs font-semibold text-muted hover:text-red-600"
          >
            حذف
          </button>
        </td>
      )}
    </tr>
  );
}

function AddLineForm({ quoteId, products }: { quoteId: string; products: ProductOpt[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      productId: String(f.get("productId") ?? ""),
      quantity: String(f.get("quantity") ?? "") || 1,
      unitPrice: String(f.get("unitPrice") ?? "") || undefined,
      discountPercent: String(f.get("discountPercent") ?? "") || 0,
    };
    setError(null);
    startTransition(async () => {
      const res = await addQuoteLineAction(quoteId, payload);
      if (res.success) {
        setOpen(false);
        router.refresh();
      } else setError(res.error?.message ?? "تعذّر الإضافة");
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="self-start text-sm font-semibold text-brand hover:underline"
      >
        + إضافة بند
      </button>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface p-4 text-sm text-muted">
        لا توجد منتجات — أضِف منتجًا في الكتالوج أولًا.{" "}
        <button onClick={() => setOpen(false)} className="text-brand hover:underline">
          إغلاق
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-4"
    >
      {error && <div className="w-full text-sm text-red-600">{error}</div>}
      <select name="productId" required defaultValue="" className={inputCls}>
        <option value="" disabled>
          المنتج *
        </option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.code}){p.salePrice ? ` — ${p.salePrice}` : ""}
          </option>
        ))}
      </select>
      <input name="quantity" placeholder="الكمية (1)" dir="ltr" className={`${inputCls} w-24`} />
      <input name="unitPrice" placeholder="سعر الوحدة" dir="ltr" className={`${inputCls} w-28`} />
      <input name="discountPercent" placeholder="خصم %" dir="ltr" className={`${inputCls} w-20`} />
      <button type="submit" disabled={pending} style={brand} className={btnPrimary}>
        {pending ? "…" : "إضافة"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
        إلغاء
      </button>
    </form>
  );
}

// ===== الإجماليات =====

function TotalsPanel({ quote, editable }: { quote: QuoteData; editable: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      discountPercent: String(f.get("discountPercent") ?? "") || 0,
      taxPercent: String(f.get("taxPercent") ?? "") || 0,
    };
    setError(null);
    startTransition(async () => {
      const res = await updateQuoteAction(quote.id, payload);
      if (res.success) {
        setEditing(false);
        router.refresh();
      } else setError(res.error?.message ?? "تعذّر الحفظ");
    });
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">الإجماليات</h2>
        {editable && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-brand hover:underline"
          >
            تعديل الخصم/الضريبة
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 text-sm">
        <Row label="المجموع الفرعي" value={quote.subtotal} />
        <Row label={`خصم العرض (${quote.discountPercent}%)`} value={`− ${quote.discountAmount}`} />
        <Row label={`ضريبة (${quote.taxPercent}%)`} value={`+ ${quote.taxAmount}`} />
        <div className="mt-1 border-t border-line pt-2">
          <Row label="الإجمالي النهائي" value={quote.grandTotal} bold />
        </div>
      </div>

      {editing && (
        <form
          onSubmit={onSubmit}
          className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4"
        >
          {error && <div className="w-full text-sm text-red-600">{error}</div>}
          <label className="flex flex-col gap-1 text-xs text-muted">
            خصم العرض %
            <input
              name="discountPercent"
              defaultValue={quote.discountPercent}
              dir="ltr"
              className={`${inputCls} w-28`}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            ضريبة %
            <input
              name="taxPercent"
              defaultValue={quote.taxPercent}
              dir="ltr"
              className={`${inputCls} w-28`}
            />
          </label>
          <button type="submit" disabled={pending} style={brand} className={btnPrimary}>
            {pending ? "…" : "حفظ"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className={btnGhost}>
            إلغاء
          </button>
        </form>
      )}
    </section>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-bold text-ink" : "text-muted"}>{label}</span>
      <span className={`${bold ? "text-lg font-extrabold" : ""} text-ink`} dir="ltr">
        {value}
      </span>
    </div>
  );
}
