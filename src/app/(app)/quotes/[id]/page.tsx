import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { isAppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { getQuoteDetail } from "@/modules/quotes/services/QuotesService";
import { listProducts } from "@/modules/products/services/ProductService";
import { QuoteEditor } from "./QuoteEditor";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  let quote: Awaited<ReturnType<typeof getQuoteDetail>>;
  try {
    quote = await getQuoteDetail(user.id, id);
  } catch (e) {
    if (isAppError(e) && e.code === CommonErrorCodes.NOT_FOUND) notFound();
    if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) {
      return (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا تملك صلاحية عرض عروض الأسعار.
        </div>
      );
    }
    throw e;
  }

  const products = (
    await listProducts(user.id).catch((e) => {
      if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) return [];
      throw e;
    })
  ).map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    salePrice: p.salePrice ? p.salePrice.toString() : null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/quotes" className="text-sm text-muted hover:text-brand">
          ← عروض الأسعار
        </Link>
        <h1 className="mt-1 flex items-baseline gap-3 text-[26px] font-extrabold text-ink">
          <span className="font-mono" dir="ltr">
            {quote.quoteNumber}
          </span>
          <span className="text-base font-semibold text-muted">{quote.customerNameSnapshot}</span>
        </h1>
      </div>

      <QuoteEditor
        quote={{
          id: quote.id,
          status: quote.status,
          issuedAt: quote.issuedAt ? quote.issuedAt.toISOString() : null,
          validUntil: quote.validUntil ? quote.validUntil.toISOString() : null,
          approvedAt: quote.approvedAt ? quote.approvedAt.toISOString() : null,
          discountPercent: quote.discountPercent.toString(),
          taxPercent: quote.taxPercent.toString(),
          subtotal: quote.subtotal.toString(),
          discountAmount: quote.discountAmount.toString(),
          taxAmount: quote.taxAmount.toString(),
          grandTotal: quote.grandTotal.toString(),
          notes: quote.notes,
          terms: quote.terms,
          lines: quote.lines.map((l) => ({
            id: l.id,
            productCode: l.productCodeSnapshot,
            productName: l.productNameSnapshot,
            quantity: l.quantity.toString(),
            unitPrice: l.unitPrice.toString(),
            unitCost: l.unitCostSnapshot.toString(),
            discountPercent: l.discountPercent.toString(),
            lineTotal: l.lineTotal.toString(),
          })),
        }}
        products={products}
      />
    </div>
  );
}
