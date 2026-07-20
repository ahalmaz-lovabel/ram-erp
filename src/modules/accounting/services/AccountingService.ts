import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/modules/shared/permissions";
import { AppError, CommonErrorCodes } from "@/modules/shared/errors/AppError";
import { isOverdue } from "@/modules/invoices/services/paymentStatus";
import { AccountingPermissions } from "../permissions";
import type { CustomerStatement, ReceivablesSummary, CustomerReceivable } from "../types";
import { buildAccountStatement, type StatementEntry } from "./statementBuilder";

/**
 * موديول الحسابات — طبقة قراءة/تجميع فوق الفواتير والدفعات (تحليل §9، §10).
 * لا يكتب بيانات في هذه المرحلة؛ كل دالة تفحص صلاحية العرض. المبالغ Decimal
 * داخليًا وتُرجَّع نصوصًا للعرض (CLAUDE #3). الفواتير الملغاة مستبعدة.
 */

/** كشف حساب عميل: حركات مدينة (فواتير) ودائنة (دفعات) برصيد جارٍ (§9). */
export async function getCustomerStatement(
  actorUserId: string,
  customerId: string
): Promise<CustomerStatement> {
  await requirePermission(actorUserId, AccountingPermissions.viewStatement);

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true },
  });
  if (!customer) {
    throw new AppError(CommonErrorCodes.NOT_FOUND, "العميل غير موجود", 404);
  }

  const invoices = await prisma.invoice.findMany({
    where: { customerId, status: { not: "cancelled" } },
    select: {
      invoiceNumber: true,
      grandTotal: true,
      issuedAt: true,
      createdAt: true,
      payments: {
        select: { amount: true, paidAt: true, method: true },
      },
    },
  });

  const entries: StatementEntry[] = [];
  for (const inv of invoices) {
    entries.push({
      date: inv.issuedAt ?? inv.createdAt,
      type: "invoice",
      reference: inv.invoiceNumber,
      description: `فاتورة ${inv.invoiceNumber}`,
      amount: inv.grandTotal,
    });
    for (const p of inv.payments) {
      entries.push({
        date: p.paidAt,
        type: "payment",
        reference: inv.invoiceNumber,
        description: `دفعة على ${inv.invoiceNumber}`,
        amount: p.amount,
      });
    }
  }

  const built = buildAccountStatement(entries);
  return {
    customerId: customer.id,
    customerName: customer.name,
    movements: built.movements,
    totalDebit: built.totalDebit.toString(),
    totalCredit: built.totalCredit.toString(),
    balance: built.balance.toString(),
  };
}

/** ملخّص المستحقات على كل العملاء مع تمييز المتأخّر (§10). */
export async function getReceivablesSummary(actorUserId: string): Promise<ReceivablesSummary> {
  await requirePermission(actorUserId, AccountingPermissions.viewReceivables);

  const invoices = await prisma.invoice.findMany({
    where: { status: { not: "cancelled" } },
    select: {
      customerId: true,
      customerNameSnapshot: true,
      grandTotal: true,
      paidAmount: true,
      status: true,
      dueDate: true,
    },
  });

  const ZERO = new Prisma.Decimal(0);
  const byCustomer = new Map<
    string,
    { name: string; outstanding: Prisma.Decimal; overdue: Prisma.Decimal; count: number }
  >();

  for (const inv of invoices) {
    const remaining = inv.grandTotal.minus(inv.paidAmount);
    if (remaining.lessThanOrEqualTo(0)) continue; // مسدّدة بالكامل

    const acc = byCustomer.get(inv.customerId) ?? {
      name: inv.customerNameSnapshot,
      outstanding: ZERO,
      overdue: ZERO,
      count: 0,
    };
    acc.outstanding = acc.outstanding.plus(remaining);
    if (isOverdue(inv.status, inv.dueDate)) {
      acc.overdue = acc.overdue.plus(remaining);
    }
    acc.count += 1;
    byCustomer.set(inv.customerId, acc);
  }

  let totalOutstanding = ZERO;
  let totalOverdue = ZERO;
  const customers: CustomerReceivable[] = [...byCustomer.entries()].map(([customerId, v]) => {
    totalOutstanding = totalOutstanding.plus(v.outstanding);
    totalOverdue = totalOverdue.plus(v.overdue);
    return {
      customerId,
      customerName: v.name,
      outstanding: v.outstanding.toString(),
      overdue: v.overdue.toString(),
      invoiceCount: v.count,
    };
  });

  // الأعلى مديونية أولًا.
  customers.sort((a, b) => Number(b.outstanding) - Number(a.outstanding));

  return {
    customers,
    totalOutstanding: totalOutstanding.toString(),
    totalOverdue: totalOverdue.toString(),
  };
}
