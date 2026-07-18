import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { isAppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { getCustomerProfile } from "@/modules/customers/services/CustomersService";
import {
  customerTypeLabel,
  customerStatusLabel,
  customerStatusBadge,
  contactDepartmentLabel,
  dealStatusLabel,
  dealTypeLabel,
} from "@/modules/customers/labels";
import { CustomerActions } from "./CustomerActions";
import { AddContactForm } from "./AddContactForm";
import { AddDealForm } from "./AddDealForm";

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  let customer;
  try {
    customer = await getCustomerProfile(user.id, id);
  } catch (e) {
    if (isAppError(e) && e.code === CommonErrorCodes.NOT_FOUND) notFound();
    throw e;
  }

  const b = customerStatusBadge[customer.status];
  const info: [string, string | null][] = [
    ["الهاتف", customer.phone],
    ["واتساب", customer.whatsapp],
    ["البريد", customer.email],
    ["المدينة", customer.city],
    ["الدولة", customer.country],
    ["العنوان", customer.address],
    ["الرقم الضريبي", customer.taxNumber],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/customers" className="text-sm text-muted hover:text-brand">
            ← رجوع للعملاء
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-[26px] font-extrabold text-ink">{customer.name}</h1>
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{ background: b.bg, color: b.color }}
            >
              {customerStatusLabel[customer.status]}
            </span>
            {customer.isImportant && <span className="text-sm text-amber-600">★ عميل مهم</span>}
          </div>
          <div className="mt-1 font-slug text-sm text-muted" dir="ltr">
            {customer.code} · {customerTypeLabel[customer.type]}
          </div>
        </div>
        <CustomerActions customerId={customer.id} archived={customer.status === "archived"} />
      </div>

      {/* البيانات الأساسية */}
      <section className="rounded-xl border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-bold text-ink">البيانات الأساسية</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {info.map(([k, v]) => (
            <div key={k}>
              <div className="text-xs text-muted">{k}</div>
              <div className="text-sm text-ink" dir={k === "البريد" ? "ltr" : undefined}>
                {v || "—"}
              </div>
            </div>
          ))}
        </div>
        {customer.notes && (
          <div className="mt-4">
            <div className="text-xs text-muted">ملاحظات</div>
            <div className="text-sm text-ink">{customer.notes}</div>
          </div>
        )}
      </section>

      {/* جهات التواصل */}
      <section className="rounded-xl border border-line bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">جهات التواصل ({customer.contacts.length})</h2>
          <AddContactForm customerId={customer.id} />
        </div>
        {customer.contacts.length === 0 ? (
          <p className="text-sm text-muted">لا توجد جهات تواصل.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {customer.contacts.map((ct) => (
              <div
                key={ct.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-line bg-white px-4 py-3"
              >
                <span className="font-semibold text-ink">{ct.name}</span>
                {ct.isPrimary && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                    style={{ background: "var(--color-brand)" }}
                  >
                    أساسية
                  </span>
                )}
                {ct.jobTitle && <span className="text-sm text-muted">{ct.jobTitle}</span>}
                {ct.department && (
                  <span className="text-xs text-muted">
                    · {contactDepartmentLabel[ct.department]}
                  </span>
                )}
                {ct.phone && (
                  <span className="text-sm text-muted" dir="ltr">
                    {ct.phone}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* الصفقات */}
      <section className="rounded-xl border border-line bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">الصفقات ({customer.deals.length})</h2>
          <AddDealForm customerId={customer.id} />
        </div>
        {customer.deals.length === 0 ? (
          <p className="text-sm text-muted">لا توجد صفقات.</p>
        ) : (
          <table className="w-full text-right text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="py-2 font-semibold">الرقم</th>
                <th className="py-2 font-semibold">الاسم</th>
                <th className="py-2 font-semibold">النوع</th>
                <th className="py-2 font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {customer.deals.map((d) => (
                <tr key={d.id} className="border-b border-line last:border-0">
                  <td className="py-2 font-slug text-muted" dir="ltr">
                    {d.number}
                  </td>
                  <td className="py-2 text-ink">{d.name}</td>
                  <td className="py-2 text-muted">{dealTypeLabel[d.type]}</td>
                  <td className="py-2 text-muted">{dealStatusLabel[d.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
