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
  relationship?: string; // Owner, vet, trainer, etc.
  isPrimary?: boolean;
}

/**
 * Horse transport instructions
 * Embedded in Horse document or stored separately
 */
export interface TransportInstructions {
  // Loading behavior
  loadingBehavior?: LoadingBehavior;
  loadingNotes?: string;

  // Position preferences
  positionPreference?: TransportPosition;
  needsCompanion?: boolean;
  preferredCompanion?: string; // Horse name or ID

  // Travel requirements
  travelAnxiety?: boolean;
  travelAnxietyNotes?: string;
  sedationRequired?: boolean;
  sedationNotes?: string;

  // Feeding during transport
  feedDuringTransport?: boolean;
  feedingInstructions?: string;
  hayNetRequired?: boolean;
  waterInstructions?: string;

  // Equipment
  specialEquipment?: string[];
  travelBoots?: boolean;
  travelBlanket?: boolean;
  headProtection?: boolean;
  tailGuard?: boolean;
  pollGuard?: boolean;

  // Health considerations
  motionSickness?: boolean;
  ventilationNeeds?: string;
  temperaturePreference?: "cool" | "warm" | "normal";

  // Rest requirements (for long journeys)
  maxTravelTime?: number; // In hours
  restBreakFrequency?: number; // In hours
  unloadForRest?: boolean;

  // Emergency contacts
  emergencyContacts?: TransportEmergencyContact[];

  // Insurance information
  transportInsurance?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;

  // General notes
  notes?: string;

  // Metadata
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
export function getLoadingBehaviorDisplayName(
  behavior: LoadingBehavior,
  locale: "en" | "sv" = "en",
): string {
  const labels: Record<LoadingBehavior, { en: string; sv: string }> = {
    easy_loader: { en: "Easy Loader", sv: "Går på lätt" },
    needs_patience: { en: "Needs Patience", sv: "Behöver tålamod" },
    needs_handler: { en: "Needs Handler", sv: "Behöver hjälp" },
    difficult: { en: "Difficult", sv: "Svår" },
    unknown: { en: "Unknown", sv: "Okänd" },
  };

  return labels[behavior]?.[locale] || behavior;
}

/**
 * Helper to summarize transport instructions
 */
export function summarizeTransportInstructions(
  instructions: TransportInstructions,
): TransportInstructionsSummary {
  return {
    loadingBehavior: instructions.loadingBehavior,
    hasSpecialRequirements: !!(
      instructions.sedationRequired ||
      instructions.travelAnxiety ||
      instructions.needsCompanion ||
      instructions.motionSickness ||
      (instructions.specialEquipment &&
        instructions.specialEquipment.length > 0)
    ),
    requiresSedation: !!instructions.sedationRequired,
    needsCompanion: !!instructions.needsCompanion,
    hasEmergencyContacts: !!(
      instructions.emergencyContacts &&
      instructions.emergencyContacts.length > 0
    ),
    specialEquipmentCount: instructions.specialEquipment?.length || 0,
  };
}
