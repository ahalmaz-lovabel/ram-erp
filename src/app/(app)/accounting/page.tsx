import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { isAppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { getReceivablesSummary } from "@/modules/accounting/services/AccountingService";

export default async function AccountingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let summary: Awaited<ReturnType<typeof getReceivablesSummary>> | null = null;
  let denied = false;
  try {
    summary = await getReceivablesSummary(user.id);
  } catch (e) {
    if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) denied = true;
    else throw e;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[26px] font-extrabold text-ink">الحسابات</h1>
        <p className="mt-1 text-sm text-muted">المستحقات على العملاء وكشوف الحسابات</p>
      </div>

      {denied ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا تملك صلاحية عرض المستحقات المالية.
        </div>
      ) : !summary || summary.customers.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا توجد مستحقات حاليًا.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface p-5">
              <div className="text-xs text-muted">إجمالي المستحقات</div>
              <div className="mt-1 text-2xl font-extrabold text-ink" dir="ltr">
                {summary.totalOutstanding}
              </div>
            </div>
            <div className="rounded-xl border border-line bg-surface p-5">
              <div className="text-xs text-muted">منها متأخّرة</div>
              <div className="mt-1 text-2xl font-extrabold text-red-600" dir="ltr">
                {summary.totalOverdue}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-line text-right text-xs text-muted">
                  <th className="px-4 py-3 font-semibold">العميل</th>
                  <th className="px-4 py-3 font-semibold">المستحق</th>
                  <th className="px-4 py-3 font-semibold">المتأخّر</th>
                  <th className="px-4 py-3 font-semibold">فواتير</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {summary.customers.map((c) => (
                  <tr
                    key={c.customerId}
                    className="border-b border-line last:border-0 hover:bg-canvas"
                  >
                    <td className="px-4 py-3 font-semibold text-ink">{c.customerName}</td>
                    <td className="px-4 py-3 text-ink" dir="ltr">
                      {c.outstanding}
                    </td>
                    <td
                      className={`px-4 py-3 ${Number(c.overdue) > 0 ? "text-red-600" : "text-muted"}`}
                      dir="ltr"
                    >
                      {c.overdue}
                    </td>
                    <td className="px-4 py-3 text-muted" dir="ltr">
                      {c.invoiceCount}
                    </td>
                    <td className="px-4 py-3 text-left">
                      <Link
                        href={`/accounting/${c.customerId}`}
                        className="text-xs font-semibold text-brand hover:underline"
                      >
                        كشف الحساب ←
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
