import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "stall-bokning-dev.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "stall-bokning-dev",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "stall-bokning-dev.appspot.com",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Connect to emulators ONLY in local development
// Check both environment variable AND that we're running on localhost
const isLocalDevelopment =
  import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

if (isLocalDevelopment) {
  const authEmulatorUrl =
    import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL || "http://localhost:5099";
  const firestoreHost =
    import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || "localhost:5081";

  // Extract host and port from the Firestore emulator host
  const [host, portStr] = firestoreHost.split(":");
  const port = parseInt(portStr, 10);

  // Connect to emulators
  connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });
  connectFirestoreEmulator(db, host, port);

  console.log("🔧 Connected to Firebase Emulators");
  console.log(`   Auth: ${authEmulatorUrl}`);
  console.log(`   Firestore: ${firestoreHost}`);
} else {
  console.log("🔥 Connected to Production Firebase");
  console.log(`   Project: ${firebaseConfig.projectId}`);
}

export default app;
