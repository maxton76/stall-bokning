import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { formatFullName } from "@/lib/nameUtils";
import { apiClient } from "@/lib/apiClient";

export interface RegisterUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/**
 * Register a new user with firstName and lastName
 * Creates Firebase Auth user and calls backend to create Firestore documents
 * Backend automatically creates organization and membership
 *
 * @param data - User registration data
 * @throws Error if registration fails
 * @returns Organization ID for the user to set in context
 */
export async function registerUser(data: RegisterUserData): Promise<string> {
  // 1. Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    data.email,
    data.password,
  );
  const user = userCredential.user;

  try {
    // 2. Update Firebase Auth profile with full name
    await updateProfile(user, {
      displayName: formatFullName({
        firstName: data.firstName,
        lastName: data.lastName,
      }),
    });

    // 3. Call backend to create Firestore user document and organization
    // Backend handles:
    // - Creating user document
    // - Creating organization
    // - Creating organization member record
    // - Migrating pending invites
    const response = await apiClient.post<{
      user: { id: string; email: string; firstName: string; lastName: string };
    }>("/auth/signup", {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      systemRole: "member",
    });

    // Backend creates organization, but doesn't return it
    // We need to fetch user's organizations to get the ID
    // For now, return empty string - frontend will handle fetching organizations
    return "";
  } catch (error) {
    // If backend fails, delete the Auth user to maintain consistency
    await user.delete();
    throw error;
  }
}
