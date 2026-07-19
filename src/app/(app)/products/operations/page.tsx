import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { isAppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { listOperations } from "@/modules/products/services/OperationService";
import { AddOperationForm, OperationRow } from "./OperationForms";

export default async function OperationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let operations: Awaited<ReturnType<typeof listOperations>> = [];
  let denied = false;
  try {
    operations = await listOperations(user.id);
  } catch (e) {
    if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) denied = true;
    else throw e;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/products" className="text-sm text-muted hover:text-brand">
            ← المنتجات
          </Link>
          <h1 className="mt-1 text-[26px] font-extrabold text-ink">عمليات التصنيع</h1>
          <p className="mt-1 text-sm text-muted">العمليات المعيارية وتكلفتها (قص، لحام، دهان…)</p>
        </div>
        {!denied && <AddOperationForm />}
      </div>

      {denied ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا تملك صلاحية عرض العمليات.
        </div>
      ) : operations.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا توجد عمليات بعد — ابدأ بإضافة عملية.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {operations.map((o) => (
            <OperationRow
              key={o.id}
              operation={{
                id: o.id,
                name: o.name,
                category: o.category,
                costModel: o.costModel,
                standardCost: o.standardCost.toString(),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
