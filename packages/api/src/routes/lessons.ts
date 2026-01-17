import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import {
  authenticate,
  requireOrganizationMember,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import type {
  LessonType,
  Lesson,
  LessonBooking,
  Instructor,
  InstructorAvailability,
  LessonScheduleTemplate,
  LessonLevel,
  LessonCategory,
  LessonStatus,
  BookingStatus,
  CancellationPolicyType,
} from "@stall-bokning/shared";

// ============================================
// Schemas
// ============================================

const createLessonTypeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.enum([
    "private",
    "group",
    "clinic",
    "camp",
    "assessment",
    "other",
  ]),
  level: z
    .enum(["beginner", "novice", "intermediate", "advanced", "professional"])
    .optional(),
  defaultDuration: z.number().min(15).max(480),
  minParticipants: z.number().min(1).default(1),
  maxParticipants: z.number().min(1).max(50),
  requiresOwnHorse: z.boolean().default(false),
  color: z.string().optional(),
  pricing: z.object({
    basePrice: z.number().min(0),
    currency: z.string().default("SEK"),
    perParticipant: z.boolean().default(false),
    memberDiscount: z.number().min(0).max(100).optional(),
  }),
  cancellationPolicy: z
    .object({
      type: z.enum(["strict", "moderate", "flexible", "custom"]),
      noRefundHours: z.number().optional(),
      partialRefundHours: z.number().optional(),
      partialRefundPercent: z.number().min(0).max(100).optional(),
      fullRefundHours: z.number().optional(),
    })
    .optional(),
  isActive: z.boolean().default(true),
});

const updateLessonTypeSchema = createLessonTypeSchema.partial();

const createLessonSchema = z.object({
  lessonTypeId: z.string(),
  instructorId: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  location: z.string().optional(),
  facilityId: z.string().optional(),
  maxParticipants: z.number().min(1).optional(),
  notes: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringPatternId: z.string().optional(),
});

const updateLessonSchema = z.object({
  instructorId: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  location: z.string().optional(),
  facilityId: z.string().optional(),
  maxParticipants: z.number().min(1).optional(),
  notes: z.string().optional(),
  status: z
    .enum(["scheduled", "confirmed", "in_progress", "completed", "cancelled"])
    .optional(),
  cancellationReason: z.string().optional(),
});

const createBookingSchema = z.object({
  lessonId: z.string(),
  participantContactId: z.string(),
  horseId: z.string().optional(),
  notes: z.string().optional(),
});

const updateBookingSchema = z.object({
  status: z
    .enum([
      "pending",
      "confirmed",
      "waitlisted",
      "cancelled",
      "no_show",
      "completed",
    ])
    .optional(),
  horseId: z.string().optional(),
  notes: z.string().optional(),
  paymentStatus: z.enum(["pending", "paid", "refunded", "partial"]).optional(),
  cancellationReason: z.string().optional(),
});

const createInstructorSchema = z.object({
  userId: z.string().optional(),
  contactId: z.string().optional(),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  specializations: z.array(z.string()).optional(),
  certifications: z
    .array(
      z.object({
        name: z.string(),
        issuer: z.string().optional(),
        issuedDate: z.string().optional(),
        expiryDate: z.string().optional(),
      }),
    )
    .optional(),
  defaultRate: z.number().min(0).optional(),
  color: z.string().optional(),
  isActive: z.boolean().default(true),
});

const updateInstructorSchema = createInstructorSchema.partial();

const setAvailabilitySchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  isRecurring: z.boolean().default(true),
  specificDate: z.string().optional(),
  isAvailable: z.boolean().default(true),
  notes: z.string().optional(),
});

const createScheduleTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  lessonTypeId: z.string(),
  instructorId: z.string(),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().optional(),
  facilityId: z.string().optional(),
  maxParticipants: z.number().min(1).optional(),
  isActive: z.boolean().default(true),
  effectiveFrom: z.string().optional(),
  effectiveUntil: z.string().optional(),
});

