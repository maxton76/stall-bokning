import type { OrganizationMember, OrganizationInvite } from "@equiduty/shared";

/**
 * Validation status for a single import row
 */
export type RowValidationStatus = "valid" | "warning" | "error";

/**
 * Validation result for a single import row
 */
export interface RowValidation {
  status: RowValidationStatus;
  errors: string[];
  warnings: string[];
}

/**
 * A row prepared for the preview step with validation info
 */
export interface PreviewRow {
  index: number;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  validation: RowValidation;
  excluded: boolean;
}

/**
 * Summary counts for the preview
 */
export interface ValidationSummary {
  total: number;
  valid: number;
  warnings: number;
  errors: number;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Validate a single email address
 */
function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Validate import rows against existing members and invites
 */
export function validateImportRows(
  rows: Array<{
    email: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
  }>,
  existingMembers: OrganizationMember[],
  existingInvites: (OrganizationInvite & { id: string })[],
): PreviewRow[] {
  const existingEmails = new Set(
    existingMembers.map((m) => m.userEmail.toLowerCase()),
  );
  const pendingInviteEmails = new Set(
    existingInvites
      .filter((i) => i.status === "pending")
      .map((i) => i.email.toLowerCase()),
  );

  // Track duplicates within the file
  const seenEmails = new Map<string, number>();

  return rows.map((row, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const emailLower = row.email.toLowerCase();

    // Email validation
    if (!row.email) {
      errors.push("MISSING_EMAIL");
    } else if (!isValidEmail(row.email)) {
      errors.push("INVALID_EMAIL");
    } else {
      // Check duplicate within file
      const previousIndex = seenEmails.get(emailLower);
      if (previousIndex !== undefined) {
        errors.push("DUPLICATE_IN_FILE");
      } else {
        seenEmails.set(emailLower, index);
      }

      // Check duplicate with existing members
      if (existingEmails.has(emailLower)) {
        errors.push("ALREADY_MEMBER");
      }

      // Check duplicate with pending invites
      if (pendingInviteEmails.has(emailLower)) {
        warnings.push("PENDING_INVITE");
      }
    }

    // Missing name warning
    if (!row.firstName && !row.lastName) {
      warnings.push("MISSING_NAME");
    }

    const status: RowValidationStatus =
      errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "valid";

    return {
      index,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      phoneNumber: row.phoneNumber,
      validation: { status, errors, warnings },
      excluded: false,
    };
  });
}

/**
 * Compute validation summary from preview rows
 */
export function computeValidationSummary(
  rows: PreviewRow[],
): ValidationSummary {
  const activeRows = rows.filter((r) => !r.excluded);
  return {
    total: activeRows.length,
    valid: activeRows.filter((r) => r.validation.status === "valid").length,
    warnings: activeRows.filter((r) => r.validation.status === "warning")
      .length,
    errors: activeRows.filter((r) => r.validation.status === "error").length,
  };
}

/**
 * Get translatable error/warning message key
 */
export function getValidationMessageKey(code: string): string {
  const map: Record<string, string> = {
    MISSING_EMAIL: "organizations:bulkImport.validation.missingEmail",
    INVALID_EMAIL: "organizations:bulkImport.validation.invalidEmail",
    DUPLICATE_IN_FILE: "organizations:bulkImport.validation.duplicateInFile",
    ALREADY_MEMBER: "organizations:bulkImport.validation.alreadyMember",
    PENDING_INVITE: "organizations:bulkImport.validation.pendingInvite",
    MISSING_NAME: "organizations:bulkImport.validation.missingName",
  };
  return map[code] || code;
}
