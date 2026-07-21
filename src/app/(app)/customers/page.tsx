import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { isAppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { listCustomers } from "@/modules/customers/services/CustomersService";
import type { CustomerStatus, CustomerType } from "@/modules/customers/types";
import {
  customerTypeLabel,
  customerStatusLabel,
  customerStatusBadge,
} from "@/modules/customers/labels";
import { CustomerRowActions } from "./CustomerRowActions";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; type?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  let customers: Awaited<ReturnType<typeof listCustomers>> = [];
  let denied = false;
  try {
    customers = await listCustomers(user.id, {
      search: sp.search,
      status: sp.status as CustomerStatus | undefined,
      type: sp.type as CustomerType | undefined,
    });
  } catch (e) {
    if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) denied = true;
    else throw e;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold text-ink">العملاء</h1>
          <p className="mt-1 text-sm text-muted">إدارة العملاء والصفقات وجهات التواصل</p>
        </div>
        <Link
          href="/customers/new"
          style={{ background: "var(--color-brand)" }}
          className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          + إضافة عميل
        </Link>
      </div>

      {denied ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا تملك صلاحية عرض العملاء.
        </div>
      ) : (
        <>
          <form className="flex flex-wrap gap-3 rounded-xl border border-line bg-surface p-4">
            <input
              name="search"
              defaultValue={sp.search}
              placeholder="ابحث بالاسم، الكود، الهاتف، البريد…"
              className="min-w-[240px] flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <select
              name="type"
              defaultValue={sp.type ?? ""}
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">كل الأنواع</option>
              {Object.entries(customerTypeLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={sp.status ?? ""}
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">كل الحالات</option>
              {Object.entries(customerStatusLabel).map(([k, v]) => (
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

          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[1100px] text-right text-sm">
              <thead className="border-b border-line bg-canvas text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">الكود</th>
                  <th className="px-4 py-3 font-semibold">الاسم</th>
                  <th className="px-4 py-3 font-semibold">النوع</th>
                  <th className="px-4 py-3 font-semibold">جهة التواصل</th>
                  <th className="px-4 py-3 font-semibold">هاتف / واتساب</th>
                  <th className="px-4 py-3 font-semibold">المدينة</th>
                  <th className="px-4 py-3 font-semibold">الحالة</th>
                  <th className="px-4 py-3 font-semibold">الفواتير (مدفوع/إجمالي)</th>
                  <th className="px-4 py-3 font-semibold">المتبقّي</th>
                  <th className="px-4 py-3 font-semibold">آخر تعامل</th>
                  <th className="px-4 py-3 font-semibold text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-muted">
                      لا يوجد عملاء بعد — ابدأ بإضافة عميل.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => {
                    const b = customerStatusBadge[c.status];
                    return (
                      <tr key={c.id} className="border-b border-line last:border-0 hover:bg-canvas">
                        <td className="px-4 py-3 font-slug text-muted" dir="ltr">
                          {c.code}
                        </td>
                        <td className="px-4 py-3 font-semibold text-ink">
                          <Link href={`/customers/${c.id}`} className="hover:text-brand">
                            {c.name}
                            {c.isImportant && <span title="عميل مهم"> ★</span>}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted">{customerTypeLabel[c.type]}</td>
                        <td className="px-4 py-3 text-muted">{c.primaryContactName ?? "—"}</td>
                        <td className="px-4 py-3 text-muted" dir="ltr">
                          {c.phone ?? c.whatsapp ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted">{c.city ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={{ background: b.bg, color: b.color }}
                          >
                            {customerStatusLabel[c.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted" dir="ltr">
                          {c.totalInvoiced.gt(0) ? (
                            <span>
                              {c.totalPaid.toString()} / {c.totalInvoiced.toString()}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td
                          className={`px-4 py-3 font-semibold ${
                            c.balance.gt(0) ? "text-red-600" : "text-ink"
                          }`}
                          dir="ltr"
                        >
                          {c.balance.gt(0) ? c.balance.toString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted" dir="ltr">
                          {c.lastInteractionAt
                            ? new Date(c.lastInteractionAt).toLocaleDateString("ar-EG")
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <CustomerRowActions
                            customerId={c.id}
                            archived={c.status === "archived"}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-muted">إجمالي: {customers.length} عميل</div>
        </>
      )}
    </div>
  );
}
