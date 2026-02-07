import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  // Determine Firebase project ID from environment or default
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    "equiduty-dev";

  if (process.env.NODE_ENV === "production") {
    // Production: Use Application Default Credentials with explicit project ID
    initializeApp({
      projectId,
    });
  } else {
    // Development: Use service account or emulator
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      // Using Firebase Emulator
      initializeApp({
        projectId,
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Using service account file
      const serviceAccount = await import(
        process.env.GOOGLE_APPLICATION_CREDENTIALS
      );
      initializeApp({
        credential: cert(serviceAccount.default),
        projectId,
      });
    } else {
      // Fallback: Use Application Default Credentials with explicit project ID
      // This handles Cloud Run deployment with NODE_ENV=development
      initializeApp({
        projectId,
      });
    }
  }
}

export const db = getFirestore();
export const auth = getAuth();
export const storage = getStorage();

// Configure Firestore settings
db.settings({
  ignoreUndefinedProperties: true,
});
