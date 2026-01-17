import type { Timestamp } from "firebase/firestore";
import type { RecurrencePattern } from "./recurring.js";

/**
 * Lesson Types
 * Types for lesson scheduling and booking system
 */

/**
 * Lesson difficulty level
 */
export type LessonLevel =
  | "beginner"
  | "novice"
  | "intermediate"
  | "advanced"
  | "expert";

/**
 * Lesson type category
 */
export type LessonCategory =
  | "dressage"
  | "jumping"
  | "eventing"
  | "western"
  | "trail"
  | "groundwork"
  | "theory"
  | "other";

/**
 * Lesson status
 */
export type LessonStatus =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

/**
 * Booking status
 */
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "waitlisted"
  | "cancelled"
  | "no_show";

/**
 * Cancellation policy type
 */
export type CancellationPolicyType =
  | "flexible" // Full refund up to 24h
  | "moderate" // Full refund up to 48h, 50% up to 24h
  | "strict" // Full refund up to 7 days, 50% up to 48h
  | "custom";

/**
 * Lesson type definition
 * Stored in: lessonTypes/{id}
 */
export interface LessonType {
  id: string;
  organizationId: string;
  stableId?: string; // If specific to a stable

  // Basic info
  name: string;
  description?: string;
  category: LessonCategory;
  level: LessonLevel;

  // Duration and capacity
  durationMinutes: number;
  minParticipants: number;
  maxParticipants: number;
  isGroupLesson: boolean;

  // Pricing
  price: number;
  currency: string; // Default: "SEK"
  pricePerAdditionalParticipant?: number; // For group lessons

  // Requirements
  requiresOwnHorse: boolean;
  schoolHorseAvailable: boolean;
  schoolHorsePrice?: number;
  minimumRiderAge?: number;
  requiredLevel?: LessonLevel;
  prerequisites?: string[];

  // Facility requirements
  requiredFacilityTypes?: string[]; // "arena", "outdoor", "round_pen", etc.
  preferredFacilityId?: string;

  // Instructor requirements
  allowedInstructorIds?: string[]; // Empty = any instructor
  defaultInstructorId?: string;

  // Booking rules
  bookingWindowDays: number; // How far in advance can book
  cancellationPolicy: CancellationPolicyType;
  cancellationHours?: number; // For custom policy
  cancellationRefundPercent?: number;
  allowWaitlist: boolean;
  requiresApproval: boolean; // Instructor must approve booking

  // Status
  isActive: boolean;
  isPublic: boolean; // Visible in client portal

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

/**
 * Instructor availability slot
 * Stored in: instructorAvailability/{id}
 */
export interface InstructorAvailability {
  id: string;
  instructorId: string;
  organizationId: string;

  // Time slot
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"

  // Effective dates
  effectiveFrom: Timestamp;
  effectiveUntil?: Timestamp;

  // Restrictions
  lessonTypeIds?: string[]; // Empty = all types
  facilityIds?: string[]; // Empty = any facility

  // Status
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Scheduled lesson instance
 * Stored in: lessons/{id}
 */
export interface Lesson {
  id: string;
  organizationId: string;
  stableId?: string;
  lessonTypeId: string;

  // Denormalized from LessonType
  lessonTypeName: string;
  category: LessonCategory;
  level: LessonLevel;
  durationMinutes: number;
  maxParticipants: number;

  // Schedule
  scheduledDate: Timestamp;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"

  // Location
  facilityId?: string;
  facilityName?: string;

  // Instructor
  instructorId: string;
  instructorName: string;
  instructorUserId?: string; // If instructor is also a user

  // Participants
  currentParticipants: number;
  bookings: LessonBookingRef[];

  // School horses assigned
  schoolHorses: {
    horseId: string;
    horseName: string;
    assignedToBookingId?: string;
  }[];

  // Status
  status: LessonStatus;
  cancelledAt?: Timestamp;
  cancelledBy?: string;
  cancellationReason?: string;

  // Completion
  completedAt?: Timestamp;
  completedBy?: string;
  notes?: string;
  feedbackAverage?: number;

  // Pricing override
  priceOverride?: number;
  currency: string;

