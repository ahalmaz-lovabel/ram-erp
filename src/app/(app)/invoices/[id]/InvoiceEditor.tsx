"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateInvoiceAction,
  addInvoiceLineAction,
  updateInvoiceLineAction,
  removeInvoiceLineAction,
  recordPaymentAction,
  deletePaymentAction,
  cancelInvoiceAction,
} from "@/modules/invoices/actions";
import {
  invoiceStatusLabel,
  invoiceStatusBadge,
  paymentMethodLabel,
  paymentMethodOptions,
} from "@/modules/invoices/labels";
import type { InvoiceStatus, PaymentMethod } from "@/modules/invoices/types";

const inputCls =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";
const btnPrimary =
  "rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition hover:opacity-90";
const btnGhost =
  "rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-brand";
const brand = { background: "var(--color-brand)" };

interface Line {
  id: string;
  productCode: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
  lineTotal: string;
}
interface Payment {
  id: string;
  amount: string;
  method: PaymentMethod;
  paidAt: string;
  reference: string | null;
}
interface InvoiceData {
  id: string;
  status: InvoiceStatus;
  overdue: boolean;
  dueDate: string | null;
  sourceQuoteId: string | null;
  discountPercent: string;
  taxPercent: string;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  grandTotal: string;
  paidAmount: string;
  notes: string | null;
  terms: string | null;
  lines: Line[];
  payments: Payment[];
}
interface ProductOpt {
  id: string;
  code: string;
  name: string;
  salePrice: string | null;
}

