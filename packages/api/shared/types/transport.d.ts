import type { Timestamp } from "firebase/firestore";
/**
 * Transportation instructions types for horse transport management
 */
/**
 * Loading behavior preferences
 */
export type LoadingBehavior =
  | "easy_loader"
  | "needs_patience"
  | "needs_handler"
  | "difficult"
  | "unknown";
/**
 * Transport position preference
 */
export type TransportPosition =
  | "any"
  | "front"
  | "rear"
  | "left"
  | "right"
  | "facing_forward"
  | "facing_backward";
/**
 * Emergency contact for transport
 */
export interface TransportEmergencyContact {
  name: string;
  phone: string;
  relationship?: string;
  isPrimary?: boolean;
}
/**
 * Horse transport instructions
 * Embedded in Horse document or stored separately
 */
export interface TransportInstructions {
  loadingBehavior?: LoadingBehavior;
  loadingNotes?: string;
  positionPreference?: TransportPosition;
  needsCompanion?: boolean;
  preferredCompanion?: string;
  travelAnxiety?: boolean;
  travelAnxietyNotes?: string;
  sedationRequired?: boolean;
  sedationNotes?: string;
  feedDuringTransport?: boolean;
  feedingInstructions?: string;
  hayNetRequired?: boolean;
  waterInstructions?: string;
  specialEquipment?: string[];
  travelBoots?: boolean;
  travelBlanket?: boolean;
  headProtection?: boolean;
  tailGuard?: boolean;
  pollGuard?: boolean;
  motionSickness?: boolean;
  ventilationNeeds?: string;
  temperaturePreference?: "cool" | "warm" | "normal";
  maxTravelTime?: number;
  restBreakFrequency?: number;
  unloadForRest?: boolean;
  emergencyContacts?: TransportEmergencyContact[];
  transportInsurance?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  notes?: string;
  updatedAt?: Timestamp;
  lastModifiedBy?: string;
}
/**
 * Transport instruction summary for quick reference
 */
export interface TransportInstructionsSummary {
  loadingBehavior?: LoadingBehavior;
  hasSpecialRequirements: boolean;
  requiresSedation: boolean;
  needsCompanion: boolean;
  hasEmergencyContacts: boolean;
  specialEquipmentCount: number;
}
/**
 * Update transport instructions input
 */
export interface UpdateTransportInstructionsInput {
  loadingBehavior?: LoadingBehavior;
  loadingNotes?: string;
  positionPreference?: TransportPosition;
  needsCompanion?: boolean;
  preferredCompanion?: string;
  travelAnxiety?: boolean;
  travelAnxietyNotes?: string;
  sedationRequired?: boolean;
  sedationNotes?: string;
  feedDuringTransport?: boolean;
  feedingInstructions?: string;
  hayNetRequired?: boolean;
  waterInstructions?: string;
  specialEquipment?: string[];
  travelBoots?: boolean;
  travelBlanket?: boolean;
  headProtection?: boolean;
  tailGuard?: boolean;
  pollGuard?: boolean;
  motionSickness?: boolean;
  ventilationNeeds?: string;
  temperaturePreference?: "cool" | "warm" | "normal";
  maxTravelTime?: number;
  restBreakFrequency?: number;
  unloadForRest?: boolean;
  emergencyContacts?: TransportEmergencyContact[];
  transportInsurance?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  notes?: string;
}
/**
 * Helper to get display name for loading behavior
 */
export declare function getLoadingBehaviorDisplayName(
  behavior: LoadingBehavior,
  locale?: "en" | "sv",
): string;
/**
 * Helper to summarize transport instructions
 */
export declare function summarizeTransportInstructions(
  instructions: TransportInstructions,
): TransportInstructionsSummary;
//# sourceMappingURL=transport.d.ts.map
