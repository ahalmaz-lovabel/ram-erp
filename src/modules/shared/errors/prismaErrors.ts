import { Prisma } from "@/generated/prisma/client";

/**
 * أدوات مساعدة لتحويل أخطاء Prisma المعروفة لأخطاء عمل (AppError) بدل ما
 * تطلع كخطأ 500 عام. مفيدة كشبكة أمان للتعارضات تحت التزامن (race conditions)
 * حتى لو فيه فحص مُسبق.
 */

/** خطأ انتهاك قيد فريد (unique) — كود Prisma هو P2002. */
export function isUniqueConstraintError(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/** أسماء الحقول المتسبّبة في انتهاك القيد الفريد (من meta.target). */
export function uniqueConstraintFields(err: Prisma.PrismaClientKnownRequestError): string[] {
  const target = err.meta?.target;
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === "string") return [target];
  return [];
}
