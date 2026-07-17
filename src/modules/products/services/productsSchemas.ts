import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";

// تحقّق مدخلات موديول products (مرحلة 1أ: الخامات والسمات).
// القيم المالية تُستقبل كنص أو رقم وتُخزَّن Decimal (دقة مالية).

const measurementUnit = z.enum([
  "ton",
  "kg",
  "gram",
  "meter",
  "cm",
  "mm",
  "liter",
  "ml",
  "roll",
  "box",
  "piece",
]);

const attributeType = z.enum([
  "text",
  "number",
  "list",
  "boolean",
  "unit",
  "color",
  "file",
  "image",
]);

// قيمة عشرية موجبة (سعر/معامل). نقبل نص أو رقم ونتحقق عبر Prisma.Decimal.
const positiveDecimal = z
  .union([z.string(), z.number()])
  .refine((v) => {
    try {
      return new Prisma.Decimal(v).greaterThan(0);
    } catch {
      return false;
    }
  }, "قيمة رقمية موجبة مطلوبة")
  .transform((v) => new Prisma.Decimal(v));

const optionalText = z
  .string()
  .trim()
  .min(1)
  .optional()
  .or(z.literal("").transform(() => undefined));

// ===== مكتبة الخامات (§8) =====

export const createMaterialSchema = z.object({
  code: z.string().trim().min(1, "كود الخامة مطلوب"),
  name: z.string().trim().min(1, "اسم الخامة مطلوب"),
  category: z.string().trim().min(1, "تصنيف الخامة مطلوب"),
  description: optionalText,
  purchaseUnit: measurementUnit,
  baseUnit: measurementUnit,
  conversionFactor: positiveDecimal,
  purchaseUnitPrice: positiveDecimal,
});
export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;

export const updateMaterialSchema = z.object({
  name: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  description: optionalText,
});
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;

// تعديل سعر الخامة — عملية حساسة تُسجَّل في سجل الأسعار (§8، §13).
export const updateMaterialPriceSchema = z.object({
  newPurchaseUnitPrice: positiveDecimal,
  reason: optionalText,
});
export type UpdateMaterialPriceInput = z.infer<typeof updateMaterialPriceSchema>;

// ===== مكتبة السمات (§7) =====

export const createAttributeSchema = z.object({
  name: z.string().trim().min(1, "اسم السمة مطلوب"),
  type: attributeType,
  unit: measurementUnit.optional(),
  isRequired: z.boolean().default(false),
  showInQuotes: z.boolean().default(false),
  showOnWebsite: z.boolean().default(false),
  usedInFilter: z.boolean().default(false),
  internalOnly: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
  // القيم المسموحة (لسمة من نوع list).
  values: z.array(z.string().trim().min(1)).default([]),
});
export type CreateAttributeInput = z.infer<typeof createAttributeSchema>;

export const updateAttributeSchema = z.object({
  name: z.string().trim().min(1).optional(),
  unit: measurementUnit.nullable().optional(),
  isRequired: z.boolean().optional(),
  showInQuotes: z.boolean().optional(),
  showOnWebsite: z.boolean().optional(),
  usedInFilter: z.boolean().optional(),
  internalOnly: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
  // لو اتبعتت، تستبدل قائمة القيم بالكامل.
  values: z.array(z.string().trim().min(1)).optional(),
});
export type UpdateAttributeInput = z.infer<typeof updateAttributeSchema>;
