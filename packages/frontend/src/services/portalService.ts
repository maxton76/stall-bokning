import { authFetchJSON } from "@/utils/authFetch";
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
} from "@stall-bokning/shared";

const API_BASE = import.meta.env.VITE_API_URL || "";
const PORTAL_URL = `${API_BASE}/api/v1/portal`;

// ============================================
// Dashboard
// ============================================

export async function getPortalDashboard(): Promise<PortalDashboardData> {
  return authFetchJSON<PortalDashboardData>(`${PORTAL_URL}/dashboard`);
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
  return authFetchJSON<PortalHorsesResponse>(`${PORTAL_URL}/my-horses`);
}

export async function getPortalHorseDetail(
  horseId: string,
): Promise<PortalHorseDetailResponse> {
  return authFetchJSON<PortalHorseDetailResponse>(
    `${PORTAL_URL}/my-horses/${horseId}`,
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
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.limit) params.set("limit", filters.limit.toString());
  if (filters?.offset) params.set("offset", filters.offset.toString());

  const query = params.toString();
  return authFetchJSON<PortalInvoicesResponse>(
    `${PORTAL_URL}/my-invoices${query ? `?${query}` : ""}`,
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
  return authFetchJSON<PortalInvoiceDetailResponse>(
    `${PORTAL_URL}/my-invoices/${invoiceId}`,
  );
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
  const params = new URLSearchParams();
  if (filters?.horseId) params.set("horseId", filters.horseId);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters?.dateTo) params.set("dateTo", filters.dateTo);
  if (filters?.limit) params.set("limit", filters.limit.toString());
  if (filters?.offset) params.set("offset", filters.offset.toString());

  const query = params.toString();
  return authFetchJSON<PortalActivitiesResponse>(
    `${PORTAL_URL}/my-activities${query ? `?${query}` : ""}`,
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
  return authFetchJSON<PortalThreadsResponse>(`${PORTAL_URL}/threads`);
}

export async function getPortalThreadMessages(
  threadId: string,
): Promise<PortalMessagesResponse> {
  return authFetchJSON<PortalMessagesResponse>(
    `${PORTAL_URL}/threads/${threadId}/messages`,
  );
}

export async function createPortalThread(
  data: CreatePortalThreadData,
): Promise<PortalThread> {
  return authFetchJSON<PortalThread>(`${PORTAL_URL}/threads`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function sendPortalMessage(
  threadId: string,
  content: string,
): Promise<PortalMessage> {
  return authFetchJSON<PortalMessage>(
    `${PORTAL_URL}/threads/${threadId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    },
  );
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
  return authFetchJSON<PortalProfileResponse>(`${PORTAL_URL}/profile`);
}

export async function updatePortalNotificationPreferences(
  data: UpdatePortalNotificationPreferencesData,
): Promise<PortalNotificationPreferences> {
  return authFetchJSON<PortalNotificationPreferences>(
    `${PORTAL_URL}/notification-preferences`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
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
