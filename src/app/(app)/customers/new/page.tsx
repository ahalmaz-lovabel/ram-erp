import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { CreateCustomerForm } from "./CreateCustomerForm";

export default async function NewCustomerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <Link href="/customers" className="text-sm text-muted hover:text-brand">
          ← رجوع للعملاء
        </Link>
        <h1 className="mt-2 text-[26px] font-extrabold text-ink">إضافة عميل جديد</h1>
      </div>
      <CreateCustomerForm />
    </div>
  );
}
