import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { isAppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { listInvoices } from "@/modules/invoices/services/InvoicesService";
import { listCustomers } from "@/modules/customers/services/CustomersService";
import { invoiceStatusLabel, invoiceStatusBadge } from "@/modules/invoices/labels";
import { isOverdue } from "@/modules/invoices/services/paymentStatus";
import { CreateInvoiceForm } from "./CreateInvoiceForm";

export default async function InvoicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let invoices: Awaited<ReturnType<typeof listInvoices>> = [];
  let denied = false;
  try {
    invoices = await listInvoices(user.id);
  } catch (e) {
    if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) denied = true;
    else throw e;
  }

  const customers = (
    await listCustomers(user.id).catch((e) => {
      if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) return [];
      throw e;
    })
  ).map((c) => ({ id: c.id, name: c.name, code: c.code }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold text-ink">الفواتير</h1>
          <p className="mt-1 text-sm text-muted">إصدار الفواتير ومتابعة السداد والدفعات</p>
        </div>
        {!denied && <CreateInvoiceForm customers={customers} />}
      </div>

      {denied ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا تملك صلاحية عرض الفواتير.
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا توجد فواتير بعد.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-right text-xs text-muted">
                <th className="px-4 py-3 font-semibold">الرقم</th>
                <th className="px-4 py-3 font-semibold">العميل</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3 font-semibold">الإجمالي</th>
                <th className="px-4 py-3 font-semibold">المدفوع</th>
                <th className="px-4 py-3 font-semibold">الاستحقاق</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const overdue = isOverdue(inv.status, inv.dueDate);
                const badge = overdue ? invoiceStatusBadge.overdue : invoiceStatusBadge[inv.status];
                const label = overdue ? invoiceStatusLabel.overdue : invoiceStatusLabel[inv.status];
                return (
                  <tr key={inv.id} className="border-b border-line last:border-0 hover:bg-canvas">
                    <td className="px-4 py-3 font-mono text-ink" dir="ltr">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-ink">{inv.customerNameSnapshot}</td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        {label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink" dir="ltr">
                      {inv.grandTotal.toString()}
                    </td>
                    <td className="px-4 py-3 text-muted" dir="ltr">
                      {inv.paidAmount.toString()}
                    </td>
                    <td className="px-4 py-3 text-muted" dir="ltr">
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("ar-EG") : "—"}
                    </td>
                    <td className="px-4 py-3 text-left">
                      <Link
                        href={`/invoices/${inv.id}`}
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
