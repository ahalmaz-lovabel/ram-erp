/**
 * خطأ موحّد لكل النظام. أي قاعدة عمل (business rule) بتفشل لازم تدي
 * الخطأ ده، مش throw new Error() عادي، عشان تقدر الواجهة تتعامل معاه
 * بشكل موحّد ومتوقع.
 *
 * أمثلة استخدام:
 *   throw new AppError("INSUFFICIENT_STOCK", "الكمية المتاحة أقل من المطلوبة", 400, { available: 3, requested: 10 });
 *   throw new AppError("INVOICE_ALREADY_APPROVED", "لا يمكن تعديل فاتورة معتمدة", 409);
 *   throw new AppError("PERMISSION_DENIED", "لا تملك صلاحية هذا الإجراء", 403);
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    statusCode: number = 400,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

/**
 * أكواد أخطاء مشتركة بين كل الموديولات — استخدمها بدل ما تخترع كود جديد
 * لنفس المعنى في كل موديول. أي كود خاص بموديول واحد يُعرَّف جوه الموديول
 * نفسه (مثلاً modules/inventory/errors.ts).
 */
export const CommonErrorCodes = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  ALREADY_APPROVED: "ALREADY_APPROVED",
  ALREADY_ARCHIVED: "ALREADY_ARCHIVED",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
