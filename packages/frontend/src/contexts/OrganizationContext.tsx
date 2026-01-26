import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getUserOrganizations } from "../services/organizationService";
import { getUserPreferences } from "../services/userSettingsService";

interface OrganizationContextType {
  currentOrganizationId: string | null;
  /** @deprecated Use currentOrganizationId */
  currentOrganization: string | null;
  /** @deprecated Use currentOrganizationId */
  selectedOrganization: string | null;
  setCurrentOrganizationId: (id: string | null) => void;
  validating: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined,
);

interface OrganizationProviderProps {
  children: ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const { user } = useAuth();
  const [currentOrganizationId, setCurrentOrganizationId] = useState<
    string | null
  >(null);
  const [validating, setValidating] = useState(true);
  const preferencesLoadedRef = useRef(false);

  // Validate organization membership on mount and when user changes
  useEffect(() => {
    async function validateOrganizationMembership() {
      setValidating(true);
      preferencesLoadedRef.current = false;

      if (!user) {
        setCurrentOrganizationId(null);
        localStorage.removeItem("currentOrganizationId");
        setValidating(false);
        return;
      }

      const storedOrgId = localStorage.getItem("currentOrganizationId");

      // If we have a stored org ID, validate it first (fast path)
      if (storedOrgId) {
        try {
          // Verify user is actually a member of the organization
          const memberId = `${user.uid}_${storedOrgId}`;
          const memberDoc = await getDoc(
            doc(db, "organizationMembers", memberId),
          );

          if (memberDoc.exists() && memberDoc.data()?.status === "active") {
            // Valid membership, set the organization
            setCurrentOrganizationId(storedOrgId);
            setValidating(false);

            // Also check user preferences in background to sync
            loadDefaultFromPreferences();
            return;
          } else {
            // Invalid membership, clear the stored org
            localStorage.removeItem("currentOrganizationId");
            console.warn(
              "User is not an active member of the stored organization",
            );
          }
        } catch (error) {
          console.error("Error validating organization membership:", error);
          localStorage.removeItem("currentOrganizationId");
        }
      }

      // No valid stored org - try user preferences first
      try {
        const preferences = await getUserPreferences();
        preferencesLoadedRef.current = true;

        if (preferences.defaultOrganizationId) {
          // Validate user is actually a member of this organization
          const memberId = `${user.uid}_${preferences.defaultOrganizationId}`;
          const memberDoc = await getDoc(
            doc(db, "organizationMembers", memberId),
          );

          if (memberDoc.exists() && memberDoc.data()?.status === "active") {
            setCurrentOrganizationId(preferences.defaultOrganizationId);
            localStorage.setItem(
              "currentOrganizationId",
              preferences.defaultOrganizationId,
            );
            setValidating(false);
            return;
          }
        }
      } catch (error) {
        console.error("Error fetching user preferences:", error);
        // Continue with fallback logic
      }

      // No valid preference - try to auto-select if user has exactly one organization
      try {
        // Use backend API to get user's organizations (respects security rules)
        const organizations = await getUserOrganizations(user.uid);

        if (organizations.length === 1) {
          // User has exactly one organization - auto-select it
          const orgId = organizations[0]!.id;
          setCurrentOrganizationId(orgId);
        } else if (organizations.length > 1) {
          // User has multiple organizations - let them choose
          setCurrentOrganizationId(null);
        } else {
          // User has no organizations
          setCurrentOrganizationId(null);
        }
      } catch (error) {
        console.error("Error fetching user organizations:", error);
        setCurrentOrganizationId(null);
      }

      setValidating(false);
    }

    // Helper to load default from preferences in background
    async function loadDefaultFromPreferences() {
      if (preferencesLoadedRef.current) return;

      try {
        const preferences = await getUserPreferences();
        preferencesLoadedRef.current = true;

        // If user has a saved default in preferences that differs from current,
        // we don't override - localStorage takes precedence for explicit user selection
        // But we could log for debugging
        if (
          preferences.defaultOrganizationId &&
          preferences.defaultOrganizationId !==
            localStorage.getItem("currentOrganizationId")
        ) {
          console.debug(
            "User has a different default organization in preferences. " +
              "Current selection takes precedence.",
          );
        }
      } catch (error) {
        console.error("Error loading preferences in background:", error);
      }
    }

    validateOrganizationMembership();
  }, [user]);

  // Sync with localStorage whenever currentOrganizationId changes
  useEffect(() => {
    if (currentOrganizationId) {
      localStorage.setItem("currentOrganizationId", currentOrganizationId);
    } else {
      localStorage.removeItem("currentOrganizationId");
    }
  }, [currentOrganizationId]);

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganizationId,
        currentOrganization: currentOrganizationId,
        selectedOrganization: currentOrganizationId,
        setCurrentOrganizationId,
        validating,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganizationContext() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error(
      "useOrganizationContext must be used within an OrganizationProvider",
    );
  }
  return context;
}

/**
 * Alias for useOrganizationContext for backward compatibility
 */
export const useOrganization = useOrganizationContext;
