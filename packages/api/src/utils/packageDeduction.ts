import { Timestamp } from "firebase-admin/firestore";
import { db } from "./firebase.js";

/**
 * Attempt to deduct from a member's active prepaid package (klippkort).
 *
 * Checks if the member (or any member in their billing group if package is transferable)
 * has an active package covering the given chargeable item.
 *
 * @returns The deduction record if successful, null if no active package found
 */
export async function deductFromPackage(
  memberId: string,
  chargeableItemId: string,
  organizationId: string,
  lineItemId: string,
  deductedBy: string,
): Promise<{
  deductionId: string;
  memberPackageId: string;
  remainingUnits: number;
} | null> {
  // Step 1: Find active packages for this member and chargeable item
  // Check direct packages first
  const packageQuery = db
    .collection("memberPackages")
    .where("organizationId", "==", organizationId)
    .where("memberId", "==", memberId)
    .where("status", "==", "active");

  const packageSnapshot = await packageQuery.get();

  // Filter to packages that cover this chargeable item
  // We need to look up the package definition to check chargeableItemId
  let matchingPackage: FirebaseFirestore.DocumentSnapshot | null = null;

  for (const doc of packageSnapshot.docs) {
    const pkg = doc.data();
    const defDoc = await db
      .collection("packageDefinitions")
      .doc(pkg.packageDefinitionId)
      .get();
    if (defDoc.exists && defDoc.data()!.chargeableItemId === chargeableItemId) {
      // Check expiry
      if (pkg.expiresAt && pkg.expiresAt.toDate() < new Date()) {
        continue; // Skip expired
      }
      if (pkg.remainingUnits > 0) {
        matchingPackage = doc;
        break;
      }
    }
  }

  // Step 2: If no direct package, check billing group transferable packages
  if (!matchingPackage) {
    // Find billing groups this member belongs to
    const groupSnapshot = await db
      .collection("billingGroups")
      .where("organizationId", "==", organizationId)
      .where("memberIds", "array-contains", memberId)
      .get();

    for (const groupDoc of groupSnapshot.docs) {
      // Find transferable packages owned by billing group
      const groupPackageSnapshot = await db
        .collection("memberPackages")
        .where("organizationId", "==", organizationId)
        .where("billingGroupId", "==", groupDoc.id)
        .where("status", "==", "active")
        .get();

      for (const pkgDoc of groupPackageSnapshot.docs) {
        const pkg = pkgDoc.data();
        const defDoc = await db
          .collection("packageDefinitions")
          .doc(pkg.packageDefinitionId)
          .get();
        if (defDoc.exists) {
          const def = defDoc.data()!;
          if (
            def.chargeableItemId === chargeableItemId &&
            def.transferableWithinGroup
          ) {
            if (pkg.expiresAt && pkg.expiresAt.toDate() < new Date()) continue;
            if (pkg.remainingUnits > 0) {
              matchingPackage = pkgDoc;
              break;
            }
          }
        }
      }
      if (matchingPackage) break;
    }
  }

  if (!matchingPackage) {
    return null; // No active package found -- caller creates billable line item
  }

  // Step 3: Deduct using a transaction to prevent race conditions
  const packageRef = matchingPackage.ref;

  return await db.runTransaction(async (transaction) => {
    const freshDoc = await transaction.get(packageRef);
    if (!freshDoc.exists) return null;

    const pkg = freshDoc.data()!;
    if (pkg.remainingUnits <= 0 || pkg.status !== "active") return null;

    const newRemaining = pkg.remainingUnits - 1;
    const updates: Record<string, unknown> = {
      remainingUnits: newRemaining,
      updatedAt: Timestamp.now(),
    };

    if (newRemaining === 0) {
      updates.status = "depleted";
    }

    transaction.update(packageRef, updates);

    // Create deduction record
    const deductionData = {
      organizationId,
      memberPackageId: freshDoc.id,
      lineItemId,
      units: 1,
      deductedAt: Timestamp.now(),
      deductedBy,
    };

    const deductionRef = db.collection("packageDeductions").doc();
    transaction.set(deductionRef, deductionData);

    return {
      deductionId: deductionRef.id,
      memberPackageId: freshDoc.id,
      remainingUnits: newRemaining,
    };
  });
}
