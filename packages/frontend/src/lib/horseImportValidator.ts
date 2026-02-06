import type { HorseImportRow } from "./horseImportParser";
import { isValidEmail } from "./emailUtils";

/**
 * Validation status for a horse import row.
 */
export type HorseRowValidationStatus = "valid" | "warning" | "error";

/**
 * Validation codes for horse import.
 */
export type HorseValidationCode =
  | "MEMBER_NOT_FOUND"
  | "EMPTY_HORSE_NAME"
  | "DUPLICATE_HORSE_FOR_OWNER"
  | "INVALID_EMAIL";

/**
 * A horse row prepared for the preview step with validation.
 */
export interface HorsePreviewRow {
  index: number;
  ownerEmail: string;
  ownerId: string | null;
  ownerName: string | null;
  horseName: string;
  stableId: string | null;
  stableName: string | null;
  validation: {
    status: HorseRowValidationStatus;
    errors: HorseValidationCode[];
    warnings: HorseValidationCode[];
  };
  excluded: boolean;
}

/**
 * Summary of horse import validation.
 */
export interface HorseValidationSummary {
  total: number;
  valid: number;
  warnings: number;
  errors: number;
  uniqueOwners: number;
}

interface ResolvedMember {
  email: string;
  userId: string;
  name: string;
}

/**
 * Validate horse import rows against resolved member data.
 */
export function validateHorseImportRows(
  rows: HorseImportRow[],
  resolvedMembers: ResolvedMember[],
  unresolvedEmails: string[],
): HorsePreviewRow[] {
  const resolvedMap = new Map<string, ResolvedMember>();
  for (const m of resolvedMembers) {
    resolvedMap.set(m.email.toLowerCase(), m);
  }
  const unresolvedSet = new Set(unresolvedEmails.map((e) => e.toLowerCase()));

  // Track duplicate horse names per owner
  const ownerHorseNames = new Map<string, Set<string>>();

  return rows.map((row, index) => {
    const errors: HorseValidationCode[] = [];
    const warnings: HorseValidationCode[] = [];
    const emailLower = row.ownerEmail.toLowerCase();

    // Email validation
    if (!isValidEmail(row.ownerEmail)) {
      errors.push("INVALID_EMAIL");
    } else if (unresolvedSet.has(emailLower) || !resolvedMap.has(emailLower)) {
      errors.push("MEMBER_NOT_FOUND");
    }

    // Horse name validation
    if (!row.horseName.trim()) {
      errors.push("EMPTY_HORSE_NAME");
    }

    // Duplicate horse name per owner
    const ownerKey = emailLower;
    const horseNameLower = row.horseName.toLowerCase();
    if (!ownerHorseNames.has(ownerKey)) {
      ownerHorseNames.set(ownerKey, new Set());
    }
    const ownerNames = ownerHorseNames.get(ownerKey)!;
    if (ownerNames.has(horseNameLower)) {
      warnings.push("DUPLICATE_HORSE_FOR_OWNER");
    } else {
      ownerNames.add(horseNameLower);
    }

    const resolved = resolvedMap.get(emailLower);

    const status: HorseRowValidationStatus =
      errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "valid";

    return {
      index,
      ownerEmail: row.ownerEmail,
      ownerId: resolved?.userId ?? null,
      ownerName: resolved?.name ?? null,
      horseName: row.horseName,
      stableId: null,
      stableName: null,
      validation: { status, errors, warnings },
      excluded: false,
    };
  });
}

/**
 * Compute validation summary from horse preview rows.
 */
export function computeHorseValidationSummary(
  rows: HorsePreviewRow[],
): HorseValidationSummary {
  const activeRows = rows.filter((r) => !r.excluded);
  const uniqueOwners = new Set(
    activeRows.map((r) => r.ownerEmail.toLowerCase()),
  );
  return {
    total: activeRows.length,
    valid: activeRows.filter((r) => r.validation.status === "valid").length,
    warnings: activeRows.filter((r) => r.validation.status === "warning")
      .length,
    errors: activeRows.filter((r) => r.validation.status === "error").length,
    uniqueOwners: uniqueOwners.size,
  };
}

/**
 * Get translatable validation message key.
 */
export function getHorseValidationMessageKey(
  code: HorseValidationCode,
): string {
  const map: Record<HorseValidationCode, string> = {
    MEMBER_NOT_FOUND: "horses:bulkImport.validation.memberNotFound",
    EMPTY_HORSE_NAME: "horses:bulkImport.validation.emptyHorseName",
    DUPLICATE_HORSE_FOR_OWNER:
      "horses:bulkImport.validation.duplicateHorseForOwner",
    INVALID_EMAIL: "horses:bulkImport.validation.invalidEmail",
  };
  return map[code];
}