// ============================================
// Helper Functions
// ============================================

function toFirestoreTimestamp(dateString: string): Timestamp {
  return Timestamp.fromDate(new Date(dateString));
}

function fromFirestoreTimestamp(timestamp: Timestamp): string {
  return timestamp.toDate().toISOString();
}

// ============================================
// Routes
// ============================================

export async function lessonRoutes(fastify: FastifyInstance) {
  // ==========================================
  // Lesson Types
  // ==========================================

  // Get all lesson types for organization
  fastify.get<{
    Params: { organizationId: string };
    Querystring: { includeInactive?: string };
  }>(
    "/organizations/:organizationId/lesson-types",
    {
      preHandler: [authenticate, requireOrganizationMember("organizationId")],
    },
    async (request, reply) => {
      const { organizationId } = request.params;
      const includeInactive = request.query.includeInactive === "true";

      let query = db
        .collection("organizations")
        .doc(organizationId)
        .collection("lessonTypes")
        .orderBy("name");

      if (!includeInactive) {
        query = query.where("isActive", "==", true);
      }

      const snapshot = await query.get();
      const lessonTypes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return { lessonTypes };
    },
  );

  // Create lesson type
  fastify.post<{
    Params: { organizationId: string };
    Body: z.infer<typeof createLessonTypeSchema>;
  }>(
    "/organizations/:organizationId/lesson-types",
    {
      preHandler: [authenticate, requireOrganizationMember("organizationId")],
    },
    async (request, reply) => {
      const { organizationId } = request.params;
      const validatedData = createLessonTypeSchema.parse(request.body);

      const lessonTypeRef = db
        .collection("organizations")
        .doc(organizationId)
        .collection("lessonTypes")
        .doc();

      const lessonType: Omit<LessonType, "id"> = {
        organizationId,
        ...validatedData,
        pricing: {
          ...validatedData.pricing,
          currency: validatedData.pricing?.currency || "SEK",
        },
        cancellationPolicy: validatedData.cancellationPolicy || {
          type: "moderate" as CancellationPolicyType,
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await lessonTypeRef.set(lessonType);

      return reply.status(201).send({
        id: lessonTypeRef.id,
        ...lessonType,
      });
    },
  );

  // Update lesson type
  fastify.patch<{
    Params: { organizationId: string; lessonTypeId: string };
    Body: z.infer<typeof updateLessonTypeSchema>;
  }>(
    "/organizations/:organizationId/lesson-types/:lessonTypeId",
    {
      preHandler: [authenticate, requireOrganizationMember("organizationId")],
    },
    async (request, reply) => {
      const { organizationId, lessonTypeId } = request.params;
      const validatedData = updateLessonTypeSchema.parse(request.body);

      const lessonTypeRef = db
        .collection("organizations")
        .doc(organizationId)
        .collection("lessonTypes")
        .doc(lessonTypeId);

      const doc = await lessonTypeRef.get();
      if (!doc.exists) {
        return reply.status(404).send({ error: "Lesson type not found" });
      }

      await lessonTypeRef.update({
        ...validatedData,
        updatedAt: Timestamp.now(),
      });

      const updated = await lessonTypeRef.get();
      return { id: lessonTypeId, ...updated.data() };
    },
  );

  // Delete lesson type (soft delete)
  fastify.delete<{
    Params: { organizationId: string; lessonTypeId: string };
  }>(
    "/organizations/:organizationId/lesson-types/:lessonTypeId",
    {
      preHandler: [authenticate, requireOrganizationMember("organizationId")],
    },
    async (request, reply) => {
      const { organizationId, lessonTypeId } = request.params;

      const lessonTypeRef = db
        .collection("organizations")
        .doc(organizationId)
        .collection("lessonTypes")
        .doc(lessonTypeId);

      await lessonTypeRef.update({
        isActive: false,
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    },
  );

  // ==========================================
  // Instructors
  // ==========================================

  // Get all instructors
  fastify.get<{
    Params: { organizationId: string };
    Querystring: { includeInactive?: string };
  }>(
    "/organizations/:organizationId/instructors",
    {
      preHandler: [authenticate, requireOrganizationMember("organizationId")],
    },
    async (request, reply) => {
      const { organizationId } = request.params;
      const includeInactive = request.query.includeInactive === "true";

      let query = db
        .collection("organizations")
        .doc(organizationId)
        .collection("instructors")
        .orderBy("name");

      if (!includeInactive) {
        query = query.where("isActive", "==", true);
      }

      const snapshot = await query.get();
      const instructors = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return { instructors };
    },
  );

  // Create instructor
  fastify.post<{
    Params: { organizationId: string };
    Body: z.infer<typeof createInstructorSchema>;
  }>(
    "/organizations/:organizationId/instructors",
    {
      preHandler: [authenticate, requireOrganizationMember("organizationId")],
    },
    async (request, reply) => {
      const { organizationId } = request.params;
      const validatedData = createInstructorSchema.parse(request.body);

      const instructorRef = db
        .collection("organizations")
        .doc(organizationId)
        .collection("instructors")
        .doc();

      const instructor: Omit<Instructor, "id"> = {
        organizationId,
        ...validatedData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await instructorRef.set(instructor);

      return reply.status(201).send({
        id: instructorRef.id,
        ...instructor,
      });
    },
  );

  // Update instructor
  fastify.patch<{
    Params: { organizationId: string; instructorId: string };
    Body: z.infer<typeof updateInstructorSchema>;
  }>(
    "/organizations/:organizationId/instructors/:instructorId",
    {
      preHandler: [authenticate, requireOrganizationMember("organizationId")],
    },
    async (request, reply) => {
      const { organizationId, instructorId } = request.params;
      const validatedData = updateInstructorSchema.parse(request.body);

      const instructorRef = db
        .collection("organizations")
        .doc(organizationId)
        .collection("instructors")
        .doc(instructorId);

      const doc = await instructorRef.get();
      if (!doc.exists) {
        return reply.status(404).send({ error: "Instructor not found" });
      }

      await instructorRef.update({
        ...validatedData,
        updatedAt: Timestamp.now(),
      });

      const updated = await instructorRef.get();
      return { id: instructorId, ...updated.data() };
    },
  );

  // Set instructor availability
  fastify.post<{
    Params: { organizationId: string; instructorId: string };
    Body: z.infer<typeof setAvailabilitySchema>;
  }>(
    "/organizations/:organizationId/instructors/:instructorId/availability",
    {
      preHandler: [authenticate, requireOrganizationMember("organizationId")],
    },
    async (request, reply) => {
      const { organizationId, instructorId } = request.params;
      const validatedData = setAvailabilitySchema.parse(request.body);

      const availabilityRef = db
        .collection("organizations")
        .doc(organizationId)
        .collection("instructors")
        .doc(instructorId)
        .collection("availability")
        .doc();

      const availability: Omit<InstructorAvailability, "id"> = {
        instructorId,
        organizationId,
        ...validatedData,
        specificDate: validatedData.specificDate
          ? toFirestoreTimestamp(validatedData.specificDate)
          : undefined,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await availabilityRef.set(availability);

      return reply.status(201).send({
        id: availabilityRef.id,
        ...availability,
      });
    },
  );

  // Get instructor availability
  fastify.get<{
    Params: { organizationId: string; instructorId: string };
    Querystring: { startDate?: string; endDate?: string };
  }>(
    "/organizations/:organizationId/instructors/:instructorId/availability",
    {
      preHandler: [authenticate, requireOrganizationMember("organizationId")],
    },
    async (request, reply) => {
      const { organizationId, instructorId } = request.params;

      const snapshot = await db
        .collection("organizations")
        .doc(organizationId)
        .collection("instructors")
        .doc(instructorId)
        .collection("availability")
        .get();

      const availability = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return { availability };
    },
  );

  // ==========================================
  // Lessons
  // ==========================================

  // Get lessons for organization
  fastify.get<{
    Params: { organizationId: string };
    Querystring: {
      startDate?: string;
      endDate?: string;
      instructorId?: string;
      lessonTypeId?: string;
      status?: string;
      limit?: string;
      offset?: string;
    };
  }>(
    "/organizations/:organizationId/lessons",
    {
      preHandler: [authenticate, requireOrganizationMember("organizationId")],
    },
    async (request, reply) => {
      const { organizationId } = request.params;
      const {
        startDate,
        endDate,
        instructorId,
        lessonTypeId,
        status,
        limit = "50",
        offset = "0",
      } = request.query;

      let query: FirebaseFirestore.Query = db
        .collection("organizations")
        .doc(organizationId)
        .collection("lessons")
        .orderBy("startTime", "desc");

      if (startDate) {
        query = query.where("startTime", ">=", toFirestoreTimestamp(startDate));
      }
      if (endDate) {
        query = query.where("startTime", "<=", toFirestoreTimestamp(endDate));
      }
      if (instructorId) {
        query = query.where("instructorId", "==", instructorId);
      }
      if (lessonTypeId) {
        query = query.where("lessonTypeId", "==", lessonTypeId);
      }
      if (status) {
        query = query.where("status", "==", status);
      }

      const snapshot = await query
        .limit(parseInt(limit))
        .offset(parseInt(offset))
        .get();

      const lessons = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        lessons,
        total: lessons.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
      };
    },
  );

  // Get single lesson with bookings
  fastify.get<{
    Params: { organizationId: string; lessonId: string };
  }>(
    "/organizations/:organizationId/lessons/:lessonId",
    {
      preHandler: [authenticate, requireOrganizationMember("organizationId")],
    },
    async (request, reply) => {
      const { organizationId, lessonId } = request.params;

      const lessonRef = db
        .collection("organizations")
        .doc(organizationId)
        .collection("lessons")
        .doc(lessonId);

      const lessonDoc = await lessonRef.get();
      if (!lessonDoc.exists) {
        return reply.status(404).send({ error: "Lesson not found" });
      }

      // Get bookings for this lesson
      const bookingsSnapshot = await lessonRef.collection("bookings").get();
      const bookings = bookingsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        lesson: { id: lessonId, ...lessonDoc.data() },
        bookings,
      };
    },
  );

  // Create lesson
  fastify.post<{
    Params: { organizationId: string };
    Body: z.infer<typeof createLessonSchema>;
  }>(
    "/organizations/:organizationId/lessons",
    {
      preHandler: [authenticate, requireOrganizationMember("organizationId")],
    },
    async (request, reply) => {
      const { organizationId } = request.params;
      const auth = request as AuthenticatedRequest;
      const validatedData = createLessonSchema.parse(request.body);

      // Verify lesson type exists
      const lessonTypeDoc = await db
        .collection("organizations")
        .doc(organizationId)
        .collection("lessonTypes")
        .doc(validatedData.lessonTypeId)
        .get();

      if (!lessonTypeDoc.exists) {
        return reply.status(400).send({ error: "Lesson type not found" });
      }

      // Verify instructor exists
      const instructorDoc = await db
        .collection("organizations")
        .doc(organizationId)
        .collection("instructors")
        .doc(validatedData.instructorId)
        .get();

      if (!instructorDoc.exists) {
        return reply.status(400).send({ error: "Instructor not found" });
      }

      const lessonTypeData = lessonTypeDoc.data() as LessonType;

      const lessonRef = db
        .collection("organizations")
        .doc(organizationId)
        .collection("lessons")
        .doc();

      const lesson: Omit<Lesson, "id"> = {
        organizationId,
        lessonTypeId: validatedData.lessonTypeId,
        lessonTypeName: lessonTypeData.name,
        instructorId: validatedData.instructorId,
        instructorName: (instructorDoc.data() as Instructor).name,
        startTime: toFirestoreTimestamp(validatedData.startTime),
        endTime: toFirestoreTimestamp(validatedData.endTime),
        location: validatedData.location,
        facilityId: validatedData.facilityId,
        status: "scheduled" as LessonStatus,
        maxParticipants:
          validatedData.maxParticipants || lessonTypeData.maxParticipants,
        currentParticipants: 0,
        waitlistCount: 0,
        price: lessonTypeData.pricing.basePrice,
        currency: lessonTypeData.pricing.currency,
        notes: validatedData.notes,
        isRecurring: validatedData.isRecurring,
        recurringPatternId: validatedData.recurringPatternId,
        createdBy: auth.user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await lessonRef.set(lesson);

      return reply.status(201).send({
        id: lessonRef.id,
        ...lesson,
      });
    },
  );

  // Update lesson
  fastify.patch<{
    Params: { organizationId: string; lessonId: string };
    Body: z.infer<typeof updateLessonSchema>;
  }>(
    "/organizations/:organizationId/lessons/:lessonId",
    {
      preHandler: [authenticate, requireOrganizationMember("organizationId")],
    },
    async (request, reply) => {
      const { organizationId, lessonId } = request.params;
      const validatedData = updateLessonSchema.parse(request.body);

      const lessonRef = db
        .collection("organizations")
        .doc(organizationId)
        .collection("lessons")
        .doc(lessonId);

      const lessonDoc = await lessonRef.get();
      if (!lessonDoc.exists) {
        return reply.status(404).send({ error: "Lesson not found" });
      }

      const updateData: Record<string, unknown> = {
        ...validatedData,
        updatedAt: Timestamp.now(),
      };

      // Convert date strings to Timestamps
      if (validatedData.startTime) {
        updateData.startTime = toFirestoreTimestamp(validatedData.startTime);
      }
      if (validatedData.endTime) {
        updateData.endTime = toFirestoreTimestamp(validatedData.endTime);
      }

      // Update instructor name if instructor changed
      if (validatedData.instructorId) {
        const instructorDoc = await db
          .collection("organizations")
          .doc(organizationId)
          .collection("instructors")
          .doc(validatedData.instructorId)
          .get();

        if (instructorDoc.exists) {
          updateData.instructorName = (instructorDoc.data() as Instructor).name;
        }
      }

      await lessonRef.update(updateData);

      const updated = await lessonRef.get();
      return { id: lessonId, ...updated.data() };
    },
  );

  // Cancel lesson
  fastify.post<{
    Params: { organizationId: string; lessonId: string };
    Body: { reason?: string; notifyParticipants?: boolean };
  }>(
    "/organizations/:organizationId/lessons/:lessonId/cancel",
    {
      preHandler: [authenticate, requireOrganizationMember("organizationId")],
    },
    async (request, reply) => {
      const { organizationId, lessonId } = request.params;
      const { reason, notifyParticipants = true } = request.body || {};

      const lessonRef = db
        .collection("organizations")
        .doc(organizationId)
        .collection("lessons")
        .doc(lessonId);

      const lessonDoc = await lessonRef.get();
      if (!lessonDoc.exists) {
        return reply.status(404).send({ error: "Lesson not found" });
      }

      await lessonRef.update({
        status: "cancelled",
        cancellationReason: reason,
        cancelledAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Update all bookings to cancelled
      const bookingsSnapshot = await lessonRef.collection("bookings").get();
      const batch = db.batch();
      bookingsSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          status: "cancelled",
          cancellationReason: "Lesson cancelled",
          updatedAt: Timestamp.now(),
        });
      });
      await batch.commit();

      // TODO: If notifyParticipants, trigger notification to all participants

      return { success: true };
    },
  );

  // ==========================================
  // Bookings
  // ==========================================

  // Get bookings for a lesson
  fastify.get<{
    Params: { organizationId: string; lessonId: string };
  }>(
    "/organizations/:organizationId/lessons/:lessonId/bookings",
    {
      preHandler: [authenticate, requireOrganizationMember("organizationId")],
    },
    async (request, reply) => {
      const { organizationId, lessonId } = request.params;

      const snapshot = await db
        .collection("organizations")
        .doc(organizationId)
        .collection("lessons")
        .doc(lessonId)
        .collection("bookings")
        .orderBy("createdAt")
        .get();

      const bookings = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return { bookings };
    },
  );

  // Create booking
  fastify.post<{
    Params: { organizationId: string; lessonId: string };
    Body: z.infer<typeof createBookingSchema>;
  }>(
    "/organizations/:organizationId/lessons/:lessonId/bookings",
    {
      preHandler: [authenticate, requireOrganizationMember("organizationId")],
    },
    async (request, reply) => {
      const { organizationId, lessonId } = request.params;
      const auth = request as AuthenticatedRequest;
      const validatedData = createBookingSchema.parse(request.body);

      const lessonRef = db
        .collection("organizations")
        .doc(organizationId)
        .collection("lessons")
        .doc(lessonId);

      const lessonDoc = await lessonRef.get();
      if (!lessonDoc.exists) {
        return reply.status(404).send({ error: "Lesson not found" });
      }

      const lessonData = lessonDoc.data() as Lesson;

      // Check if lesson is available
      if (
        lessonData.status !== "scheduled" &&
        lessonData.status !== "confirmed"
      ) {
        return reply
          .status(400)
          .send({ error: "Lesson is not available for booking" });
      }

      // Check capacity
      const isWaitlisted =
        lessonData.currentParticipants >= lessonData.maxParticipants;

      // Get contact info
      const contactDoc = await db
        .collection("organizations")
        .doc(organizationId)
        .collection("contacts")
        .doc(validatedData.participantContactId)
        .get();

      const contactName = contactDoc.exists
        ? `${contactDoc.data()?.firstName || ""} ${contactDoc.data()?.lastName || ""}`.trim()
        : "Unknown";

      const bookingRef = lessonRef.collection("bookings").doc();

      const booking: Omit<LessonBooking, "id"> = {
        lessonId,
        organizationId,
        participantContactId: validatedData.participantContactId,
        participantName: contactName,
        horseId: validatedData.horseId,
        status: isWaitlisted ? "waitlisted" : ("pending" as BookingStatus),
        paymentStatus: "pending",
        amountDue: lessonData.price,
        currency: lessonData.currency,
        notes: validatedData.notes,
        bookedBy: auth.user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await bookingRef.set(booking);

      // Update lesson participant count
      await lessonRef.update({
        currentParticipants: isWaitlisted
          ? lessonData.currentParticipants
          : lessonData.currentParticipants + 1,
        waitlistCount: isWaitlisted
          ? (lessonData.waitlistCount || 0) + 1
          : lessonData.waitlistCount || 0,
        updatedAt: Timestamp.now(),
      });

      return reply.status(201).send({
        id: bookingRef.id,
        ...booking,
        isWaitlisted,
      });
    },
  );

  // Update booking
  fastify.patch<{
    Params: { organizationId: string; lessonId: string; bookingId: string };
    Body: z.infer<typeof updateBookingSchema>;
  }>(
    "/organizations/:organizationId/lessons/:lessonId/bookings/:bookingId",
    {
      preHandler: [authenticate, requireOrganizationMember("organizationId")],
    },
    async (request, reply) => {
      const { organizationId, lessonId, bookingId } = request.params;
      const validatedData = updateBookingSchema.parse(request.body);

      const bookingRef = db
        .collection("organizations")
        .doc(organizationId)
        .collection("lessons")
        .doc(lessonId)
        .collection("bookings")
        .doc(bookingId);

      const bookingDoc = await bookingRef.get();
      if (!bookingDoc.exists) {
        return reply.status(404).send({ error: "Booking not found" });
      }

      const previousStatus = (bookingDoc.data() as LessonBooking).status;

      await bookingRef.update({
        ...validatedData,
        updatedAt: Timestamp.now(),
      });

      // If cancelling, update lesson counts
      if (
        validatedData.status === "cancelled" &&
        previousStatus !== "cancelled"
      ) {
        const lessonRef = db
          .collection("organizations")
          .doc(organizationId)
          .collection("lessons")
          .doc(lessonId);

        const lessonDoc = await lessonRef.get();
        const lessonData = lessonDoc.data() as Lesson;

        if (previousStatus === "waitlisted") {
          await lessonRef.update({
            waitlistCount: Math.max(0, (lessonData.waitlistCount || 0) - 1),
            updatedAt: Timestamp.now(),
          });
        } else {
          await lessonRef.update({
            currentParticipants: Math.max(
              0,
              lessonData.currentParticipants - 1,
            ),
            updatedAt: Timestamp.now(),
          });
        }
      }

      const updated = await bookingRef.get();
      return { id: bookingId, ...updated.data() };
    },
  );

  // Cancel booking
  fastify.post<{
    Params: { organizationId: string; lessonId: string; bookingId: string };
    Body: { reason?: string };
  }>(
    "/organizations/:organizationId/lessons/:lessonId/bookings/:bookingId/cancel",
    {
      preHandler: [authenticate, requireOrganizationMember("organizationId")],
    },
    async (request, reply) => {
      const { organizationId, lessonId, bookingId } = request.params;
      const { reason } = request.body || {};

      const bookingRef = db
        .collection("organizations")
        .doc(organizationId)
        .collection("lessons")
        .doc(lessonId)
        .collection("bookings")
        .doc(bookingId);

      const bookingDoc = await bookingRef.get();
      if (!bookingDoc.exists) {
        return reply.status(404).send({ error: "Booking not found" });
      }

      const bookingData = bookingDoc.data() as LessonBooking;
      if (bookingData.status === "cancelled") {
        return reply.status(400).send({ error: "Booking already cancelled" });
      }

      const wasWaitlisted = bookingData.status === "waitlisted";

      await bookingRef.update({
        status: "cancelled",
        cancellationReason: reason,
        cancelledAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Update lesson counts
      const lessonRef = db
        .collection("organizations")
        .doc(organizationId)
        .collection("lessons")
        .doc(lessonId);

      const lessonDoc = await lessonRef.get();
      const lessonData = lessonDoc.data() as Lesson;

      if (wasWaitlisted) {
        await lessonRef.update({
          waitlistCount: Math.max(0, (lessonData.waitlistCount || 0) - 1),
          updatedAt: Timestamp.now(),
        });
      } else {
        await lessonRef.update({
          currentParticipants: Math.max(0, lessonData.currentParticipants - 1),
          updatedAt: Timestamp.now(),
        });

        // TODO: Promote first waitlisted person if any
      }

      return { success: true };
    },
  );

  // ==========================================
  // Schedule Templates
  // ==========================================

  // Get schedule templates
  fastify.get<{
    Params: { organizationId: string };
  }>(
    "/organizations/:organizationId/lesson-schedule-templates",
    {
      preHandler: [authenticate, requireOrganizationMember("organizationId")],
    },
    async (request, reply) => {
      const { organizationId } = request.params;

      const snapshot = await db
        .collection("organizations")
        .doc(organizationId)
        .collection("lessonScheduleTemplates")
        .where("isActive", "==", true)
        .orderBy("dayOfWeek")
        .orderBy("startTime")
        .get();

      const templates = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return { templates };
    },
  );

  // Create schedule template
  fastify.post<{
    Params: { organizationId: string };
    Body: z.infer<typeof createScheduleTemplateSchema>;
  }>(
    "/organizations/:organizationId/lesson-schedule-templates",
    {
      preHandler: [authenticate, requireOrganizationMember("organizationId")],
    },
    async (request, reply) => {
      const { organizationId } = request.params;
      const validatedData = createScheduleTemplateSchema.parse(request.body);

      const templateRef = db
        .collection("organizations")
        .doc(organizationId)
        .collection("lessonScheduleTemplates")
        .doc();

      const template: Omit<LessonScheduleTemplate, "id"> = {
        organizationId,
        ...validatedData,
        effectiveFrom: validatedData.effectiveFrom
          ? toFirestoreTimestamp(validatedData.effectiveFrom)
          : undefined,
        effectiveUntil: validatedData.effectiveUntil
          ? toFirestoreTimestamp(validatedData.effectiveUntil)
          : undefined,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await templateRef.set(template);

      return reply.status(201).send({
        id: templateRef.id,
        ...template,
      });
    },
  );

  // Generate lessons from templates for a date range
  fastify.post<{
    Params: { organizationId: string };
    Body: { startDate: string; endDate: string };
  }>(
    "/organizations/:organizationId/lessons/generate-from-templates",
    {
      preHandler: [authenticate, requireOrganizationMember("organizationId")],
    },
    async (request, reply) => {
      const { organizationId } = request.params;
      const auth = request as AuthenticatedRequest;
      const { startDate, endDate } = request.body;

      // Get active templates
      const templatesSnapshot = await db
        .collection("organizations")
        .doc(organizationId)
        .collection("lessonScheduleTemplates")
        .where("isActive", "==", true)
        .get();

      const templates = templatesSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as LessonScheduleTemplate,
      );

      // Generate lessons for each day in range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const createdLessons: string[] = [];

      for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay();

        for (const template of templates) {
          if (template.dayOfWeek !== dayOfWeek) continue;

          // Check effective dates
          if (
            template.effectiveFrom &&
            date < (template.effectiveFrom as Timestamp).toDate()
          )
            continue;
          if (
            template.effectiveUntil &&
            date > (template.effectiveUntil as Timestamp).toDate()
          )
            continue;

          // Create lesson
          const [startHour, startMin] = template.startTime
            .split(":")
            .map(Number);
          const [endHour, endMin] = template.endTime.split(":").map(Number);

          const lessonStart = new Date(date);
          lessonStart.setHours(startHour, startMin, 0, 0);

          const lessonEnd = new Date(date);
          lessonEnd.setHours(endHour, endMin, 0, 0);

          // Get lesson type info
          const lessonTypeDoc = await db
            .collection("organizations")
            .doc(organizationId)
            .collection("lessonTypes")
            .doc(template.lessonTypeId)
            .get();

          const lessonType = lessonTypeDoc.data() as LessonType;

          // Get instructor info
          const instructorDoc = await db
            .collection("organizations")
            .doc(organizationId)
            .collection("instructors")
            .doc(template.instructorId)
            .get();

          const instructor = instructorDoc.data() as Instructor;

          const lessonRef = db
            .collection("organizations")
            .doc(organizationId)
            .collection("lessons")
            .doc();

          const lesson: Omit<Lesson, "id"> = {
            organizationId,
            lessonTypeId: template.lessonTypeId,
            lessonTypeName: lessonType?.name || template.name,
            instructorId: template.instructorId,
            instructorName: instructor?.name || "Unknown",
            startTime: Timestamp.fromDate(lessonStart),
            endTime: Timestamp.fromDate(lessonEnd),
            location: template.location,
            facilityId: template.facilityId,
            status: "scheduled",
            maxParticipants:
              template.maxParticipants || lessonType?.maxParticipants || 1,
            currentParticipants: 0,
            waitlistCount: 0,
            price: lessonType?.pricing?.basePrice || 0,
            currency: lessonType?.pricing?.currency || "SEK",
            isRecurring: true,
            scheduleTemplateId: template.id,
            createdBy: auth.user.uid,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };

          await lessonRef.set(lesson);
          createdLessons.push(lessonRef.id);
        }
      }

      return {
        success: true,
        createdCount: createdLessons.length,
        lessonIds: createdLessons,
      };
    },
  );
}
