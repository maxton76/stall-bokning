import type { FastifyRequest } from 'fastify'

export interface AuthUser {
  uid: string
  email: string
  role: 'user' | 'system_admin' | 'stable_owner'  // Fixed: 'admin' → 'system_admin'
}

export interface AuthenticatedRequest extends FastifyRequest {
  user?: AuthUser
}

// Stable member role types
export type StableMemberRole = 'manager' | 'member'
export type StableMemberStatus = 'active' | 'inactive' | 'pending'

// Extended request interface with stable context
export interface StableContextRequest extends AuthenticatedRequest {
  stableId?: string
  stableRole?: 'owner' | StableMemberRole | null
}

export interface Stable {
  id?: string
  name: string
  address: string
  capacity: number
  availableStalls: number
  pricePerMonth: number
  amenities: string[]
  ownerId: string
  createdAt?: Date
  updatedAt?: Date
}

export interface Schedule {
  id?: string
  stableId: string
  stallNumber: string
  userId: string
  startDate: Date
  endDate: Date
  status: 'pending' | 'confirmed' | 'cancelled'
  pricePerMonth: number
  createdAt?: Date
  updatedAt?: Date
}

export interface Shift {
  id?: string
  stableId: string
  userId: string
  date: Date
  startTime: string
  endTime: string
  role: string
  status: 'scheduled' | 'completed' | 'cancelled'
  createdAt?: Date
  updatedAt?: Date
}
