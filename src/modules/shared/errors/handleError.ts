import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { isAppError, CommonErrorCodes } from "./AppError";
import { logger } from "../logger";

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * يحوّل ناتج الـ action لشكل قابل للـ serialization عبر حدود Server↔Client:
 * كائنات Prisma.Decimal (غير المدعومة) تتحوّل لنص. التواريخ والبدائيات كما هي.
 * يضمن إن أي action يرجّع كيانًا فيه حقول مالية Decimal لا يكسر الواجهة.
 */
function toClientSafe(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Prisma.Decimal.isDecimal(value)) return value.toString();
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(toClientSafe);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = toClientSafe(v);
    return out;
  }
  return value;
}

/**
 * غلاف موحّد لكل server action في النظام. أي action في أي موديول لازم
 * يستخدمه بدل try/catch مكرر في كل مكان.
 *
 * الاستخدام:
 *   export async function createInvoiceAction(userId: string, raw: unknown) {
 *     return wrapAction(async () => {
 *       const input = createInvoiceSchema.parse(raw); // Zod
 *       return createInvoice(userId, input);
 *     });
 *   }
 *
 * الناتج دايمًا بنفس الشكل:
 *   { success: true, data }  أو  { success: false, error: { code, message } }
 * والواجهة الأمامية تتعامل مع الشكل ده بس، بدون ما تعرف تفاصيل الخطأ الداخلي.
 */
export async function wrapAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data: toClientSafe(data) as T };
  } catch (err) {
    if (err instanceof ZodError) {
      logger.warn({ issues: err.issues }, "Validation failed");
      return {
        success: false,
        error: {
          code: CommonErrorCodes.VALIDATION_FAILED,
          message: "البيانات المُدخلة غير صحيحة",
          details: { issues: err.issues },
        },
      };
    }

    if (isAppError(err)) {
      logger.warn({ code: err.code, message: err.message, details: err.details }, "AppError");
      return {
        success: false,
        error: { code: err.code, message: err.message, details: err.details },
      };
    }

    logger.error({ err }, "Unexpected error");
    return {
      success: false,
      error: {
        code: CommonErrorCodes.INTERNAL_ERROR,
        message: "حصل خطأ غير متوقع، حاول تاني أو تواصل مع الدعم الفني",
      },
    };
  }
}
