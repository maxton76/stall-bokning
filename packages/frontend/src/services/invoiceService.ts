import type {
  Invoice,
  InvoiceStatus,
  CreateInvoiceData,
  UpdateInvoiceData,
  RecordPaymentData,
  PaymentMethod,
  ContactInvoiceSummary,
} from "@equiduty/shared";
import { apiClient } from "@/lib/apiClient";
// ============================================================================
// Invoice CRUD Operations
// ============================================================================

/**
 * Get all invoices for an organization
 * @param organizationId - Organization ID
 * @param options - Query options
 * @returns Promise with invoices
 */
export async function getOrganizationInvoices(
  organizationId: string,
  options?: { status?: InvoiceStatus; contactId?: string; limit?: number },
): Promise<Invoice[]> {
  const params: Record<string, string> = {};
  if (options?.status) {
    params.status = options.status;
  }
  if (options?.contactId) {
    params.contactId = options.contactId;
  }
  if (options?.limit) {
    params.limit = options.limit.toString();
  }

  const response = await apiClient.get<{ invoices: Invoice[] }>(
    `/invoices/organization/${organizationId}`,
    Object.keys(params).length > 0 ? params : undefined,
  );

  return response.invoices;
}

/**
 * Get a single invoice by ID
 * @param invoiceId - Invoice ID
 * @returns Promise with invoice
 */
export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  try {
    return await apiClient.get<Invoice>(`/invoices/${invoiceId}`);
  } catch {
    return null;
  }
}

/**
 * Create a new invoice
 * @param organizationId - Organization ID
 * @param data - Invoice data
 * @returns Promise with created invoice
 */
export async function createInvoice(
  organizationId: string,
  data: CreateInvoiceData,
): Promise<Invoice> {
  return await apiClient.post<Invoice>("/invoices", {
    organizationId,
    ...data,
  });
}

/**
 * Update an invoice
 * @param invoiceId - Invoice ID
 * @param updates - Partial update data
 * @returns Promise with updated invoice
 */
export async function updateInvoice(
  invoiceId: string,
  updates: UpdateInvoiceData,
): Promise<Invoice> {
  return await apiClient.put<Invoice>(`/invoices/${invoiceId}`, updates);
}

/**
 * Delete a draft invoice
 * @param invoiceId - Invoice ID
 * @returns Promise that resolves when deleted
 */
export async function deleteInvoice(invoiceId: string): Promise<void> {
  await apiClient.delete(`/invoices/${invoiceId}`);
}

// ============================================================================
// Invoice Actions
// ============================================================================

/**
 * Mark invoice as sent
 * @param invoiceId - Invoice ID
 * @returns Promise with success message
 */
export async function sendInvoice(
  invoiceId: string,
): Promise<{ success: boolean; message: string }> {
  return await apiClient.post<{ success: boolean; message: string }>(
    `/invoices/${invoiceId}/send`,
  );
}

/**
 * Cancel an invoice
 * @param invoiceId - Invoice ID
 * @returns Promise with success message
 */
export async function cancelInvoice(
  invoiceId: string,
): Promise<{ success: boolean; message: string }> {
  return await apiClient.post<{ success: boolean; message: string }>(
    `/invoices/${invoiceId}/cancel`,
  );
}

/**
 * Record a payment on an invoice
 * @param invoiceId - Invoice ID
 * @param data - Payment data
 * @returns Promise with payment result
 */
export async function recordPayment(
  invoiceId: string,
  data: RecordPaymentData,
): Promise<{
  success: boolean;
  payment: {
    id: string;
    amount: number;
    method: PaymentMethod;
    paidAt: string;
  };
  invoice: {
    amountPaid: number;
    amountDue: number;
    status: InvoiceStatus;
  };
}> {
  return await apiClient.post<{
    success: boolean;
    payment: {
      id: string;
      amount: number;
      method: PaymentMethod;
      paidAt: string;
    };
    invoice: {
      amountPaid: number;
      amountDue: number;
      status: InvoiceStatus;
    };
  }>(`/invoices/${invoiceId}/payment`, data);
}

// ============================================================================
// Contact Invoices
// ============================================================================

/**
 * Get invoices for a specific contact
 * @param contactId - Contact ID
 * @param limit - Max invoices to return
 * @returns Promise with contact invoice summary
 */
export async function getContactInvoices(
  contactId: string,
  limit = 20,
): Promise<ContactInvoiceSummary> {
  return await apiClient.get<ContactInvoiceSummary>(
    `/invoices/contact/${contactId}`,
    { limit: limit.toString() },
  );
}

// ============================================================================
// My Invoices (for authenticated user's linked contact)
// ============================================================================

export interface MyInvoicesResponse {
  contactId: string | null;
  contactName: string | null;
  summary: {
    totalInvoices: number;
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
    totalOverdue: number;
    currency: string;
  };
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    total: number;
    amountPaid: number;
    amountDue: number;
    currency: string;
    status: string;
    isOverdue: boolean;
    daysOverdue: number;
    canPayOnline: boolean;
    stripeInvoiceUrl?: string;
  }>;
}

/**
 * Get invoices for the authenticated user's linked contact
 * @param organizationId - Organization ID
 * @param options - Query options
 * @returns Promise with user's invoices and summary
 */
export async function getMyInvoices(
  organizationId: string,
  options?: { status?: string; limit?: number },
): Promise<MyInvoicesResponse> {
  const params: Record<string, string> = {};
  if (options?.status) params.status = options.status;
  if (options?.limit) params.limit = options.limit.toString();

  return apiClient.get<MyInvoicesResponse>(
    `/invoices/my/${organizationId}`,
    Object.keys(params).length > 0 ? params : undefined,
  );
}

// ============================================================================
// Overdue Invoices
// ============================================================================

/**
 * Get overdue invoices for an organization
 * @param organizationId - Organization ID
 * @returns Promise with overdue invoices
 */
export async function getOverdueInvoices(organizationId: string): Promise<{
  count: number;
  totalOverdue: number;
  currency: string;
  invoices: (Invoice & { daysOverdue: number })[];
}> {
  return await apiClient.get<{
    count: number;
    totalOverdue: number;
    currency: string;
    invoices: (Invoice & { daysOverdue: number })[];
  }>(`/invoices/organization/${organizationId}/overdue`);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get status color for UI styling
 * @param status - Invoice status
 * @returns CSS color class or Tailwind color
 */
export function getStatusColor(
  status: InvoiceStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "paid":
      return "default";
    case "sent":
    case "partially_paid":
      return "secondary";
    case "overdue":
    case "cancelled":
    case "void":
      return "destructive";
    default:
      return "outline";
  }
}
