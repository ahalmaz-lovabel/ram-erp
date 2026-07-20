import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { isAppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import {
  getProductDetail,
  getProductPricing,
  type ProductPricingView,
} from "@/modules/products/services/ProductService";
import { listMaterials } from "@/modules/products/services/MaterialService";
import { listOperations } from "@/modules/products/services/OperationService";
import { ProductBuilder } from "./ProductBuilder";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  let product: Awaited<ReturnType<typeof getProductDetail>>;
  try {
    product = await getProductDetail(user.id, id);
  } catch (e) {
    if (isAppError(e) && e.code === CommonErrorCodes.NOT_FOUND) notFound();
    if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) {
      return (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا تملك صلاحية عرض المنتجات.
        </div>
      );
    }
    throw e;
  }

  // التسعير قد يكون بصلاحية منفصلة (viewProductProfit) — لا نُفشل الصفحة لغيابها.
  let pricing: ProductPricingView | null = null;
  try {
    pricing = await getProductPricing(user.id, id);
  } catch (e) {
    if (!(isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED)) throw e;
  }

  // قوائم الاختيار للنماذج (تُخفي المؤرشف). قد تكون بصلاحية منفصلة.
  const materials = await listMaterials(user.id).catch((e) => {
    if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) return [];
    throw e;
  });
  const operations = await listOperations(user.id).catch((e) => {
    if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) return [];
    throw e;
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/products/catalog" className="text-sm text-muted hover:text-brand">
          ← كتالوج المنتجات
        </Link>
        <h1 className="mt-1 text-[26px] font-extrabold text-ink">{product.name}</h1>
        <p className="mt-1 font-mono text-sm text-muted" dir="ltr">
          {product.code}
        </p>
      </div>

      <ProductBuilder
        productId={product.id}
        productionCost={product.productionCost.toString()}
        costUpdatedAt={product.costUpdatedAt ? product.costUpdatedAt.toISOString() : null}
        components={product.components.map((c) => ({
          id: c.id,
          parentId: c.parentId,
          name: c.name,
          quantity: c.quantity.toString(),
          lengthCm: c.lengthCm?.toString() ?? null,
          widthCm: c.widthCm?.toString() ?? null,
          thicknessMm: c.thicknessMm?.toString() ?? null,
          weightKg: c.weightKg?.toString() ?? null,
          notes: c.notes,
          materials: c.materials.map((m) => ({
            id: m.id,
            materialName: m.material.name,
            materialCode: m.material.code,
            quantity: m.quantity.toString(),
            unit: m.unit,
            wastePercent: m.wastePercent.toString(),
          })),
          operations: c.operations.map((o) => ({
            id: o.id,
            name: o.name,
            costModel: o.costModel,
            standardCost: o.standardCost.toString(),
            param: o.param.toString(),
          })),
        }))}
        materials={materials.map((m) => ({
          id: m.id,
          code: m.code,
          name: m.name,
          baseUnit: m.baseUnit,
        }))}
        operations={operations.map((o) => ({
          id: o.id,
          name: o.name,
          costModel: o.costModel,
          standardCost: o.standardCost.toString(),
        }))}
        pricing={pricing}
      />
    </div>
  );
}
