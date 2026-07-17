// أكواد أخطاء خاصة بموديول products (غير الأكواد المشتركة في
// modules/shared/errors/AppError.ts). مبنية على قواعد products-analysis.md.

export const ProductsErrorCodes = {
  MATERIAL_CODE_TAKEN: "MATERIAL_CODE_TAKEN", // كود الخامة مستخدم بالفعل
  ATTRIBUTE_NAME_TAKEN: "ATTRIBUTE_NAME_TAKEN", // اسم السمة مستخدم بالفعل
  INVALID_CONVERSION_FACTOR: "INVALID_CONVERSION_FACTOR", // معامل التحويل يجب أن يكون > 0
  LIST_ATTRIBUTE_NEEDS_VALUES: "LIST_ATTRIBUTE_NEEDS_VALUES", // سمة "اختيار من قائمة" تحتاج قيمًا
  OPERATION_NAME_TAKEN: "OPERATION_NAME_TAKEN", // اسم عملية التصنيع مستخدم بالفعل
  INCOMPATIBLE_UNITS: "INCOMPATIBLE_UNITS", // وحدة كمية الخامة في الـ BOM لا تطابق بُعد وحدة الخامة
  PRODUCT_CODE_TAKEN: "PRODUCT_CODE_TAKEN", // كود المنتج مستخدم بالفعل
  COMPONENT_PARENT_MISMATCH: "COMPONENT_PARENT_MISMATCH", // المكوّن الأب يتبع منتجًا آخر
  MATERIAL_ARCHIVED: "MATERIAL_ARCHIVED", // لا يمكن استخدام خامة مؤرشفة في الوصفة
  INLINE_OPERATION_INCOMPLETE: "INLINE_OPERATION_INCOMPLETE", // عملية استثنائية تحتاج اسم + نموذج + تكلفة
} as const;

export type ProductsErrorCode = (typeof ProductsErrorCodes)[keyof typeof ProductsErrorCodes];
