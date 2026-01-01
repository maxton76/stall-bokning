import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { stablesRoutes } from './routes/stables.js'
import { schedulesRoutes } from './routes/schedules.js'
import { organizationsRoutes } from './routes/organizations.js'
import inviteRoutes from './routes/invites.js'
import organizationMemberRoutes from './routes/organizationMembers.js'
import authRoutes from './routes/auth.js'

const PORT = Number(process.env.PORT) || 5003
const HOST = process.env.HOST || '0.0.0.0'
const NODE_ENV = process.env.NODE_ENV || 'development'

// Create Fastify instance with logging
const fastify = Fastify({
  logger: {
    level: NODE_ENV === 'development' ? 'debug' : 'info',
    transport: NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            colorize: true
          }
        }
      : undefined
  }
})

// Register CORS
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
})

// Register rate limiting
await fastify.register(rateLimit, {
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  timeWindow: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  cache: 10000,
  allowList: NODE_ENV === 'development' ? ['127.0.0.1', 'localhost'] : [],
  skipOnError: true
})

// Health check endpoint
fastify.get('/health', async () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime()
  }
})

// API version endpoint
fastify.get('/api/v1', async () => {
  return {
    version: '1.0.0',
    name: 'Stall Bokning API',
    documentation: '/api/v1/docs'
  }
})

// Register API routes
await fastify.register(authRoutes, { prefix: '/api/v1/auth' })
await fastify.register(stablesRoutes, { prefix: '/api/v1/stables' })
await fastify.register(schedulesRoutes, { prefix: '/api/v1/schedules' })
await fastify.register(organizationsRoutes, { prefix: '/api/v1/organizations' })
await fastify.register(inviteRoutes, { prefix: '/api/v1/invites' })
await fastify.register(organizationMemberRoutes, { prefix: '/api/v1/organization-members' })

// 404 handler
fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    error: 'Not Found',
    message: `Route ${request.method} ${request.url} not found`,
    statusCode: 404
  })
})

// Global error handler
fastify.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
  request.log.error({ error }, 'Unhandled error')

  // Don't leak error details in production
  const message = NODE_ENV === 'development'
    ? error.message
    : 'An unexpected error occurred'

  reply.status(error.statusCode || 500).send({
    error: error.name || 'Internal Server Error',
    message,
    statusCode: error.statusCode || 500
  })
})

// Graceful shutdown
const closeGracefully = async (signal: string) => {
  fastify.log.info(`Received signal to terminate: ${signal}`)
  await fastify.close()
  process.exit(0)
}

process.on('SIGINT', () => closeGracefully('SIGINT'))
process.on('SIGTERM', () => closeGracefully('SIGTERM'))

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST })
    fastify.log.info(`🚀 API Gateway running on http://${HOST}:${PORT}`)
    fastify.log.info(`📊 Health check: http://${HOST}:${PORT}/health`)
    fastify.log.info(`🌍 Environment: ${NODE_ENV}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
