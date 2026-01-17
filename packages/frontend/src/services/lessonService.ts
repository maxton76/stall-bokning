import { authFetchJSON } from "@/utils/authFetch";
import type {
  LessonType,
  Lesson,
  LessonBooking,
  Instructor,
  InstructorAvailability,
  LessonScheduleTemplate,
} from "@stall-bokning/shared";

const API_BASE = import.meta.env.VITE_API_URL || "";

// ============================================
// Types
// ============================================

export interface LessonTypesResponse {
  lessonTypes: LessonType[];
}

export interface InstructorsResponse {
  instructors: Instructor[];
}

export interface InstructorAvailabilityResponse {
  availability: InstructorAvailability[];
}

export interface LessonsResponse {
  lessons: Lesson[];
  total: number;
  limit: number;
  offset: number;
}

export interface LessonDetailResponse {
  lesson: Lesson;
  bookings: LessonBooking[];
}

export interface BookingsResponse {
  bookings: LessonBooking[];
}

export interface ScheduleTemplatesResponse {
  templates: LessonScheduleTemplate[];
}

export interface GenerateLessonsResponse {
  success: boolean;
  createdCount: number;
  lessonIds: string[];
}

export interface LessonsFilters {
  startDate?: string;
  endDate?: string;
  instructorId?: string;
  lessonTypeId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface CreateLessonTypeData {
  name: string;
  description?: string;
  category: "private" | "group" | "clinic" | "camp" | "assessment" | "other";
  level?: "beginner" | "novice" | "intermediate" | "advanced" | "professional";
  defaultDuration: number;
  minParticipants?: number;
  maxParticipants: number;
  requiresOwnHorse?: boolean;
  color?: string;
  pricing: {
    basePrice: number;
    currency?: string;
    perParticipant?: boolean;
    memberDiscount?: number;
  };
  cancellationPolicy?: {
    type: "strict" | "moderate" | "flexible" | "custom";
    noRefundHours?: number;
    partialRefundHours?: number;
    partialRefundPercent?: number;
    fullRefundHours?: number;
  };
  isActive?: boolean;
}

export interface CreateLessonData {
  lessonTypeId: string;
  instructorId: string;
  startTime: string;
  endTime: string;
  location?: string;
  facilityId?: string;
  maxParticipants?: number;
  notes?: string;
  isRecurring?: boolean;
  recurringPatternId?: string;
}

export interface UpdateLessonData {
  instructorId?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  facilityId?: string;
  maxParticipants?: number;
  notes?: string;
  status?:
    | "scheduled"
    | "confirmed"
    | "in_progress"
    | "completed"
    | "cancelled";
  cancellationReason?: string;
}

export interface CreateInstructorData {
  userId?: string;
  contactId?: string;
  name: string;
  email?: string;
  phone?: string;
  bio?: string;
  specializations?: string[];
  certifications?: {
    name: string;
    issuer?: string;
    issuedDate?: string;
    expiryDate?: string;
  }[];
  defaultRate?: number;
  color?: string;
  isActive?: boolean;
}

export interface SetAvailabilityData {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring?: boolean;
  specificDate?: string;
  isAvailable?: boolean;
  notes?: string;
}

export interface CreateBookingData {
  lessonId: string;
  participantContactId: string;
  horseId?: string;
  notes?: string;
}

export interface UpdateBookingData {
  status?:
    | "pending"
    | "confirmed"
    | "waitlisted"
    | "cancelled"
    | "no_show"
    | "completed";
  horseId?: string;
  notes?: string;
  paymentStatus?: "pending" | "paid" | "refunded" | "partial";
  cancellationReason?: string;
}

export interface CreateScheduleTemplateData {
  name: string;
  description?: string;
  lessonTypeId: string;
  instructorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location?: string;
  facilityId?: string;
  maxParticipants?: number;
  isActive?: boolean;
  effectiveFrom?: string;
  effectiveUntil?: string;
}

// ============================================
// Lesson Types
// ============================================

export async function getLessonTypes(
  organizationId: string,
  includeInactive = false,
): Promise<LessonTypesResponse> {
  const params = new URLSearchParams();
  if (includeInactive) params.set("includeInactive", "true");
  const query = params.toString();
  return authFetchJSON<LessonTypesResponse>(
    `${API_BASE}/api/v1/organizations/${organizationId}/lesson-types${query ? `?${query}` : ""}`,
  );
}

export async function createLessonType(
  organizationId: string,
  data: CreateLessonTypeData,
): Promise<LessonType> {
  return authFetchJSON<LessonType>(
    `${API_BASE}/api/v1/organizations/${organizationId}/lesson-types`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function updateLessonType(
  organizationId: string,
  lessonTypeId: string,
  data: Partial<CreateLessonTypeData>,
): Promise<LessonType> {
  return authFetchJSON<LessonType>(
    `${API_BASE}/api/v1/organizations/${organizationId}/lesson-types/${lessonTypeId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export async function deleteLessonType(
  organizationId: string,
  lessonTypeId: string,
): Promise<{ success: boolean }> {
  return authFetchJSON<{ success: boolean }>(
    `${API_BASE}/api/v1/organizations/${organizationId}/lesson-types/${lessonTypeId}`,
    {
      method: "DELETE",
    },
  );
}

// ============================================
// Instructors
// ============================================

export async function getInstructors(
  organizationId: string,
  includeInactive = false,
): Promise<InstructorsResponse> {
  const params = new URLSearchParams();
  if (includeInactive) params.set("includeInactive", "true");
  const query = params.toString();
  return authFetchJSON<InstructorsResponse>(
    `${API_BASE}/api/v1/organizations/${organizationId}/instructors${query ? `?${query}` : ""}`,
  );
}

export async function createInstructor(
  organizationId: string,
  data: CreateInstructorData,
): Promise<Instructor> {
  return authFetchJSON<Instructor>(
    `${API_BASE}/api/v1/organizations/${organizationId}/instructors`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function updateInstructor(
  organizationId: string,
  instructorId: string,
  data: Partial<CreateInstructorData>,
): Promise<Instructor> {
  return authFetchJSON<Instructor>(
    `${API_BASE}/api/v1/organizations/${organizationId}/instructors/${instructorId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export async function getInstructorAvailability(
  organizationId: string,
  instructorId: string,
): Promise<InstructorAvailabilityResponse> {
  return authFetchJSON<InstructorAvailabilityResponse>(
    `${API_BASE}/api/v1/organizations/${organizationId}/instructors/${instructorId}/availability`,
  );
}

export async function setInstructorAvailability(
  organizationId: string,
  instructorId: string,
  data: SetAvailabilityData,
): Promise<InstructorAvailability> {
  return authFetchJSON<InstructorAvailability>(
    `${API_BASE}/api/v1/organizations/${organizationId}/instructors/${instructorId}/availability`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

// ============================================
// Lessons
// ============================================

export async function getLessons(
  organizationId: string,
  filters?: LessonsFilters,
): Promise<LessonsResponse> {
  const params = new URLSearchParams();
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.instructorId) params.set("instructorId", filters.instructorId);
  if (filters?.lessonTypeId) params.set("lessonTypeId", filters.lessonTypeId);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.limit) params.set("limit", filters.limit.toString());
  if (filters?.offset) params.set("offset", filters.offset.toString());
  const query = params.toString();
  return authFetchJSON<LessonsResponse>(
    `${API_BASE}/api/v1/organizations/${organizationId}/lessons${query ? `?${query}` : ""}`,
  );
}

export async function getLesson(
  organizationId: string,
  lessonId: string,
): Promise<LessonDetailResponse> {
  return authFetchJSON<LessonDetailResponse>(
    `${API_BASE}/api/v1/organizations/${organizationId}/lessons/${lessonId}`,
  );
}

export async function createLesson(
  organizationId: string,
  data: CreateLessonData,
): Promise<Lesson> {
  return authFetchJSON<Lesson>(
    `${API_BASE}/api/v1/organizations/${organizationId}/lessons`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function updateLesson(
  organizationId: string,
  lessonId: string,
  data: UpdateLessonData,
): Promise<Lesson> {
  return authFetchJSON<Lesson>(
    `${API_BASE}/api/v1/organizations/${organizationId}/lessons/${lessonId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export async function cancelLesson(
  organizationId: string,
  lessonId: string,
  reason?: string,
  notifyParticipants = true,
): Promise<{ success: boolean }> {
  return authFetchJSON<{ success: boolean }>(
    `${API_BASE}/api/v1/organizations/${organizationId}/lessons/${lessonId}/cancel`,
    {
      method: "POST",
      body: JSON.stringify({ reason, notifyParticipants }),
    },
  );
}

// ============================================
// Bookings
// ============================================

export async function getLessonBookings(
  organizationId: string,
  lessonId: string,
): Promise<BookingsResponse> {
  return authFetchJSON<BookingsResponse>(
    `${API_BASE}/api/v1/organizations/${organizationId}/lessons/${lessonId}/bookings`,
  );
}

export async function createBooking(
  organizationId: string,
  lessonId: string,
  data: CreateBookingData,
): Promise<LessonBooking & { isWaitlisted: boolean }> {
  return authFetchJSON<LessonBooking & { isWaitlisted: boolean }>(
    `${API_BASE}/api/v1/organizations/${organizationId}/lessons/${lessonId}/bookings`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function updateBooking(
  organizationId: string,
  lessonId: string,
  bookingId: string,
  data: UpdateBookingData,
): Promise<LessonBooking> {
  return authFetchJSON<LessonBooking>(
    `${API_BASE}/api/v1/organizations/${organizationId}/lessons/${lessonId}/bookings/${bookingId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export async function cancelBooking(
  organizationId: string,
  lessonId: string,
  bookingId: string,
  reason?: string,
): Promise<{ success: boolean }> {
  return authFetchJSON<{ success: boolean }>(
    `${API_BASE}/api/v1/organizations/${organizationId}/lessons/${lessonId}/bookings/${bookingId}/cancel`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    },
  );
}

// ============================================
// Schedule Templates
// ============================================

export async function getScheduleTemplates(
  organizationId: string,
): Promise<ScheduleTemplatesResponse> {
  return authFetchJSON<ScheduleTemplatesResponse>(
    `${API_BASE}/api/v1/organizations/${organizationId}/lesson-schedule-templates`,
  );
}

export async function createScheduleTemplate(
  organizationId: string,
  data: CreateScheduleTemplateData,
): Promise<LessonScheduleTemplate> {
  return authFetchJSON<LessonScheduleTemplate>(
    `${API_BASE}/api/v1/organizations/${organizationId}/lesson-schedule-templates`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function generateLessonsFromTemplates(
  organizationId: string,
  startDate: string,
  endDate: string,
): Promise<GenerateLessonsResponse> {
  return authFetchJSON<GenerateLessonsResponse>(
    `${API_BASE}/api/v1/organizations/${organizationId}/lessons/generate-from-templates`,
    {
      method: "POST",
      body: JSON.stringify({ startDate, endDate }),
    },
  );
}

// ============================================
// Utility Functions
// ============================================

export function getLessonStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "scheduled":
    case "confirmed":
      return "secondary";
    case "in_progress":
      return "outline";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
}

export function getBookingStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "confirmed":
    case "completed":
      return "default";
    case "pending":
    case "waitlisted":
      return "secondary";
    case "cancelled":
    case "no_show":
      return "destructive";
    default:
      return "outline";
  }
}

export function getLessonCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    private: "Private",
    group: "Group",
    clinic: "Clinic",
    camp: "Camp",
    assessment: "Assessment",
    other: "Other",
  };
  return labels[category] || category;
}

export function getLessonLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    beginner: "Beginner",
    novice: "Novice",
    intermediate: "Intermediate",
    advanced: "Advanced",
    professional: "Professional",
  };
  return labels[level] || level;
}

export function getDayOfWeekLabel(day: number): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[day] || "";
}
