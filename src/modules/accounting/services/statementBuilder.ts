import { Prisma } from "@/generated/prisma/client";
import type { StatementMovement } from "../types";

/**
 * بناء كشف حساب العميل من حركات مالية (فواتير مدينة + دفعات دائنة) — دالة
 * نقية قابلة للاختبار (تحليل §9). الرصيد الجاري = Σ مدين − Σ دائن حتى كل حركة.
 * كل الحسابات Prisma.Decimal (دقة مالية — CLAUDE #3)، والمخرجات نصوص للعرض.
 */

export interface StatementEntry {
  date: Date;
  type: "invoice" | "payment";
  reference: string;
  description: string;
  amount: Prisma.Decimal; // موجب دائمًا؛ النوع يحدد مدين/دائن
}

export interface BuiltStatement {
  movements: StatementMovement[];
  totalDebit: Prisma.Decimal;
  totalCredit: Prisma.Decimal;
  balance: Prisma.Decimal;
}

export function buildAccountStatement(entries: StatementEntry[]): BuiltStatement {
  // ترتيب زمني تصاعدي؛ عند تساوي التاريخ تُقدَّم الفاتورة على الدفعة.
  const sorted = [...entries].sort((a, b) => {
    const d = a.date.getTime() - b.date.getTime();
    if (d !== 0) return d;
    if (a.type === b.type) return 0;
    return a.type === "invoice" ? -1 : 1;
  });

  const ZERO = new Prisma.Decimal(0);
  let running = ZERO;
  let totalDebit = ZERO;
  let totalCredit = ZERO;

  const movements: StatementMovement[] = sorted.map((e) => {
    const isDebit = e.type === "invoice";
    if (isDebit) {
      running = running.plus(e.amount);
      totalDebit = totalDebit.plus(e.amount);
    } else {
      running = running.minus(e.amount);
      totalCredit = totalCredit.plus(e.amount);
    }
    return {
      date: e.date.toISOString(),
      type: e.type,
      reference: e.reference,
      description: e.description,
      debit: isDebit ? e.amount.toString() : "0",
      credit: isDebit ? "0" : e.amount.toString(),
      balance: running.toString(),
    };
  });

  return { movements, totalDebit, totalCredit, balance: running };
}
