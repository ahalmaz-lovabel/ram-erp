// أكواد أخطاء خاصة بموديول quotes فقط (غير الأكواد المشتركة في
// modules/shared/errors/AppError.ts زي PERMISSION_DENIED أو NOT_FOUND).

export const QuotesErrorCodes = {
  QUOTE_NOT_EDITABLE: "QUOTE_NOT_EDITABLE", // تعديل عرض في حالة لا تسمح (مُرسل/مقبول/مؤرشف...)
  QUOTE_EMPTY: "QUOTE_EMPTY", // إرسال عرض بلا بنود
  INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION", // انتقال حالة غير مسموح
  DEAL_WRONG_CUSTOMER: "DEAL_WRONG_CUSTOMER", // الصفقة لا تتبع نفس العميل
  LINE_NOT_FOUND: "LINE_NOT_FOUND", // بند غير موجود في العرض
} as const;

export type QuotesErrorCode = (typeof QuotesErrorCodes)[keyof typeof QuotesErrorCodes];
