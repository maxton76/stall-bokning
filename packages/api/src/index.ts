import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { stablesRoutes } from "./routes/stables.js";
import { schedulesRoutes } from "./routes/schedules.js";
import { shiftsRoutes } from "./routes/shifts.js";
import { organizationsRoutes } from "./routes/organizations.js";
import { horsesRoutes } from "./routes/horses.js";
import { vaccinationRecordsRoutes } from "./routes/vaccination-records.js";
import { locationHistoryRoutes } from "./routes/location-history.js";
import { vaccinationRulesRoutes } from "./routes/vaccination-rules.js";
import { activitiesRoutes } from "./routes/activities.js";
import { activityTypesRoutes } from "./routes/activity-types.js";
import { contactsRoutes } from "./routes/contacts.js";
import { facilitiesRoutes } from "./routes/facilities.js";
import { facilityReservationsRoutes } from "./routes/facility-reservations.js";
import inviteRoutes from "./routes/invites.js";
import organizationMemberRoutes from "./routes/organizationMembers.js";
import authRoutes from "./routes/auth.js";
import { shiftTypesRoutes } from "./routes/shift-types.js";
import { horseGroupsRoutes } from "./routes/horse-groups.js";
import { healthRecordsRoutes } from "./routes/health-records.js";
import { horseOwnershipRoutes } from "./routes/horse-ownership.js";
import { horseMediaRoutes } from "./routes/horse-media.js";
import { horseTeamRoutes } from "./routes/horse-team.js";
import { horseTackRoutes } from "./routes/horse-tack.js";
import { auditLogsRoutes } from "./routes/audit-logs.js";
import { feedTypesRoutes } from "./routes/feed-types.js";
import { feedingTimesRoutes } from "./routes/feeding-times.js";
import { horseFeedingsRoutes } from "./routes/horse-feedings.js";
import { feedingHistoryRoutes } from "./routes/feeding-history.js";
import { availabilityRoutes } from "./routes/availability.js";
import { recurringActivitiesRoutes } from "./routes/recurring-activities.js";
import { notificationsRoutes } from "./routes/notifications.js";
import { pedigreeRoutes } from "./routes/pedigree.js";
import { transportRoutes } from "./routes/transport.js";
import { inventoryRoutes } from "./routes/inventory.js";
import { invoicesRoutes } from "./routes/invoices.js";
import { communicationsRoutes } from "./routes/communications.js";
import { portalRoutes } from "./routes/portal.js";
import { lessonRoutes } from "./routes/lessons.js";
import { paymentsRoutes } from "./routes/payments.js";
import { assistantRoutes } from "./routes/assistant.js";
import { routinesRoutes } from "./routes/routines.js";
import { routineSchedulesRoutes } from "./routes/routine-schedules.js";
import { dailyNotesRoutes } from "./routes/daily-notes.js";
import { horseActivityHistoryRoutes } from "./routes/horse-activity-history.js";
import { fairnessRoutes } from "./routes/fairness.js";
import { settingsRoutes } from "./routes/settings.js";

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "0.0.0.0";
const NODE_ENV = process.env.NODE_ENV || "development";

// Create Fastify instance with logging
const fastify = Fastify({
  logger: {
    level: NODE_ENV === "development" ? "debug" : "info",
    transport:
      NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: {
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
              colorize: true,
            },
          }
        : undefined,
  },
});

// Register CORS
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

// Register rate limiting
await fastify.register(rateLimit, {
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  timeWindow: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  cache: 10000,
  allowList: NODE_ENV === "development" ? ["127.0.0.1", "localhost"] : [],
  skipOnError: true,
});

// Health check endpoint
fastify.get("/health", async () => {
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime(),
  };
});

// API version endpoint
fastify.get("/api/v1", async () => {
  return {
    version: "1.0.0",
    name: "Stall Bokning API",
    documentation: "/api/v1/docs",
  };
});

