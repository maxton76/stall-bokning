#!/usr/bin/env tsx
/**
 * Create an admin user in Firebase Auth Emulator
 * Usage: tsx scripts/create-admin.ts [email] [password]
 */

import { initializeApp, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

// Get email and password from command line args
const email = process.argv[2] || 'maxkrax@gmail.com'
const password = process.argv[3] || 'admin123'

// Set emulator host for local development
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:5099'

console.log(`🔧 Using Auth Emulator: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`)
console.log('')

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp({
    projectId: 'stall-bokning-dev'
  })
}

const auth = getAuth()

async function createAdminUser() {
  try {
    console.log('🔧 Creating admin user...')
    console.log(`📧 Email: ${email}`)
    console.log(`🔑 Password: ${password}`)
    console.log('')

    // Check if user already exists
    let user
    try {
      user = await auth.getUserByEmail(email)
      console.log('ℹ️  User already exists, updating to admin role...')
    } catch (error) {
      // User doesn't exist, create it
      console.log('➕ Creating new user...')
      user = await auth.createUser({
        email: email,
        password: password,
        emailVerified: true,
        displayName: 'Admin User'
      })
      console.log(`✅ User created with UID: ${user.uid}`)
    }

    // Set custom claims to make user an admin
    await auth.setCustomUserClaims(user.uid, {
      role: 'admin',
      permissions: ['read', 'write', 'delete', 'manage_users']
    })

    console.log('✅ Admin role assigned successfully!')
    console.log('')
    console.log('📝 User Details:')
    console.log(`   UID:          ${user.uid}`)
    console.log(`   Email:        ${user.email}`)
    console.log(`   Role:         admin`)
    console.log(`   Verified:     ${user.emailVerified}`)
    console.log('')
    console.log('🎉 Admin user is ready!')
    console.log('')
    console.log('🔗 Login at: http://localhost:5173/login')
    console.log(`   Email:    ${email}`)
    console.log(`   Password: ${password}`)
    console.log('')
    console.log('🌐 View in Firebase Emulator UI: http://localhost:5444/auth')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    process.exit(1)
  }
}

createAdminUser()
