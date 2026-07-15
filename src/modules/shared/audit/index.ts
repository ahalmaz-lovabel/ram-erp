import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

/**
 * سجل التدقيق (Audit Log) — "مين عمل إيه" على مستوى العمل نفسه، للمراجعة
 * المالية والإدارية. منفصل تمامًا عن السجلات التقنية (logger/Pino).
 *
 * كل عملية حساسة (إنشاء، تعديل، اعتماد، إلغاء، أرشفة) لازم تُسجَّل هنا.
 *
 * مهم: عشان نضمن إن العملية وتسجيلها يحصلوا معًا أو يتراجعوا معًا، مرّر
 * الـ transaction client (`tx`) بتاع العملية — كده لو أي خطوة فشلت،
 * السجل نفسه بيترجع (Rollback) ومفيش عملية غير موثّقة. لو مفيش transaction،
 * بيستخدم الـ client العام.
 */
export interface AuditLogEntry {
  /** معرف المستخدم اللي نفّذ العملية. */
  userId: string;
  /** اسم الموديول، مثال: "users" أو "invoices". */
  module: string;
  /** نوع العملية، مثال: "create" أو "approve" أو "archive". */
  action: string;
  /** معرف الكيان المتأثر (لو ينطبق). */
  entityId?: string;
  /** snapshot للقيمة قبل التعديل. */
  oldValue?: unknown;
  /** snapshot للقيمة بعد التعديل. */
  newValue?: unknown;
}

type AuditDbClient = Prisma.TransactionClient | typeof prisma;

export async function recordAuditLog(
  entry: AuditLogEntry,
  tx: AuditDbClient = prisma
): Promise<void> {
  await tx.auditLog.create({
    data: {
      userId: entry.userId,
      module: entry.module,
      action: entry.action,
      entityId: entry.entityId,
      oldValue: toJsonInput(entry.oldValue),
      newValue: toJsonInput(entry.newValue),
    },
  });
}

/**
 * يحوّل قيمة عشوائية لصيغة Json مقبولة من Prisma. `undefined` بيتساب
 * زي ما هو (يعني العمود ما يتكتبش)، وأي قيمة تانية بتتخزن كـ JSON.
 */
function toJsonInput(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return value as Prisma.InputJsonValue;
}
