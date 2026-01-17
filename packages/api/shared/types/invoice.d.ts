import type { Timestamp } from "firebase/firestore";
import type { InvoiceLanguage } from "./contact.js";
/**
 * Invoice and Billing Types
 * Supports invoice creation, payment tracking, and recurring billing
 */
/**
 * Invoice status lifecycle
 * - draft: Being created, not yet sent
 * - pending: Created but not yet sent to customer
 * - sent: Sent to customer, awaiting payment
 * - paid: Fully paid
 * - partially_paid: Some payment received
 * - overdue: Past due date without full payment
 * - cancelled: Invoice cancelled
 * - void: Invoice voided (for corrections)
 */
export type InvoiceStatus =
  | "draft"
  | "pending"
  | "sent"
  | "paid"
  | "partially_paid"
  | "overdue"
  | "cancelled"
  | "void";
/**
 * Invoice item types (Swedish stable context)
 * - boarding: Box/stall hyra
 * - feed: Foder
 * - bedding: Strö
 * - service: Tjänster (ex. skötsel)
 * - lesson: Ridlektion
 * - veterinary: Veterinärkostnader
 * - farrier: Hovslagare
 * - transport: Transport
 * - equipment: Utrustning
 * - other: Övrigt
 */
export type InvoiceItemType =
  | "boarding"
  | "feed"
  | "bedding"
  | "service"
  | "lesson"
  | "veterinary"
  | "farrier"
  | "transport"
  | "equipment"
  | "other";
/**
 * Payment method types
 */
export type PaymentMethod =
  | "bank_transfer"
  | "swish"
  | "card"
  | "cash"
  | "stripe"
  | "other";
/**
 * Invoice item - line item on invoice
 */
export interface InvoiceItem {
  id: string;
  description: string;
  itemType: InvoiceItemType;
  quantity: number;
  unit?: string;
  unitPrice: number;
  vatRate: number;
  discount?: number;
  discountAmount?: number;
  lineTotal: number;
  vatAmount: number;
  horseId?: string;
  horseName?: string;
  periodStart?: Timestamp;
  periodEnd?: Timestamp;
  serviceDate?: Timestamp;
  serviceName?: string;
}
/**
 * Invoice payment record
 */
export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  reference?: string;
  paidAt: Timestamp;
  recordedAt: Timestamp;
  recordedBy: string;
  notes?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
}
/**
 * VAT breakdown for invoice
 */
export interface VatBreakdown {
  rate: number;
  baseAmount: number;
  vatAmount: number;
}
/**
 * Invoice document
 * Stored in: invoices/{id}
 */
export interface Invoice {
  id: string;
  invoiceNumber: string;
  organizationId: string;
  stableId?: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  contactAddress?: {
    street: string;
    houseNumber: string;
    postcode: string;
    city: string;
    country: string;
  };
  organizationName: string;
  organizationAddress?: {
    street: string;
    houseNumber: string;
    postcode: string;
    city: string;
    country: string;
  };
  organizationVatNumber?: string;
  organizationBankInfo?: {
    bankName: string;
    accountNumber: string;
    iban?: string;
    bic?: string;
  };
  issueDate: Timestamp;
  dueDate: Timestamp;
  periodStart?: Timestamp;
  periodEnd?: Timestamp;
  items: InvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  vatBreakdown: VatBreakdown[];
  totalVat: number;
  total: number;
  currency: string;
  amountPaid: number;
  amountDue: number;
  payments: InvoicePayment[];
  status: InvoiceStatus;
  sentAt?: Timestamp;
  paidAt?: Timestamp;
  cancelledAt?: Timestamp;
  voidedAt?: Timestamp;
  language: InvoiceLanguage;
  pdfUrl?: string;
  pdfGeneratedAt?: Timestamp;
  stripeInvoiceId?: string;
  stripeInvoiceUrl?: string;
  stripePaymentIntentId?: string;
  internalNotes?: string;
  customerNotes?: string;
  paymentTerms?: string;
  footerText?: string;
  relatedInvoiceId?: string;
  templateId?: string;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}
/**
 * Invoice for display in UI
 */
export interface InvoiceDisplay extends Omit<
  Invoice,
  | "issueDate"
  | "dueDate"
  | "periodStart"
  | "periodEnd"
  | "sentAt"
  | "paidAt"
  | "cancelledAt"
  | "voidedAt"
  | "pdfGeneratedAt"
  | "createdAt"
  | "updatedAt"
> {
  issueDate: Date;
  dueDate: Date;
  periodStart?: Date;
  periodEnd?: Date;
  sentAt?: Date;
  paidAt?: Date;
  cancelledAt?: Date;
  voidedAt?: Date;
  pdfGeneratedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isOverdue: boolean;
  daysOverdue: number;
  statusDisplay: string;
  formattedTotal: string;
}
/**
 * Invoice Template
 * Reusable template for recurring invoices
 * Stored in: invoiceTemplates/{id}
 */
