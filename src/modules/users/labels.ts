// مسميات عربية لقيم enums موديول users + أسماء الموديولات لشجرة الصلاحيات.

import type { Department, UserStatus, RoleStatus, RoleLevel } from "./types";

export const departmentLabel: Record<Department, string> = {
  sales: "مبيعات",
  accounts: "حسابات",
  warehouse: "مخازن",
  production: "إنتاج",
  purchasing: "مشتريات",
  management: "إدارة",
  shipping: "شحن وتركيب",
  website: "موقع إلكتروني ومحتوى",
};

export const userStatusLabel: Record<UserStatus, string> = {
  active: "نشط",
  suspended: "موقوف",
  locked: "مقفل أمنيًا",
  archived: "مؤرشف",
};

export const roleStatusLabel: Record<RoleStatus, string> = {
  active: "نشط",
  suspended: "موقوف",
  archived: "مؤرشف",
};

export const roleLevelLabel: Record<RoleLevel, string> = {
  owner: "مالك النظام",
  admin: "مدير النظام",
  standard: "دور تشغيلي",
};

export const userStatusBadge: Record<UserStatus, { bg: string; color: string }> = {
  active: { bg: "oklch(0.92 0.06 150)", color: "oklch(0.35 0.12 150)" },
  suspended: { bg: "oklch(0.92 0.06 60)", color: "oklch(0.4 0.1 60)" },
  locked: { bg: "oklch(0.9 0.08 25)", color: "oklch(0.4 0.15 25)" },
  archived: { bg: "oklch(0.88 0.01 30)", color: "oklch(0.4 0.01 30)" },
};

// أسماء الموديولات لعرض شجرة الصلاحيات مجمّعة. غير المعروف يظهر بمفتاحه.
export const moduleLabel: Record<string, string> = {
  users: "المستخدمون والأدوار",
  products: "المنتجات والخامات",
  customers: "العملاء والصفقات",
  quotes: "عروض الأسعار",
  invoices: "الفواتير",
  accounting: "الحسابات",
  purchasing: "المشتريات",
  production: "الإنتاج",
  shipping: "الشحن",
};

// قوائم الاختيار للنماذج.
export const departmentOptions: { value: Department; label: string }[] = (
  Object.keys(departmentLabel) as Department[]
).map((d) => ({ value: d, label: departmentLabel[d] }));
