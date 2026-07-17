// أكواد أخطاء خاصة بموديول products (غير الأكواد المشتركة في
// modules/shared/errors/AppError.ts). مبنية على قواعد products-analysis.md.

export const ProductsErrorCodes = {
  MATERIAL_CODE_TAKEN: "MATERIAL_CODE_TAKEN", // كود الخامة مستخدم بالفعل
  ATTRIBUTE_NAME_TAKEN: "ATTRIBUTE_NAME_TAKEN", // اسم السمة مستخدم بالفعل
  INVALID_CONVERSION_FACTOR: "INVALID_CONVERSION_FACTOR", // معامل التحويل يجب أن يكون > 0
  LIST_ATTRIBUTE_NEEDS_VALUES: "LIST_ATTRIBUTE_NEEDS_VALUES", // سمة "اختيار من قائمة" تحتاج قيمًا
  OPERATION_NAME_TAKEN: "OPERATION_NAME_TAKEN", // اسم عملية التصنيع مستخدم بالفعل
} as const;

export type ProductsErrorCode = (typeof ProductsErrorCodes)[keyof typeof ProductsErrorCodes];
