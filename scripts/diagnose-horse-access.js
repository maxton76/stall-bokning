#!/usr/bin/env node

/**
 * Diagnostic script to check horse access permissions
 * Usage: node scripts/diagnose-horse-access.js <horseId> <userId>
 */

const admin = require('firebase-admin');

// Get command line arguments
const [,, horseId, userId] = process.argv;

if (!horseId || !userId) {
  console.error('❌ Usage: node scripts/diagnose-horse-access.js <horseId> <userId>');
  process.exit(1);
}

// Initialize Firebase Admin
const projectId = process.env.FIREBASE_PROJECT_ID || 'equiduty-prod';
admin.initializeApp({
  projectId,
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

async function diagnoseAccess() {
  console.log('\n🔍 Diagnosing horse access...\n');
  console.log(`Horse ID: ${horseId}`);
  console.log(`User ID: ${userId}\n`);

  try {
    // Get user
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.error('❌ User not found');
      return;
    }
    const user = userDoc.data();
    console.log(`✅ User found: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`   System Role: ${user.systemRole || 'none'}\n`);

    // Get horse
    const horseDoc = await db.collection('horses').doc(horseId).get();
    if (!horseDoc.exists) {
      console.error('❌ Horse not found');
      return;
    }
    const horse = horseDoc.data();
    console.log(`✅ Horse found: ${horse.name}`);
    console.log(`   Owner ID: ${horse.ownerId}`);
    console.log(`   Current Stable ID: ${horse.currentStableId || 'none'}\n`);

    // Check 1: System Admin
    if (user.systemRole === 'system_admin') {
      console.log('✅ ACCESS GRANTED: User is system admin\n');
      return;
    }

    // Check 2: Horse Owner
    if (horse.ownerId === userId) {
      console.log('✅ ACCESS GRANTED: User is horse owner\n');
      return;
    }
    console.log('❌ User is NOT horse owner\n');

    // Check 3: Stable Access
    if (!horse.currentStableId) {
      console.error('❌ ACCESS DENIED: Horse not assigned to any stable\n');
      return;
    }

    const stableDoc = await db.collection('stables').doc(horse.currentStableId).get();
    if (!stableDoc.exists) {
      console.error('❌ Stable not found\n');
      return;
    }
    const stable = stableDoc.data();
    console.log(`📍 Horse assigned to stable: ${stable.name}`);
    console.log(`   Stable Owner ID: ${stable.ownerId}`);
    console.log(`   Organization ID: ${stable.organizationId || 'none'}\n`);

    // Check 3a: Stable Owner
    if (stable.ownerId === userId) {
      console.log('✅ ACCESS GRANTED: User is stable owner\n');
      return;
    }
    console.log('❌ User is NOT stable owner\n');

    // Check 3b: Organization Member
    if (!stable.organizationId) {
      console.error('❌ ACCESS DENIED: Stable has no organization\n');
      return;
    }

    const memberId = `${userId}_${stable.organizationId}`;
    const memberDoc = await db.collection('organizationMembers').doc(memberId).get();
    if (!memberDoc.exists) {
      console.error('❌ ACCESS DENIED: User is not a member of the organization\n');
      return;
    }

    const member = memberDoc.data();
    console.log(`📋 Organization membership found:`);
    console.log(`   Status: ${member.status}`);
    console.log(`   Primary Role: ${member.primaryRole}`);
    console.log(`   Stable Access: ${member.stableAccess}`);
    if (member.stableAccess === 'specific') {
      console.log(`   Assigned Stable IDs: ${JSON.stringify(member.assignedStableIds || [])}`);
    }
    console.log();

    // Check membership conditions
    if (member.status !== 'active') {
      console.error(`❌ ACCESS DENIED: Membership status is '${member.status}' (not active)\n`);
      return;
    }

    if (member.stableAccess === 'all') {
      console.log('✅ ACCESS GRANTED: User has access to all stables in organization\n');
      return;
    }

    if (member.stableAccess === 'specific') {
      if (member.assignedStableIds && member.assignedStableIds.includes(horse.currentStableId)) {
        console.log('✅ ACCESS GRANTED: User has specific access to this stable\n');
        return;
      } else {
        console.error('❌ ACCESS DENIED: Stable not in user\'s assigned stable list\n');
        return;
      }
    }

    console.error('❌ ACCESS DENIED: Unknown reason\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

diagnoseAccess().then(() => process.exit(0));
