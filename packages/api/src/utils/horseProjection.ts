import type { Horse } from "@equiduty/shared";
import type { HealthRecord } from "@equiduty/shared";
import type { HorseAccessContext, HorseAccessLevel } from "./authorization.js";

/**
 * Horse field access control system
 * Defines which fields are accessible at each access level
 */

/**
 * Field access map - defines which fields are visible at each access level
 * Each level includes all fields from lower levels
 */
const FIELD_ACCESS_MAP: Record<HorseAccessLevel, (keyof Horse)[]> = {
  /**
   * Level 1: Public - Visible to all stable members
   * Basic identification and status information
   */
  public: [
    "id",
    "name",
    "breed",
    "color",
    "gender",
    "age",
    "dateOfBirth",
    "status",
    "currentStableId",
    "currentStableName",
    "boxName",
    "paddockName",
    "usage",
    "coverPhotoURL",
    "avatarPhotoURL",
  ],

  /**
   * Level 2: Basic Care - Grooms, riders, daily staff
   * Public fields + care instructions and equipment
   */
  basic_care: [
    // Include all public fields
    "id",
    "name",
    "breed",
    "color",
    "gender",
    "age",
    "dateOfBirth",
    "status",
    "currentStableId",
    "currentStableName",
    "boxName",
    "paddockName",
    "usage",
    "coverPhotoURL",
    "avatarPhotoURL",
    // Add basic care fields
    "specialInstructions",
    "equipment",
    "hasSpecialInstructions",
    "horseGroupId",
    "horseGroupName",
    "withersHeight",
  ],

  /**
   * Level 3: Professional - Veterinarian, Farrier, Dentist
   * Basic care fields + medical/health data (filtered by role)
   */
  professional: [
    // Include all basic_care fields
    "id",
    "name",
    "breed",
    "color",
    "gender",
    "age",
    "dateOfBirth",
    "status",
    "currentStableId",
    "currentStableName",
    "boxName",
    "paddockName",
    "usage",
    "coverPhotoURL",
    "avatarPhotoURL",
    "specialInstructions",
    "equipment",
    "hasSpecialInstructions",
    "horseGroupId",
    "horseGroupName",
    "withersHeight",
    // Add professional fields
    "vaccinationRuleId",
    "vaccinationRuleName",
    "lastVaccinationDate",
    "nextVaccinationDue",
    "vaccinationStatus",
    "ueln",
    "chipNumber",
    "feiPassNumber",
    "feiExpiryDate",
    "sire",
    "dam",
    "damsire",
    "studbook",
    "breeder",
    "hasTeamAssignments",
    "hasTransportInstructions",
    "hasPedigreeData",
  ],

  /**
   * Level 4: Management - Administrators, Stable Owners
   * Professional fields + owner information and full records
   */
  management: [
    // Include all professional fields
    "id",
    "name",
    "breed",
    "color",
    "gender",
    "age",
    "dateOfBirth",
    "status",
    "currentStableId",
    "currentStableName",
    "boxName",
    "paddockName",
    "usage",
    "coverPhotoURL",
    "avatarPhotoURL",
    "specialInstructions",
    "equipment",
    "hasSpecialInstructions",
    "horseGroupId",
    "horseGroupName",
    "withersHeight",
    "vaccinationRuleId",
    "vaccinationRuleName",
    "lastVaccinationDate",
    "nextVaccinationDue",
    "vaccinationStatus",
    "ueln",
    "chipNumber",
    "feiPassNumber",
    "feiExpiryDate",
    "sire",
    "dam",
    "damsire",
    "studbook",
    "breeder",
    "hasTeamAssignments",
    "hasTransportInstructions",
    "hasPedigreeData",
    // Add management fields
    "ownerId",
    "ownerName",
    "ownerEmail",
    "ownershipType",
    "ownerContactId",
    "ownerContactName",
    "ownerOrganizationId",
    "isExternal",
    "dateOfArrival",
    "assignedAt",
    "federationNumber",
    "notes",
    "relatedLinks",
    "createdAt",
    "updatedAt",
    "lastModifiedBy",
  ],

  /**
   * Level 5: Owner - Full access to all fields
   * All fields including external location and removal status
   */
  owner: [
    // All Horse interface fields
    "id",
    "name",
    "breed",
    "color",
    "gender",
    "age",
    "dateOfBirth",
    "status",
    "currentStableId",
    "currentStableName",
    "boxName",
    "paddockName",
    "usage",
    "coverPhotoURL",
    "avatarPhotoURL",
    "specialInstructions",
    "equipment",
    "hasSpecialInstructions",
    "horseGroupId",
    "horseGroupName",
    "withersHeight",
    "vaccinationRuleId",
    "vaccinationRuleName",
    "lastVaccinationDate",
    "nextVaccinationDue",
    "vaccinationStatus",
    "ueln",
    "chipNumber",
    "feiPassNumber",
    "feiExpiryDate",
    "sire",
    "dam",
    "damsire",
    "studbook",
    "breeder",
    "hasTeamAssignments",
    "hasTransportInstructions",
    "hasPedigreeData",
    "ownerId",
    "ownerName",
    "ownerEmail",
    "ownershipType",
    "ownerContactId",
    "ownerContactName",
    "ownerOrganizationId",
    "isExternal",
    "dateOfArrival",
    "assignedAt",
    "federationNumber",
    "notes",
    "relatedLinks",
    "createdAt",
    "updatedAt",
    "lastModifiedBy",
    // Owner-only fields
    "externalContactId",
    "externalLocation",
    "externalMoveType",
    "externalDepartureDate",
    "externalMoveReason",
    "isRemoved",
  ],
};

