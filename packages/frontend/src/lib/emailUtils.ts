/**
 * Shared email validation utilities for import wizards.
 *
 * Uses Zod's email validation to ensure consistency with backend API validation.
 * This prevents 400 errors when the frontend passes emails that the backend rejects.
 */
import { z } from "zod";

// Zod email schema - same validation as backend
const emailSchema = z.string().email();

/**
 * Check if a string is a valid email format using Zod.
 * Handles null/undefined and trims whitespace before validation.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length === 0) return false;
  return emailSchema.safeParse(trimmed).success;
}

/**
 * Partition an array of emails into valid and invalid.
 * Returns { valid: string[], invalid: string[] }
 *
 * - Trims whitespace from emails before validation
 * - Skips null/undefined/empty strings entirely (not added to invalid)
 * - Valid emails are returned trimmed and lowercased (ready for API)
 * - Invalid emails keep original value (for display to user)
 */
export function partitionEmails(emails: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const email of emails) {
    // Skip null/undefined/non-strings
    if (!email || typeof email !== "string") {
      continue;
    }
    const trimmed = email.trim();
    // Skip empty strings
    if (trimmed.length === 0) {
      continue;
    }
    if (emailSchema.safeParse(trimmed).success) {
      valid.push(trimmed.toLowerCase()); // Send trimmed + lowercased to API
    } else {
      invalid.push(email); // Keep original for display
    }
  }

  return { valid, invalid };
}
