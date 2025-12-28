import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../utils/firebase.js'
import { authenticate, requireRole, requireStableAccess } from '../middleware/auth.js'
import type { AuthenticatedRequest, Stable } from '../types/index.js'

const createStableSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1),
  capacity: z.number().int().positive(),
  availableStalls: z.number().int().min(0),
  pricePerMonth: z.number().positive(),
  amenities: z.array(z.string()).default([])
})

const updateStableSchema = createStableSchema.partial()

export async function stablesRoutes(fastify: FastifyInstance) {
  // Get all stables (public)
  fastify.get('/', async (request, reply) => {
    try {
      const snapshot = await db.collection('stables').get()
      const stables = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      return { stables }
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch stables')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch stables'
      })
    }
  })

  // Get single stable (requires authentication and membership)
  fastify.get('/:id', {
    preHandler: [authenticate, requireStableAccess()]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const doc = await db.collection('stables').doc(id).get()

      if (!doc.exists) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Stable not found'
        })
      }

      return {
        id: doc.id,
        ...doc.data()
      }
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch stable')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch stable'
      })
    }
  })

  // Create stable (requires authentication and stable_owner or system_admin role)
  fastify.post('/', {
    preHandler: [authenticate, requireRole(['stable_owner', 'system_admin'])]
  }, async (request, reply) => {
    try {
      const validation = createStableSchema.safeParse(request.body)

      if (!validation.success) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Invalid input',
          details: validation.error.errors
        })
      }

      const user = (request as AuthenticatedRequest).user!
      const stableData: Stable = {
        ...validation.data,
        ownerId: user.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const docRef = await db.collection('stables').add(stableData)
      const doc = await docRef.get()

      return reply.status(201).send({
        id: doc.id,
        ...doc.data()
      })
    } catch (error) {
      request.log.error({ error }, 'Failed to create stable')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create stable'
      })
    }
  })

  // Update stable (requires authentication and ownership or admin)
  fastify.patch('/:id', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const validation = updateStableSchema.safeParse(request.body)

      if (!validation.success) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Invalid input',
          details: validation.error.errors
        })
      }

      const user = (request as AuthenticatedRequest).user!
      const docRef = db.collection('stables').doc(id)
      const doc = await docRef.get()

      if (!doc.exists) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Stable not found'
        })
      }

      const stable = doc.data() as Stable

      // Check ownership or system_admin role
      if (stable.ownerId !== user.uid && user.role !== 'system_admin') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have permission to update this stable'
        })
      }

      const updateData = {
        ...validation.data,
        updatedAt: new Date()
      }

      await docRef.update(updateData)
      const updatedDoc = await docRef.get()

      return {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    } catch (error) {
      request.log.error({ error }, 'Failed to update stable')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update stable'
      })
    }
  })

  // Delete stable (requires authentication and ownership or admin)
  fastify.delete('/:id', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const user = (request as AuthenticatedRequest).user!
      const docRef = db.collection('stables').doc(id)
      const doc = await docRef.get()

      if (!doc.exists) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Stable not found'
        })
      }

      const stable = doc.data() as Stable

      // Check ownership or system_admin role
      if (stable.ownerId !== user.uid && user.role !== 'system_admin') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have permission to delete this stable'
        })
      }

      await docRef.delete()

      return reply.status(204).send()
    } catch (error) {
      request.log.error({ error }, 'Failed to delete stable')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete stable'
      })
    }
  })
}
