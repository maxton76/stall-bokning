import type { Timestamp } from "firebase/firestore";

/**
 * Trainer Commission Types
 * Supports commission configuration, calculation, and payout tracking for trainers.
 * All monetary amounts stored in öre (1 SEK = 100 öre) as integers.
 * Stored in: trainerCommissionConfigs/{id}, trainerCommissions/{id}
 */

// ============================================================
// Enums / Union Types
// ============================================================

/**
 * Commission rate calculation method
 * - percentage: Rate is a percentage of revenue (e.g. 15 for 15%)
 * - fixed_amount: Rate is a fixed amount in öre per lesson
 */
export type CommissionRateType = "percentage" | "fixed_amount";

/**
 * Commission document status lifecycle
 * - draft: Being prepared, not yet submitted
 * - pending_approval: Submitted for review by administrator
 * - approved: Approved and ready for payout
 * - paid: Commission has been paid out
 * - rejected: Commission rejected by administrator
 */
export type CommissionStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "paid"
  | "rejected";

// ============================================================
// Core Interfaces
// ============================================================

/**
 * Trainer Commission Configuration
 * Defines commission rules and rates for a specific trainer.
 * Stored in: trainerCommissionConfigs/{id}
 */
export interface TrainerCommissionConfig {
  id: string;
  organizationId: string;
  /** User ID of the trainer */
  trainerId: string;
  /** Denormalized trainer display name */
  trainerName: string;
  /** Ordered list of commission rules by lesson type */
  rules: TrainerCommissionRule[];
  /** Default rate when no specific rule matches (e.g. 15 for 15%) */
  defaultRate: number;
  /** How the default rate is applied */
  defaultRateType: CommissionRateType;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

/**
 * Commission rule for a specific lesson type
 * Overrides the default rate for matching lessons.
 */
export interface TrainerCommissionRule {
  id: string;
  /** Lesson type identifier (e.g. "jumping_lesson", "dressage_lesson") */
  lessonType: string;
  /** Commission rate value */
  rate: number;
  /** How the rate is applied */
  rateType: CommissionRateType;
  /** Minimum commission amount per lesson in öre */
  minAmount?: number;
  /** Maximum commission amount per lesson in öre */
  maxAmount?: number;
}

/**
 * Trainer Commission
 * Calculated commission for a trainer over a billing period.
 * Stored in: trainerCommissions/{id}
 */
export interface TrainerCommission {
  id: string;
  organizationId: string;
  /** Reference to TrainerCommissionConfig */
  configId: string;
  trainerId: string;
  /** Denormalized trainer display name */
  trainerName: string;
  /** Billing period */
  period: {
    start: Timestamp;
    end: Timestamp;
  };
  status: CommissionStatus;
  /** Total number of lessons in this commission period */
  totalLessons: number;
  /** Total revenue from lessons in öre */
  totalRevenue: number;
  /** Calculated commission amount in öre */
  commissionAmount: number;
  currency: string;
  /** Detailed breakdown per lesson */
  lineItems: TrainerCommissionLineItem[];

  // Approval workflow
  approvedBy?: string;
  approvedAt?: Timestamp;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;

  // Payment tracking
  paidAt?: Timestamp;
  paymentReference?: string;

  notes?: string;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

/**
 * Line item within a trainer commission
 * Represents commission for a single lesson.
 */
export interface TrainerCommissionLineItem {
  /** Reference to TrainerAttribution document */
  attributionId: string;
  lessonId: string;
  lessonDate: Timestamp;
  /** Lesson type identifier (e.g. "jumping_lesson") */
  lessonType: string;
  /** Denormalized student display name */
  studentName: string;
  /** Lesson revenue in öre */
  revenue: number;
  /** Applied commission rate */
  rate: number;
  /** How the rate was applied */
  rateType: CommissionRateType;
  /** Calculated commission for this lesson in öre */
  commissionAmount: number;
}

// ============================================================
// Create/Update DTOs
// ============================================================

export interface CreateTrainerCommissionConfigData {
  trainerId: string;
  trainerName: string;
  rules: Omit<TrainerCommissionRule, "id">[];
  defaultRate: number;
  defaultRateType: CommissionRateType;
  isActive?: boolean;
}

export interface UpdateTrainerCommissionConfigData {
  trainerName?: string;
  rules?: Omit<TrainerCommissionRule, "id">[];
  defaultRate?: number;
  defaultRateType?: CommissionRateType;
  isActive?: boolean;
}

/**
 * Data required to calculate commission for a period
 */
export interface CalculateCommissionData {
  /** Period start as ISO date string */
  periodStart: string;
  /** Period end as ISO date string */
  periodEnd: string;
  /** Optional: calculate for a specific trainer only */
  trainerId?: string;
}

/**
 * Data for approving a commission
 */
export interface ApproveCommissionData {
  /** Optional notes from the approver */
  notes?: string;
}
