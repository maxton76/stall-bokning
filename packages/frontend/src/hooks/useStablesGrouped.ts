import { useEffect } from "react";
import { useAsyncData } from "@/hooks/useAsyncData";
import {
  getUserOwnedStables,
  getUserOrganizationMemberships,
  getOrganizationStables,
} from "@/lib/firestoreQueries";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface StableListItem {
  id: string;
  name: string;
  role: "owner" | "manager" | "member";
  icon: "crown" | "shield" | "users";
}

interface UseStablesGroupedResult {
  myStables: StableListItem[];
  managedStables: StableListItem[];
  loading: boolean;
  refresh: () => void;
}

interface GroupedStables {
  myStables: StableListItem[];
  managedStables: StableListItem[];
}

/**
 * Hook to load and group user's stables by role
 * - myStables: stables where user is a member
 * - managedStables: stables where user is owner or manager/administrator
 *
 * Uses organization membership with stableAccess for determining accessible stables
 */
export function useStablesGrouped(
  userId: string | undefined,
): UseStablesGroupedResult {
  const stablesData = useAsyncData<GroupedStables>({
    loadFn: async () => {
      if (!userId) {
        return { myStables: [], managedStables: [] };
      }

      const [ownedSnapshot, memberSnapshot] = await Promise.all([
        getUserOwnedStables(userId),
        getUserOrganizationMemberships(userId),
      ]);

      // Process owned stables
      const owned: StableListItem[] = ownedSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        name: docSnap.data().name,
        role: "owner" as const,
        icon: "crown" as const,
      }));

      // Process member stables from organization memberships
      const memberStables: StableListItem[] = [];
      const ownedIds = new Set(owned.map((s) => s.id));

      for (const memberDoc of memberSnapshot.docs) {
        const data = memberDoc.data();
        const isManager =
          data.roles?.includes("administrator") ||
          data.roles?.includes("manager");

        let stableIds: string[] = [];

        if (data.stableAccess === "all" && data.organizationId) {
          // Get all stables in this organization
          const orgStables = await getOrganizationStables(data.organizationId);
          stableIds = orgStables.docs.map((s) => s.id);
        } else if (data.stableAccess === "specific") {
          stableIds = data.assignedStableIds || [];
        }

        // Get stable details for each stable
        for (const stableId of stableIds) {
          // Skip if already in owned list
          if (ownedIds.has(stableId)) continue;

          const stableDoc = await getDoc(doc(db, "stables", stableId));
          if (stableDoc.exists()) {
            const stableData = stableDoc.data();
            memberStables.push({
              id: stableId,
              name: stableData.name || "Unknown Stable",
              role: isManager ? "manager" : "member",
              icon: isManager ? "shield" : "users",
            });
          }
        }
      }

      // Deduplicate member stables (in case user has multiple org memberships)
      const uniqueMemberStables = Array.from(
        new Map(memberStables.map((s) => [s.id, s])).values(),
      );

      // Group by role
      return {
        myStables: uniqueMemberStables.filter((m) => m.role === "member"),
        managedStables: [
          ...owned,
          ...uniqueMemberStables.filter((m) => m.role === "manager"),
        ],
      };
    },
    errorMessage: "Failed to load stables",
  });

  useEffect(() => {
    stablesData.load();
  }, [userId]);

  return {
    myStables: stablesData.data?.myStables || [],
    managedStables: stablesData.data?.managedStables || [],
    loading: stablesData.loading,
    refresh: stablesData.reload,
  };
}
