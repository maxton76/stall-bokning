/**
 * Organization Helper Utilities
 *
 * Shared helpers for loading and validating organization documents.
 */

import { db } from "./firebase.js";
import type { DocumentReference, DocumentData } from "firebase-admin/firestore";

export interface OrganizationDoc {
  ref: DocumentReference;
  data: DocumentData;
}

/**
 * Load an organization document, throwing a structured error if not found.
 * Callers can catch and return 404 to the client.
 */
export async function getOrganizationOrThrow(
  organizationId: string,
): Promise<OrganizationDoc> {
  const ref = db.collection("organizations").doc(organizationId);
  const doc = await ref.get();

  if (!doc.exists) {
    const err = new Error("Organization not found") as Error & {
      statusCode: number;
    };
    err.statusCode = 404;
    throw err;
  }

  return { ref, data: doc.data()! };
}
