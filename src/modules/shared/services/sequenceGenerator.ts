import { Prisma } from "@/generated/prisma/client";

/**
 * توليد أرقام تسلسلية آمنة من التعارض (CLAUDE #8). كل ترقيم رسمي (صفقة،
 * عرض سعر، فاتورة، أمر شراء، أمر تصنيع...) يمر من هنا حصريًا.
 *
 * الزيادة ذرّية (atomic) عبر upsert مع increment داخل معاملة العميل، فلا
 * يحدث رقمان متطابقان حتى مع طلبات متزامنة. يُستدعى دائمًا داخل نفس الـ
 * transaction الخاصة بإنشاء المستند (CLAUDE #13) حتى يتراجع الرقم لو فشل الإنشاء.
 */

/** يزيد عدّاد المفتاح ويعيد القيمة الجديدة (ذرّيًا). */
export async function nextSequenceValue(
  tx: Prisma.TransactionClient,
  key: string
): Promise<number> {
  const row = await tx.sequence.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return row.value;
}

/** ينسّق رقمًا تسلسليًا: بادئة + قيمة مصفوفة بأصفار. مثال: DEAL-00042. */
export function formatSequenceNumber(prefix: string, value: number, padding = 5): string {
  return `${prefix}-${String(value).padStart(padding, "0")}`;
}

/** يجلب القيمة التالية وينسّقها في خطوة واحدة. */
export async function nextFormattedSequence(
  tx: Prisma.TransactionClient,
  key: string,
  options: { prefix: string; padding?: number }
): Promise<string> {
  const value = await nextSequenceValue(tx, key);
  return formatSequenceNumber(options.prefix, value, options.padding);
}
