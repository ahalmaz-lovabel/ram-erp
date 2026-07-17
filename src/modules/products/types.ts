// أنواع بيانات موديول products. المصدر النهائي للحقول هو schema.prisma.
// مرحلة 1أ: الخامات والسمات. القيم المالية Prisma.Decimal (ممنوع number للأموال).

import type {
  Prisma,
  MeasurementUnit,
  MaterialStatus,
  AttributeType,
  OperationCostModel,
  ProductStatus,
} from "@/generated/prisma/client";

export type { MeasurementUnit, MaterialStatus, AttributeType, OperationCostModel, ProductStatus };

export interface ProductView {
  id: string;
  code: string;
  name: string;
  status: ProductStatus;
  productionCost: Prisma.Decimal;
  costUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaterialView {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string | null;
  imageUrl: string | null;
  purchaseUnit: MeasurementUnit;
  baseUnit: MeasurementUnit;
  conversionFactor: Prisma.Decimal;
  purchaseUnitPrice: Prisma.Decimal;
  baseUnitPrice: Prisma.Decimal;
  lastPurchasePrice: Prisma.Decimal | null;
  avgPurchasePrice: Prisma.Decimal | null;
  status: MaterialStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface OperationView {
  id: string;
  name: string;
  category: string | null;
  costModel: OperationCostModel;
  standardCost: Prisma.Decimal;
  description: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttributeValueView {
  id: string;
  value: string;
  displayOrder: number;
}

export interface AttributeView {
  id: string;
  name: string;
  type: AttributeType;
  unit: MeasurementUnit | null;
  isRequired: boolean;
  showInQuotes: boolean;
  showOnWebsite: boolean;
  usedInFilter: boolean;
  internalOnly: boolean;
  displayOrder: number;
  archivedAt: Date | null;
  values: AttributeValueView[];
  createdAt: Date;
  updatedAt: Date;
}
