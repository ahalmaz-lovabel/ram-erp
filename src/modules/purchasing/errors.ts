// أكواد أخطاء خاصة بموديول purchasing فقط (غير الأكواد المشتركة في
// modules/shared/errors/AppError.ts زي PERMISSION_DENIED أو NOT_FOUND).

export const PurchasingErrorCodes = {
  SUPPLIER_CODE_TAKEN: "SUPPLIER_CODE_TAKEN",
  PO_NOT_EDITABLE: "PO_NOT_EDITABLE", // تعديل أمر بعد إرساله/استلامه/إلغائه
  PO_EMPTY: "PO_EMPTY", // إرسال/استلام أمر بلا بنود
  PO_CANCELLED: "PO_CANCELLED",
  INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION",
  CANNOT_CANCEL_WITH_PAYMENTS: "CANNOT_CANCEL_WITH_PAYMENTS",
  PAYMENT_EXCEEDS_REMAINING: "PAYMENT_EXCEEDS_REMAINING",
  LINE_NOT_FOUND: "LINE_NOT_FOUND",
  PAYMENT_NOT_FOUND: "PAYMENT_NOT_FOUND",
} as const;

export type PurchasingErrorCode = (typeof PurchasingErrorCodes)[keyof typeof PurchasingErrorCodes];