export interface InvoiceTemplate {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  items: Omit<
    InvoiceItem,
    "id" | "lineTotal" | "vatAmount" | "discountAmount"
  >[];
  frequency?: "monthly" | "quarterly" | "yearly" | "custom";
  dayOfMonth?: number;
  customIntervalDays?: number;
  contactIds?: string[];
  applyToAllContacts?: boolean;
  dueDays: number;
  language: InvoiceLanguage;
  paymentTerms?: string;
  footerText?: string;
  isActive: boolean;
  lastGeneratedAt?: Timestamp;
  nextGenerateAt?: Timestamp;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}
/**
 * Invoice template for display
 */
export interface InvoiceTemplateDisplay extends Omit<
  InvoiceTemplate,
  "lastGeneratedAt" | "nextGenerateAt" | "createdAt" | "updatedAt"
> {
  lastGeneratedAt?: Date;
  nextGenerateAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  frequencyDisplay: string;
  itemCount: number;
  totalAmount: number;
}
/**
 * Invoice numbering settings
 * Stored as part of organization settings
 */
export interface InvoiceNumberingSettings {
  prefix: string;
  separator: string;
  includeYear: boolean;
  yearFormat: "full" | "short";
  paddingDigits: number;
  nextNumber: number;
  resetYearly: boolean;
}
/**
 * Invoice settings for organization
 */
export interface InvoiceSettings {
  organizationId: string;
  numbering: InvoiceNumberingSettings;
  defaultDueDays: number;
  defaultVatRate: number;
  defaultCurrency: string;
  defaultLanguage: InvoiceLanguage;
  bankInfo: {
    bankName: string;
    accountNumber: string;
    iban?: string;
    bic?: string;
  };
  swishNumber?: string;
  plusgiro?: string;
  bankgiro?: string;
  logoUrl?: string;
  primaryColor?: string;
  vatNumber?: string;
  companyRegistrationNumber?: string;
  defaultPaymentTerms?: string;
  defaultFooterText?: string;
  stripeEnabled: boolean;
  stripeAccountId?: string;
  sendReminders: boolean;
  reminderDaysBefore: number[];
  reminderDaysAfter: number[];
  updatedAt: Timestamp;
  updatedBy: string;
}
export interface CreateInvoiceItemData {
  description: string;
  itemType: InvoiceItemType;
  quantity: number;
  unit?: string;
  unitPrice: number;
  vatRate: number;
  discount?: number;
  horseId?: string;
  periodStart?: string | Date;
  periodEnd?: string | Date;
  serviceDate?: string | Date;
  serviceName?: string;
}
export interface CreateInvoiceData {
  contactId: string;
  issueDate: string | Date;
  dueDate: string | Date;
  periodStart?: string | Date;
  periodEnd?: string | Date;
  items: CreateInvoiceItemData[];
  currency?: string;
  language?: InvoiceLanguage;
  internalNotes?: string;
  customerNotes?: string;
  paymentTerms?: string;
  footerText?: string;
  templateId?: string;
  status?: "draft" | "pending";
}
export interface UpdateInvoiceData {
  contactId?: string;
  issueDate?: string | Date;
  dueDate?: string | Date;
  periodStart?: string | Date | null;
  periodEnd?: string | Date | null;
  items?: CreateInvoiceItemData[];
  internalNotes?: string;
  customerNotes?: string;
  paymentTerms?: string;
  footerText?: string;
}
export interface RecordPaymentData {
  amount: number;
  method: PaymentMethod;
  reference?: string;
  paidAt: string | Date;
  notes?: string;
}
export interface CreateInvoiceTemplateData {
  name: string;
  description?: string;
  items: Omit<
    CreateInvoiceItemData,
    "periodStart" | "periodEnd" | "serviceDate"
  >[];
  frequency?: "monthly" | "quarterly" | "yearly" | "custom";
  dayOfMonth?: number;
  customIntervalDays?: number;
  contactIds?: string[];
  applyToAllContacts?: boolean;
  dueDays: number;
  language?: InvoiceLanguage;
  paymentTerms?: string;
  footerText?: string;
}
export interface UpdateInvoiceTemplateData extends Partial<CreateInvoiceTemplateData> {
  isActive?: boolean;
}
/**
 * Invoice analytics/dashboard data
 */
export interface InvoiceAnalytics {
  organizationId: string;
  period: {
    start: Date;
    end: Date;
  };
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  totalOverdue: number;
  currency: string;
  invoiceCount: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  byStatus: {
    status: InvoiceStatus;
    count: number;
    amount: number;
  }[];
  byItemType: {
    itemType: InvoiceItemType;
    count: number;
    amount: number;
  }[];
  byContact: {
    contactId: string;
    contactName: string;
    invoiceCount: number;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
  }[];
  monthlyTrend: {
    month: string;
    invoiced: number;
    paid: number;
    count: number;
  }[];
  byPaymentMethod: {
    method: PaymentMethod;
    count: number;
    amount: number;
  }[];
  averageInvoiceValue: number;
  averageDaysToPayment: number;
  onTimePaymentRate: number;
}
/**
 * Contact invoice summary
 * For unified contact view
 */
export interface ContactInvoiceSummary {
  contactId: string;
  contactName: string;
  totalInvoices: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  totalOverdue: number;
  currency: string;
  lastInvoiceDate?: Date;
  lastPaymentDate?: Date;
  recentInvoices: InvoiceDisplay[];
}
//# sourceMappingURL=invoice.d.ts.map
