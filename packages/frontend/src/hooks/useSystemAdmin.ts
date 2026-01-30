import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

interface UseSystemAdminReturn {
  isSystemAdmin: boolean;
  loading: boolean;
}

/**
 * Hook to check if the current user has system_admin role
 * Checks both the AppUser systemRole and Firestore user document
 */
export function useSystemAdmin(): UseSystemAdminReturn {
  const { user, loading: authLoading } = useAuth();
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsSystemAdmin(false);
      setLoading(false);
      return;
    }

    // Quick check from cached profile
    if (user.systemRole === "system_admin") {
      setIsSystemAdmin(true);
      setLoading(false);
      return;
    }

    // Fallback: check Firestore directly
    async function checkFirestore() {
      try {
        const userDoc = await getDoc(doc(db, "users", user!.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setIsSystemAdmin(data?.systemRole === "system_admin");
        } else {
          setIsSystemAdmin(false);
        }
      } catch {
        setIsSystemAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkFirestore();
  }, [user, authLoading]);

  return { isSystemAdmin, loading };
}
