import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { isAppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { getCustomerStatement } from "@/modules/accounting/services/AccountingService";

export default async function CustomerStatementPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { customerId } = await params;

  let statement: Awaited<ReturnType<typeof getCustomerStatement>>;
  try {
    statement = await getCustomerStatement(user.id, customerId);
  } catch (e) {
    if (isAppError(e) && e.code === CommonErrorCodes.NOT_FOUND) notFound();
    if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) {
      return (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا تملك صلاحية عرض كشف الحساب.
        </div>
      );
    }
    throw e;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/accounting" className="text-sm text-muted hover:text-brand">
          ← الحسابات
        </Link>
        <h1 className="mt-1 text-[26px] font-extrabold text-ink">
          كشف حساب: {statement.customerName}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="إجمالي الفواتير" value={statement.totalDebit} />
        <Stat label="إجمالي المدفوع" value={statement.totalCredit} />
        <Stat
          label="الرصيد المستحق"
          value={statement.balance}
          highlight={Number(statement.balance) > 0}
        />
      </div>

      {statement.movements.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا توجد حركات مالية لهذا العميل.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-right text-xs text-muted">
                <th className="px-4 py-3 font-semibold">التاريخ</th>
                <th className="px-4 py-3 font-semibold">البيان</th>
                <th className="px-4 py-3 font-semibold">مدين</th>
                <th className="px-4 py-3 font-semibold">دائن</th>
                <th className="px-4 py-3 font-semibold">الرصيد</th>
              </tr>
            </thead>
            <tbody>
              {statement.movements.map((m, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 text-muted" dir="ltr">
                    {new Date(m.date).toLocaleDateString("ar-EG")}
                  </td>
                  <td className="px-4 py-3 text-ink">{m.description}</td>
                  <td className="px-4 py-3 text-ink" dir="ltr">
                    {m.debit !== "0" ? m.debit : "—"}
                  </td>
                  <td className="px-4 py-3 text-green-700" dir="ltr">
                    {m.credit !== "0" ? m.credit : "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink" dir="ltr">
                    {m.balance}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="text-xs text-muted">{label}</div>
      <div
        className={`mt-1 text-2xl font-extrabold ${highlight ? "text-red-600" : "text-ink"}`}
        dir="ltr"
      >
        {value}
      </div>
    </div>
  );
}
