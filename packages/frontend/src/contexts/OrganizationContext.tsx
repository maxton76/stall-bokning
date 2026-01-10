import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface OrganizationContextType {
  currentOrganizationId: string | null;
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

  // Validate organization membership on mount and when user changes
  useEffect(() => {
    async function validateOrganizationMembership() {
      setValidating(true);

      const storedOrgId = localStorage.getItem("currentOrganizationId");

      if (!storedOrgId || !user) {
        setCurrentOrganizationId(null);
        localStorage.removeItem("currentOrganizationId");
        setValidating(false);
        return;
      }

      try {
        // Verify user is actually a member of the organization
        const memberId = `${user.uid}_${storedOrgId}`;
        const memberDoc = await getDoc(
          doc(db, "organizationMembers", memberId),
        );

        if (memberDoc.exists() && memberDoc.data()?.status === "active") {
          // Valid membership, set the organization
          setCurrentOrganizationId(storedOrgId);
        } else {
          // Invalid membership, clear the organization
          setCurrentOrganizationId(null);
          localStorage.removeItem("currentOrganizationId");
          console.warn(
            "User is not an active member of the stored organization",
          );
        }
      } catch (error) {
        console.error("Error validating organization membership:", error);
        setCurrentOrganizationId(null);
        localStorage.removeItem("currentOrganizationId");
      }

      setValidating(false);
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
      value={{ currentOrganizationId, setCurrentOrganizationId, validating }}
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
