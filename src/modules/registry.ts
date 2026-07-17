// سجل مركزي بكل أقسام (موديولات) النظام وترتيب بنائها وحالتها.
// الترتيب أدناه = ترتيب التنفيذ المعتمد، مبني على تحليلات الأقسام
// (docs/analysis/) والتسلسل المنطقي حيث يغذّي كل قسم القسم التالي.
// يُحدَّث تلقائيًا عند توليد موديول جديد عبر scripts/new-module.mjs.

export interface ModuleRegistryEntry {
  /** اسم الموديول (kebab-case) ومجلده تحت src/modules. */
  name: string;
  /** الوصف العربي للقسم. */
  label: string;
  /** حالة البناء. */
  status: "planned" | "in-progress" | "stable";
}

// ملاحظة: قسم المخازن (inventory) مذكور في العمارة لكن لا يوجد له تحليل معتمد
// بعد — يُضاف عند توفّر تحليله. الشحن مغطّى مبدئيًا كملحق ضمن المنتجات (§24).
export const moduleRegistry: ModuleRegistryEntry[] = [
  { name: "users", label: "المستخدمون والأدوار والصلاحيات وسجل العمليات", status: "stable" },
  { name: "products", label: "المنتجات والخامات والسمات وتكلفة الإنتاج", status: "in-progress" },
  { name: "customers", label: "العملاء والصفقات", status: "in-progress" },
  { name: "quotes", label: "عروض الأسعار", status: "planned" },
  { name: "invoices", label: "الفواتير والمدفوعات والاسترداد", status: "planned" },
  { name: "accounting", label: "الحسابات والإدارة المالية", status: "planned" },
  { name: "purchasing", label: "المشتريات والموردون", status: "planned" },
  { name: "production", label: "الإنتاج ومتابعة التصنيع", status: "planned" },
  { name: "shipping", label: "الطرود والشحن وملصقات الشحن", status: "planned" },
];
