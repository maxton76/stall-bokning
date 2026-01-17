/**
 * Centralized Firebase Admin SDK initialization
 *
 * This module provides a single point of Firebase initialization
 * to avoid duplication across multiple function files.
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

/**
 * Get the Firestore database instance
 * Firebase Admin SDK is lazily initialized on first call
 */
export const db = getFirestore();

/**
 * Re-export commonly used Firebase Admin types and functions
 * for convenience in consuming modules
 */
export { Timestamp, FieldValue } from "firebase-admin/firestore";
export type {
  Firestore,
  DocumentReference,
  QuerySnapshot,
} from "firebase-admin/firestore";
