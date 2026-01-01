import type { FastifyInstance } from 'fastify'
import { db } from '../utils/firebase.js'
import { authenticate } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../types/index.js'
import { getInviteByToken, acceptInvite, declineInvite } from '../services/inviteService.js'

export default async function inviteRoutes(fastify: FastifyInstance) {

  // GET /api/v1/invites/:token - Get invite details (public endpoint)
  fastify.get('/:token', async (request, reply) => {
    try {
      const { token } = request.params as { token: string }

      const invite = await getInviteByToken(token)

      if (!invite) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Invite not found or expired'
        })
      }

      // Return public invite information (don't expose sensitive data)
      return reply.send({
        organizationName: invite.organizationName,
        inviterName: invite.inviterName,
        roles: invite.roles,
        expiresAt: invite.expiresAt
      })
    } catch (error) {
      request.log.error({ error }, 'Failed to get invite details')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get invite details'
      })
    }
  })

  // POST /api/v1/invites/:token/accept - Accept invite (requires authentication)
  fastify.post('/:token/accept', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { token } = request.params as { token: string }
      const user = (request as AuthenticatedRequest).user!

      const invite = await getInviteByToken(token)

      if (!invite) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Invite not found or expired'
        })
      }

      // Verify email matches (security check)
      if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'This invite was sent to a different email address'
        })
      }

      // Accept the invite
      await acceptInvite(invite.id, user.uid)

      return reply.send({
        message: 'Invite accepted successfully',
        organizationId: invite.organizationId
      })
    } catch (error) {
      request.log.error({ error }, 'Failed to accept invite')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to accept invite'
      })
    }
  })

  // POST /api/v1/invites/:token/decline - Decline invite (public endpoint)
  fastify.post('/:token/decline', async (request, reply) => {
    try {
      const { token } = request.params as { token: string }

      const invite = await getInviteByToken(token)

      if (!invite) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Invite not found or expired'
        })
      }

      // Decline the invite
      await declineInvite(invite.id)

      return reply.send({
        message: 'Invite declined successfully'
      })
    } catch (error) {
      request.log.error({ error }, 'Failed to decline invite')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to decline invite'
      })
    }
  })

  // GET /api/v1/invites/pending - Get user's pending invites (requires authentication)
  fastify.get('/pending', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const user = (request as AuthenticatedRequest).user!

      // Get pending invites for this user's email
      const inviteSnapshot = await db.collection('invites')
        .where('email', '==', user.email?.toLowerCase())
        .where('status', '==', 'pending')
        .get()

      // Get pending organizationMembers (existing user invites)
      const memberSnapshot = await db.collection('organizationMembers')
        .where('userId', '==', user.uid)
        .where('status', '==', 'pending')
        .get()

      const invites = inviteSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      const pendingMemberships = memberSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      return reply.send({
        invites,
        pendingMemberships
      })
    } catch (error) {
      request.log.error({ error }, 'Failed to get pending invites')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get pending invites'
      })
    }
  })
}
