import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { isAppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { getPurchaseOrderDetail } from "@/modules/purchasing/services/PurchasingService";
import { listMaterials } from "@/modules/products/services/MaterialService";
import { PurchaseOrderEditor } from "./PurchaseOrderEditor";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  let order: Awaited<ReturnType<typeof getPurchaseOrderDetail>>;
  try {
    order = await getPurchaseOrderDetail(user.id, id);
  } catch (e) {
    if (isAppError(e) && e.code === CommonErrorCodes.NOT_FOUND) notFound();
    if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) {
      return (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا تملك صلاحية عرض أوامر الشراء.
        </div>
      );
    }
    throw e;
  }

  const materials = (
    await listMaterials(user.id, { status: "active" }).catch((e) => {
      if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) return [];
      throw e;
    })
  ).map((m) => ({
    id: m.id,
    code: m.code,
    name: m.name,
    purchaseUnit: m.purchaseUnit,
    purchaseUnitPrice: m.purchaseUnitPrice ? m.purchaseUnitPrice.toString() : null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/purchasing" className="text-sm text-muted hover:text-brand">
          ← المشتريات
        </Link>
        <h1 className="mt-1 flex items-baseline gap-3 text-[26px] font-extrabold text-ink">
          <span className="font-mono" dir="ltr">
            {order.poNumber}
          </span>
          <span className="text-base font-semibold text-muted">{order.supplierNameSnapshot}</span>
        </h1>
      </div>

      <PurchaseOrderEditor
        order={{
          id: order.id,
          status: order.status,
          expectedDate: order.expectedDate ? order.expectedDate.toISOString() : null,
          receivedAt: order.receivedAt ? order.receivedAt.toISOString() : null,
          discountPercent: order.discountPercent.toString(),
          taxPercent: order.taxPercent.toString(),
          subtotal: order.subtotal.toString(),
          discountAmount: order.discountAmount.toString(),
          taxAmount: order.taxAmount.toString(),
          grandTotal: order.grandTotal.toString(),
          paidAmount: order.paidAmount.toString(),
          notes: order.notes,
          terms: order.terms,
          lines: order.lines.map((l) => ({
            id: l.id,
            materialCode: l.materialCodeSnapshot,
            materialName: l.materialNameSnapshot,
            quantity: l.quantity.toString(),
            unit: l.unit,
            unitPrice: l.unitPrice.toString(),
            lineTotal: l.lineTotal.toString(),
          })),
          payments: order.payments.map((p) => ({
            id: p.id,
            amount: p.amount.toString(),
            method: p.method,
            paidAt: p.paidAt.toISOString(),
            reference: p.reference,
          })),
        }}
        materials={materials}
      />
    </div>
  );
}
