import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { isAppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { getInvoiceDetail } from "@/modules/invoices/services/InvoicesService";
import { isOverdue } from "@/modules/invoices/services/paymentStatus";
import { listProducts } from "@/modules/products/services/ProductService";
import { InvoiceEditor } from "./InvoiceEditor";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  let invoice: Awaited<ReturnType<typeof getInvoiceDetail>>;
  try {
    invoice = await getInvoiceDetail(user.id, id);
  } catch (e) {
    if (isAppError(e) && e.code === CommonErrorCodes.NOT_FOUND) notFound();
    if (isAppError(e) && e.code === CommonErrorCodes.PERMISSION_DENIED) {
      return (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          لا تملك صلاحية عرض الفواتير.
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
        <Link href="/invoices" className="text-sm text-muted hover:text-brand">
          ← الفواتير
        </Link>
        <h1 className="mt-1 flex items-baseline gap-3 text-[26px] font-extrabold text-ink">
          <span className="font-mono" dir="ltr">
            {invoice.invoiceNumber}
          </span>
          <span className="text-base font-semibold text-muted">{invoice.customerNameSnapshot}</span>
        </h1>
      </div>

      <InvoiceEditor
        invoice={{
          id: invoice.id,
          status: invoice.status,
          overdue: isOverdue(invoice.status, invoice.dueDate),
          dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
          sourceQuoteId: invoice.sourceQuoteId,
          discountPercent: invoice.discountPercent.toString(),
          taxPercent: invoice.taxPercent.toString(),
          subtotal: invoice.subtotal.toString(),
          discountAmount: invoice.discountAmount.toString(),
          taxAmount: invoice.taxAmount.toString(),
          grandTotal: invoice.grandTotal.toString(),
          paidAmount: invoice.paidAmount.toString(),
          notes: invoice.notes,
          terms: invoice.terms,
          lines: invoice.lines.map((l) => ({
            id: l.id,
            productCode: l.productCodeSnapshot,
            productName: l.productNameSnapshot,
            quantity: l.quantity.toString(),
            unitPrice: l.unitPrice.toString(),
            discountPercent: l.discountPercent.toString(),
            lineTotal: l.lineTotal.toString(),
          })),
          payments: invoice.payments.map((p) => ({
            id: p.id,
            amount: p.amount.toString(),
            method: p.method,
            paidAt: p.paidAt.toISOString(),
            reference: p.reference,
          })),
        }}
        products={products}
      />
    </div>
  );
}
