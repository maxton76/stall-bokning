import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// IMPORTANT: Set emulator host BEFORE importing firebase-admin
if (process.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:5081'
  console.log('🔧 Connecting to emulator at localhost:5081\n')
}

import admin from 'firebase-admin'

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'stall-bokning-dev'
admin.initializeApp({ projectId })
const db = admin.firestore()

async function checkStableMember() {
  const userId = 'gasnIeYqVpLCtBGi1ESXt37zPtJz'

  console.log(`🔍 Checking stableMember documents for user: ${userId}\n`)

  try {
    const membersSnap = await db
      .collection('stableMembers')
      .where('userId', '==', userId)
      .get()

    console.log(`Found ${membersSnap.size} stableMember documents\n`)

    if (membersSnap.size > 0) {
      membersSnap.docs.forEach(doc => {
        const data = doc.data()
        console.log(`Document ID: ${doc.id}`)
        console.log(`Data:`, JSON.stringify(data, null, 2))
        console.log(`\nStatus field value: "${data.status}"`)
        console.log(`Status field type: ${typeof data.status}`)
        console.log(`Has status field: ${data.hasOwnProperty('status')}`)
        console.log('')
      })
    }
  } catch (error) {
    console.log('❌ Error:', error)
  }
}

checkStableMember().then(() => process.exit(0))
