import type { Timestamp } from "firebase/firestore";
import type { InvoiceLanguage } from "./contact.js";

/**
 * Invoice and Billing Types
 * Supports invoice creation, payment tracking, and recurring billing.
 * All monetary amounts stored in öre (1 SEK = 100 öre) as integers.
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
 * Invoice document type discriminator
 */
export type InvoiceDocumentType = "invoice" | "credit_note";

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
 * All monetary amounts in öre (integer).
 */
export interface InvoiceItem {
  id: string; // UUID for React keys
  description: string;
  itemType: InvoiceItemType;
  quantity: number;
  unit?: string; // "month", "hour", "piece", etc.
  unitPrice: number; // Price per unit in öre (ex. VAT)
  vatRate: number; // VAT percentage (25%, 12%, 6%, 0%)
  discount?: number; // Discount percentage
  discountAmount?: number; // Calculated discount amount in öre
  lineTotal: number; // quantity * unitPrice - discount (öre)
  vatAmount: number; // Calculated VAT in öre

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
 * Amount in öre (integer).
 */
export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number; // In öre
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
 * Amounts in öre (integer).
 */
export interface VatBreakdown {
  rate: number; // VAT percentage
  baseAmount: number; // Amount before VAT in öre
  vatAmount: number; // VAT amount in öre
}

/**
 * Invoice document
 * All monetary amounts in öre (integer, 1 SEK = 100 öre).
 * Stored in: invoices/{id}
 */
export interface Invoice {
  id: string;
  invoiceNumber: string; // Sequential: "INV-26-0001"
  organizationId: string;
  stableId?: string; // Optional if org has single stable

  /** Document type: invoice or credit_note (kreditfaktura) */
  type: InvoiceDocumentType;

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

  // Swedish compliance fields
  orgNumber?: string; // Organisationsnummer
  orgBankgiro?: string; // Bankgiro number
  orgPlusgiro?: string; // Plusgiro number
  orgSwish?: string; // Swish number
  ocrNumber?: string; // OCR payment reference (auto-generated)

  // Dates
  issueDate: Timestamp;
  dueDate: Timestamp;
  periodStart?: Timestamp; // Billing period if applicable
  periodEnd?: Timestamp;

  // Line items
  items: InvoiceItem[];

  // Totals (all in öre, integer)
  subtotal: number; // Sum of line totals (ex. VAT) in öre
  totalDiscount: number; // Total discount amount in öre
  vatBreakdown: VatBreakdown[]; // VAT by rate (amounts in öre)
  totalVat: number; // Total VAT amount in öre
  total: number; // Final amount inc. VAT in öre (after öresavrundning)
  roundingAmount: number; // Öresavrundning: difference between exact and rounded total
  currency: string; // Default: "SEK"

  // Payment tracking (amounts in öre)
  amountPaid: number;
  amountDue: number;
  payments: InvoicePayment[];

  // Billing group reference
  billingGroupId?: string;

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

  // Checkout / online payment
  checkoutSessionId?: string;
  checkoutUrl?: string;
  receiptUrl?: string;

  // Email delivery tracking
  emailSentAt?: Timestamp;
  emailSentTo?: string;

  // Notes
  internalNotes?: string; // Not shown to customer
  customerNotes?: string; // Shown on invoice
  paymentTerms?: string; // Payment terms text
  footerText?: string; // Footer message

  // Credit note references
  /** Credit note number (separate series, e.g., "KF-26-0001") */
  creditNoteNumber?: string;
  /** Original invoice ID that this credit note references */
  originalInvoiceId?: string;

  // References
  relatedInvoiceId?: string; // Legacy: for credit notes
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

  // Online payment settings
  paymentMode?: "manual" | "online" | "both";
  allowPartialPayments?: boolean;
  acceptedPaymentMethods?: (
    | "card"
    | "klarna"
    | "swish"
    | "bank_transfer"
    | "sepa_debit"
  )[];
  applicationFeePercent?: number;
  passFeesToCustomer?: boolean;

  // Reminders (legacy config)
  sendReminders: boolean;
  reminderDaysBefore: number[];
  reminderDaysAfter: number[];

  // Enhanced reminder configuration (Swedish compliance)
  /** Days after due date to send first reminder */
  reminder1DaysAfterDue?: number;
  /** Days after due date to send second reminder */
  reminder2DaysAfterDue?: number;
  /** Påminnelseavgift (reminder fee) in öre */
  reminderFee?: number;
  /** Dröjsmålsränta (late interest rate) as percentage */
  lateInterestRate?: number;
  /** Maximum number of reminders to send */
  maxReminders?: number;

  // Swedish compliance
  /** Organisationsnummer */
  orgNumber?: string;

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
  unitPrice: number; // In öre
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
  /** Document type (defaults to "invoice") */
  type?: InvoiceDocumentType;
  /** Billing group ID for consolidated invoices */
  billingGroupId?: string;
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
