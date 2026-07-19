import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { isAppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { listAttributes } from "@/modules/products/services/AttributeService";
import { AddAttributeForm, AttributeRow } from "./AttributeForms";

export default async function AttributesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let attributes: Awaited<ReturnType<typeof listAttributes>> = [];
  let denied = false;
  try {
    attributes = await listAttributes(user.id);
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
          <h1 className="mt-1 text-[26px] font-extrabold text-ink">مكتبة السمات</h1>
          <p className="mt-1 text-sm text-muted">
            خصائص المنتجات الموحّدة (اللون، المقاس، الخامة…)
          </p>
        </div>
        {!denied && <AddAttributeForm />}
      </div>

      {denied ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا تملك صلاحية عرض السمات.
        </div>
      ) : attributes.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا توجد سمات بعد — ابدأ بإضافة سمة.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {attributes.map((a) => (
            <AttributeRow
              key={a.id}
              attribute={{
                id: a.id,
                name: a.name,
                type: a.type,
                values: a.values.map((v) => v.value),
                internalOnly: a.internalOnly,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
