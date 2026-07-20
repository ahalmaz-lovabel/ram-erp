"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addComponentAction,
  addComponentMaterialAction,
  addComponentOperationAction,
  recalculateProductCostAction,
  updateProductPricingAction,
} from "@/modules/products/actions";
import {
  measurementUnitLabel,
  operationCostModelLabel,
  unitOptions,
} from "@/modules/products/labels";
import type { MeasurementUnit, OperationCostModel } from "@/modules/products/types";
import type { ProductPricingView } from "@/modules/products/services/ProductService";

const inputCls =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";
const btnPrimary =
  "rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition hover:opacity-90";
const btnGhost =
  "rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-brand";
const brand = { background: "var(--color-brand)" };

// ===== أنواع البيانات القادمة من الصفحة (كلها نصوص للأمان المالي) =====

interface CompMaterial {
  id: string;
  materialName: string;
  materialCode: string;
  quantity: string;
  unit: MeasurementUnit;
  wastePercent: string;
}
interface CompOperation {
  id: string;
  name: string;
  costModel: OperationCostModel;
  standardCost: string;
  param: string;
}
export interface Comp {
  id: string;
  parentId: string | null;
  name: string;
  quantity: string;
  lengthCm: string | null;
  widthCm: string | null;
  thicknessMm: string | null;
  weightKg: string | null;
  notes: string | null;
  materials: CompMaterial[];
  operations: CompOperation[];
}
interface MaterialOpt {
  id: string;
  code: string;
  name: string;
  baseUnit: MeasurementUnit;
}
interface OperationOpt {
  id: string;
  name: string;
  costModel: OperationCostModel;
  standardCost: string;
}

interface BuilderProps {
  productId: string;
  productionCost: string;
  costUpdatedAt: string | null;
  components: Comp[];
  materials: MaterialOpt[];
  operations: OperationOpt[];
  pricing: ProductPricingView | null;
}

