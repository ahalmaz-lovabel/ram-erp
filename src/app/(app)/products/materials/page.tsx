import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { isAppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { listMaterials } from "@/modules/products/services/MaterialService";
import type { MaterialStatus } from "@/modules/products/types";
import { materialStatusLabel } from "@/modules/products/labels";
import { AddMaterialForm } from "./AddMaterialForm";
import { MaterialRow } from "./MaterialRow";

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  let materials: Awaited<ReturnType<typeof listMaterials>> = [];
  let denied = false;
  try {
    materials = await listMaterials(user.id, {
      search: sp.search,
      status: sp.status as MaterialStatus | undefined,
    });
  } catch (e) {
    if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) denied = true;
    else throw e;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/products" className="text-sm text-muted hover:text-brand">
            ← المنتجات
          </Link>
          <h1 className="mt-1 text-[26px] font-extrabold text-ink">مكتبة الخامات</h1>
          <p className="mt-1 text-sm text-muted">الخامات وأسعارها ووحدات الحساب</p>
        </div>
        {!denied && <AddMaterialForm />}
      </div>

      {denied ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا تملك صلاحية عرض الخامات.
        </div>
      ) : (
        <>
          <form className="flex flex-wrap gap-3 rounded-xl border border-line bg-surface p-4">
            <input
              name="search"
              defaultValue={sp.search}
              placeholder="ابحث بالكود، الاسم، التصنيف…"
              className="min-w-[240px] flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <select
              name="status"
              defaultValue={sp.status ?? ""}
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">كل الحالات</option>
              {Object.entries(materialStatusLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas"
            >
              بحث
            </button>
          </form>

          {materials.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
              لا توجد خامات بعد — ابدأ بإضافة خامة.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {materials.map((m) => (
                <MaterialRow
                  key={m.id}
                  material={{
                    id: m.id,
                    code: m.code,
                    name: m.name,
                    category: m.category,
                    purchaseUnit: m.purchaseUnit,
                    baseUnit: m.baseUnit,
                    purchaseUnitPrice: m.purchaseUnitPrice.toString(),
                    baseUnitPrice: m.baseUnitPrice.toString(),
                    status: m.status,
                  }}
                />
              ))}
            </div>
          )}
          <div className="text-xs text-muted">إجمالي: {materials.length} خامة</div>
        </>
      )}
    </div>
  );
}
