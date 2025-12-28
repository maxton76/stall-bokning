import type { FastifyRequest, FastifyReply } from 'fastify'
import { auth } from '../utils/firebase.js'
import type { AuthenticatedRequest, StableContextRequest } from '../types/index.js'
import {
  canAccessStable,
  canManageStable,
  getStableMemberRole
} from '../utils/authorization.js'

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
      role: (decodedToken.role as 'user' | 'system_admin' | 'stable_owner') || 'user'  // Fixed: 'admin' → 'system_admin'
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

/**
 * Middleware: Require stable membership (any role)
 * Extracts stableId from params and verifies membership
 */
export function requireStableAccess() {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = (request as AuthenticatedRequest).user

    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required'
      })
    }

    const { stableId } = request.params as { stableId?: string }

    if (!stableId) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Stable ID required'
      })
    }

    // System admins bypass membership checks
    if (user.role === 'system_admin') {
      ;(request as StableContextRequest).stableId = stableId
      ;(request as StableContextRequest).stableRole = 'owner'  // Admin has full access
      return
    }

    // Check membership
    const hasAccess = await canAccessStable(user.uid, stableId)

    if (!hasAccess) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You are not a member of this stable'
      })
    }

    // Attach stable context to request
    const role = await getStableMemberRole(user.uid, stableId)

    ;(request as StableContextRequest).stableId = stableId
    ;(request as StableContextRequest).stableRole = role
  }
}

/**
 * Middleware: Require stable management permissions
 * Must be owner, manager, or system_admin
 */
export function requireStableManagement() {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = (request as AuthenticatedRequest).user

    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required'
      })
    }

    // Extract stableId from params or body
    const { stableId } = request.params as { stableId?: string }
    const bodyStableId = (request.body as any)?.stableId
    const targetStableId = stableId || bodyStableId

    if (!targetStableId) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Stable ID required'
      })
    }

    // System admins bypass checks
    if (user.role === 'system_admin') {
      ;(request as StableContextRequest).stableId = targetStableId
      ;(request as StableContextRequest).stableRole = 'owner'  // Admin has full access
      return
    }

    // Check management permission
    const canManage = await canManageStable(user.uid, targetStableId)

    if (!canManage) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Insufficient permissions to manage this stable'
      })
    }

    // Attach context
    const role = await getStableMemberRole(user.uid, targetStableId)

    ;(request as StableContextRequest).stableId = targetStableId
    ;(request as StableContextRequest).stableRole = role
  }
}
