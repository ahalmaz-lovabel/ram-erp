import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";

// تحقّق مدخلات موديول quotes. الـ action ينادي .parse() والـ service يستقبل
// بيانات موثوقة. القيم المالية تُستقبل نص/رقم وتُخزَّن Decimal (CLAUDE #3).

// قيمة عشرية موجبة (كمية/سعر).
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

// نسبة مئوية 0..100 (خصم/ضريبة).
const percent = z
  .union([z.string(), z.number()])
  .refine((v) => {
    try {
      const d = new Prisma.Decimal(v);
      return d.greaterThanOrEqualTo(0) && d.lessThanOrEqualTo(100);
    } catch {
      return false;
    }
  }, "النسبة يجب أن تكون بين 0 و100")
  .transform((v) => new Prisma.Decimal(v));

const optionalText = z
  .string()
  .trim()
  .min(1)
  .optional()
  .or(z.literal("").transform(() => undefined));

// نص قابل للمسح عند التعديل: "" ⇒ null (مسح)، الغياب ⇒ undefined (تجاهل).
const clearableText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().trim().min(1).nullable().optional()
);

// تاريخ اختياري (ISO) — قابل للمسح عند التعديل.
const clearableDate = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.coerce.date().nullable().optional()
);

// ===== الرأس =====

export const createQuoteSchema = z.object({
  customerId: z.string().min(1, "العميل مطلوب"),
  dealId: z.string().min(1).optional(),
  validUntil: z.coerce.date().optional(),
  notes: optionalText,
  terms: optionalText,
});
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;

export const updateQuoteSchema = z.object({
  discountPercent: percent.optional(),
  taxPercent: percent.optional(),
  validUntil: clearableDate,
  notes: clearableText,
  terms: clearableText,
});
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;

// ===== البنود =====

export const addQuoteLineSchema = z.object({
  productId: z.string().min(1, "المنتج مطلوب"),
  quantity: positiveDecimal.default(1),
  // اختياري: يبدأ من سعر بيع المنتج إن لم يُحدَّد.
  unitPrice: positiveDecimal.optional(),
  discountPercent: percent.default(0),
});
export type AddQuoteLineInput = z.infer<typeof addQuoteLineSchema>;

export const updateQuoteLineSchema = z.object({
  quantity: positiveDecimal.optional(),
  unitPrice: positiveDecimal.optional(),
  discountPercent: percent.optional(),
});
export type UpdateQuoteLineInput = z.infer<typeof updateQuoteLineSchema>;

// ===== رد العميل =====

export const rejectQuoteSchema = z.object({
  reason: optionalText,
});
export type RejectQuoteInput = z.infer<typeof rejectQuoteSchema>;
