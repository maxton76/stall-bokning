import type { FastifyRequest } from "fastify";

export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string;
  role: "user" | "system_admin" | "stable_owner"; // Fixed: 'admin' → 'system_admin'
}

export interface AuthenticatedRequest extends FastifyRequest {
  user?: AuthUser;
}

// Stable member role types
export type StableMemberRole = "manager" | "member";
export type StableMemberStatus = "active" | "inactive" | "pending";

// Extended request interface with stable context
export interface StableContextRequest extends AuthenticatedRequest {
  stableId?: string;
  stableRole?: "owner" | StableMemberRole | null;
}

export interface Stable {
  id?: string;
  name: string;
  address: string;
  capacity: number;
  availableStalls: number;
  pricePerMonth: number;
  amenities: string[];
  ownerId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Work Schedule - For shift scheduling and management
 */
export interface Schedule {
  id?: string;
  name: string;
  stableId: string;
  stableName: string;
  startDate: Date;
  endDate: Date;
  useAutoAssignment: boolean;
  notifyMembers: boolean;
  status: "draft" | "published" | "archived";
  publishedAt?: Date;
  publishedBy?: string;
  createdAt?: Date;
  createdBy?: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface Shift {
  id?: string;
  stableId: string;
  userId: string;
  date: Date;
  startTime: string;
  endTime: string;
  role: string;
  status: "scheduled" | "completed" | "cancelled";
  createdAt?: Date;
  updatedAt?: Date;
}
