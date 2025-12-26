import type { FastifyRequest, FastifyReply } from 'fastify'
import { auth } from '../utils/firebase.js'
import type { AuthenticatedRequest } from '../types/index.js'

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      })
    }

    const token = authHeader.substring(7)

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(token)

    // Attach user info to request
    ;(request as AuthenticatedRequest).user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      role: (decodedToken.role as 'user' | 'admin' | 'stable_owner') || 'user'
    }
  } catch (error) {
    request.log.error({ error }, 'Authentication failed')
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    })
  }
}

export function requireRole(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = (request as AuthenticatedRequest).user

    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required'
      })
    }

    if (!allowedRoles.includes(user.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      })
    }
  }
}
