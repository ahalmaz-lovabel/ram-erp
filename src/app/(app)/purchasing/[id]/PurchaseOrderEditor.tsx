"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updatePurchaseOrderAction,
  addOrderLineAction,
  updateOrderLineAction,
  removeOrderLineAction,
  markOrderSentAction,
  receiveOrderAction,
  cancelOrderAction,
  recordSupplierPaymentAction,
  deleteSupplierPaymentAction,
} from "@/modules/purchasing/actions";
import {
  purchaseOrderStatusLabel,
  purchaseOrderStatusBadge,
  paymentMethodLabel,
  paymentMethodOptions,
  measurementUnitLabel,
} from "@/modules/purchasing/labels";
import type {
  PurchaseOrderStatus,
  PaymentMethod,
  MeasurementUnit,
} from "@/modules/purchasing/types";

const inputCls =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";
const btnPrimary =
  "rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition hover:opacity-90";
const btnGhost =
  "rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-brand";
const brand = { background: "var(--color-brand)" };

const unitOptions = (Object.keys(measurementUnitLabel) as MeasurementUnit[]).map((u) => ({
  value: u,
  label: measurementUnitLabel[u],
}));

interface Line {
  id: string;
  materialCode: string;
  materialName: string;
  quantity: string;
  unit: MeasurementUnit;
  unitPrice: string;
  lineTotal: string;
}
interface Payment {
  id: string;
  amount: string;
  method: PaymentMethod;
  paidAt: string;
  reference: string | null;
}
interface OrderData {
  id: string;
  status: PurchaseOrderStatus;
  expectedDate: string | null;
  receivedAt: string | null;
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
interface MaterialOpt {
  id: string;
  code: string;
  name: string;
  purchaseUnit: MeasurementUnit;
  purchaseUnitPrice: string | null;
}

export function PurchaseOrderEditor({
  order,
  materials,
}: {
  order: OrderData;
  materials: MaterialOpt[];
}) {
  const editable = order.status === "draft";
  const cancelled = order.status === "cancelled";
  const remaining = Math.max(0, Number(order.grandTotal) - Number(order.paidAmount));
  const canPay = (order.status === "sent" || order.status === "received") && remaining > 0;

  return (
    <div className="flex flex-col gap-6">
      <StatusBar order={order} remaining={remaining} />
      <LinesSection
        orderId={order.id}
        lines={order.lines}
        materials={materials}
        editable={editable}
      />
      <TotalsPanel order={order} editable={editable} remaining={remaining} />
      <PaymentsSection
        orderId={order.id}
        payments={order.payments}
        remaining={remaining}
        canPay={canPay}
        cancelled={cancelled}
      />
      {(order.notes || order.terms) && (
        <section className="rounded-xl border border-line bg-surface p-5 text-sm">
          {order.notes && (
            <div className="mb-2">
              <span className="text-xs font-semibold text-muted">ملاحظات: </span>
              <span className="text-ink">{order.notes}</span>
            </div>
          )}
          {order.terms && (
            <div>
              <span className="text-xs font-semibold text-muted">الشروط: </span>
              <span className="text-ink">{order.terms}</span>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ===== شريط الحالة + انتقالات دورة الأمر =====

function StatusBar({ order, remaining }: { order: OrderData; remaining: number }) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const badge = purchaseOrderStatusBadge[order.status];
  const label = purchaseOrderStatusLabel[order.status];

  function run(fn: () => Promise<{ success: boolean; error?: { message?: string } }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.success) router.refresh();
      else setError(res.error?.message ?? "تعذّرت العملية");
    });
  }

  function onCancel(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
    setError(null);
    startTransition(async () => {
      const res = await cancelOrderAction(order.id, { reason });
      if (res.success) {
        setCancelling(false);
        router.refresh();
      } else setError(res.error?.message ?? "تعذّر الإلغاء");
    });
  }

  const canSend = order.status === "draft";
  const canReceive = order.status === "draft" || order.status === "sent";
  const canCancel = order.status === "draft" || order.status === "sent";

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
          المدفوع: <span dir="ltr">{order.paidAmount}</span> /{" "}
          <span dir="ltr">{order.grandTotal}</span>
        </span>
        {remaining > 0 && !["cancelled", "draft"].includes(order.status) && (
          <span className="text-xs font-semibold text-ink">
            المتبقّي: <span dir="ltr">{remaining}</span>
          </span>
        )}
        {order.receivedAt && (
          <span className="text-[11px] text-muted" dir="ltr">
            استُلم: {new Date(order.receivedAt).toLocaleDateString("ar-EG")}
          </span>
        )}
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex flex-wrap items-center gap-2">
        {canSend && (
          <button
            onClick={() => run(() => markOrderSentAction(order.id))}
            disabled={pending}
            style={brand}
            className={btnPrimary}
          >
            إرسال للمورد
          </button>
        )}
        {canReceive && (
          <button
            onClick={() => run(() => receiveOrderAction(order.id))}
            disabled={pending}
            className="rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60"
          >
            تأكيد الاستلام
          </button>
        )}
        {canCancel &&
          (cancelling ? (
            <form onSubmit={onCancel} className="flex flex-1 flex-wrap items-center gap-2">
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
            <button
              onClick={() => setCancelling(true)}
              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              إلغاء الأمر
            </button>
          ))}
      </div>
    </section>
  );
}

// ===== البنود =====

function LinesSection({
  orderId,
  lines,
  materials,
  editable,
}: {
  orderId: string;
  lines: Line[];
  materials: MaterialOpt[];
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
                <th className="px-4 py-3 font-semibold">الخامة</th>
                <th className="px-4 py-3 font-semibold">الكمية</th>
                <th className="px-4 py-3 font-semibold">الوحدة</th>
                <th className="px-4 py-3 font-semibold">سعر الوحدة</th>
                <th className="px-4 py-3 font-semibold">الإجمالي</th>
                {editable && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <LineRow key={l.id} orderId={orderId} line={l} editable={editable} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editable && <AddLineForm orderId={orderId} materials={materials} />}
    </section>
  );
}

function LineRow({ orderId, line, editable }: { orderId: string; line: Line; editable: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      quantity: String(f.get("quantity") ?? ""),
      unit: String(f.get("unit") ?? "") || undefined,
      unitPrice: String(f.get("unitPrice") ?? ""),
    };
    setError(null);
    startTransition(async () => {
      const res = await updateOrderLineAction(orderId, line.id, payload);
      if (res.success) {
        setEditing(false);
        router.refresh();
      } else setError(res.error?.message ?? "تعذّر الحفظ");
    });
  }

  function onRemove() {
    if (!confirm("حذف البند؟")) return;
    startTransition(async () => {
      const res = await removeOrderLineAction(orderId, line.id);
      if (res.success) router.refresh();
      else setError(res.error?.message ?? "تعذّر الحذف");
    });
  }

  if (editing) {
    const formId = `poline-${line.id}`;
    return (
      <tr className="border-b border-line last:border-0">
        <td className="px-4 py-2 text-ink">{line.materialName}</td>
        <td className="px-4 py-2">
          <form id={formId} onSubmit={onSave} />
          <input
            form={formId}
            name="quantity"
            defaultValue={line.quantity}
            dir="ltr"
            className={`${inputCls} w-20`}
          />
        </td>
        <td className="px-4 py-2">
          <select form={formId} name="unit" defaultValue={line.unit} className={inputCls}>
            {unitOptions.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </td>
        <td className="px-4 py-2">
          <input
            form={formId}
            name="unitPrice"
            defaultValue={line.unitPrice}
            dir="ltr"
            className={`${inputCls} w-24`}
          />
        </td>
        <td className="px-4 py-2 text-muted" dir="ltr">
          {line.lineTotal}
        </td>
        <td className="px-4 py-2 text-left">
          {error && <div className="text-xs text-red-600">{error}</div>}
          <button
            form={formId}
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
        {line.materialName}
        <span className="ms-2 font-mono text-[11px] text-muted" dir="ltr">
          {line.materialCode}
        </span>
      </td>
      <td className="px-4 py-3 text-ink" dir="ltr">
        {line.quantity}
      </td>
      <td className="px-4 py-3 text-muted">{measurementUnitLabel[line.unit]}</td>
      <td className="px-4 py-3 text-ink" dir="ltr">
        {line.unitPrice}
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

function AddLineForm({ orderId, materials }: { orderId: string; materials: MaterialOpt[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      materialId: String(f.get("materialId") ?? ""),
      quantity: String(f.get("quantity") ?? "") || 1,
      unit: String(f.get("unit") ?? "") || undefined,
      unitPrice: String(f.get("unitPrice") ?? "") || undefined,
    };
    setError(null);
    startTransition(async () => {
      const res = await addOrderLineAction(orderId, payload);
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

  if (materials.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface p-4 text-sm text-muted">
        لا توجد خامات — أضِف خامة في مكتبة الخامات أولًا.{" "}
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
      <select name="materialId" required defaultValue="" className={inputCls}>
        <option value="" disabled>
          الخامة *
        </option>
        {materials.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} ({m.code}){m.purchaseUnitPrice ? ` — ${m.purchaseUnitPrice}` : ""}
          </option>
        ))}
      </select>
      <input name="quantity" placeholder="الكمية (1)" dir="ltr" className={`${inputCls} w-24`} />
      <select name="unit" defaultValue="" className={inputCls}>
        <option value="">الوحدة (تلقائي)</option>
        {unitOptions.map((u) => (
          <option key={u.value} value={u.value}>
            {u.label}
          </option>
        ))}
      </select>
      <input
        name="unitPrice"
        placeholder="سعر الوحدة (تلقائي)"
        dir="ltr"
        className={`${inputCls} w-32`}
      />
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
  order,
  editable,
  remaining,
}: {
  order: OrderData;
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
      const res = await updatePurchaseOrderAction(order.id, payload);
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
        <Row label="المجموع الفرعي" value={order.subtotal} />
        <Row label={`خصم (${order.discountPercent}%)`} value={`− ${order.discountAmount}`} />
        <Row label={`ضريبة (${order.taxPercent}%)`} value={`+ ${order.taxAmount}`} />
        <div className="mt-1 border-t border-line pt-2">
          <Row label="الإجمالي" value={order.grandTotal} bold />
        </div>
        <Row label="المدفوع" value={order.paidAmount} />
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
              defaultValue={order.discountPercent}
              dir="ltr"
              className={`${inputCls} w-28`}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            ضريبة %
            <input
              name="taxPercent"
              defaultValue={order.taxPercent}
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
  orderId,
  payments,
  remaining,
  canPay,
  cancelled,
}: {
  orderId: string;
  payments: Payment[];
  remaining: number;
  canPay: boolean;
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
      const res = await recordSupplierPaymentAction(orderId, payload);
      if (res.success) {
        setOpen(false);
        router.refresh();
      } else setError(res.error?.message ?? "تعذّر التسجيل");
    });
  }

  function onDelete(paymentId: string) {
    if (!confirm("حذف الدفعة؟ سيُعاد احتساب المدفوع.")) return;
    startTransition(async () => {
      const res = await deleteSupplierPaymentAction(orderId, paymentId);
      if (res.success) router.refresh();
      else setError(res.error?.message ?? "تعذّر الحذف");
    });
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">مدفوعات المورد</h2>
        {canPay && !open && (
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
