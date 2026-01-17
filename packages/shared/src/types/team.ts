import type { Timestamp } from "firebase/firestore";

/**
 * Horse team types for default rider, groom, farrier, vet assignments
 */

/**
 * Team member role types
 */
export type TeamMemberRole =
  | "rider"
  | "groom"
  | "farrier"
  | "veterinarian"
  | "trainer"
  | "dentist"
  | "physiotherapist"
  | "saddler"
  | "other";

/**
 * Team member document structure
 * Can be linked to users, contacts, or external providers
 */
export interface TeamMember {
  role: TeamMemberRole;

  // Identity - one of these should be set
  userId?: string; // If team member is a system user
  contactId?: string; // If team member is a contact
  externalName?: string; // If team member is external

  // Display information (cached or provided)
  displayName: string;
  email?: string;
  phone?: string;

  // Assignment details
  isPrimary?: boolean; // Primary assignment for this role
  startDate?: Timestamp;
  endDate?: Timestamp; // Null = active
  notes?: string;
}

/**
 * Horse team configuration
 * Embedded in Horse document or stored separately
 */
export interface HorseTeam {
  // Default assignments by role
  defaultRider?: TeamMember;
  defaultGroom?: TeamMember;
  defaultFarrier?: TeamMember;
  defaultVet?: TeamMember;
  defaultTrainer?: TeamMember;
  defaultDentist?: TeamMember;

  // Additional contacts (not primary)
  additionalContacts?: TeamMember[];

  // Metadata
  updatedAt?: Timestamp;
  lastModifiedBy?: string;
}

/**
 * Team assignment history entry
 */
export interface TeamAssignmentHistory {
  id: string;
  horseId: string;
  role: TeamMemberRole;
  previousMember?: TeamMember;
  newMember?: TeamMember;
  changeDate: Timestamp;
  reason?: string;
  createdBy: string;
}

/**
 * Create/update team member input
 */
export interface TeamMemberInput {
  role: TeamMemberRole;
  userId?: string;
  contactId?: string;
  externalName?: string;
  displayName: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
  startDate?: Timestamp | Date;
  notes?: string;
}

/**
 * Team member with resolved contact information
 */
export interface ResolvedTeamMember extends TeamMember {
  // Resolved from contact/user
  fullAddress?: string;
  organization?: string;
  specialization?: string;
}

/**
 * Helper to get display name for a team role
 */
export function getTeamRoleDisplayName(
  role: TeamMemberRole,
  locale: "en" | "sv" = "en",
): string {
  const labels: Record<TeamMemberRole, { en: string; sv: string }> = {
    rider: { en: "Rider", sv: "Ryttare" },
    groom: { en: "Groom", sv: "Skötare" },
    farrier: { en: "Farrier", sv: "Hovslagare" },
    veterinarian: { en: "Veterinarian", sv: "Veterinär" },
    trainer: { en: "Trainer", sv: "Tränare" },
    dentist: { en: "Equine Dentist", sv: "Tandvårdare" },
    physiotherapist: { en: "Physiotherapist", sv: "Fysioterapeut" },
    saddler: { en: "Saddler", sv: "Sadelmakare" },
    other: { en: "Other", sv: "Annan" },
  };

  return labels[role]?.[locale] || role;
}

/**
 * Get icon name for a team role (for UI)
 */
export function getTeamRoleIcon(role: TeamMemberRole): string {
  const icons: Record<TeamMemberRole, string> = {
    rider: "user",
    groom: "brush",
    farrier: "hammer",
    veterinarian: "stethoscope",
    trainer: "graduation-cap",
    dentist: "smile",
    physiotherapist: "activity",
    saddler: "briefcase",
    other: "user-plus",
  };

  return icons[role] || "user";
}
