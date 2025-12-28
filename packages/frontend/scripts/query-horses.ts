import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// IMPORTANT: Set emulator host BEFORE importing firebase-admin
if (process.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:5081'
  console.log('🔧 Connecting to emulator at localhost:5081')
}

import admin from 'firebase-admin'

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'stall-bokning-dev'
admin.initializeApp({ projectId })
const db = admin.firestore()

async function queryHorses() {
  console.log('🔍 Querying for horses collection...\n')

  try {
    const horsesSnap = await db.collection('horses').get()
    console.log(`Found ${horsesSnap.size} horses\n`)

    if (horsesSnap.size > 0) {
      horsesSnap.docs.forEach(doc => {
        console.log(`Horse ID: ${doc.id}`)
        console.log(`Data:`, doc.data())
        console.log('')
      })
    }
  } catch (error) {
    console.log('❌ horses collection not found or error:', error)
  }
}

queryHorses().then(() => process.exit(0))
