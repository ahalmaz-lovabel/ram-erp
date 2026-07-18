import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { isAppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { getCustomerProfile } from "@/modules/customers/services/CustomersService";
import { EditCustomerForm } from "./EditCustomerForm";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  let c;
  try {
    c = await getCustomerProfile(user.id, id);
  } catch (e) {
    if (isAppError(e) && e.code === CommonErrorCodes.NOT_FOUND) notFound();
    throw e;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <Link href={`/customers/${id}`} className="text-sm text-muted hover:text-brand">
          ← رجوع لملف العميل
        </Link>
        <h1 className="mt-2 text-[26px] font-extrabold text-ink">تعديل: {c.name}</h1>
      </div>
      <EditCustomerForm
        customer={{
          id: c.id,
          name: c.name,
          type: c.type,
          isImportant: c.isImportant,
          phone: c.phone,
          whatsapp: c.whatsapp,
          email: c.email,
          city: c.city,
          country: c.country,
          address: c.address,
          taxNumber: c.taxNumber,
          source: c.source,
          notes: c.notes,
        }}
      />
    </div>
  );
}
