/**
 * Utility to link orphaned stables (without organizationId) to their owner's organization.
 *
 * Run this from browser console:
 * 1. Import: import { linkOrphanedStablesToOrganizations } from '@/utils/linkStablesToOrganizations'
 * 2. Execute: await linkOrphanedStablesToOrganizations()
 *
 * Or call it from a component/page with a button.
 */

import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";

interface MigrationResult {
  stableId: string;
  stableName: string;
  ownerId: string;
  organizationId: string | null;
  status: "linked" | "no_org_found" | "error";
  error?: string;
}

/**
 * Find stables without organizationId and link them to the owner's organization
 */
export async function linkOrphanedStablesToOrganizations(): Promise<{
  total: number;
  linked: number;
  noOrgFound: number;
  errors: number;
  results: MigrationResult[];
}> {
  console.log("🔍 Finding stables without organizationId...");

  // Find all stables without organizationId
  const stablesQuery = query(collection(db, "stables"));
  const stablesSnapshot = await getDocs(stablesQuery);

  const orphanedStables = stablesSnapshot.docs.filter((doc) => {
    const data = doc.data();
    return !data.organizationId;
  });

  console.log(
    `📋 Found ${orphanedStables.length} stables without organizationId`,
  );

  const results: MigrationResult[] = [];
  let linked = 0;
  let noOrgFound = 0;
  let errors = 0;

  for (const stableDoc of orphanedStables) {
    const stableData = stableDoc.data();
    const stableId = stableDoc.id;
    const stableName = stableData.name || "Unknown";
    const ownerId = stableData.ownerId;

    console.log(`\n🏛️ Processing stable: ${stableName} (${stableId})`);
    console.log(`   Owner: ${ownerId}`);

    if (!ownerId) {
      console.log(`   ⚠️ No ownerId found, skipping`);
      results.push({
        stableId,
        stableName,
        ownerId: "",
        organizationId: null,
        status: "error",
        error: "No ownerId",
      });
      errors++;
      continue;
    }

    try {
      // Find the owner's organization membership
      const membershipsQuery = query(
        collection(db, "organizationMembers"),
        where("userId", "==", ownerId),
        where("status", "==", "active"),
      );
      const membershipsSnapshot = await getDocs(membershipsQuery);

      if (membershipsSnapshot.empty) {
        console.log(`   ⚠️ Owner has no active organization memberships`);
        results.push({
          stableId,
          stableName,
          ownerId,
          organizationId: null,
          status: "no_org_found",
        });
        noOrgFound++;
        continue;
      }

      // Use the first (or only) organization
      const organizationId = membershipsSnapshot.docs[0]!.data().organizationId;
      console.log(`   ✅ Found organization: ${organizationId}`);

      // Update the stable with organizationId
      await updateDoc(doc(db, "stables", stableId), {
        organizationId,
        updatedAt: Timestamp.now(),
      });

      console.log(`   ✅ Linked stable to organization`);
      results.push({
        stableId,
        stableName,
        ownerId,
        organizationId,
        status: "linked",
      });
      linked++;
    } catch (error) {
      console.error(`   ❌ Error processing stable:`, error);
      results.push({
        stableId,
        stableName,
        ownerId,
        organizationId: null,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      errors++;
    }
  }

  console.log("\n📊 Migration Summary:");
  console.log(`   Total orphaned stables: ${orphanedStables.length}`);
  console.log(`   Successfully linked: ${linked}`);
  console.log(`   No organization found: ${noOrgFound}`);
  console.log(`   Errors: ${errors}`);

  return {
    total: orphanedStables.length,
    linked,
    noOrgFound,
    errors,
    results,
  };
}

/**
 * Preview which stables would be affected without making changes
 */
export async function previewOrphanedStables(): Promise<
  Array<{
    stableId: string;
    stableName: string;
    ownerId: string;
    ownerOrganizations: string[];
  }>
> {
  console.log("🔍 Finding stables without organizationId (preview mode)...");

  const stablesQuery = query(collection(db, "stables"));
  const stablesSnapshot = await getDocs(stablesQuery);

  const orphanedStables = stablesSnapshot.docs.filter((doc) => {
    const data = doc.data();
    return !data.organizationId;
  });

  console.log(
    `📋 Found ${orphanedStables.length} stables without organizationId`,
  );

  const results = [];

  for (const stableDoc of orphanedStables) {
    const stableData = stableDoc.data();
    const stableId = stableDoc.id;
    const stableName = stableData.name || "Unknown";
    const ownerId = stableData.ownerId;

    let ownerOrganizations: string[] = [];

    if (ownerId) {
      const membershipsQuery = query(
        collection(db, "organizationMembers"),
        where("userId", "==", ownerId),
        where("status", "==", "active"),
      );
      const membershipsSnapshot = await getDocs(membershipsQuery);
      ownerOrganizations = membershipsSnapshot.docs.map(
        (doc) => doc.data().organizationId,
      );
    }

    results.push({
      stableId,
      stableName,
      ownerId: ownerId || "",
      ownerOrganizations,
    });

    console.log(`\n🏛️ ${stableName} (${stableId})`);
    console.log(`   Owner: ${ownerId || "none"}`);
    console.log(
      `   Owner's organizations: ${ownerOrganizations.join(", ") || "none"}`,
    );
  }

  return results;
}