/**
 * Filter health records based on user's organization role
 * Professional users only see records relevant to their specialty
 *
 * @param records - Array of health records to filter
 * @param organizationRoles - User's organization roles
 * @returns Filtered array of health records
 */
export function filterHealthRecordsByRole(
  records: HealthRecord[] | undefined,
  organizationRoles: string[],
): HealthRecord[] | undefined {
  if (!records || records.length === 0) {
    return records;
  }

  // Veterinarians see veterinary and medication records
  if (organizationRoles.includes("veterinarian")) {
    return records.filter(
      (r) => r.recordType === "veterinary" || r.recordType === "medication",
    );
  }

  // Farriers see farrier records
  if (organizationRoles.includes("farrier")) {
    return records.filter((r) => r.recordType === "farrier");
  }

  // Dentists see dental records
  if (organizationRoles.includes("dentist")) {
    return records.filter((r) => r.recordType === "dental");
  }

  // No health records for other roles
  return [];
}

/**
 * Project horse fields based on access level
 * Returns only the fields the user is allowed to see
 *
 * @param horse - Full horse object
 * @param accessLevel - User's access level
 * @param context - User's access context
 * @returns Partial horse object with only accessible fields
 */
export function projectHorseFields(
  horse: Horse,
  accessLevel: HorseAccessLevel,
  context: HorseAccessContext,
): Partial<Horse> & { _accessLevel?: string; _isOwner?: boolean } {
  const allowedFields =
    FIELD_ACCESS_MAP[accessLevel] || FIELD_ACCESS_MAP.public;

  const projected: Partial<Horse> & {
    _accessLevel?: string;
    _isOwner?: boolean;
  } = {};

  // Project allowed fields
  for (const field of allowedFields) {
    if (horse[field] !== undefined) {
      (projected as any)[field] = horse[field];
    }
  }

  // Add metadata for frontend
  projected._accessLevel = accessLevel;
  projected._isOwner = context.isOwner;

  return projected;
}

/**
 * Get a list of field names for a given access level
 * Useful for debugging and documentation
 *
 * @param accessLevel - The access level
 * @returns Array of field names accessible at that level
 */
export function getAccessibleFields(
  accessLevel: HorseAccessLevel,
): (keyof Horse)[] {
  return FIELD_ACCESS_MAP[accessLevel] || FIELD_ACCESS_MAP.public;
}

/**
 * Check if a specific field is accessible at a given access level
 *
 * @param field - The field name to check
 * @param accessLevel - The access level
 * @returns True if the field is accessible
 */
export function isFieldAccessible(
  field: keyof Horse,
  accessLevel: HorseAccessLevel,
): boolean {
  const allowedFields =
    FIELD_ACCESS_MAP[accessLevel] || FIELD_ACCESS_MAP.public;
  return allowedFields.includes(field);
}
