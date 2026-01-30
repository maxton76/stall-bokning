import { apiClient } from "@/lib/apiClient";
import type {
  PortalDashboardData,
  PortalHorseSummary,
  PortalInvoiceSummary,
  PortalActivitySummary,
  PortalThread,
  PortalMessage,
  PortalNotificationPreferences,
  CreatePortalThreadData,
  UpdatePortalNotificationPreferencesData,
} from "@equiduty/shared";

// ============================================
// Dashboard
// ============================================

export async function getPortalDashboard(): Promise<PortalDashboardData> {
  return apiClient.get<PortalDashboardData>("/portal/dashboard");
}

// ============================================
// Horses
// ============================================

export interface PortalHorsesResponse {
  horses: PortalHorseSummary[];
}

export interface PortalHorseDetailResponse {
  horse: PortalHorseSummary & {
    gender?: string;
  };
  activities: PortalActivitySummary[];
  healthSummary?: {
    lastVetVisit?: string;
    lastFarrierVisit?: string;
    nextVaccination?: string;
    nextDeworming?: string;
    notes?: string;
  };
}

export async function getPortalHorses(): Promise<PortalHorsesResponse> {
  return apiClient.get<PortalHorsesResponse>("/portal/my-horses");
}

export async function getPortalHorseDetail(
  horseId: string,
): Promise<PortalHorseDetailResponse> {
  return apiClient.get<PortalHorseDetailResponse>(
    `/portal/my-horses/${horseId}`,
  );
}

// ============================================
// Invoices
// ============================================

export interface PortalInvoicesResponse {
  invoices: PortalInvoiceSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface PortalInvoiceFilters {
  status?: string;
  limit?: number;
  offset?: number;
}

export async function getPortalInvoices(
  filters?: PortalInvoiceFilters,
): Promise<PortalInvoicesResponse> {
  const params: Record<string, string> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.limit) params.limit = filters.limit.toString();
  if (filters?.offset) params.offset = filters.offset.toString();

  return apiClient.get<PortalInvoicesResponse>(
    "/portal/my-invoices",
    Object.keys(params).length > 0 ? params : undefined,
  );
}

export interface PortalInvoiceDetailResponse {
  invoice: PortalInvoiceSummary & {
    organizationName?: string;
    organizationAddress?: string;
    items: {
      description: string;
      horseName?: string;
      quantity: number;
      unitPrice: number;
      vatRate?: number;
      periodStart?: string;
      periodEnd?: string;
    }[];
    subtotal: number;
    vatBreakdown?: {
      rate: number;
      amount: number;
    }[];
    pdfUrl?: string;
  };
  payments: {
    id: string;
    amount: number;
    method: string;
    paidAt: string;
  }[];
}

export async function getPortalInvoiceDetail(
  invoiceId: string,
): Promise<PortalInvoiceDetailResponse> {
  return apiClient.get<PortalInvoiceDetailResponse>(
    `/portal/my-invoices/${invoiceId}`,
  );
}

/**
 * Flattened invoice response for payment page
 * This merges the invoice properties with the response for easier access
 */
export type FlattenedPortalInvoice = PortalInvoiceDetailResponse["invoice"] & {
  organizationId: string;
  contactId: string;
  payments: PortalInvoiceDetailResponse["payments"];
  paidAmount: number;
};

/**
 * Get portal invoice for payment - returns flattened structure
 * @deprecated Use getPortalInvoiceDetail and destructure `invoice` property
 */
export async function getPortalInvoice(
  invoiceId: string,
): Promise<FlattenedPortalInvoice> {
  const response = await getPortalInvoiceDetail(invoiceId);
  // Flatten the response for backward compatibility
  return {
    ...response.invoice,
    // Add any missing properties with defaults
    organizationId: "", // This should come from the invoice context
    contactId: "", // This should come from the invoice context
    payments: response.payments,
    paidAmount: response.payments.reduce((sum, p) => sum + p.amount, 0),
  };
}

// ============================================
// Activities
// ============================================

export interface PortalActivitiesResponse {
  activities: PortalActivitySummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface PortalActivityFilters {
  horseId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export async function getPortalActivities(
  filters?: PortalActivityFilters,
): Promise<PortalActivitiesResponse> {
  const params: Record<string, string> = {};
  if (filters?.horseId) params.horseId = filters.horseId;
  if (filters?.status) params.status = filters.status;
  if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters?.dateTo) params.dateTo = filters.dateTo;
  if (filters?.limit) params.limit = filters.limit.toString();
  if (filters?.offset) params.offset = filters.offset.toString();

  return apiClient.get<PortalActivitiesResponse>(
    "/portal/my-activities",
    Object.keys(params).length > 0 ? params : undefined,
  );
}

// ============================================
// Messages / Threads
// ============================================

export interface PortalThreadsResponse {
  threads: PortalThread[];
}

export interface PortalMessagesResponse {
  thread: PortalThread;
  messages: PortalMessage[];
}

export async function getPortalThreads(): Promise<PortalThreadsResponse> {
  return apiClient.get<PortalThreadsResponse>("/portal/threads");
}

export async function getPortalThreadMessages(
  threadId: string,
): Promise<PortalMessagesResponse> {
  return apiClient.get<PortalMessagesResponse>(
    `/portal/threads/${threadId}/messages`,
  );
}

export async function createPortalThread(
  data: CreatePortalThreadData,
): Promise<PortalThread> {
  return apiClient.post<PortalThread>("/portal/threads", data);
}

export async function sendPortalMessage(
  threadId: string,
  content: string,
): Promise<PortalMessage> {
  return apiClient.post<PortalMessage>(`/portal/threads/${threadId}/messages`, {
    content,
  });
}

// ============================================
// Profile / Preferences
// ============================================

export interface PortalProfileResponse {
  contact: any;
  organization: {
    id: string;
    name: string;
  };
  role: string;
  permissions: {
    canViewInvoices: boolean;
    canPayInvoices: boolean;
    canViewActivities: boolean;
    canViewHealthRecords: boolean;
    canCommunicate: boolean;
  };
  notificationPreferences: PortalNotificationPreferences;
}

export async function getPortalProfile(): Promise<PortalProfileResponse> {
  return apiClient.get<PortalProfileResponse>("/portal/profile");
}

export async function updatePortalNotificationPreferences(
  data: UpdatePortalNotificationPreferencesData,
): Promise<PortalNotificationPreferences> {
  return apiClient.patch<PortalNotificationPreferences>(
    "/portal/notification-preferences",
    data,
  );
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format currency for display
 */
export function formatCurrency(
  amount: number,
  currency: string = "SEK",
): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get invoice status badge variant
 */
export function getInvoiceStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "paid":
      return "default";
    case "sent":
    case "pending":
      return "secondary";
    case "overdue":
      return "destructive";
    case "cancelled":
    case "void":
      return "outline";
    default:
      return "secondary";
  }
}

/**
 * Get activity status badge variant
 */
export function getActivityStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "scheduled":
    case "confirmed":
      return "secondary";
    case "in_progress":
      return "outline";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
}