export function ProductBuilder({
  productId,
  productionCost,
  costUpdatedAt,
  components,
  materials,
  operations,
  pricing,
}: BuilderProps) {
  const router = useRouter();
  const [recalcPending, startRecalc] = useTransition();
  const [recalcError, setRecalcError] = useState<string | null>(null);

  // بناء الشجرة من المكوّنات المسطّحة.
  const { roots, childrenByParent } = useMemo(() => {
    const byParent = new Map<string, Comp[]>();
    const rootList: Comp[] = [];
    for (const c of components) {
      if (c.parentId) {
        const arr = byParent.get(c.parentId) ?? [];
        arr.push(c);
        byParent.set(c.parentId, arr);
      } else rootList.push(c);
    }
    return { roots: rootList, childrenByParent: byParent };
  }, [components]);

  function onRecalc() {
    setRecalcError(null);
    startRecalc(async () => {
      const res = await recalculateProductCostAction(productId);
      if (res.success) router.refresh();
      else setRecalcError(res.error?.message ?? "تعذّرت إعادة الحساب");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* بطاقة التكلفة + إعادة الحساب */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface p-5">
        <div>
          <div className="text-xs text-muted">تكلفة الإنتاج المجمّعة</div>
          <div className="mt-1 text-2xl font-extrabold text-ink" dir="ltr">
            {productionCost}
          </div>
          {costUpdatedAt && (
            <div className="mt-1 text-[11px] text-muted">
              آخر حساب: {new Date(costUpdatedAt).toLocaleString("ar-EG")}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <button onClick={onRecalc} disabled={recalcPending} style={brand} className={btnPrimary}>
            {recalcPending ? "…" : "إعادة حساب التكلفة"}
          </button>
          {recalcError && <div className="text-xs text-red-600">{recalcError}</div>}
        </div>
      </div>

      {/* شجرة المكوّنات */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">شجرة المكوّنات</h2>
        </div>
        {roots.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface p-6 text-center text-sm text-muted">
            لا توجد مكوّنات بعد — أضِف أول مكوّن رئيسي (مثال: جسم العارضة).
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {roots.map((c) => (
              <ComponentNode
                key={c.id}
                component={c}
                childrenByParent={childrenByParent}
                productId={productId}
                materials={materials}
                operations={operations}
                depth={0}
              />
            ))}
          </div>
        )}
        <AddComponentForm productId={productId} label="+ مكوّن رئيسي" />
      </section>

      {/* التسعير والربحية */}
      {pricing && <PricingPanel productId={productId} pricing={pricing} />}
    </div>
  );
}

// ===== عقدة مكوّن (اسم + مواصفات + خامات + عمليات + أبناء) =====

function ComponentNode({
  component,
  childrenByParent,
  productId,
  materials,
  operations,
  depth,
}: {
  component: Comp;
  childrenByParent: Map<string, Comp[]>;
  productId: string;
  materials: MaterialOpt[];
  operations: OperationOpt[];
  depth: number;
}) {
  const children = childrenByParent.get(component.id) ?? [];
  const dims = [
    component.lengthCm && `ط ${component.lengthCm}سم`,
    component.widthCm && `ع ${component.widthCm}سم`,
    component.thicknessMm && `سُمك ${component.thicknessMm}مم`,
    component.weightKg && `${component.weightKg}كجم`,
  ].filter(Boolean);

  return (
    <div
      className="rounded-xl border border-line bg-surface p-4"
      style={depth > 0 ? { marginInlineStart: 16 } : undefined}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-bold text-ink">{component.name}</span>
        <span className="text-xs text-muted">×{component.quantity}</span>
        {dims.length > 0 && (
          <span className="text-[11px] text-muted" dir="ltr">
            {dims.join(" · ")}
          </span>
        )}
      </div>
      {component.notes && <div className="mt-1 text-xs text-muted">{component.notes}</div>}

      {/* الخامات */}
      <div className="mt-3">
        <div className="text-[11px] font-semibold text-muted">الخامات</div>
        {component.materials.length === 0 ? (
          <div className="text-xs text-muted">—</div>
        ) : (
          <ul className="mt-1 flex flex-col gap-1">
            {component.materials.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-x-3 text-sm text-ink">
                <span>{m.materialName}</span>
                <span className="text-xs text-muted" dir="ltr">
                  {m.quantity} {measurementUnitLabel[m.unit]}
                </span>
                {Number(m.wastePercent) > 0 && (
                  <span className="text-[11px] text-muted">هالك {m.wastePercent}%</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* العمليات */}
      <div className="mt-3">
        <div className="text-[11px] font-semibold text-muted">العمليات</div>
        {component.operations.length === 0 ? (
          <div className="text-xs text-muted">—</div>
        ) : (
          <ul className="mt-1 flex flex-col gap-1">
            {component.operations.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-3 text-sm text-ink">
                <span>{o.name}</span>
                <span className="text-[11px] text-muted">
                  {operationCostModelLabel[o.costModel]}
                </span>
                <span className="text-xs text-muted" dir="ltr">
                  {o.standardCost}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* أزرار الإضافة على مستوى المكوّن */}
      <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
        <AddMaterialForm componentId={component.id} materials={materials} />
        <AddOperationForm componentId={component.id} operations={operations} />
        <AddComponentForm productId={productId} parentId={component.id} label="+ جزء فرعي" />
      </div>

      {/* الأبناء */}
      {children.length > 0 && (
        <div className="mt-3 flex flex-col gap-3">
          {children.map((c) => (
            <ComponentNode
              key={c.id}
              component={c}
              childrenByParent={childrenByParent}
              productId={productId}
              materials={materials}
              operations={operations}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ===== نموذج إضافة مكوّن (رئيسي أو فرعي) =====

function AddComponentForm({
  productId,
  parentId,
  label,
}: {
  productId: string;
  parentId?: string;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => {
      const v = String(f.get(k) ?? "").trim();
      return v === "" ? undefined : v;
    };
    const payload = {
      parentId,
      name: String(f.get("name") ?? ""),
      quantity: num("quantity") ?? 1,
      lengthCm: num("lengthCm"),
      widthCm: num("widthCm"),
      thicknessMm: num("thicknessMm"),
      weightKg: num("weightKg"),
      notes: String(f.get("notes") ?? ""),
    };
    setError(null);
    startTransition(async () => {
      const res = await addComponentAction(productId, payload);
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
        className="text-xs font-semibold text-brand hover:underline"
      >
        {label}
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full flex-col gap-3 rounded-lg border border-line bg-white p-4"
    >
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <input name="name" required placeholder="اسم المكوّن *" className={inputCls} />
        <input name="quantity" placeholder="العدد (افتراضي 1)" dir="ltr" className={inputCls} />
        <input name="lengthCm" placeholder="الطول (سم)" dir="ltr" className={inputCls} />
        <input name="widthCm" placeholder="العرض (سم)" dir="ltr" className={inputCls} />
        <input name="thicknessMm" placeholder="السُمك (مم)" dir="ltr" className={inputCls} />
        <input name="weightKg" placeholder="الوزن (كجم)" dir="ltr" className={inputCls} />
      </div>
      <input name="notes" placeholder="ملاحظات" className={inputCls} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} style={brand} className={btnPrimary}>
          {pending ? "…" : "حفظ"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
          إلغاء
        </button>
      </div>
    </form>
  );
}

// ===== نموذج إضافة خامة لمكوّن =====

function AddMaterialForm({
  componentId,
  materials,
}: {
  componentId: string;
  materials: MaterialOpt[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      materialId: String(f.get("materialId") ?? ""),
      quantity: String(f.get("quantity") ?? ""),
      unit: String(f.get("unit") ?? ""),
      wastePercent: String(f.get("wastePercent") ?? "") || 0,
    };
    setError(null);
    startTransition(async () => {
      const res = await addComponentMaterialAction(componentId, payload);
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
        className="text-xs font-semibold text-muted hover:text-brand"
      >
        + خامة
      </button>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="w-full text-xs text-muted">
        لا توجد خامات متاحة — أضِف خامات في <span className="font-semibold">مكتبة الخامات</span>{" "}
        أولًا.{" "}
        <button onClick={() => setOpen(false)} className="text-brand hover:underline">
          إغلاق
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-4"
    >
      {error && <div className="w-full text-sm text-red-600">{error}</div>}
      <select name="materialId" required defaultValue="" className={inputCls}>
        <option value="" disabled>
          الخامة *
        </option>
        {materials.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} ({m.code})
          </option>
        ))}
      </select>
      <input name="quantity" required placeholder="الكمية *" dir="ltr" className={inputCls} />
      <select name="unit" required defaultValue="" className={inputCls}>
        <option value="" disabled>
          الوحدة *
        </option>
        {unitOptions.map((u) => (
          <option key={u.value} value={u.value}>
            {u.label}
          </option>
        ))}
      </select>
      <input name="wastePercent" placeholder="هالك %" dir="ltr" className={inputCls} />
      <button type="submit" disabled={pending} style={brand} className={btnPrimary}>
        {pending ? "…" : "إضافة"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
        إلغاء
      </button>
    </form>
  );
}

// ===== نموذج إضافة عملية لمكوّن (من المكتبة أو استثنائية) =====

function AddOperationForm({
  componentId,
  operations,
}: {
  componentId: string;
  operations: OperationOpt[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [inline, setInline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const param = String(f.get("param") ?? "").trim() || 1;
    const payload = inline
      ? {
          name: String(f.get("name") ?? ""),
          costModel: String(f.get("costModel") ?? ""),
          standardCost: String(f.get("standardCost") ?? ""),
          param,
          saveToLibrary: f.get("saveToLibrary") === "on",
        }
      : { operationId: String(f.get("operationId") ?? ""), param };
    setError(null);
    startTransition(async () => {
      const res = await addComponentOperationAction(componentId, payload);
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
        className="text-xs font-semibold text-muted hover:text-brand"
      >
        + عملية
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full flex-col gap-3 rounded-lg border border-line bg-white p-4"
    >
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex gap-4 text-xs">
        <label className="flex items-center gap-1.5 text-ink">
          <input type="radio" checked={!inline} onChange={() => setInline(false)} /> من المكتبة
        </label>
        <label className="flex items-center gap-1.5 text-ink">
          <input type="radio" checked={inline} onChange={() => setInline(true)} /> عملية استثنائية
        </label>
      </div>

      {inline ? (
        <div className="flex flex-wrap items-end gap-3">
          <input name="name" required placeholder="اسم العملية *" className={inputCls} />
          <select name="costModel" required defaultValue="" className={inputCls}>
            <option value="" disabled>
              نموذج التكلفة *
            </option>
            {Object.entries(operationCostModelLabel).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input
            name="standardCost"
            required
            placeholder="التكلفة *"
            dir="ltr"
            className={inputCls}
          />
          <input name="param" placeholder="المعامل (كمية/زمن)" dir="ltr" className={inputCls} />
          <label className="flex items-center gap-1.5 text-xs text-ink">
            <input name="saveToLibrary" type="checkbox" className="h-4 w-4" /> حفظ في المكتبة
          </label>
        </div>
      ) : operations.length === 0 ? (
        <div className="text-xs text-muted">
          لا توجد عمليات في المكتبة — أضِفها في{" "}
          <span className="font-semibold">عمليات التصنيع</span> أو استخدم عملية استثنائية.
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <select name="operationId" required defaultValue="" className={inputCls}>
            <option value="" disabled>
              العملية *
            </option>
            {operations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} — {operationCostModelLabel[o.costModel]} ({o.standardCost})
              </option>
            ))}
          </select>
          <input name="param" placeholder="المعامل (كمية/زمن)" dir="ltr" className={inputCls} />
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} style={brand} className={btnPrimary}>
          {pending ? "…" : "إضافة"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
          إلغاء
        </button>
      </div>
    </form>
  );
}

// ===== لوحة التسعير والربحية =====

function PricingPanel({ productId, pricing }: { productId: string; pricing: ProductPricingView }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const opt = (k: string) => {
      const v = String(f.get(k) ?? "").trim();
      return v === "" ? undefined : v;
    };
    const payload = {
      salePrice: opt("salePrice"),
      minSalePrice: opt("minSalePrice"),
      minMarginPercent: opt("minMarginPercent"),
      reason: String(f.get("reason") ?? ""),
    };
    setError(null);
    startTransition(async () => {
      const res = await updateProductPricingAction(productId, payload);
      if (res.success) {
        setEditing(false);
        router.refresh();
      } else setError(res.error?.message ?? "تعذّر الحفظ");
    });
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">التسعير والربحية</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-brand hover:underline"
          >
            تعديل التسعير
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Metric label="التكلفة الفعّالة" value={pricing.effectiveCost} />
        <Metric label="سعر البيع" value={pricing.salePrice ?? "—"} />
        <Metric label="أقل سعر" value={pricing.minSalePrice ?? "—"} />
        <Metric label="الربح" value={pricing.profit ?? "—"} />
        <Metric label="الهامش %" value={pricing.margin ?? "—"} danger={pricing.belowMinMargin} />
        <Metric label="حد الهامش %" value={pricing.minMarginPercent ?? "—"} />
      </div>

      {pricing.belowMinMargin && (
        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          ⚠ الهامش الحالي أقل من الحد الأدنى المسموح.
        </div>
      )}

      {editing && (
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs text-muted">
              سعر البيع
              <input
                name="salePrice"
                defaultValue={pricing.salePrice ?? ""}
                dir="ltr"
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              أقل سعر بيع
              <input
                name="minSalePrice"
                defaultValue={pricing.minSalePrice ?? ""}
                dir="ltr"
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              حد أدنى للهامش %
              <input
                name="minMarginPercent"
                defaultValue={pricing.minMarginPercent ?? ""}
                dir="ltr"
                className={inputCls}
              />
            </label>
          </div>
          <input name="reason" placeholder="سبب التغيير (اختياري)" className={inputCls} />
          <div className="flex gap-2">
            <button type="submit" disabled={pending} style={brand} className={btnPrimary}>
              {pending ? "…" : "حفظ التسعير"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={btnGhost}>
              إلغاء
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-muted">{label}</div>
      <div className={`mt-0.5 text-lg font-bold ${danger ? "text-red-600" : "text-ink"}`} dir="ltr">
        {value}
      </div>
    </div>
  );
}
