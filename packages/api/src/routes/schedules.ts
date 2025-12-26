import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../utils/firebase.js'
import { authenticate } from '../middleware/auth.js'
import type { AuthenticatedRequest, Schedule } from '../types/index.js'

const createScheduleSchema = z.object({
  stableId: z.string().min(1),
  stallNumber: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  pricePerMonth: z.number().positive()
})

const updateScheduleSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
})

export async function schedulesRoutes(fastify: FastifyInstance) {
  // Get all schedules for authenticated user
  fastify.get('/', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const user = (request as AuthenticatedRequest).user!

      const snapshot = await db
        .collection('schedules')
        .where('userId', '==', user.uid)
        .get()

      const schedules = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      return { schedules }
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch schedules')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch schedules'
      })
    }
  })

  // Get schedules for a specific stable
  fastify.get('/stable/:stableId', async (request, reply) => {
    try {
      const { stableId } = request.params as { stableId: string }

      const snapshot = await db
        .collection('schedules')
        .where('stableId', '==', stableId)
        .where('status', '==', 'confirmed')
        .get()

      const schedules = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      return { schedules }
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch stable schedules')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch stable schedules'
      })
    }
  })

  // Create new schedule
  fastify.post('/', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const validation = createScheduleSchema.safeParse(request.body)

      if (!validation.success) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Invalid input',
          details: validation.error.errors
        })
      }

      const user = (request as AuthenticatedRequest).user!

      // Check if stable exists
      const stableDoc = await db.collection('stables').doc(validation.data.stableId).get()
      if (!stableDoc.exists) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Stable not found'
        })
      }

      const scheduleData: Schedule = {
        ...validation.data,
        startDate: new Date(validation.data.startDate),
        endDate: new Date(validation.data.endDate),
        userId: user.uid,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const docRef = await db.collection('schedules').add(scheduleData)
      const doc = await docRef.get()

      return reply.status(201).send({
        id: doc.id,
        ...doc.data()
      })
    } catch (error) {
      request.log.error({ error }, 'Failed to create schedule')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create schedule'
      })
    }
  })

  // Update schedule
  fastify.patch('/:id', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const validation = updateScheduleSchema.safeParse(request.body)

      if (!validation.success) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Invalid input',
          details: validation.error.errors
        })
      }

      const user = (request as AuthenticatedRequest).user!
      const docRef = db.collection('schedules').doc(id)
      const doc = await docRef.get()

      if (!doc.exists) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Schedule not found'
        })
      }

      const schedule = doc.data() as Schedule

      // Check ownership
      if (schedule.userId !== user.uid && user.role !== 'admin') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have permission to update this schedule'
        })
      }

      const updateData: Partial<Schedule> & { updatedAt: Date } = {
        status: validation.data.status,
        updatedAt: new Date()
      }

      if (validation.data.startDate) {
        updateData.startDate = new Date(validation.data.startDate)
      }
      if (validation.data.endDate) {
        updateData.endDate = new Date(validation.data.endDate)
      }

      await docRef.update(updateData)
      const updatedDoc = await docRef.get()

      return {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    } catch (error) {
      request.log.error({ error }, 'Failed to update schedule')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update schedule'
      })
    }
  })

  // Cancel schedule
  fastify.delete('/:id', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const user = (request as AuthenticatedRequest).user!
      const docRef = db.collection('schedules').doc(id)
      const doc = await docRef.get()

      if (!doc.exists) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Schedule not found'
        })
      }

      const schedule = doc.data() as Schedule

      // Check ownership
      if (schedule.userId !== user.uid && user.role !== 'admin') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have permission to cancel this schedule'
        })
      }

      // Soft delete by updating status
      await docRef.update({
        status: 'cancelled',
        updatedAt: new Date()
      })

      return reply.status(204).send()
    } catch (error) {
      request.log.error({ error }, 'Failed to cancel schedule')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to cancel schedule'
      })
    }
  })
}
