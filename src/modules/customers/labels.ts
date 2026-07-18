// مسميات عربية لقيم الـ enums (للعرض في الواجهة). type-only imports (آمن للعميل).

import type {
  CustomerType,
  CustomerStatus,
  CustomerSource,
  ContactDepartment,
  DealStatus,
  DealType,
} from "./types";

export const customerTypeLabel: Record<CustomerType, string> = {
  person: "فرد",
  organization: "مؤسسة",
  company: "شركة",
  club: "نادي",
  gym: "جيم",
  distributor: "موزع",
};

export const customerStatusLabel: Record<CustomerStatus, string> = {
  prospect: "محتمل",
  active: "نشط",
  inactive: "غير نشط",
  archived: "مؤرشف",
};

export const customerSourceLabel: Record<CustomerSource, string> = {
  ad: "إعلان",
  referral: "ترشيح",
  visit: "زيارة",
  call: "اتصال",
  exhibition: "معرض",
  existing: "عميل قديم",
};

export const contactDepartmentLabel: Record<ContactDepartment, string> = {
  management: "إدارة",
  purchasing: "مشتريات",
  accounts: "حسابات",
  website: "موقع",
  receiving: "استلام",
};

export const dealStatusLabel: Record<DealStatus, string> = {
  interested: "عميل مهتم",
  contacting: "جاري التواصل",
  quote_sent: "تم إرسال عرض",
  negotiation: "تفاوض",
  accepted: "مقبولة",
  rejected: "مرفوضة",
  postponed: "مؤجلة",
  converted: "تحوّلت لبيع",
  cancelled: "ملغاة",
};

export const dealTypeLabel: Record<DealType, string> = {
  direct_sale: "بيع مباشر",
  gym_setup: "تجهيز جيم",
  supply_only: "توريد فقط",
  supply_install: "توريد وتركيب",
  later_addition: "إضافة لاحقة",
};

// ألوان شارة حالة العميل (خلفية/نص).
export const customerStatusBadge: Record<CustomerStatus, { bg: string; color: string }> = {
  prospect: { bg: "oklch(0.92 0.05 250)", color: "oklch(0.35 0.1 250)" },
  active: { bg: "oklch(0.92 0.06 150)", color: "oklch(0.35 0.12 150)" },
  inactive: { bg: "oklch(0.9 0.01 30)", color: "oklch(0.4 0.01 30)" },
  archived: { bg: "oklch(0.88 0.01 30)", color: "oklch(0.4 0.01 30)" },
};
