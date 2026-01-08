/**
 * Check all documents for the new user
 */

import dotenv from 'dotenv'
import admin from 'firebase-admin'

dotenv.config({ path: '.env.local' })

if (process.env.VITE_USE_FIREBASE_EMULATOR === 'true' || process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:5081'
  console.log('🔧 Connecting to Firestore Emulator at', process.env.FIRESTORE_EMULATOR_HOST)
}

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'stall-bokning-dev'

if (!admin.apps.length) {
  admin.initializeApp({ projectId })
}

const db = admin.firestore()
const auth = admin.auth()

async function checkUserDocs() {
  const orgId = 'GIlPalwerOdpy1dxouul'

  console.log('\n📋 Checking Organization:', orgId)
  console.log('='.repeat(60))

  // Get organization to find owner ID
  const orgDoc = await db.collection('organizations').doc(orgId).get()
  if (!orgDoc.exists) {
    console.log('❌ Organization not found')
    return
  }

  const orgData = orgDoc.data()
  const ownerId = orgData?.ownerId

  console.log('\n✅ Organization found')
  console.log('   Name:', orgData?.name)
  console.log('   Owner ID:', ownerId)
  console.log('   Stats:', orgData?.stats)

  if (!ownerId) {
    console.log('\n❌ No owner ID found')
    return
  }

  // Check user document in Firestore
  console.log('\n👤 Checking Firestore User Document:', ownerId)
  const userDoc = await db.collection('users').doc(ownerId).get()
  if (userDoc.exists) {
    console.log('   ✅ User document EXISTS in Firestore')
    const userData = userDoc.data()
    console.log('      Email:', userData?.email)
    console.log('      Name:', userData?.firstName, userData?.lastName)
    console.log('      System Role:', userData?.systemRole)
    console.log('      Created:', userData?.createdAt?.toDate())
  } else {
    console.log('   ❌ User document DOES NOT EXIST in Firestore')
    console.log('   🚨 THIS IS THE PROBLEM - Security rules need this!')
  }

  // Check Firebase Auth
  try {
    const authUser = await auth.getUser(ownerId)
    console.log('\n🔐 Firebase Auth user EXISTS')
    console.log('      Email:', authUser.email)
    console.log('      Display Name:', authUser.displayName)
    console.log('      Created:', authUser.metadata.creationTime)
  } catch (error) {
    console.log('\n   ❌ Firebase Auth user DOES NOT EXIST')
  }

  // Check organization member
  const memberId = `${ownerId}_${orgId}`
  console.log('\n👥 Checking Organization Member:', memberId)
  const memberDoc = await db.collection('organizationMembers').doc(memberId).get()
  if (memberDoc.exists) {
    console.log('   ✅ Organization member document EXISTS')
    const memberData = memberDoc.data()
    console.log('      Roles:', memberData?.roles)
    console.log('      Status:', memberData?.status)
    console.log('      Primary Role:', memberData?.primaryRole)
  } else {
    console.log('   ❌ Organization member document DOES NOT EXIST')
    console.log('   🚨 THIS IS ALSO A PROBLEM!')
  }

  console.log('\n' + '='.repeat(60))
  console.log('Summary:')
  console.log('  Organization:', orgDoc.exists ? '✅' : '❌')
  console.log('  User Document:', userDoc.exists ? '✅' : '❌')
  console.log('  Organization Member:', memberDoc.exists ? '✅' : '❌')
}

checkUserDocs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n💥 Error:', error)
    process.exit(1)
  })
