// صلاحيات موديول purchasing. تتسجّل في الـ registry المركزي عبر register.ts.
// ⚠️ لا يوجد تحليل معتمد — الصلاحيات افتراضات موثّقة في README.

export const PurchasingPermissions = {
  // الموردون
  viewSuppliers: "purchasing.view_suppliers",
  createSupplier: "purchasing.create_supplier",
  updateSupplier: "purchasing.update_supplier",
  archiveSupplier: "purchasing.archive_supplier",
  // أوامر الشراء
  viewOrders: "purchasing.view_orders",
  createOrder: "purchasing.create_order",
  updateOrder: "purchasing.update_order", // تعديل الرأس/البنود (مسودة)
  receiveOrder: "purchasing.receive_order", // تأكيد الاستلام
  cancelOrder: "purchasing.cancel_order",
  // مدفوعات الموردين
  recordPayment: "purchasing.record_payment",
  deletePayment: "purchasing.delete_payment",
} as const;

export type PurchasingPermission =
  (typeof PurchasingPermissions)[keyof typeof PurchasingPermissions];

export const PurchasingPermissionLabels: Record<keyof typeof PurchasingPermissions, string> = {
  viewSuppliers: "عرض الموردين",
  createSupplier: "إضافة مورد",
  updateSupplier: "تعديل مورد",
  archiveSupplier: "أرشفة مورد",
  viewOrders: "عرض أوامر الشراء",
  createOrder: "إنشاء أمر شراء",
  updateOrder: "تعديل أمر شراء",
  receiveOrder: "تأكيد استلام أمر شراء",
  cancelOrder: "إلغاء أمر شراء",
  recordPayment: "تسجيل دفعة لمورد",
  deletePayment: "حذف دفعة مورد",
};
