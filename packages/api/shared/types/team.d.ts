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
  userId?: string;
  contactId?: string;
  externalName?: string;
  displayName: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
  startDate?: Timestamp;
  endDate?: Timestamp;
  notes?: string;
}
/**
 * Horse team configuration
 * Embedded in Horse document or stored separately
 */
export interface HorseTeam {
  defaultRider?: TeamMember;
  defaultGroom?: TeamMember;
  defaultFarrier?: TeamMember;
  defaultVet?: TeamMember;
  defaultTrainer?: TeamMember;
  defaultDentist?: TeamMember;
  additionalContacts?: TeamMember[];
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
  fullAddress?: string;
  organization?: string;
  specialization?: string;
}
/**
 * Helper to get display name for a team role
 */
export declare function getTeamRoleDisplayName(
  role: TeamMemberRole,
  locale?: "en" | "sv",
): string;
/**
 * Get icon name for a team role (for UI)
 */
export declare function getTeamRoleIcon(role: TeamMemberRole): string;
//# sourceMappingURL=team.d.ts.map
