// أنواع بيانات موديول accounting. طبقة قراءة/تجميع فوق الفواتير والدفعات
// (تحليل العملاء §9 كشف الحساب + §10 الاستحقاقات). لا جداول خاصة بها بعد —
// المرتجعات والتسويات وردّ المبالغ تأتي لاحقًا (موثّق في README).

export type MovementType = "invoice" | "payment";

/** حركة واحدة في كشف الحساب (كل المبالغ نصوص جاهزة للعرض). */
export interface StatementMovement {
  date: string; // ISO
  type: MovementType;
  reference: string; // رقم الفاتورة
  description: string;
  debit: string; // مدين (فاتورة على العميل)
  credit: string; // دائن (دفعة من العميل)
  balance: string; // الرصيد بعد الحركة (موجب = على العميل)
}

export interface CustomerStatement {
  customerId: string;
  customerName: string;
  movements: StatementMovement[];
  totalDebit: string;
  totalCredit: string;
  balance: string; // الرصيد النهائي (المستحق على العميل)
}

/** ملخّص مستحقات عميل (تحليل §10). */
export interface CustomerReceivable {
  customerId: string;
  customerName: string;
  outstanding: string; // إجمالي المتبقّي غير المدفوع
  overdue: string; // منه المتأخّر (تجاوز الاستحقاق)
  invoiceCount: number;
}

export interface ReceivablesSummary {
  customers: CustomerReceivable[];
  totalOutstanding: string;
  totalOverdue: string;
}
