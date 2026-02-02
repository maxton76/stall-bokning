import { apiClient } from "@/lib/apiClient";

export interface PaymentDashboardData {
  organizationId: string;
  period: { start: string; end: string };
  summary: {
    totalPayments: number;
    totalAmount: number;
    totalRefunds: number;
    totalRefundAmount: number;
    netAmount: number;
    totalApplicationFees: number;
    currency: string;
  };
  byPaymentMethod: { method: string; count: number; amount: number }[];
  byStatus: { status: string; count: number; amount: number }[];
  dailyTrend: { date: string; count: number; amount: number }[];
  recentPayments: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    contactName?: string;
    invoiceNumber?: string;
    paymentMethodType?: string;
    createdAt: string;
  }[];
}

export interface ApplicationFeeReport {
  totalFees: number;
  currency: string;
  feesByPeriod: { date: string; amount: number }[];
}

export async function getPaymentAnalytics(
  organizationId: string,
  startDate: string,
  endDate: string,
): Promise<PaymentDashboardData> {
  return apiClient.get<PaymentDashboardData>(
    `/organizations/${organizationId}/payments/analytics`,
    { startDate, endDate },
  );
}

export async function getApplicationFeeReport(
  organizationId: string,
  startDate: string,
  endDate: string,
): Promise<ApplicationFeeReport> {
  return apiClient.get<ApplicationFeeReport>(
    `/organizations/${organizationId}/payments/application-fees`,
    { startDate, endDate },
  );
}