export function InvoiceEditor({
  invoice,
  products,
}: {
  invoice: InvoiceData;
  products: ProductOpt[];
}) {
  const editable = invoice.status === "unpaid" && Number(invoice.paidAmount) <= 0;
  const remaining = Math.max(0, Number(invoice.grandTotal) - Number(invoice.paidAmount));

  return (
    <div className="flex flex-col gap-6">
      <StatusBar invoice={invoice} remaining={remaining} />
      <LinesSection
        invoiceId={invoice.id}
        lines={invoice.lines}
        products={products}
        editable={editable}
      />
      <TotalsPanel invoice={invoice} editable={editable} remaining={remaining} />
      <PaymentsSection
        invoiceId={invoice.id}
        payments={invoice.payments}
        remaining={remaining}
        cancelled={invoice.status === "cancelled"}
      />
      {(invoice.notes || invoice.terms) && (
        <section className="rounded-xl border border-line bg-surface p-5 text-sm">
          {invoice.notes && (
            <div className="mb-2">
              <span className="text-xs font-semibold text-muted">ملاحظات: </span>
              <span className="text-ink">{invoice.notes}</span>
            </div>
          )}
          {invoice.terms && (
            <div>
              <span className="text-xs font-semibold text-muted">الشروط: </span>
              <span className="text-ink">{invoice.terms}</span>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ===== شريط الحالة + الإلغاء =====

function StatusBar({ invoice, remaining }: { invoice: InvoiceData; remaining: number }) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const badge = invoice.overdue ? invoiceStatusBadge.overdue : invoiceStatusBadge[invoice.status];
  const label = invoice.overdue ? invoiceStatusLabel.overdue : invoiceStatusLabel[invoice.status];

  function onCancel(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
    setError(null);
    startTransition(async () => {
      const res = await cancelInvoiceAction(invoice.id, { reason });
      if (res.success) {
        setCancelling(false);
        router.refresh();
      } else setError(res.error?.message ?? "تعذّر الإلغاء");
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ background: badge.bg, color: badge.color }}
        >
          {label}
        </span>
        <span className="text-xs text-muted">
          المدفوع: <span dir="ltr">{invoice.paidAmount}</span> /{" "}
          <span dir="ltr">{invoice.grandTotal}</span>
        </span>
        {remaining > 0 && invoice.status !== "cancelled" && (
          <span className="text-xs font-semibold text-ink">
            المتبقّي: <span dir="ltr">{remaining}</span>
          </span>
        )}
        {invoice.sourceQuoteId && <span className="text-[11px] text-muted">محوّلة من عرض سعر</span>}
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {invoice.status !== "cancelled" &&
        (cancelling ? (
          <form onSubmit={onCancel} className="flex flex-wrap items-center gap-2">
            <input
              name="reason"
              required
              placeholder="سبب الإلغاء *"
              className={`${inputCls} flex-1`}
            />
            <button type="submit" disabled={pending} style={brand} className={btnPrimary}>
              تأكيد الإلغاء
            </button>
            <button type="button" onClick={() => setCancelling(false)} className={btnGhost}>
              تراجع
            </button>
          </form>
        ) : (
          <div>
            <button
              onClick={() => setCancelling(true)}
              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              إلغاء الفاتورة
            </button>
          </div>
        ))}
    </section>
  );
}

// ===== البنود =====

function LinesSection({
  invoiceId,
  lines,
  products,
  editable,
}: {
  invoiceId: string;
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
                <LineRow key={l.id} invoiceId={invoiceId} line={l} editable={editable} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editable && <AddLineForm invoiceId={invoiceId} products={products} />}
    </section>
  );
}

function LineRow({
  invoiceId,
  line,
  editable,
}: {
  invoiceId: string;
  line: Line;
  editable: boolean;
}) {
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
      const res = await updateInvoiceLineAction(invoiceId, line.id, payload);
      if (res.success) {
        setEditing(false);
        router.refresh();
      } else setError(res.error?.message ?? "تعذّر الحفظ");
    });
  }

  function onRemove() {
    if (!confirm("حذف البند؟")) return;
    startTransition(async () => {
      const res = await removeInvoiceLineAction(invoiceId, line.id);
      if (res.success) router.refresh();
      else setError(res.error?.message ?? "تعذّر الحذف");
    });
  }

  if (editing) {
    return (
      <tr className="border-b border-line last:border-0">
        <td className="px-4 py-2 text-ink">{line.productName}</td>
        <td className="px-4 py-2">
          <form id={`iline-${line.id}`} onSubmit={onSave} />
          <input
            form={`iline-${line.id}`}
            name="quantity"
            defaultValue={line.quantity}
            dir="ltr"
            className={`${inputCls} w-20`}
          />
        </td>
        <td className="px-4 py-2">
          <input
            form={`iline-${line.id}`}
            name="unitPrice"
            defaultValue={line.unitPrice}
            dir="ltr"
            className={`${inputCls} w-24`}
          />
        </td>
        <td className="px-4 py-2">
          <input
            form={`iline-${line.id}`}
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
            form={`iline-${line.id}`}
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

function AddLineForm({ invoiceId, products }: { invoiceId: string; products: ProductOpt[] }) {
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
      const res = await addInvoiceLineAction(invoiceId, payload);
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

function TotalsPanel({
  invoice,
  editable,
  remaining,
}: {
  invoice: InvoiceData;
  editable: boolean;
  remaining: number;
}) {
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
      const res = await updateInvoiceAction(invoice.id, payload);
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
        <Row label="المجموع الفرعي" value={invoice.subtotal} />
        <Row label={`خصم (${invoice.discountPercent}%)`} value={`− ${invoice.discountAmount}`} />
        <Row label={`ضريبة (${invoice.taxPercent}%)`} value={`+ ${invoice.taxAmount}`} />
        <div className="mt-1 border-t border-line pt-2">
          <Row label="الإجمالي" value={invoice.grandTotal} bold />
        </div>
        <Row label="المدفوع" value={invoice.paidAmount} />
        <Row label="المتبقّي" value={String(remaining)} bold />
      </div>

      {editing && (
        <form
          onSubmit={onSubmit}
          className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4"
        >
          {error && <div className="w-full text-sm text-red-600">{error}</div>}
          <label className="flex flex-col gap-1 text-xs text-muted">
            خصم %
            <input
              name="discountPercent"
              defaultValue={invoice.discountPercent}
              dir="ltr"
              className={`${inputCls} w-28`}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            ضريبة %
            <input
              name="taxPercent"
              defaultValue={invoice.taxPercent}
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

// ===== الدفعات =====

function PaymentsSection({
  invoiceId,
  payments,
  remaining,
  cancelled,
}: {
  invoiceId: string;
  payments: Payment[];
  remaining: number;
  cancelled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      amount: String(f.get("amount") ?? ""),
      method: String(f.get("method") ?? ""),
      paidAt: String(f.get("paidAt") ?? "") || undefined,
      reference: String(f.get("reference") ?? "") || undefined,
    };
    setError(null);
    startTransition(async () => {
      const res = await recordPaymentAction(invoiceId, payload);
      if (res.success) {
        setOpen(false);
        router.refresh();
      } else setError(res.error?.message ?? "تعذّر التسجيل");
    });
  }

  function onDelete(paymentId: string) {
    if (!confirm("حذف الدفعة؟ سيُعاد احتساب حالة الفاتورة.")) return;
    startTransition(async () => {
      const res = await deletePaymentAction(invoiceId, paymentId);
      if (res.success) router.refresh();
      else setError(res.error?.message ?? "تعذّر الحذف");
    });
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">الدفعات</h2>
        {!cancelled && !open && remaining > 0 && (
          <button
            onClick={() => setOpen(true)}
            className="text-xs font-semibold text-brand hover:underline"
          >
            + تسجيل دفعة
          </button>
        )}
      </div>

      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}

      {open && (
        <form
          onSubmit={onSubmit}
          className="mt-3 flex flex-wrap items-end gap-3 border-b border-line pb-4"
        >
          <label className="flex flex-col gap-1 text-xs text-muted">
            المبلغ *
            <input
              name="amount"
              required
              placeholder={`≤ ${remaining}`}
              dir="ltr"
              className={`${inputCls} w-32`}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            الطريقة *
            <select name="method" required defaultValue="cash" className={inputCls}>
              {paymentMethodOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            التاريخ
            <input name="paidAt" type="date" dir="ltr" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            مرجع/إيصال
            <input name="reference" placeholder="رقم إيصال/تحويل" className={inputCls} />
          </label>
          <button type="submit" disabled={pending} style={brand} className={btnPrimary}>
            {pending ? "…" : "تسجيل"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
            إلغاء
          </button>
        </form>
      )}

      {payments.length === 0 ? (
        <div className="mt-3 text-sm text-muted">لا توجد دفعات بعد.</div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {payments.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-line bg-white px-4 py-2 text-sm"
            >
              <span className="font-semibold text-ink" dir="ltr">
                {p.amount}
              </span>
              <span className="text-xs text-muted">{paymentMethodLabel[p.method]}</span>
              <span className="text-xs text-muted" dir="ltr">
                {new Date(p.paidAt).toLocaleDateString("ar-EG")}
              </span>
              {p.reference && <span className="text-[11px] text-muted">مرجع: {p.reference}</span>}
              {!cancelled && (
                <button
                  onClick={() => onDelete(p.id)}
                  disabled={pending}
                  className="ms-auto text-xs font-semibold text-muted hover:text-red-600"
                >
                  حذف
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
