import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  if (process.env.NODE_ENV === "production") {
    // Production: Use Application Default Credentials
    initializeApp();
  } else {
    // Development: Use service account or emulator
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      // Using Firebase Emulator
      initializeApp({
        projectId: "equiduty-dev",
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Using service account file
      const serviceAccount = await import(
        process.env.GOOGLE_APPLICATION_CREDENTIALS
      );
      initializeApp({
        credential: cert(serviceAccount.default),
      });
    } else {
      // Fallback to default initialization
      initializeApp();
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
