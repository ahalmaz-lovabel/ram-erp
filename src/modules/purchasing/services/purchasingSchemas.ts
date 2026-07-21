import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";

// تحقّق مدخلات موديول purchasing. القيم المالية نص/رقم → Decimal (CLAUDE #3).
// ⚠️ لا يوجد تحليل معتمد — الحقول افتراضات موثّقة في README (بموافقة صريحة).
// الـ action هو اللي بينادي .parse() — الـ service بيستقبل بيانات موثوقة بالفعل.

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

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email("بريد غير صحيح")
  .optional()
  .or(z.literal("").transform(() => undefined));

const clearableText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().trim().min(1).nullable().optional()
);

const clearableDate = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.coerce.date().nullable().optional()
);

const measurementUnit = z.enum([
  "ton",
  "kg",
  "gram",
  "meter",
  "cm",
  "mm",
  "squareMeter",
  "squareCm",
  "cubicMeter",
  "cubicCm",
  "liter",
  "ml",
  "roll",
  "box",
  "piece",
]);

const paymentMethod = z.enum(["cash", "transfer", "card", "cheque"]);

// ===== المورد =====

export const createSupplierSchema = z.object({
  code: z.string().trim().min(1, "كود المورد مطلوب"),
  name: z.string().trim().min(1, "اسم المورد مطلوب"),
  phone: optionalText,
  whatsapp: optionalText,
  email: optionalEmail,
  address: optionalText,
  contactPerson: optionalText,
  taxNumber: optionalText,
  notes: optionalText,
});
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: optionalText,
  whatsapp: optionalText,
  email: optionalEmail,
  address: optionalText,
  contactPerson: optionalText,
  taxNumber: optionalText,
  notes: optionalText,
});
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

// ===== أمر الشراء =====

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "المورد مطلوب"),
  expectedDate: z.coerce.date().optional(),
  notes: optionalText,
  terms: optionalText,
});
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;

export const updatePurchaseOrderSchema = z.object({
  discountPercent: percent.optional(),
  taxPercent: percent.optional(),
  expectedDate: clearableDate,
  notes: clearableText,
  terms: clearableText,
});
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;

// ===== البنود =====

export const addOrderLineSchema = z.object({
  materialId: z.string().min(1, "الخامة مطلوبة"),
  quantity: positiveDecimal.default(1),
  unit: measurementUnit.optional(),
  unitPrice: positiveDecimal.optional(),
});
export type AddOrderLineInput = z.infer<typeof addOrderLineSchema>;

export const updateOrderLineSchema = z.object({
  quantity: positiveDecimal.optional(),
  unit: measurementUnit.optional(),
  unitPrice: positiveDecimal.optional(),
});
export type UpdateOrderLineInput = z.infer<typeof updateOrderLineSchema>;

// ===== مدفوعات المورد =====

export const recordSupplierPaymentSchema = z.object({
  amount: positiveDecimal,
  method: paymentMethod,
  paidAt: z.coerce.date().default(() => new Date()),
  reference: optionalText,
  notes: optionalText,
});
export type RecordSupplierPaymentInput = z.infer<typeof recordSupplierPaymentSchema>;

// ===== الإلغاء =====

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(1, "سبب الإلغاء مطلوب"),
});
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
