import { apiClient } from "@/lib/apiClient";
import type {
  LessonType,
  Lesson,
  LessonBooking,
  Instructor,
  InstructorAvailability,
  LessonScheduleTemplate,
} from "@equiduty/shared";

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

export interface MyBookingsResponse {
  bookings: LessonBooking[];
}

export interface LessonSettingsResponse {
  settings: LessonSettings;
}

export interface LessonSettings {
  skillLevels: SkillLevel[];
  defaultCancellationDeadlineHours: number;
  defaultMaxCancellationsPerTerm: number;
  termStartDate?: string;
  termEndDate?: string;
  autoPromoteFromWaitlist: boolean;
}

export interface SkillLevel {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  isSystem: boolean;
  isEnabled: boolean;
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
  level?: string;
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
  const params: Record<string, string> = {};
  if (includeInactive) params.includeInactive = "true";
  return apiClient.get<LessonTypesResponse>(
    `/organizations/${organizationId}/lesson-types`,
    Object.keys(params).length > 0 ? params : undefined,
  );
}

export async function createLessonType(
  organizationId: string,
  data: CreateLessonTypeData,
): Promise<LessonType> {
  return apiClient.post<LessonType>(
    `/organizations/${organizationId}/lesson-types`,
    data,
  );
}

export async function updateLessonType(
  organizationId: string,
  lessonTypeId: string,
  data: Partial<CreateLessonTypeData>,
): Promise<LessonType> {
  return apiClient.patch<LessonType>(
    `/organizations/${organizationId}/lesson-types/${lessonTypeId}`,
    data,
  );
}

export async function deleteLessonType(
  organizationId: string,
  lessonTypeId: string,
): Promise<{ success: boolean }> {
  return apiClient.delete<{ success: boolean }>(
    `/organizations/${organizationId}/lesson-types/${lessonTypeId}`,
  );
}

// ============================================
// Instructors
// ============================================

export async function getInstructors(
  organizationId: string,
  includeInactive = false,
): Promise<InstructorsResponse> {
  const params: Record<string, string> = {};
  if (includeInactive) params.includeInactive = "true";
  return apiClient.get<InstructorsResponse>(
    `/organizations/${organizationId}/instructors`,
    Object.keys(params).length > 0 ? params : undefined,
  );
}

export async function createInstructor(
  organizationId: string,
  data: CreateInstructorData,
): Promise<Instructor> {
  return apiClient.post<Instructor>(
    `/organizations/${organizationId}/instructors`,
    data,
  );
}

export async function updateInstructor(
  organizationId: string,
  instructorId: string,
  data: Partial<CreateInstructorData>,
): Promise<Instructor> {
  return apiClient.patch<Instructor>(
    `/organizations/${organizationId}/instructors/${instructorId}`,
    data,
  );
}

export async function getInstructorAvailability(
  organizationId: string,
  instructorId: string,
): Promise<InstructorAvailabilityResponse> {
  return apiClient.get<InstructorAvailabilityResponse>(
    `/organizations/${organizationId}/instructors/${instructorId}/availability`,
  );
}

export async function setInstructorAvailability(
  organizationId: string,
  instructorId: string,
  data: SetAvailabilityData,
): Promise<InstructorAvailability> {
  return apiClient.post<InstructorAvailability>(
    `/organizations/${organizationId}/instructors/${instructorId}/availability`,
    data,
  );
}

// ============================================
// Lessons
// ============================================

export async function getLessons(
  organizationId: string,
  filters?: LessonsFilters,
): Promise<LessonsResponse> {
  const params: Record<string, string> = {};
  if (filters?.startDate) params.startDate = filters.startDate;
  if (filters?.endDate) params.endDate = filters.endDate;
  if (filters?.instructorId) params.instructorId = filters.instructorId;
  if (filters?.lessonTypeId) params.lessonTypeId = filters.lessonTypeId;
  if (filters?.status) params.status = filters.status;
  if (filters?.limit) params.limit = filters.limit.toString();
  if (filters?.offset) params.offset = filters.offset.toString();
  return apiClient.get<LessonsResponse>(
    `/organizations/${organizationId}/lessons`,
    Object.keys(params).length > 0 ? params : undefined,
  );
}

