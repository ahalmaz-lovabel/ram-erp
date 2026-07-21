import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { isAppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { listPurchaseOrders, listSuppliers } from "@/modules/purchasing/services/PurchasingService";
import { purchaseOrderStatusLabel, purchaseOrderStatusBadge } from "@/modules/purchasing/labels";
import { CreatePurchaseOrderForm } from "./CreatePurchaseOrderForm";

export default async function PurchasingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let orders: Awaited<ReturnType<typeof listPurchaseOrders>> = [];
  let denied = false;
  try {
    orders = await listPurchaseOrders(user.id);
  } catch (e) {
    if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) denied = true;
    else throw e;
  }

  const suppliers = (
    await listSuppliers(user.id, { status: "active" }).catch((e) => {
      if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) return [];
      throw e;
    })
  ).map((s) => ({ id: s.id, name: s.name, code: s.code }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold text-ink">المشتريات</h1>
          <p className="mt-1 text-sm text-muted">
            أوامر الشراء من الموردين ومتابعة الاستلام والدفع
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/purchasing/suppliers"
            className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:border-brand"
          >
            الموردون
          </Link>
          {!denied && <CreatePurchaseOrderForm suppliers={suppliers} />}
        </div>
      </div>

      {denied ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا تملك صلاحية عرض أوامر الشراء.
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا توجد أوامر شراء بعد.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-right text-xs text-muted">
                <th className="px-4 py-3 font-semibold">الرقم</th>
                <th className="px-4 py-3 font-semibold">المورد</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3 font-semibold">الإجمالي</th>
                <th className="px-4 py-3 font-semibold">المدفوع</th>
                <th className="px-4 py-3 font-semibold">التوريد المتوقّع</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const badge = purchaseOrderStatusBadge[o.status];
                const label = purchaseOrderStatusLabel[o.status];
                return (
                  <tr key={o.id} className="border-b border-line last:border-0 hover:bg-canvas">
                    <td className="px-4 py-3 font-mono text-ink" dir="ltr">
                      {o.poNumber}
                    </td>
                    <td className="px-4 py-3 text-ink">{o.supplierNameSnapshot}</td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        {label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink" dir="ltr">
                      {o.grandTotal.toString()}
                    </td>
                    <td className="px-4 py-3 text-muted" dir="ltr">
                      {o.paidAmount.toString()}
                    </td>
                    <td className="px-4 py-3 text-muted" dir="ltr">
                      {o.expectedDate ? new Date(o.expectedDate).toLocaleDateString("ar-EG") : "—"}
                    </td>
                    <td className="px-4 py-3 text-left">
                      <Link
                        href={`/purchasing/${o.id}`}
                        className="text-xs font-semibold text-brand hover:underline"
                      >
                        فتح ←
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
