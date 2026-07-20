// أكواد أخطاء خاصة بموديول invoices فقط (غير الأكواد المشتركة في
// modules/shared/errors/AppError.ts زي PERMISSION_DENIED أو NOT_FOUND).

export const InvoicesErrorCodes = {
  INVOICE_NOT_EDITABLE: "INVOICE_NOT_EDITABLE", // تعديل فاتورة بعد أول دفعة أو بعد الإلغاء
  INVOICE_EMPTY: "INVOICE_EMPTY", // إصدار/تحويل بلا بنود
  INVOICE_CANCELLED: "INVOICE_CANCELLED", // عملية على فاتورة ملغاة
  CANNOT_CANCEL_WITH_PAYMENTS: "CANNOT_CANCEL_WITH_PAYMENTS", // إلغاء فاتورة بها دفعات (يلزم رد أولًا)
  QUOTE_NOT_CONVERTIBLE: "QUOTE_NOT_CONVERTIBLE", // العرض ليس في حالة تسمح بالتحويل
  QUOTE_ALREADY_CONVERTED: "QUOTE_ALREADY_CONVERTED", // العرض له فاتورة بالفعل
  PAYMENT_EXCEEDS_REMAINING: "PAYMENT_EXCEEDS_REMAINING", // الدفعة تتجاوز المتبقّي
  DEAL_WRONG_CUSTOMER: "DEAL_WRONG_CUSTOMER",
  LINE_NOT_FOUND: "LINE_NOT_FOUND",
  PAYMENT_NOT_FOUND: "PAYMENT_NOT_FOUND",
} as const;

export type InvoicesErrorCode = (typeof InvoicesErrorCodes)[keyof typeof InvoicesErrorCodes];
