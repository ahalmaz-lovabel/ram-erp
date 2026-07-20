// إجماليات عرض السعر = نفس محرك إجماليات مستندات البيع المشترك.
// المنطق الفعلي في shared/services/documentTotals (مشترك مع invoices).
export {
  computeLineTotal,
  computeDocumentTotals as computeQuoteTotals,
  type LineForTotal,
  type DocumentTotalsInput as QuoteTotalsInput,
  type DocumentTotals as QuoteTotals,
} from "@/modules/shared/services/documentTotals";
