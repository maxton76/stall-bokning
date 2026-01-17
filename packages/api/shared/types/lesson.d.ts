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
  | "flexible"
  | "moderate"
  | "strict"
  | "custom";
/**
 * Lesson type definition
 * Stored in: lessonTypes/{id}
 */
export interface LessonType {
  id: string;
  organizationId: string;
  stableId?: string;
  name: string;
  description?: string;
  category: LessonCategory;
  level: LessonLevel;
  durationMinutes: number;
  /** @deprecated Use durationMinutes */
  defaultDuration?: number;
  minParticipants: number;
  maxParticipants: number;
  isGroupLesson: boolean;
  color?: string;
  price: number;
  /** @deprecated Use price and related fields */
  pricing?: {
    basePrice: number;
    memberDiscount?: number;
  };
  currency: string;
  pricePerAdditionalParticipant?: number;
  requiresOwnHorse: boolean;
  schoolHorseAvailable: boolean;
  schoolHorsePrice?: number;
  minimumRiderAge?: number;
  requiredLevel?: LessonLevel;
  prerequisites?: string[];
  requiredFacilityTypes?: string[];
  preferredFacilityId?: string;
  allowedInstructorIds?: string[];
  defaultInstructorId?: string;
  bookingWindowDays: number;
  cancellationPolicy: CancellationPolicyType;
  cancellationHours?: number;
  cancellationRefundPercent?: number;
  allowWaitlist: boolean;
  requiresApproval: boolean;
  isActive: boolean;
  isPublic: boolean;
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
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  effectiveFrom: Timestamp;
  effectiveUntil?: Timestamp;
  lessonTypeIds?: string[];
  facilityIds?: string[];
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
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
  lessonTypeName: string;
  category: LessonCategory;
  level: LessonLevel;
  durationMinutes: number;
  maxParticipants: number;
  scheduledDate: Timestamp;
  startTime: string;
  endTime: string;
  facilityId?: string;
  facilityName?: string;
  /** Location string for display */
  location?: string;
  instructorId: string;
  instructorName: string;
  instructorUserId?: string;
  currentParticipants: number;
  bookings: LessonBookingRef[];
  schoolHorses: {
    horseId: string;
    horseName: string;
    assignedToBookingId?: string;
  }[];
  status: LessonStatus;
  cancelledAt?: Timestamp;
  cancelledBy?: string;
  cancellationReason?: string;
  completedAt?: Timestamp;
  completedBy?: string;
  notes?: string;
  feedbackAverage?: number;
  priceOverride?: number;
  currency: string;
  recurringActivityId?: string;
  isRecurringInstance: boolean;
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
  contactId: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  bookedByUserId?: string;
  participantName: string;
  participantAge?: number;
  participantLevel?: LessonLevel;
  horseId?: string;
  horseName?: string;
  isSchoolHorse: boolean;
  schoolHorseRequested: boolean;
  lessonDate: Timestamp;
  startTime: string;
  endTime: string;
  facilityName?: string;
  instructorName: string;
  status: BookingStatus;
  waitlistPosition?: number;
  requiresApproval: boolean;
  approvedAt?: Timestamp;
  approvedBy?: string;
  rejectedAt?: Timestamp;
  rejectedBy?: string;
  rejectionReason?: string;
  cancelledAt?: Timestamp;
  cancelledBy?: string;
  cancellationReason?: string;
  price: number;
  schoolHorsePrice: number;
  totalPrice: number;
  currency: string;
  isPaid: boolean;
  paidAt?: Timestamp;
  invoiceId?: string;
  paymentMethod?: string;
  attendedAt?: Timestamp;
  markedNoShowAt?: Timestamp;
  feedbackRating?: number;
  feedbackComment?: string;
  feedbackSubmittedAt?: Timestamp;
  specialRequests?: string;
  internalNotes?: string;
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
  lessonTypeId: string;
  lessonTypeName: string;
  instructorId: string;
  instructorName: string;
  facilityId?: string;
  facilityName?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  recurrencePattern: RecurrencePattern;
  effectiveFrom: Timestamp;
  effectiveUntil?: Timestamp;
  excludedDates: string[];
  isActive: boolean;
  lastGeneratedAt?: Timestamp;
  nextGenerateAt?: Timestamp;
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
  userId?: string;
  contactId?: string;
  firstName: string;
  lastName: string;
  displayName: string;
  /** @deprecated Use displayName */
  name?: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  color?: string;
  certifications: string[];
  specializations: LessonCategory[];
  experienceYears?: number;
  bio?: string;
  /** @deprecated Use defaultHourlyRate */
  defaultRate?: number;
  availableDays: number[];
  averageRating?: number;
  totalLessons: number;
  totalReviews: number;
  isActive: boolean;
  isPublic: boolean;
  defaultHourlyRate?: number;
  currency: string;
  notifyOnBooking: boolean;
  notifyOnCancellation: boolean;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}
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
export interface LessonAnalytics {
  organizationId: string;
  period: {
    start: Date;
    end: Date;
  };
  totalLessons: number;
  completedLessons: number;
  cancelledLessons: number;
  totalBookings: number;
  totalRevenue: number;
  currency: string;
  averageCapacityUsed: number;
  totalParticipants: number;
  byCategory: {
    category: LessonCategory;
    lessonCount: number;
    bookingCount: number;
    revenue: number;
  }[];
  byInstructor: {
    instructorId: string;
    instructorName: string;
    lessonCount: number;
    bookingCount: number;
    averageRating: number;
    revenue: number;
  }[];
  popularTimeSlots: {
    dayOfWeek: number;
    hour: number;
    bookingCount: number;
  }[];
  cancellationRate: number;
  noShowRate: number;
  averageFeedbackRating: number;
  feedbackCount: number;
}
//# sourceMappingURL=lesson.d.ts.map