  // Recurring info
  recurringActivityId?: string;
  isRecurringInstance: boolean;

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

/**
 * Reference to a booking within a lesson
 */
export interface LessonBookingRef {
  bookingId: string;
  contactId: string;
  contactName: string;
  status: BookingStatus;
  horseId?: string;
  horseName?: string;
  isSchoolHorse: boolean;
}

/**
 * Lesson booking
 * Stored in: lessonBookings/{id}
 */
export interface LessonBooking {
  id: string;
  lessonId: string;
  lessonTypeId: string;
  organizationId: string;

  // Booker info
  contactId: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  bookedByUserId?: string; // Portal user ID if self-booked

  // Participant info (can be different from booker for children)
  participantName: string;
  participantAge?: number;
  participantLevel?: LessonLevel;

  // Horse assignment
  horseId?: string;
  horseName?: string;
  isSchoolHorse: boolean;
  schoolHorseRequested: boolean;

  // Lesson info (denormalized)
  lessonDate: Timestamp;
  startTime: string;
  endTime: string;
  facilityName?: string;
  instructorName: string;

  // Status
  status: BookingStatus;
  waitlistPosition?: number;

  // Approval workflow
  requiresApproval: boolean;
  approvedAt?: Timestamp;
  approvedBy?: string;
  rejectedAt?: Timestamp;
  rejectedBy?: string;
  rejectionReason?: string;

  // Cancellation
  cancelledAt?: Timestamp;
  cancelledBy?: string;
  cancellationReason?: string;

  // Pricing
  price: number;
  schoolHorsePrice: number;
  totalPrice: number;
  currency: string;

  // Payment
  isPaid: boolean;
  paidAt?: Timestamp;
  invoiceId?: string;
  paymentMethod?: string;

  // Attendance
  attendedAt?: Timestamp;
  markedNoShowAt?: Timestamp;

  // Feedback
  feedbackRating?: number; // 1-5
  feedbackComment?: string;
  feedbackSubmittedAt?: Timestamp;

  // Notes
  specialRequests?: string;
  internalNotes?: string;

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

/**
 * Lesson booking for display
 */
export interface LessonBookingDisplay {
  id: string;
  lessonId: string;
  lessonTypeName: string;
  category: LessonCategory;
  level: LessonLevel;

  participantName: string;
  horseName?: string;
  isSchoolHorse: boolean;

  lessonDate: Date;
  startTime: string;
  endTime: string;
  facilityName?: string;
  instructorName: string;

  status: BookingStatus;
  statusDisplay: string;
  waitlistPosition?: number;

  totalPrice: number;
  currency: string;
  isPaid: boolean;

  canCancel: boolean;
  cancellationDeadline?: Date;
}

/**
 * Lesson schedule template
 * For creating recurring lessons
 * Stored in: lessonScheduleTemplates/{id}
 */
export interface LessonScheduleTemplate {
  id: string;
  organizationId: string;
  stableId?: string;

  name: string;
  description?: string;

  // Lesson configuration
  lessonTypeId: string;
  lessonTypeName: string;
  instructorId: string;
  instructorName: string;
  facilityId?: string;
  facilityName?: string;

  // Schedule
  dayOfWeek: number;
  startTime: string;
  endTime: string;

  // Recurrence
  recurrencePattern: RecurrencePattern;
  effectiveFrom: Timestamp;
  effectiveUntil?: Timestamp;

  // Exceptions
  excludedDates: string[]; // ISO date strings

  // Status
  isActive: boolean;
  lastGeneratedAt?: Timestamp;
  nextGenerateAt?: Timestamp;

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

/**
 * Instructor profile
 * Stored in: instructors/{id}
 */
export interface Instructor {
  id: string;
  organizationId: string;
  userId?: string; // If instructor is also a system user
  contactId?: string; // If instructor has a contact record

  // Basic info
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone?: string;
  photoUrl?: string;

  // Qualifications
  certifications: string[];
  specializations: LessonCategory[];
  experienceYears?: number;
  bio?: string;

  // Availability summary
  availableDays: number[]; // 0-6

  // Ratings
  averageRating?: number;
  totalLessons: number;
  totalReviews: number;

  // Status
  isActive: boolean;
  isPublic: boolean; // Visible to clients

