// أكواد أخطاء خاصة بموديول customers (غير الأكواد المشتركة).

export const CustomersErrorCodes = {
  CUSTOMER_CODE_TAKEN: "CUSTOMER_CODE_TAKEN", // كود العميل مستخدم بالفعل
  CONTACT_WRONG_CUSTOMER: "CONTACT_WRONG_CUSTOMER", // جهة التواصل تتبع عميلًا آخر
} as const;

export type CustomersErrorCode = (typeof CustomersErrorCodes)[keyof typeof CustomersErrorCodes];
