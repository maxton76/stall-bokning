import { db } from "./firebase.js";
import { Timestamp } from "firebase-admin/firestore";
import type { CommissionRateType } from "@equiduty/shared";

/**
 * Commission config shape expected by the calculator.
 * Uses structural typing to avoid firebase-admin vs firebase Timestamp conflicts.
 */
interface CommissionConfig {
  id: string;
  trainerId: string;
  trainerName: string;
  rules: Array<{
    lessonType: string;
    rate: number;
    rateType: CommissionRateType;
    minAmount?: number;
    maxAmount?: number;
  }>;
  defaultRate: number;
  defaultRateType: CommissionRateType;
}

/**
 * Result of commission calculation, ready to be persisted to Firestore.
 */
export interface CommissionCalculationResult {
  organizationId: string;
  configId: string;
  trainerId: string;
  trainerName: string;
  period: { start: Timestamp; end: Timestamp };
  status: string;
  totalLessons: number;
  totalRevenue: number;
  commissionAmount: number;
  currency: string;
  lineItems: Array<{
    attributionId: string;
    lessonId: string;
    lessonDate: Timestamp;
    lessonType: string;
    studentName: string;
    revenue: number;
    rate: number;
    rateType: CommissionRateType;
    commissionAmount: number;
  }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

/**
 * Calculate commission for a trainer over a billing period.
 * Queries trainerAttributions collection for the period, applies config rules.
 *
 * All monetary amounts are in ore (1 SEK = 100 ore).
 */
export async function calculateCommission(
  config: CommissionConfig,
  organizationId: string,
  periodStart: Date,
  periodEnd: Date,
  calculatedBy: string,
): Promise<CommissionCalculationResult> {
  // Query trainerAttributions for this trainer in the period
  const attributionsSnap = await db
    .collection("trainerAttributions")
    .where("organizationId", "==", organizationId)
    .where("trainerId", "==", config.trainerId)
    .where("activityDate", ">=", Timestamp.fromDate(periodStart))
    .where("activityDate", "<=", Timestamp.fromDate(periodEnd))
    .orderBy("activityDate", "asc")
    .get();

  const lineItems: CommissionCalculationResult["lineItems"] = [];
  let totalRevenue = 0;
  let totalCommission = 0;

  for (const doc of attributionsSnap.docs) {
    const attr = doc.data();
    const revenue: number = attr.totalRevenue || 0; // in ore
    const lessonType: string = attr.activityType || "";

    // Find matching rule for this lesson type
    const rule = config.rules.find((r) => r.lessonType === lessonType);
    const rate = rule?.rate ?? config.defaultRate;
    const rateType: CommissionRateType =
      rule?.rateType ?? config.defaultRateType;

    // Calculate commission amount
    let commissionAmount: number;
    if (rateType === "percentage") {
      commissionAmount = Math.round((revenue * rate) / 100);
    } else {
      commissionAmount = rate; // fixed_amount in ore
    }

    // Apply min/max clamp only for percentage rates (clamping a fixed_amount is nonsensical)
    if (rateType === "percentage") {
      if (rule?.minAmount !== undefined && commissionAmount < rule.minAmount) {
        commissionAmount = rule.minAmount;
      }
      if (rule?.maxAmount !== undefined && commissionAmount > rule.maxAmount) {
        commissionAmount = rule.maxAmount;
      }
    }

    totalRevenue += revenue;
    totalCommission += commissionAmount;

    lineItems.push({
      attributionId: doc.id,
      lessonId: attr.activityId || "",
      lessonDate: attr.activityDate,
      lessonType,
      studentName: attr.studentName || attr.participantName || "",
      revenue,
      rate,
      rateType,
      commissionAmount,
    });
  }

  return {
    organizationId,
    configId: config.id,
    trainerId: config.trainerId,
    trainerName: config.trainerName,
    period: {
      start: Timestamp.fromDate(periodStart),
      end: Timestamp.fromDate(periodEnd),
    },
    status: "draft",
    totalLessons: lineItems.length,
    totalRevenue,
    commissionAmount: totalCommission,
    currency: "SEK",
    lineItems,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: calculatedBy,
  };
}
