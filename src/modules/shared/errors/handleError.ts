import { ZodError } from "zod";
import { AppError, isAppError, CommonErrorCodes } from "./AppError";
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
    return { success: true, data };
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
