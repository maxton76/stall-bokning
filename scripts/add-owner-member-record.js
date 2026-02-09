/**
 * Script to add missing organization owner member record
 *
 * Copies existing member record and creates owner's member record
 *
 * Usage: node scripts/add-owner-member-record.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../packages/api/service-account-dev.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'equiduty-dev',
});

const db = admin.firestore();

async function addOwnerMemberRecord() {
  console.log('🔍 Starting to add owner member record...\n');

  // Source member record to copy
  const sourceMemberId = '6OGq7VUDlYdV9bpLpJyKw7PjK3D3_l7889CZl2QPKmKJBPb8L';

  // New owner member record details
  const ownerUserId = 'Lo75bvHKLVVhFAQdecgJXOt9fmu2';
  const organizationId = 'l7889CZl2QPKmKJBPb8L';
  const ownerMemberId = `${ownerUserId}_${organizationId}`;
  const ownerEmail = 'maxkrax@gmail.com';

  try {
    // Step 1: Read source member record
    console.log(`📖 Reading source member record: ${sourceMemberId}`);
    const sourceDoc = await db.collection('organizationMembers').doc(sourceMemberId).get();

    if (!sourceDoc.exists) {
      console.error(`❌ Source member record not found: ${sourceMemberId}`);
      process.exit(1);
    }

    const sourceData = sourceDoc.data();
    console.log('✅ Source member record found:', {
      userId: sourceData.userId,
      email: sourceData.userEmail,
      firstName: sourceData.firstName,
      lastName: sourceData.lastName,
      roles: sourceData.roles,
    });

    // Step 2: Check if owner member record already exists
    console.log(`\n🔍 Checking if owner member record already exists: ${ownerMemberId}`);
    const ownerDoc = await db.collection('organizationMembers').doc(ownerMemberId).get();

    if (ownerDoc.exists) {
      console.log('⚠️  Owner member record already exists!');
      console.log('Current data:', ownerDoc.data());

      const answer = await new Promise((resolve) => {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        readline.question('\nDo you want to overwrite it? (yes/no): ', (answer) => {
          readline.close();
          resolve(answer.toLowerCase());
        });
      });

      if (answer !== 'yes') {
        console.log('❌ Aborted by user');
        process.exit(0);
      }
    }

    // Step 3: Create new owner member record
    console.log(`\n📝 Creating owner member record: ${ownerMemberId}`);

    // Copy source data and update userId and email
    const ownerData = {
      ...sourceData,
      userId: ownerUserId,
      userEmail: ownerEmail,
      // Keep all other fields from source (firstName, lastName, roles, etc.)
    };

    // Show what will be created
    console.log('\n📋 New owner member record data:', {
      id: ownerMemberId,
      userId: ownerData.userId,
      email: ownerData.userEmail,
      firstName: ownerData.firstName,
      lastName: ownerData.lastName,
      organizationId: ownerData.organizationId,
      roles: ownerData.roles,
      stableAccess: ownerData.stableAccess,
      assignedStableIds: ownerData.assignedStableIds,
      showInPlanning: ownerData.showInPlanning,
      status: ownerData.status,
    });

    // Confirm before creating
    const confirmAnswer = await new Promise((resolve) => {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      readline.question('\nCreate this member record? (yes/no): ', (answer) => {
        readline.close();
        resolve(answer.toLowerCase());
      });
    });

    if (confirmAnswer !== 'yes') {
      console.log('❌ Aborted by user');
      process.exit(0);
    }

    // Create the document
    await db.collection('organizationMembers').doc(ownerMemberId).set(ownerData);

    console.log('\n✅ Owner member record created successfully!');
    console.log(`   Document ID: ${ownerMemberId}`);
    console.log(`   User ID: ${ownerUserId}`);
    console.log(`   Email: ${ownerEmail}`);

    // Step 4: Verify the record was created
    console.log('\n🔍 Verifying creation...');
    const verifyDoc = await db.collection('organizationMembers').doc(ownerMemberId).get();

    if (verifyDoc.exists) {
      console.log('✅ Verification successful!');
      console.log('Created record:', verifyDoc.data());
    } else {
      console.error('❌ Verification failed - document not found after creation');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }

  console.log('\n✨ Done!');
  process.exit(0);
}

// Run the script
addOwnerMemberRecord();
