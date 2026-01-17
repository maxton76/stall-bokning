/**
 * Migration Script: Contacts and Members Integration
 *
 * This script performs the following migration tasks:
 * 1. Add default values to existing contacts (source: 'manual', hasLoginAccess: false)
 * 2. Link existing members to contacts by email match
 * 3. Add ownershipType: 'member' to existing horses with valid ownerId
 *
 * Run with: npx tsx src/scripts/migrateContactsAndMembers.ts
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as path from "path";
import * as fs from "fs";

// Initialize Firebase Admin
function initializeFirebase() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  // Try to find service account file
  const possiblePaths = [
    path.join(process.cwd(), "service-account-dev.json"),
    path.join(process.cwd(), "service-account.json"),
    path.join(process.cwd(), "..", "..", "service-account-dev.json"),
  ];

  let serviceAccountPath: string | undefined;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      serviceAccountPath = p;
      break;
    }
  }

  if (!serviceAccountPath) {
    throw new Error(
      "Service account file not found. Please ensure service-account-dev.json exists.",
    );
  }

  const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, "utf8"),
  );

  initializeApp({
    credential: cert(serviceAccount),
  });

  return getFirestore();
}

const db = initializeFirebase();

interface MigrationStats {
  contactsUpdated: number;
  contactsSkipped: number;
  membersLinked: number;
  horsesUpdated: number;
  errors: string[];
}

/**
 * Migrate contacts: Add default values for new fields
 */
async function migrateContacts(stats: MigrationStats) {
  console.log("\n📇 Migrating contacts...");

  const contactsSnapshot = await db.collection("contacts").get();
  console.log(`Found ${contactsSnapshot.size} contacts to check`);

  const batch = db.batch();
  let batchCount = 0;
  const maxBatchSize = 500;

  for (const doc of contactsSnapshot.docs) {
    const contact = doc.data();

    // Skip if already has the new fields
    if (contact.source !== undefined && contact.hasLoginAccess !== undefined) {
      stats.contactsSkipped++;
      continue;
    }

    // Add default values for new fields
    const updates: Record<string, any> = {};

    if (contact.source === undefined) {
      updates.source = "manual";
    }

    if (contact.hasLoginAccess === undefined) {
      updates.hasLoginAccess = false;
    }

    if (contact.badge === undefined) {
      updates.badge = "external";
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = Timestamp.now();
      batch.update(doc.ref, updates);
      batchCount++;
      stats.contactsUpdated++;

      // Commit batch if reaching limit
      if (batchCount >= maxBatchSize) {
        await batch.commit();
        console.log(`  Committed batch of ${batchCount} contacts`);
        batchCount = 0;
      }
    }
  }

  // Commit remaining
  if (batchCount > 0) {
    await batch.commit();
    console.log(`  Committed final batch of ${batchCount} contacts`);
  }

  console.log(
    `✅ Contacts migration complete: ${stats.contactsUpdated} updated, ${stats.contactsSkipped} skipped`,
  );
}

/**
 * Link existing members to contacts by email match
 */
async function linkMembersToContacts(stats: MigrationStats) {
  console.log("\n🔗 Linking members to contacts...");

  const membersSnapshot = await db.collection("organizationMembers").get();
  console.log(`Found ${membersSnapshot.size} members to check`);

  for (const memberDoc of membersSnapshot.docs) {
    const member = memberDoc.data();

    if (!member.userEmail || !member.organizationId) {
      continue;
    }

    try {
      // Find contact with matching email in the same organization
      const contactsSnapshot = await db
        .collection("contacts")
        .where("organizationId", "==", member.organizationId)
        .where("email", "==", member.userEmail.toLowerCase())
        .limit(1)
        .get();

      if (contactsSnapshot.empty) {
        continue;
      }

      const contactDoc = contactsSnapshot.docs[0];
      const contact = contactDoc.data();

      // Skip if already linked
      if (contact.linkedMemberId === memberDoc.id) {
        continue;
      }

      // Update contact with member link
      await contactDoc.ref.update({
        linkedMemberId: memberDoc.id,
        linkedUserId: member.userId,
        badge: "member",
        hasLoginAccess: member.status === "active",
        updatedAt: Timestamp.now(),
      });

      stats.membersLinked++;
    } catch (error) {
      stats.errors.push(`Failed to link member ${memberDoc.id}: ${error}`);
    }
  }

  console.log(`✅ Member linking complete: ${stats.membersLinked} linked`);
}

/**
 * Update horses with default ownershipType
 */
async function migrateHorses(stats: MigrationStats) {
  console.log("\n🐴 Migrating horses...");

  const horsesSnapshot = await db.collection("horses").get();
  console.log(`Found ${horsesSnapshot.size} horses to check`);

  const batch = db.batch();
  let batchCount = 0;
  const maxBatchSize = 500;

  for (const doc of horsesSnapshot.docs) {
    const horse = doc.data();

    // Skip if already has ownershipType
    if (horse.ownershipType !== undefined) {
      continue;
    }

    // Set default ownershipType based on existing data
    let ownershipType = "member";

    // If the horse has an ownerId, it's owned by a member
    // This is the default case for existing horses
    if (horse.ownerId) {
      ownershipType = "member";
    }

    batch.update(doc.ref, {
      ownershipType,
      updatedAt: Timestamp.now(),
    });

    batchCount++;
    stats.horsesUpdated++;

    if (batchCount >= maxBatchSize) {
      await batch.commit();
      console.log(`  Committed batch of ${batchCount} horses`);
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`  Committed final batch of ${batchCount} horses`);
  }

  console.log(`✅ Horses migration complete: ${stats.horsesUpdated} updated`);
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log(
    "═══════════════════════════════════════════════════════════════",
  );
  console.log("    Contacts and Members Integration Migration");
  console.log(
    "═══════════════════════════════════════════════════════════════",
  );
  console.log(`Started at: ${new Date().toISOString()}`);

  const stats: MigrationStats = {
    contactsUpdated: 0,
    contactsSkipped: 0,
    membersLinked: 0,
    horsesUpdated: 0,
    errors: [],
  };

  try {
    await migrateContacts(stats);
    await linkMembersToContacts(stats);
    await migrateHorses(stats);

    console.log(
      "\n═══════════════════════════════════════════════════════════════",
    );
    console.log("    Migration Summary");
    console.log(
      "═══════════════════════════════════════════════════════════════",
    );
    console.log(`Contacts updated:  ${stats.contactsUpdated}`);
    console.log(`Contacts skipped:  ${stats.contactsSkipped}`);
    console.log(`Members linked:    ${stats.membersLinked}`);
    console.log(`Horses updated:    ${stats.horsesUpdated}`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors (${stats.errors.length}):`);
      stats.errors.forEach((err) => console.log(`  - ${err}`));
    }

    console.log(`\nCompleted at: ${new Date().toISOString()}`);
    console.log(
      "═══════════════════════════════════════════════════════════════",
    );
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log("\n✅ Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration error:", error);
    process.exit(1);
  });
