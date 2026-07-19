import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { isAppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { getCustomerProfile } from "@/modules/customers/services/CustomersService";
import {
  customerTypeLabel,
  customerStatusLabel,
  customerStatusBadge,
  communicationTypeLabel,
} from "@/modules/customers/labels";
import { CustomerActions } from "./CustomerActions";
import { AddContactForm } from "./AddContactForm";
import { AddDealForm } from "./AddDealForm";
import { AddCommunicationForm } from "./AddCommunicationForm";
import { ContactRow } from "./ContactRow";
import { DealRow } from "./DealRow";

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
              <ContactRow
                key={ct.id}
                contact={{
                  id: ct.id,
                  name: ct.name,
                  jobTitle: ct.jobTitle,
                  phone: ct.phone,
                  whatsapp: ct.whatsapp,
                  email: ct.email,
                  isPrimary: ct.isPrimary,
                  department: ct.department,
                }}
              />
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
          <div className="flex flex-col gap-2">
            {customer.deals.map((d) => (
              <DealRow
                key={d.id}
                deal={{
                  id: d.id,
                  number: d.number,
                  name: d.name,
                  type: d.type,
                  status: d.status,
                  source: d.source,
                  estimatedValue: d.estimatedValue?.toString() ?? null,
                  expectedCloseDate: d.expectedCloseDate
                    ? d.expectedCloseDate.toISOString().slice(0, 10)
                    : null,
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* سجل التواصل والمتابعة (§14) */}
      <section className="rounded-xl border border-line bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">
            سجل التواصل ({customer.communications.length})
          </h2>
          <AddCommunicationForm customerId={customer.id} />
        </div>
        {customer.communications.length === 0 ? (
          <p className="text-sm text-muted">لا توجد متابعات.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {customer.communications.map((cm) => (
              <div key={cm.id} className="rounded-lg border border-line bg-white px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className="rounded bg-canvas px-1.5 py-0.5 font-semibold text-ink">
                    {communicationTypeLabel[cm.type]}
                  </span>
                  <span dir="ltr">{cm.createdAt.toISOString().slice(0, 10)}</span>
                  {cm.nextFollowUpDate && (
                    <span>· متابعة: {cm.nextFollowUpDate.toISOString().slice(0, 10)}</span>
                  )}
                </div>
                <div className="mt-1 text-sm text-ink">{cm.summary}</div>
                {cm.nextStep && (
                  <div className="mt-1 text-xs text-muted">الخطوة التالية: {cm.nextStep}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