// Register API routes
await fastify.register(authRoutes, { prefix: "/api/v1/auth" });
await fastify.register(stablesRoutes, { prefix: "/api/v1/stables" });
await fastify.register(schedulesRoutes, { prefix: "/api/v1/schedules" });
await fastify.register(shiftsRoutes, { prefix: "/api/v1/shifts" });
await fastify.register(organizationsRoutes, {
  prefix: "/api/v1/organizations",
});
await fastify.register(horsesRoutes, { prefix: "/api/v1/horses" });
await fastify.register(vaccinationRecordsRoutes, {
  prefix: "/api/v1/vaccination-records",
});
await fastify.register(locationHistoryRoutes, {
  prefix: "/api/v1/location-history",
});
await fastify.register(vaccinationRulesRoutes, {
  prefix: "/api/v1/vaccination-rules",
});
await fastify.register(activitiesRoutes, { prefix: "/api/v1/activities" });
await fastify.register(activityTypesRoutes, {
  prefix: "/api/v1/activity-types",
});
await fastify.register(contactsRoutes, { prefix: "/api/v1/contacts" });
await fastify.register(facilitiesRoutes, { prefix: "/api/v1/facilities" });
await fastify.register(facilityReservationsRoutes, {
  prefix: "/api/v1/facility-reservations",
});
await fastify.register(inviteRoutes, { prefix: "/api/v1/invites" });
await fastify.register(organizationMemberRoutes, {
  prefix: "/api/v1/organization-members",
});
await fastify.register(shiftTypesRoutes, { prefix: "/api/v1/shift-types" });
await fastify.register(horseGroupsRoutes, { prefix: "/api/v1/horse-groups" });
await fastify.register(healthRecordsRoutes, {
  prefix: "/api/v1/health-records",
});
await fastify.register(horseOwnershipRoutes, {
  prefix: "/api/v1/horse-ownership",
});
await fastify.register(horseMediaRoutes, { prefix: "/api/v1/horse-media" });
await fastify.register(horseTeamRoutes, { prefix: "/api/v1" });
await fastify.register(horseTackRoutes, { prefix: "/api/v1" });
await fastify.register(auditLogsRoutes, { prefix: "/api/v1/audit-logs" });
await fastify.register(feedTypesRoutes, { prefix: "/api/v1/feed-types" });
await fastify.register(feedingTimesRoutes, { prefix: "/api/v1/feeding-times" });
await fastify.register(horseFeedingsRoutes, {
  prefix: "/api/v1/horse-feedings",
});
await fastify.register(feedingHistoryRoutes, {
  prefix: "/api/v1/feeding-history",
});
await fastify.register(availabilityRoutes, {
  prefix: "/api/v1/availability",
});
await fastify.register(recurringActivitiesRoutes, {
  prefix: "/api/v1/recurring-activities",
});
await fastify.register(notificationsRoutes, {
  prefix: "/api/v1/notifications",
});
await fastify.register(pedigreeRoutes, { prefix: "/api/v1" });
await fastify.register(transportRoutes, { prefix: "/api/v1" });
await fastify.register(inventoryRoutes, { prefix: "/api/v1/inventory" });
await fastify.register(invoicesRoutes, { prefix: "/api/v1/invoices" });
await fastify.register(communicationsRoutes, { prefix: "/api/v1" });
await fastify.register(portalRoutes, { prefix: "/api/v1/portal" });
await fastify.register(lessonRoutes, { prefix: "/api/v1" });
await fastify.register(paymentsRoutes, { prefix: "/api/v1" });
await fastify.register(assistantRoutes, { prefix: "/api/v1" });
await fastify.register(routinesRoutes, { prefix: "/api/v1/routines" });
await fastify.register(routineSchedulesRoutes, {
  prefix: "/api/v1/routine-schedules",
});
await fastify.register(dailyNotesRoutes, { prefix: "/api/v1/daily-notes" });
await fastify.register(horseActivityHistoryRoutes, {
  prefix: "/api/v1/horse-activity-history",
});
await fastify.register(fairnessRoutes, { prefix: "/api/v1/fairness" });
await fastify.register(settingsRoutes, { prefix: "/api/v1/settings" });

// 404 handler
fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    error: "Not Found",
    message: `Route ${request.method} ${request.url} not found`,
    statusCode: 404,
  });
});

// Global error handler
fastify.setErrorHandler(
  (error: Error & { statusCode?: number }, request, reply) => {
    request.log.error({ error }, "Unhandled error");

    // Don't leak error details in production
    const message =
      NODE_ENV === "development"
        ? error.message
        : "An unexpected error occurred";

    reply.status(error.statusCode || 500).send({
      error: error.name || "Internal Server Error",
      message,
      statusCode: error.statusCode || 500,
    });
  },
);

// Graceful shutdown
const closeGracefully = async (signal: string) => {
  fastify.log.info(`Received signal to terminate: ${signal}`);
  await fastify.close();
  process.exit(0);
};

process.on("SIGINT", () => closeGracefully("SIGINT"));
process.on("SIGTERM", () => closeGracefully("SIGTERM"));

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`🚀 API Gateway running on http://${HOST}:${PORT}`);
    fastify.log.info(`📊 Health check: http://${HOST}:${PORT}/health`);
    fastify.log.info(`🌍 Environment: ${NODE_ENV}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
