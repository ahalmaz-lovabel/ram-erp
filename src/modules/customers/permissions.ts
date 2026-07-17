// صلاحيات موديول customers. تتسجل في الـ registry المركزي عبر register.ts.
// مبنية على docs/analysis/customers-analysis.md (§2 ضابط الحذف/الأرشفة).

export const CustomersPermissions = {
  viewCustomers: "customers.view",
  createCustomer: "customers.create",
  updateCustomer: "customers.update",
  archiveCustomer: "customers.archive",
  manageContacts: "customers.manage_contacts",

  viewDeals: "deals.view",
  createDeal: "deals.create",
  updateDeal: "deals.update",
  changeDealStatus: "deals.change_status",

  logCommunication: "customers.log_communication",
  viewCommunications: "customers.view_communications",
} as const;

export type CustomersPermission = (typeof CustomersPermissions)[keyof typeof CustomersPermissions];

export const CustomersPermissionLabels: Record<keyof typeof CustomersPermissions, string> = {
  viewCustomers: "عرض العملاء",
  createCustomer: "إضافة عميل",
  updateCustomer: "تعديل عميل",
  archiveCustomer: "أرشفة عميل",
  manageContacts: "إدارة جهات التواصل",
  viewDeals: "عرض الصفقات",
  createDeal: "إضافة صفقة",
  updateDeal: "تعديل صفقة",
  changeDealStatus: "تغيير حالة صفقة",
  logCommunication: "تسجيل متابعة/تواصل",
  viewCommunications: "عرض سجل التواصل",
};
