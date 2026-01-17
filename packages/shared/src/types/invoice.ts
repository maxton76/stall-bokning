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
  id: string; // UUID for React keys
  description: string;
  itemType: InvoiceItemType;
  quantity: number;
  unit?: string; // "month", "hour", "piece", etc.
  unitPrice: number; // Price per unit (ex. VAT)
  vatRate: number; // VAT percentage (25%, 12%, 6%, 0%)
  discount?: number; // Discount percentage
  discountAmount?: number; // Calculated discount amount
  lineTotal: number; // quantity * unitPrice - discount
  vatAmount: number; // Calculated VAT

  // Optional references
  horseId?: string; // If charge is for specific horse
  horseName?: string; // Denormalized
  periodStart?: Timestamp; // If charge covers a period
  periodEnd?: Timestamp;

  // For services
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
  reference?: string; // Bank reference, Swish number, etc.
  paidAt: Timestamp;
  recordedAt: Timestamp;
  recordedBy: string;
  notes?: string;

  // Stripe integration
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
}

/**
 * VAT breakdown for invoice
 */
export interface VatBreakdown {
  rate: number; // VAT percentage
  baseAmount: number; // Amount before VAT
  vatAmount: number; // VAT amount
}

/**
 * Invoice document
 * Stored in: invoices/{id}
 */
export interface Invoice {
  id: string;
  invoiceNumber: string; // Sequential: "INV-2026-0001"
  organizationId: string;
  stableId?: string; // Optional if org has single stable

  // Customer information
  contactId: string;
  contactName: string; // Denormalized
  contactEmail: string; // For sending
  contactAddress?: {
    street: string;
    houseNumber: string;
    postcode: string;
    city: string;
    country: string;
  };

  // Organization information (seller)
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

  // Dates
  issueDate: Timestamp;
  dueDate: Timestamp;
  periodStart?: Timestamp; // Billing period if applicable
  periodEnd?: Timestamp;

  // Line items
  items: InvoiceItem[];

  // Totals (all in invoice currency)
  subtotal: number; // Sum of line totals (ex. VAT)
  totalDiscount: number; // Total discount amount
  vatBreakdown: VatBreakdown[]; // VAT by rate
  totalVat: number; // Total VAT amount
  total: number; // Final amount inc. VAT
  currency: string; // Default: "SEK"

  // Payment tracking
  amountPaid: number;
  amountDue: number;
  payments: InvoicePayment[];

  // Status
  status: InvoiceStatus;
  sentAt?: Timestamp;
  paidAt?: Timestamp;
  cancelledAt?: Timestamp;
  voidedAt?: Timestamp;

  // Document generation
  language: InvoiceLanguage;
  pdfUrl?: string;
  pdfGeneratedAt?: Timestamp;

  // External integrations
  stripeInvoiceId?: string;
  stripeInvoiceUrl?: string;
  stripePaymentIntentId?: string;

  // Notes
  internalNotes?: string; // Not shown to customer
  customerNotes?: string; // Shown on invoice
  paymentTerms?: string; // Payment terms text
  footerText?: string; // Footer message

  // References
  relatedInvoiceId?: string; // For credit notes
  templateId?: string; // Template used to create

  // Metadata
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
  // Computed fields
  isOverdue: boolean;
  daysOverdue: number;
  statusDisplay: string; // Localized status
  formattedTotal: string; // "1 234,56 kr"
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

  // Default items
  items: Omit<
    InvoiceItem,
    "id" | "lineTotal" | "vatAmount" | "discountAmount"
  >[];

  // Schedule (for recurring)
  frequency?: "monthly" | "quarterly" | "yearly" | "custom";
  dayOfMonth?: number; // 1-28 for monthly
  customIntervalDays?: number;

  // Applicable contacts
  contactIds?: string[]; // Specific contacts to apply to
  applyToAllContacts?: boolean;

  // Settings
  dueDays: number; // Days until due from issue
  language: InvoiceLanguage;
  paymentTerms?: string;
  footerText?: string;

  // Status
  isActive: boolean;
  lastGeneratedAt?: Timestamp;
  nextGenerateAt?: Timestamp;

  // Metadata
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
  // Computed fields
  frequencyDisplay: string;
  itemCount: number;
  totalAmount: number;
}

/**
 * Invoice numbering settings
 * Stored as part of organization settings
 */
export interface InvoiceNumberingSettings {
  prefix: string; // "INV" or "F" (Faktura)
  separator: string; // "-"
  includeYear: boolean;
  yearFormat: "full" | "short"; // "2026" vs "26"
  paddingDigits: number; // 4 = "0001"
  nextNumber: number;
  resetYearly: boolean;
}

/**
 * Invoice settings for organization
 */
export interface InvoiceSettings {
  organizationId: string;

  // Numbering
  numbering: InvoiceNumberingSettings;

  // Defaults
  defaultDueDays: number; // Default: 30
  defaultVatRate: number; // Default: 25
  defaultCurrency: string; // Default: "SEK"
  defaultLanguage: InvoiceLanguage;

  // Payment information
  bankInfo: {
    bankName: string;
    accountNumber: string;
    iban?: string;
    bic?: string;
  };
  swishNumber?: string;
  plusgiro?: string;
  bankgiro?: string;

  // Branding
  logoUrl?: string;
  primaryColor?: string;

  // Legal
  vatNumber?: string;
  companyRegistrationNumber?: string;

  // Default texts
  defaultPaymentTerms?: string;
  defaultFooterText?: string;

  // Stripe integration
  stripeEnabled: boolean;
  stripeAccountId?: string;

  // Reminders
  sendReminders: boolean;
  reminderDaysBefore: number[];
  reminderDaysAfter: number[];

  // Metadata
  updatedAt: Timestamp;
  updatedBy: string;
}

// ============================================================
// Create/Update DTOs
// ============================================================

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

// ============================================================
// Analytics Types
// ============================================================

/**
 * Invoice analytics/dashboard data
 */
export interface InvoiceAnalytics {
  organizationId: string;
  period: {
    start: Date;
    end: Date;
  };

  // Summary
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  totalOverdue: number;
  currency: string;

  // Counts
  invoiceCount: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;

  // By status
  byStatus: {
    status: InvoiceStatus;
    count: number;
    amount: number;
  }[];

  // By item type
  byItemType: {
    itemType: InvoiceItemType;
    count: number;
    amount: number;
  }[];

  // By contact (top customers)
  byContact: {
    contactId: string;
    contactName: string;
    invoiceCount: number;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
  }[];

  // Monthly trend
  monthlyTrend: {
    month: string; // "2026-01"
    invoiced: number;
    paid: number;
    count: number;
  }[];

  // Payment method breakdown
  byPaymentMethod: {
    method: PaymentMethod;
    count: number;
    amount: number;
  }[];

  // Average metrics
  averageInvoiceValue: number;
  averageDaysToPayment: number;
  onTimePaymentRate: number; // Percentage paid before due
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
