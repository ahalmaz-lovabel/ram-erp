// أنواع بيانات موديول customers. المصدر النهائي هو schema.prisma.

import type {
  Prisma,
  CustomerType,
  CustomerStatus,
  CustomerSource,
  ContactDepartment,
  DealStatus,
  DealType,
  CommunicationType,
} from "@/generated/prisma/client";

export type {
  CustomerType,
  CustomerStatus,
  CustomerSource,
  ContactDepartment,
  DealStatus,
  DealType,
  CommunicationType,
};

export interface CommunicationView {
  id: string;
  customerId: string;
  contactId: string | null;
  type: CommunicationType;
  summary: string;
  nextStep: string | null;
  nextFollowUpDate: Date | null;
  createdByUserId: string;
  createdAt: Date;
}

export interface CustomerView {
  id: string;
  code: string;
  name: string;
  type: CustomerType;
  status: CustomerStatus;
  isImportant: boolean;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  taxNumber: string | null;
  commercialRegister: string | null;
  source: CustomerSource | null;
  notes: string | null;
  responsibleUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactView {
  id: string;
  customerId: string;
  name: string;
  jobTitle: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  isPrimary: boolean;
  department: ContactDepartment | null;
  notes: string | null;
}

export interface DealView {
  id: string;
  number: string;
  name: string;
  customerId: string;
  contactId: string | null;
  responsibleUserId: string | null;
  source: CustomerSource | null;
  type: DealType;
  estimatedValue: Prisma.Decimal | null;
  expectedCloseDate: Date | null;
  status: DealStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
