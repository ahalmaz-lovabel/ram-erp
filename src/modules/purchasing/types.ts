// أنواع بيانات موديول purchasing. المصدر النهائي للحقول هو schema.prisma.
// ⚠️ لا يوجد تحليل معتمد لهذا القسم — النموذج بالكامل افتراضات مؤقتة موثّقة في
// README (بموافقة صريحة من المستخدم). كل المبالغ Prisma.Decimal (CLAUDE #3).

import type {
  Prisma,
  SupplierStatus,
  PurchaseOrderStatus,
  PaymentMethod,
  MeasurementUnit,
} from "@/generated/prisma/client";

export type { SupplierStatus, PurchaseOrderStatus, PaymentMethod, MeasurementUnit };

export interface SupplierView {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  contactPerson: string | null;
  taxNumber: string | null;
  notes: string | null;
  status: SupplierStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrderView {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierNameSnapshot: string;
  status: PurchaseOrderStatus;
  orderDate: Date;
  expectedDate: Date | null;
  receivedAt: Date | null;
  subtotal: Prisma.Decimal;
  discountPercent: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxPercent: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  notes: string | null;
  terms: string | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrderLineView {
  id: string;
  purchaseOrderId: string;
  materialId: string | null;
  materialCodeSnapshot: string;
  materialNameSnapshot: string;
  quantity: Prisma.Decimal;
  unit: MeasurementUnit;
  unitPrice: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  sortOrder: number;
  createdAt: Date;
}

export interface SupplierPaymentView {
  id: string;
  purchaseOrderId: string;
  amount: Prisma.Decimal;
  method: PaymentMethod;
  paidAt: Date;
  reference: string | null;
  notes: string | null;
  paidByUserId: string;
  createdAt: Date;
}