  // Settings
  defaultHourlyRate?: number;
  currency: string;
  notifyOnBooking: boolean;
  notifyOnCancellation: boolean;

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ============================================================
// Create/Update DTOs
// ============================================================

export interface CreateLessonTypeData {
  name: string;
  description?: string;
  category: LessonCategory;
  level: LessonLevel;
  durationMinutes: number;
  minParticipants?: number;
  maxParticipants: number;
  isGroupLesson: boolean;
  price: number;
  currency?: string;
  requiresOwnHorse?: boolean;
  schoolHorseAvailable?: boolean;
  schoolHorsePrice?: number;
  minimumRiderAge?: number;
  requiredLevel?: LessonLevel;
  prerequisites?: string[];
  requiredFacilityTypes?: string[];
  preferredFacilityId?: string;
  allowedInstructorIds?: string[];
  defaultInstructorId?: string;
  bookingWindowDays?: number;
  cancellationPolicy?: CancellationPolicyType;
  cancellationHours?: number;
  cancellationRefundPercent?: number;
  allowWaitlist?: boolean;
  requiresApproval?: boolean;
  isActive?: boolean;
  isPublic?: boolean;
}

export interface UpdateLessonTypeData extends Partial<CreateLessonTypeData> {}

export interface CreateLessonData {
  lessonTypeId: string;
  scheduledDate: string | Date;
  startTime: string;
  instructorId: string;
  facilityId?: string;
  priceOverride?: number;
  notes?: string;
}

export interface UpdateLessonData {
  scheduledDate?: string | Date;
  startTime?: string;
  instructorId?: string;
  facilityId?: string;
  priceOverride?: number;
  notes?: string;
}

export interface CreateLessonBookingData {
  lessonId: string;
  contactId: string;
  participantName: string;
  participantAge?: number;
  participantLevel?: LessonLevel;
  horseId?: string;
  schoolHorseRequested?: boolean;
  specialRequests?: string;
}

export interface UpdateLessonBookingData {
  participantName?: string;
  participantAge?: number;
  participantLevel?: LessonLevel;
  horseId?: string;
  schoolHorseRequested?: boolean;
  specialRequests?: string;
  internalNotes?: string;
}

export interface CreateInstructorData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  certifications?: string[];
  specializations?: LessonCategory[];
  experienceYears?: number;
  bio?: string;
  defaultHourlyRate?: number;
  currency?: string;
  isActive?: boolean;
  isPublic?: boolean;
}

export interface UpdateInstructorData extends Partial<CreateInstructorData> {}

export interface CreateLessonScheduleTemplateData {
  name: string;
  description?: string;
  lessonTypeId: string;
  instructorId: string;
  facilityId?: string;
  dayOfWeek: number;
  startTime: string;
  effectiveFrom: string | Date;
  effectiveUntil?: string | Date;
  recurrencePattern: RecurrencePattern;
  isActive?: boolean;
}

export interface UpdateLessonScheduleTemplateData extends Partial<CreateLessonScheduleTemplateData> {
  excludedDates?: string[];
}

// ============================================================
// Query/Filter Types
// ============================================================

export interface LessonSearchFilters {
  dateFrom?: string | Date;
  dateTo?: string | Date;
  lessonTypeId?: string;
  instructorId?: string;
  facilityId?: string;
  category?: LessonCategory;
  level?: LessonLevel;
  status?: LessonStatus;
  hasAvailability?: boolean;
}

export interface BookingSearchFilters {
  dateFrom?: string | Date;
  dateTo?: string | Date;
  contactId?: string;
  lessonTypeId?: string;
  status?: BookingStatus;
  isPaid?: boolean;
}

// ============================================================
// Analytics Types
// ============================================================

export interface LessonAnalytics {
  organizationId: string;
  period: {
    start: Date;
    end: Date;
  };

  // Summary
  totalLessons: number;
  completedLessons: number;
  cancelledLessons: number;
  totalBookings: number;
  totalRevenue: number;
  currency: string;

  // Utilization
  averageCapacityUsed: number; // Percentage
  totalParticipants: number;

  // By category
  byCategory: {
    category: LessonCategory;
    lessonCount: number;
    bookingCount: number;
    revenue: number;
  }[];

  // By instructor
  byInstructor: {
    instructorId: string;
    instructorName: string;
    lessonCount: number;
    bookingCount: number;
    averageRating: number;
    revenue: number;
  }[];

  // Popular times
  popularTimeSlots: {
    dayOfWeek: number;
    hour: number;
    bookingCount: number;
  }[];

  // Cancellation rate
  cancellationRate: number;
  noShowRate: number;

  // Average feedback
  averageFeedbackRating: number;
  feedbackCount: number;
}