export async function getLesson(
  organizationId: string,
  lessonId: string,
): Promise<LessonDetailResponse> {
  return apiClient.get<LessonDetailResponse>(
    `/organizations/${organizationId}/lessons/${lessonId}`,
  );
}

export async function createLesson(
  organizationId: string,
  data: CreateLessonData,
): Promise<Lesson> {
  return apiClient.post<Lesson>(
    `/organizations/${organizationId}/lessons`,
    data,
  );
}

export async function updateLesson(
  organizationId: string,
  lessonId: string,
  data: UpdateLessonData,
): Promise<Lesson> {
  return apiClient.patch<Lesson>(
    `/organizations/${organizationId}/lessons/${lessonId}`,
    data,
  );
}

export async function cancelLesson(
  organizationId: string,
  lessonId: string,
  reason?: string,
  notifyParticipants = true,
): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>(
    `/organizations/${organizationId}/lessons/${lessonId}/cancel`,
    { reason, notifyParticipants },
  );
}

// ============================================
// Bookings
// ============================================

export async function getLessonBookings(
  organizationId: string,
  lessonId: string,
): Promise<BookingsResponse> {
  return apiClient.get<BookingsResponse>(
    `/organizations/${organizationId}/lessons/${lessonId}/bookings`,
  );
}

export async function createBooking(
  organizationId: string,
  lessonId: string,
  data: CreateBookingData,
): Promise<LessonBooking & { isWaitlisted: boolean }> {
  return apiClient.post<LessonBooking & { isWaitlisted: boolean }>(
    `/organizations/${organizationId}/lessons/${lessonId}/bookings`,
    data,
  );
}

export async function updateBooking(
  organizationId: string,
  lessonId: string,
  bookingId: string,
  data: UpdateBookingData,
): Promise<LessonBooking> {
  return apiClient.patch<LessonBooking>(
    `/organizations/${organizationId}/lessons/${lessonId}/bookings/${bookingId}`,
    data,
  );
}

export async function cancelBooking(
  organizationId: string,
  lessonId: string,
  bookingId: string,
  reason?: string,
): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>(
    `/organizations/${organizationId}/lessons/${lessonId}/bookings/${bookingId}/cancel`,
    { reason },
  );
}

// ============================================
// Schedule Templates
// ============================================

export async function getScheduleTemplates(
  organizationId: string,
): Promise<ScheduleTemplatesResponse> {
  return apiClient.get<ScheduleTemplatesResponse>(
    `/organizations/${organizationId}/lesson-schedule-templates`,
  );
}

export async function createScheduleTemplate(
  organizationId: string,
  data: CreateScheduleTemplateData,
): Promise<LessonScheduleTemplate> {
  return apiClient.post<LessonScheduleTemplate>(
    `/organizations/${organizationId}/lesson-schedule-templates`,
    data,
  );
}

export async function generateLessonsFromTemplates(
  organizationId: string,
  startDate: string,
  endDate: string,
): Promise<GenerateLessonsResponse> {
  return apiClient.post<GenerateLessonsResponse>(
    `/organizations/${organizationId}/lessons/generate-from-templates`,
    { startDate, endDate },
  );
}

// ============================================
// My Bookings (member self-service)
// ============================================

export async function getMyLessonBookings(
  organizationId: string,
): Promise<MyBookingsResponse> {
  return apiClient.get<MyBookingsResponse>(
    `/organizations/${organizationId}/my/lesson-bookings`,
  );
}

export async function bookLessonSelf(
  organizationId: string,
  lessonId: string,
): Promise<LessonBooking & { isWaitlisted: boolean }> {
  return apiClient.post<LessonBooking & { isWaitlisted: boolean }>(
    `/organizations/${organizationId}/lessons/${lessonId}/book`,
    {},
  );
}

// ============================================
// Lesson Settings (org-level)
// ============================================

export async function getLessonSettings(
  organizationId: string,
): Promise<LessonSettingsResponse> {
  return apiClient.get<LessonSettingsResponse>(
    `/organizations/${organizationId}/lesson-settings`,
  );
}

export async function updateLessonSettings(
  organizationId: string,
  data: Partial<LessonSettings>,
): Promise<LessonSettings> {
  return apiClient.put<LessonSettings>(
    `/organizations/${organizationId}/lesson-settings`,
    data,
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
