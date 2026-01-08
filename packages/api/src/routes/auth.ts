import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Timestamp } from 'firebase-admin/firestore'
import { db } from '../utils/firebase.js'
import { authenticate } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../types/index.js'
import { migrateInvitesOnSignup } from '../services/inviteService.js'

// Zod schema for user signup
const signupSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().optional(),
  systemRole: z.enum(['stable_owner', 'stable_user', 'service_provider']).default('stable_user')
})

export default async function authRoutes(fastify: FastifyInstance) {

  // POST /api/v1/auth/signup - Complete user registration
  // Note: Firebase Auth user should already be created on frontend
  // This endpoint creates the Firestore user document and migrates invites
  fastify.post('/signup', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const user = (request as AuthenticatedRequest).user!
      const validation = signupSchema.safeParse(request.body)

      if (!validation.success) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Invalid input',
          details: validation.error.errors
        })
      }

      const { email, firstName, lastName, phoneNumber, systemRole } = validation.data

      // Check if user document already exists
      const existingUserDoc = await db.collection('users').doc(user.uid).get()

      if (existingUserDoc.exists) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'User already registered'
        })
      }

      // Create user document in Firestore
      const userData = {
        email: email.toLowerCase(),
        firstName,
        lastName,
        phoneNumber,
        systemRole,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      await db.collection('users').doc(user.uid).set(userData)

      // NEW: Auto-create personal organization for user
      let organizationId: string | undefined
      try {
        const orgRef = await db.collection('organizations').add({
          name: `${firstName}'s Organization`,
          ownerId: user.uid,
          ownerEmail: email.toLowerCase(),
          subscriptionTier: 'free' as const,
          stats: {
            stableCount: 0,
            totalMemberCount: 1
          },
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        })
        organizationId = orgRef.id

        // Create organizationMember record for owner
        const memberId = `${user.uid}_${organizationId}`
        await db.collection('organizationMembers').doc(memberId).set({
          id: memberId,
          organizationId,
          userId: user.uid,
          userEmail: email.toLowerCase(),
          firstName,
          lastName,
          phoneNumber: phoneNumber || null,
          roles: ['administrator'],
          primaryRole: 'administrator',
          status: 'active',
          showInPlanning: true,
          stableAccess: 'all',
          assignedStableIds: [],
          joinedAt: Timestamp.now(),
          invitedBy: 'system',
          inviteAcceptedAt: Timestamp.now()
        })

        request.log.info({ userId: user.uid, organizationId }, 'Created personal organization on signup')
      } catch (orgError) {
        // Log error but don't fail signup
        request.log.error({ error: orgError, userId: user.uid }, 'Failed to create personal organization on signup')
      }

      // Auto-accept pending invites for this email
      try {
        await migrateInvitesOnSignup(user.uid, email)
        request.log.info({ userId: user.uid, email }, 'Migrated pending invites on signup')
      } catch (inviteError) {
        // Log error but don't fail signup
        request.log.error({ error: inviteError, userId: user.uid }, 'Failed to migrate invites on signup')
      }

      return reply.status(201).send({
        user: {
          id: user.uid,
          ...userData
        }
      })
    } catch (error) {
      request.log.error({ error }, 'Failed to complete signup')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to complete signup'
      })
    }
  })

  // GET /api/v1/auth/me - Get current user profile
  fastify.get('/me', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const user = (request as AuthenticatedRequest).user!

      const userDoc = await db.collection('users').doc(user.uid).get()

      if (!userDoc.exists) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'User profile not found'
        })
      }

      return reply.send({
        id: userDoc.id,
        ...userDoc.data()
      })
    } catch (error) {
      request.log.error({ error }, 'Failed to get user profile')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get user profile'
      })
    }
  })
}
