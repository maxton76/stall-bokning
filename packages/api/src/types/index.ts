import type { FastifyRequest } from 'fastify'

export interface AuthUser {
  uid: string
  email: string
  role: 'user' | 'admin' | 'stable_owner'
}

export interface AuthenticatedRequest extends FastifyRequest {
  user?: AuthUser
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
