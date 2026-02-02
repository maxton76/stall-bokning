import type { Timestamp } from "firebase/firestore";

/**
 * Trainer Attribution
 * Links trainer activity to revenue for invoicing reporting.
 * All monetary amounts stored in ore (1 SEK = 100 ore).
 * Stored in: trainerAttributions/{id}
 */

export interface TrainerAttribution {
  id: string;
  trainerId: string;
  trainerName?: string;
  activityId: string;
  activityType: string;
  organizationId: string;
  activityDate: Timestamp;
  participantCount: number;
  /** Total revenue attributed to this activity, in ore */
  totalRevenue: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TrainerAttributionSummary {
  trainerId: string;
  trainerName?: string;
  totalActivities: number;
  totalParticipants: number;
  /** Total revenue in ore */
  totalRevenue: number;
  activityBreakdown: Record<string, number>; // activityType -> count
}

export interface CreateTrainerAttributionData {
  trainerId: string;
  trainerName?: string;
  activityId: string;
  activityType: string;
  organizationId: string;
  /** ISO date string */
  activityDate: string;
  participantCount: number;
  /** Revenue in ore */
  totalRevenue: number;
}
