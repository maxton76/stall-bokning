import { User as FirebaseUser } from "firebase/auth";
import { User as FirestoreUser } from "@/types/roles";
import { AppUser } from "@/types/auth";
import { formatFullName, getInitials } from "@/lib/nameUtils";
import { apiClient } from "@/lib/apiClient";
import { logger } from "@/utils/logger";

// In-memory cache to avoid repeated API reads
const profileCache = new Map<
  string,
  { data: FirestoreUser; fetchedAt: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch user profile from API with caching
 */
export async function fetchUserProfile(
  uid: string,
  forceRefresh = false,
): Promise<FirestoreUser | null> {
  // Check cache first
  if (!forceRefresh) {
    const cached = profileCache.get(uid);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      return cached.data;
    }
  }

  try {
    const response = await apiClient.get<FirestoreUser & { id: string }>(
      "/auth/me",
    );

    if (response) {
      const data = response as FirestoreUser;
      profileCache.set(uid, { data, fetchedAt: Date.now() });
      return data;
    }

    logger.warn(`User profile not found for uid: ${uid}`);
    return null;
  } catch (error) {
    logger.error("Failed to fetch user profile:", error);
    return null;
  }
}

/**
 * Invalidate profile cache for a user
 */
export function invalidateProfileCache(uid: string): void {
  profileCache.delete(uid);
}

/**
 * Create AppUser by merging Firebase + Firestore data
 * Always returns valid AppUser even if Firestore data is missing
 */
export function createAppUser(
  firebaseUser: FirebaseUser,
  firestoreUser: FirestoreUser | null,
): AppUser {
  const firstName = firestoreUser?.firstName || null;
  const lastName = firestoreUser?.lastName || null;

  // Compute fullName with fallbacks
  const fullName = formatFullName(
    { firstName, lastName, email: firebaseUser.email },
    {
      fallback:
        firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
    },
  );

  // Compute initials with fallbacks
  const initials = getInitials({
    firstName,
    lastName,
    email: firebaseUser.email,
  });

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    firstName,
    lastName,
    systemRole: firestoreUser?.systemRole || null,
    createdAt: firestoreUser?.createdAt || null,
    updatedAt: firestoreUser?.updatedAt || null,
    fullName,
    initials,
  };
}
