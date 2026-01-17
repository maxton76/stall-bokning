import type {
  Invoice,
  InvoiceStatus,
  CreateInvoiceData,
  UpdateInvoiceData,
  RecordPaymentData,
  PaymentMethod,
  ContactInvoiceSummary,
} from "@stall-bokning/shared";
import { authFetchJSON } from "@/utils/authFetch";

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
  const params = new URLSearchParams();
  if (options?.status) {
    params.append("status", options.status);
  }
  if (options?.contactId) {
    params.append("contactId", options.contactId);
  }
  if (options?.limit) {
    params.append("limit", options.limit.toString());
  }

  const queryString = params.toString() ? `?${params.toString()}` : "";

  const response = await authFetchJSON<{ invoices: Invoice[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/invoices/organization/${organizationId}${queryString}`,
    { method: "GET" },
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
    const response = await authFetchJSON<Invoice>(
      `${import.meta.env.VITE_API_URL}/api/v1/invoices/${invoiceId}`,
      { method: "GET" },
    );
    return response;
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
  const response = await authFetchJSON<Invoice>(
    `${import.meta.env.VITE_API_URL}/api/v1/invoices`,
    {
      method: "POST",
      body: JSON.stringify({ organizationId, ...data }),
    },
  );

  return response;
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
  const response = await authFetchJSON<Invoice>(
    `${import.meta.env.VITE_API_URL}/api/v1/invoices/${invoiceId}`,
    {
      method: "PUT",
      body: JSON.stringify(updates),
    },
  );

  return response;
}

/**
 * Delete a draft invoice
 * @param invoiceId - Invoice ID
 * @returns Promise that resolves when deleted
 */
export async function deleteInvoice(invoiceId: string): Promise<void> {
  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/invoices/${invoiceId}`,
    { method: "DELETE" },
  );
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
  const response = await authFetchJSON<{ success: boolean; message: string }>(
    `${import.meta.env.VITE_API_URL}/api/v1/invoices/${invoiceId}/send`,
    { method: "POST" },
  );

  return response;
}

/**
 * Cancel an invoice
 * @param invoiceId - Invoice ID
 * @returns Promise with success message
 */
export async function cancelInvoice(
  invoiceId: string,
): Promise<{ success: boolean; message: string }> {
  const response = await authFetchJSON<{ success: boolean; message: string }>(
    `${import.meta.env.VITE_API_URL}/api/v1/invoices/${invoiceId}/cancel`,
    { method: "POST" },
  );

  return response;
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
  const response = await authFetchJSON<{
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
  }>(`${import.meta.env.VITE_API_URL}/api/v1/invoices/${invoiceId}/payment`, {
    method: "POST",
    body: JSON.stringify(data),
  });

  return response;
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
  const response = await authFetchJSON<ContactInvoiceSummary>(
    `${import.meta.env.VITE_API_URL}/api/v1/invoices/contact/${contactId}?limit=${limit}`,
    { method: "GET" },
  );

  return response;
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
  const response = await authFetchJSON<{
    count: number;
    totalOverdue: number;
    currency: string;
    invoices: (Invoice & { daysOverdue: number })[];
  }>(
    `${import.meta.env.VITE_API_URL}/api/v1/invoices/organization/${organizationId}/overdue`,
    { method: "GET" },
  );

  return response;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format currency amount for display
 * @param amount - Amount to format
 * @param currency - Currency code (default: SEK)
 * @returns Formatted string
 */
export function formatCurrency(amount: number, currency = "SEK"): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
  }).format(amount);
}

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
