import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";

// تحقّق مدخلات موديول invoices. القيم المالية نص/رقم → Decimal (CLAUDE #3).

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

const clearableText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().trim().min(1).nullable().optional()
);

const clearableDate = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.coerce.date().nullable().optional()
);

const paymentMethod = z.enum(["cash", "transfer", "card", "cheque"]);

// ===== الفاتورة =====

export const createInvoiceSchema = z.object({
  customerId: z.string().min(1, "العميل مطلوب"),
  dueDate: z.coerce.date().optional(),
  notes: optionalText,
  terms: optionalText,
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const convertQuoteSchema = z.object({
  dueDate: z.coerce.date().optional(),
});
export type ConvertQuoteInput = z.infer<typeof convertQuoteSchema>;

export const updateInvoiceSchema = z.object({
  discountPercent: percent.optional(),
  taxPercent: percent.optional(),
  dueDate: clearableDate,
  notes: clearableText,
  terms: clearableText,
});
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

// ===== البنود =====

export const addInvoiceLineSchema = z.object({
  productId: z.string().min(1, "المنتج مطلوب"),
  quantity: positiveDecimal.default(1),
  unitPrice: positiveDecimal.optional(),
  discountPercent: percent.default(0),
});
export type AddInvoiceLineInput = z.infer<typeof addInvoiceLineSchema>;

export const updateInvoiceLineSchema = z.object({
  quantity: positiveDecimal.optional(),
  unitPrice: positiveDecimal.optional(),
  discountPercent: percent.optional(),
});
export type UpdateInvoiceLineInput = z.infer<typeof updateInvoiceLineSchema>;

// ===== الدفعات =====

export const recordPaymentSchema = z.object({
  amount: positiveDecimal,
  method: paymentMethod,
  paidAt: z.coerce.date().default(() => new Date()),
  reference: optionalText,
  notes: optionalText,
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

// ===== الإلغاء =====

export const cancelInvoiceSchema = z.object({
  reason: z.string().trim().min(1, "سبب الإلغاء مطلوب"),
});
export type CancelInvoiceInput = z.infer<typeof cancelInvoiceSchema>;
