// صلاحيات موديول products. تتسجل في الـ registry المركزي عبر register.ts.
// مبنية على docs/analysis/products-analysis.md (§20). الصلاحيات الحساسة
// (رؤية التكلفة/الربح، تعديل السعر/التكلفة/الوصفة) معزولة عن الصلاحيات العامة.
//
// مرحلة 1أ: مكتبة الخامات ومكتبة السمات. صلاحيات المنتج نفسه (products.*)
// تُضاف في المرحلة 1ب.

export const ProductsPermissions = {
  // مكتبة الخامات (§8)
  viewMaterials: "materials.view",
  createMaterial: "materials.create",
  updateMaterial: "materials.update",
  updateMaterialPrice: "materials.update_price", // حساس: يؤثر على تكلفة المنتجات
  archiveMaterial: "materials.archive",

  // مكتبة السمات (§7)
  viewAttributes: "attributes.view",
  createAttribute: "attributes.create",
  updateAttribute: "attributes.update",
  archiveAttribute: "attributes.archive",

  // مكتبة عمليات التصنيع (§10)
  viewOperations: "operations.view",
  createOperation: "operations.create",
  updateOperation: "operations.update",
  archiveOperation: "operations.archive",
} as const;

export type ProductsPermission = (typeof ProductsPermissions)[keyof typeof ProductsPermissions];

export const ProductsPermissionLabels: Record<keyof typeof ProductsPermissions, string> = {
  viewMaterials: "عرض الخامات",
  createMaterial: "إضافة خامة",
  updateMaterial: "تعديل خامة",
  updateMaterialPrice: "تعديل سعر خامة",
  archiveMaterial: "أرشفة خامة",
  viewAttributes: "عرض السمات",
  createAttribute: "إضافة سمة",
  updateAttribute: "تعديل سمة",
  archiveAttribute: "أرشفة سمة",
  viewOperations: "عرض عمليات التصنيع",
  createOperation: "إضافة عملية تصنيع",
  updateOperation: "تعديل عملية تصنيع",
  archiveOperation: "أرشفة عملية تصنيع",
};
