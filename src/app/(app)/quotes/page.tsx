import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { isAppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { listQuotes } from "@/modules/quotes/services/QuotesService";
import { listCustomers } from "@/modules/customers/services/CustomersService";
import { quoteStatusLabel, quoteStatusBadge } from "@/modules/quotes/labels";
import { CreateQuoteForm } from "./CreateQuoteForm";

export default async function QuotesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let quotes: Awaited<ReturnType<typeof listQuotes>> = [];
  let denied = false;
  try {
    quotes = await listQuotes(user.id);
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
          <h1 className="text-[26px] font-extrabold text-ink">عروض الأسعار</h1>
          <p className="mt-1 text-sm text-muted">إنشاء العروض من العملاء ومتابعة دورة حياتها</p>
        </div>
        {!denied && <CreateQuoteForm customers={customers} />}
      </div>

      {denied ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا تملك صلاحية عرض عروض الأسعار.
        </div>
      ) : quotes.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا توجد عروض أسعار بعد.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-right text-xs text-muted">
                <th className="px-4 py-3 font-semibold">الرقم</th>
                <th className="px-4 py-3 font-semibold">العميل</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3 font-semibold">الإجمالي</th>
                <th className="px-4 py-3 font-semibold">التاريخ</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => {
                const badge = quoteStatusBadge[q.status];
                return (
                  <tr key={q.id} className="border-b border-line last:border-0 hover:bg-canvas">
                    <td className="px-4 py-3 font-mono text-ink" dir="ltr">
                      {q.quoteNumber}
                    </td>
                    <td className="px-4 py-3 text-ink">{q.customerNameSnapshot}</td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        {quoteStatusLabel[q.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink" dir="ltr">
                      {q.grandTotal.toString()}
                    </td>
                    <td className="px-4 py-3 text-muted" dir="ltr">
                      {new Date(q.createdAt).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="px-4 py-3 text-left">
                      <Link
                        href={`/quotes/${q.id}`}
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
