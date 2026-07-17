import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";

// تحقّق مدخلات موديول customers (§4، §5، §6). القيم المالية Decimal.

const customerType = z.enum(["person", "organization", "company", "club", "gym", "distributor"]);
const customerSource = z.enum(["ad", "referral", "visit", "call", "exhibition", "existing"]);
const contactDepartment = z.enum(["management", "purchasing", "accounts", "website", "receiving"]);
const dealStatus = z.enum([
  "interested",
  "contacting",
  "quote_sent",
  "negotiation",
  "accepted",
  "rejected",
  "postponed",
  "converted",
  "cancelled",
]);
const dealType = z.enum([
  "direct_sale",
  "gym_setup",
  "supply_only",
  "supply_install",
  "later_addition",
]);

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

// ===== العميل (§4) =====

export const createCustomerSchema = z.object({
  code: z.string().trim().min(1, "كود العميل مطلوب"),
  name: z.string().trim().min(1, "اسم العميل مطلوب"),
  type: customerType,
  isImportant: z.boolean().default(false),
  phone: optionalText,
  whatsapp: optionalText,
  email: optionalEmail,
  address: optionalText,
  city: optionalText,
  country: optionalText,
  taxNumber: optionalText,
  commercialRegister: optionalText,
  source: customerSource.optional(),
  notes: optionalText,
  responsibleUserId: z.string().min(1).optional(),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(1).optional(),
  type: customerType.optional(),
  isImportant: z.boolean().optional(),
  phone: optionalText,
  whatsapp: optionalText,
  email: optionalEmail,
  address: optionalText,
  city: optionalText,
  country: optionalText,
  taxNumber: optionalText,
  commercialRegister: optionalText,
  source: customerSource.optional(),
  notes: optionalText,
  responsibleUserId: z.string().min(1).optional(),
});
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

// ===== جهة التواصل (§5) =====

export const addContactSchema = z.object({
  name: z.string().trim().min(1, "اسم جهة التواصل مطلوب"),
  jobTitle: optionalText,
  phone: optionalText,
  whatsapp: optionalText,
  email: optionalEmail,
  isPrimary: z.boolean().default(false),
  department: contactDepartment.optional(),
  notes: optionalText,
});
export type AddContactInput = z.infer<typeof addContactSchema>;

export const updateContactSchema = z.object({
  name: z.string().trim().min(1).optional(),
  jobTitle: optionalText,
  phone: optionalText,
  whatsapp: optionalText,
  email: optionalEmail,
  isPrimary: z.boolean().optional(),
  department: contactDepartment.optional(),
  notes: optionalText,
});
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

// ===== الصفقة (§6) =====

export const createDealSchema = z.object({
  name: z.string().trim().min(1, "اسم الصفقة مطلوب"),
  type: dealType,
  contactId: z.string().min(1).optional(),
  responsibleUserId: z.string().min(1).optional(),
  source: customerSource.optional(),
  estimatedValue: positiveDecimal.optional(),
  expectedCloseDate: z.coerce.date().optional(),
  notes: optionalText,
});
export type CreateDealInput = z.infer<typeof createDealSchema>;

export const updateDealSchema = z.object({
  name: z.string().trim().min(1).optional(),
  type: dealType.optional(),
  contactId: z.string().min(1).nullable().optional(),
  responsibleUserId: z.string().min(1).nullable().optional(),
  source: customerSource.optional(),
  estimatedValue: positiveDecimal.nullable().optional(),
  expectedCloseDate: z.coerce.date().nullable().optional(),
  notes: optionalText,
});
export type UpdateDealInput = z.infer<typeof updateDealSchema>;

export const changeDealStatusSchema = z.object({
  status: dealStatus,
  reason: optionalText,
});
export type ChangeDealStatusInput = z.infer<typeof changeDealStatusSchema>;

// ===== سجل التواصل والمتابعة (§14) =====

const communicationType = z.enum(["call", "whatsapp", "email", "visit", "meeting"]);

export const logCommunicationSchema = z.object({
  type: communicationType,
  contactId: z.string().min(1).optional(),
  summary: z.string().trim().min(1, "ملخص التواصل مطلوب"),
  nextStep: optionalText,
  nextFollowUpDate: z.coerce.date().optional(),
});
export type LogCommunicationInput = z.infer<typeof logCommunicationSchema>;
