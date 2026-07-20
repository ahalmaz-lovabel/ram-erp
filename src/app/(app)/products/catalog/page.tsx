import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { isAppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { listProducts } from "@/modules/products/services/ProductService";
import { productStatusLabel } from "@/modules/products/labels";
import { CreateProductForm } from "./CreateProductForm";

export default async function ProductCatalogPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let products: Awaited<ReturnType<typeof listProducts>> = [];
  let denied = false;
  try {
    products = await listProducts(user.id);
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
          <h1 className="mt-1 text-[26px] font-extrabold text-ink">كتالوج المنتجات</h1>
          <p className="mt-1 text-sm text-muted">
            الأجهزة والقطع، شجرة المكوّنات، وتكلفة الإنتاج المجمّعة
          </p>
        </div>
        {!denied && <CreateProductForm />}
      </div>

      {denied ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا تملك صلاحية عرض المنتجات.
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا توجد منتجات بعد — ابدأ بإنشاء منتج.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-right text-xs text-muted">
                <th className="px-4 py-3 font-semibold">الكود</th>
                <th className="px-4 py-3 font-semibold">الاسم</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3 font-semibold">تكلفة الإنتاج</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0 hover:bg-canvas">
                  <td className="px-4 py-3 font-mono text-ink" dir="ltr">
                    {p.code}
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">{p.name}</td>
                  <td className="px-4 py-3 text-muted">{productStatusLabel[p.status]}</td>
                  <td className="px-4 py-3 text-ink" dir="ltr">
                    {p.productionCost.toString()}
                  </td>
                  <td className="px-4 py-3 text-left">
                    <Link
                      href={`/products/catalog/${p.id}`}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      فتح ←
                    </Link>
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
