import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { isAppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { listSuppliers } from "@/modules/purchasing/services/PurchasingService";
import { supplierStatusLabel } from "@/modules/purchasing/labels";
import { CreateSupplierForm } from "./CreateSupplierForm";
import { SupplierRow } from "./SupplierRow";

export default async function SuppliersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let suppliers: Awaited<ReturnType<typeof listSuppliers>> = [];
  let denied = false;
  try {
    suppliers = await listSuppliers(user.id);
  } catch (e) {
    if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) denied = true;
    else throw e;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/purchasing" className="text-sm text-muted hover:text-brand">
            ← المشتريات
          </Link>
          <h1 className="mt-1 text-[26px] font-extrabold text-ink">الموردون</h1>
          <p className="mt-1 text-sm text-muted">بيانات الموردين وحالتهم</p>
        </div>
        {!denied && <CreateSupplierForm />}
      </div>

      {denied ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا تملك صلاحية عرض الموردين.
        </div>
      ) : suppliers.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا يوجد موردون بعد.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-right text-xs text-muted">
                <th className="px-4 py-3 font-semibold">الكود</th>
                <th className="px-4 py-3 font-semibold">الاسم</th>
                <th className="px-4 py-3 font-semibold">الهاتف</th>
                <th className="px-4 py-3 font-semibold">مسؤول التواصل</th>
                <th className="px-4 py-3 font-semibold">الأوامر</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <SupplierRow
                  key={s.id}
                  supplier={{
                    id: s.id,
                    code: s.code,
                    name: s.name,
                    phone: s.phone,
                    whatsapp: s.whatsapp,
                    email: s.email,
                    address: s.address,
                    contactPerson: s.contactPerson,
                    taxNumber: s.taxNumber,
                    notes: s.notes,
                    status: s.status,
                    statusLabel: supplierStatusLabel[s.status],
                    ordersCount: s.ordersCount,
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
