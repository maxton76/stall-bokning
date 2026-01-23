import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";
import { hasStableAccess } from "../utils/authorization.js";
import {
  updateDailyNotesSchema,
  getDailyNotesQuerySchema,
} from "../schemas/routines.js";
import type {
  DailyNotes,
  HorseDailyNote,
  DailyAlert,
  UpdateDailyNotesInput,
} from "@stall-bokning/shared";

export async function dailyNotesRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // DAILY NOTES CRUD
  // ============================================================================

  /**
   * GET /api/v1/daily-notes/:stableId
   * Get daily notes for a stable on a specific date (shorthand route)
   */
  fastify.get(
    "/:stableId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { stableId } = request.params as { stableId: string };
        const user = (request as AuthenticatedRequest).user!;
        const query = request.query as Record<string, string>;

        const hasAccess = await hasStableAccess(stableId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this stable",
          });
        }

        const parsedQuery = getDailyNotesQuerySchema.safeParse(query);
        if (!parsedQuery.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid query parameters",
            details: parsedQuery.error.issues,
          });
        }

        // Default to today's date if not specified
        const date =
          parsedQuery.data.date || new Date().toISOString().split("T")[0];

        const docId = `${stableId}_${date}`;
        const doc = await db.collection("dailyNotes").doc(docId).get();

        if (!doc.exists) {
          // Return empty notes structure
          return {
            notes: {
              id: docId,
              organizationId: "",
              stableId,
              date,
              generalNotes: null,
              weatherNotes: null,
              horseNotes: [],
              alerts: [],
              createdAt: null,
              updatedAt: null,
              lastUpdatedBy: null,
            },
          };
        }

        return {
          notes: serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch daily notes");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch daily notes",
        });
      }
    },
  );

  /**
   * GET /api/v1/daily-notes/stable/:stableId
   * Get daily notes for a stable on a specific date
   */
  fastify.get(
    "/stable/:stableId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { stableId } = request.params as { stableId: string };
        const user = (request as AuthenticatedRequest).user!;
        const query = request.query as Record<string, string>;

        const hasAccess = await hasStableAccess(stableId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this stable",
          });
        }

        const parsedQuery = getDailyNotesQuerySchema.safeParse(query);
        if (!parsedQuery.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid query parameters",
            details: parsedQuery.error.issues,
          });
        }

        // Default to today's date if not specified
        const date =
          parsedQuery.data.date || new Date().toISOString().split("T")[0];

        const docId = `${stableId}_${date}`;
        const doc = await db.collection("dailyNotes").doc(docId).get();

        if (!doc.exists) {
          // Return empty notes structure
          return {
            id: docId,
            organizationId: "",
            stableId,
            date,
            generalNotes: null,
            weatherNotes: null,
            horseNotes: [],
            alerts: [],
            createdAt: null,
            updatedAt: null,
            lastUpdatedBy: null,
          };
        }

        return serializeTimestamps({
          id: doc.id,
          ...doc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch daily notes");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch daily notes",
        });
      }
    },
  );

  /**
   * PUT /api/v1/daily-notes/stable/:stableId
   * Create or update daily notes for a stable
   */
  fastify.put(
    "/stable/:stableId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { stableId } = request.params as { stableId: string };
        const user = (request as AuthenticatedRequest).user!;
        const parsed = updateDailyNotesSchema.safeParse({
          ...(request.body as object),
          stableId,
        });

        if (!parsed.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: parsed.error.issues,
          });
        }

        const hasAccess = await hasStableAccess(stableId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to update notes for this stable",
          });
        }

        const input = parsed.data as UpdateDailyNotesInput;
        const docId = `${stableId}_${input.date}`;
        const now = Timestamp.now();

        // Get existing document or create new
        const existingDoc = await db.collection("dailyNotes").doc(docId).get();
        const existingData = existingDoc.exists
          ? (existingDoc.data() as DailyNotes)
          : null;

        // Get stable to get organizationId
        const stableDoc = await db.collection("stables").doc(stableId).get();
        const stableData = stableDoc.data();
        const organizationId = stableData?.organizationId || "";

        // Process horse notes
        let horseNotes: HorseDailyNote[] = existingData?.horseNotes || [];
        if (input.horseNotes) {
          // Get horse names for denormalization
          const horseIds = input.horseNotes.map((n) => n.horseId);
          const horseNames: Record<string, string> = {};

          if (horseIds.length > 0) {
            const horseDocs = await Promise.all(
              horseIds.map((id) => db.collection("horses").doc(id).get()),
            );
            horseDocs.forEach((doc) => {
              if (doc.exists) {
                horseNames[doc.id] = doc.data()?.name || "Unknown";
              }
            });
          }

          horseNotes = input.horseNotes.map((note) => ({
            id: uuidv4(),
            horseId: note.horseId,
            horseName: horseNames[note.horseId] || "Unknown",
            note: note.note,
            priority: note.priority,
            category: note.category,
            createdAt: now,
            createdBy: user.uid,
          }));
        }

        // Process alerts
        let alerts: DailyAlert[] = existingData?.alerts || [];
        if (input.alerts) {
          // Get horse names for affected horses
          const allHorseIds = input.alerts.flatMap(
            (a) => a.affectedHorseIds || [],
          );
          const horseNames: Record<string, string> = {};

          if (allHorseIds.length > 0) {
            const horseDocs = await Promise.all(
              [...new Set(allHorseIds)].map((id) =>
                db.collection("horses").doc(id).get(),
              ),
            );
            horseDocs.forEach((doc) => {
              if (doc.exists) {
                horseNames[doc.id] = doc.data()?.name || "Unknown";
              }
            });
          }

          alerts = input.alerts.map((alert) => ({
            id: uuidv4(),
            title: alert.title,
            message: alert.message,
            priority: alert.priority,
            affectedHorseIds: alert.affectedHorseIds,
            affectedHorseNames: alert.affectedHorseIds?.map(
              (id) => horseNames[id] || "Unknown",
            ),
            expiresAt: alert.expiresAt
              ? Timestamp.fromDate(new Date(alert.expiresAt as string))
              : undefined,
            createdAt: now,
            createdBy: user.uid,
          }));
        }

        // Get user name for denormalization
        const userDoc = await db.collection("users").doc(user.uid).get();
        const userName = userDoc.exists
          ? userDoc.data()?.displayName || user.email
          : user.email;

        const notesData: DailyNotes = {
          id: docId,
          organizationId,
          stableId,
          date: input.date,
          generalNotes: input.generalNotes ?? existingData?.generalNotes,
          weatherNotes: input.weatherNotes ?? existingData?.weatherNotes,
          horseNotes,
          alerts,
          createdAt: existingData?.createdAt || now,
          updatedAt: now,
          lastUpdatedBy: user.uid,
          lastUpdatedByName: userName,
        };

        await db.collection("dailyNotes").doc(docId).set(notesData);

        return serializeTimestamps(notesData);
      } catch (error) {
        request.log.error({ error }, "Failed to update daily notes");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update daily notes",
        });
      }
    },
  );

  /**
   * POST /api/v1/daily-notes/stable/:stableId/horse-note
   * Add a single horse note
   */
  fastify.post(
    "/stable/:stableId/horse-note",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { stableId } = request.params as { stableId: string };
        const user = (request as AuthenticatedRequest).user!;
        const { date, horseId, note, priority, category } = request.body as {
          date: string;
          horseId: string;
          note: string;
          priority: "info" | "warning" | "critical";
          category?: string;
        };

        const hasAccess = await hasStableAccess(stableId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to add notes for this stable",
          });
        }

        const docId = `${stableId}_${date}`;
        const now = Timestamp.now();

        // Get horse name
        const horseDoc = await db.collection("horses").doc(horseId).get();
        const horseName = horseDoc.exists ? horseDoc.data()?.name : "Unknown";

        const newNote: HorseDailyNote = {
          id: uuidv4(),
          horseId,
          horseName,
          note,
          priority,
          category: category as any,
          createdAt: now,
          createdBy: user.uid,
        };

        // Get or create daily notes document
        const existingDoc = await db.collection("dailyNotes").doc(docId).get();

        if (existingDoc.exists) {
          // Add to existing notes
          await db
            .collection("dailyNotes")
            .doc(docId)
            .update({
              horseNotes: [...(existingDoc.data()?.horseNotes || []), newNote],
              updatedAt: now,
              lastUpdatedBy: user.uid,
            });
        } else {
          // Create new document
          const stableDoc = await db.collection("stables").doc(stableId).get();
          const organizationId = stableDoc.data()?.organizationId || "";

          await db
            .collection("dailyNotes")
            .doc(docId)
            .set({
              id: docId,
              organizationId,
              stableId,
              date,
              horseNotes: [newNote],
              alerts: [],
              createdAt: now,
              updatedAt: now,
              lastUpdatedBy: user.uid,
            });
        }

        return reply.status(201).send(serializeTimestamps(newNote));
      } catch (error) {
        request.log.error({ error }, "Failed to add horse note");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to add horse note",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/daily-notes/stable/:stableId/horse-note/:noteId
   * Remove a horse note
   */
  fastify.delete(
    "/stable/:stableId/horse-note/:noteId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { stableId, noteId } = request.params as {
          stableId: string;
          noteId: string;
        };
        const { date } = request.query as { date: string };
        const user = (request as AuthenticatedRequest).user!;

        const hasAccess = await hasStableAccess(stableId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to remove notes for this stable",
          });
        }

        const docId = `${stableId}_${date}`;
        const doc = await db.collection("dailyNotes").doc(docId).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Daily notes not found",
          });
        }

        const data = doc.data() as DailyNotes;
        const updatedNotes = data.horseNotes.filter((n) => n.id !== noteId);

        await db.collection("dailyNotes").doc(docId).update({
          horseNotes: updatedNotes,
          updatedAt: Timestamp.now(),
          lastUpdatedBy: user.uid,
        });

        return { success: true };
      } catch (error) {
        request.log.error({ error }, "Failed to remove horse note");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to remove horse note",
        });
      }
    },
  );

  /**
   * POST /api/v1/daily-notes/stable/:stableId/alert
   * Add a daily alert
   */
  fastify.post(
    "/stable/:stableId/alert",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { stableId } = request.params as { stableId: string };
        const user = (request as AuthenticatedRequest).user!;
        const { date, title, message, priority, affectedHorseIds, expiresAt } =
          request.body as {
            date: string;
            title: string;
            message: string;
            priority: "info" | "warning" | "critical";
            affectedHorseIds?: string[];
            expiresAt?: string;
          };

        const hasAccess = await hasStableAccess(stableId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to add alerts for this stable",
          });
        }

        const docId = `${stableId}_${date}`;
        const now = Timestamp.now();

        // Get horse names if affected horses specified
        let affectedHorseNames: string[] | undefined;
        if (affectedHorseIds && affectedHorseIds.length > 0) {
          const horseDocs = await Promise.all(
            affectedHorseIds.map((id) => db.collection("horses").doc(id).get()),
          );
          affectedHorseNames = horseDocs.map((doc) =>
            doc.exists ? doc.data()?.name : "Unknown",
          );
        }

        // Get user name
        const userDoc = await db.collection("users").doc(user.uid).get();
        const userName = userDoc.exists
          ? userDoc.data()?.displayName
          : undefined;

        const newAlert: DailyAlert = {
          id: uuidv4(),
          title,
          message,
          priority,
          affectedHorseIds,
          affectedHorseNames,
          expiresAt: expiresAt
            ? Timestamp.fromDate(new Date(expiresAt))
            : undefined,
          createdAt: now,
          createdBy: user.uid,
          createdByName: userName,
        };

        // Get or create daily notes document
        const existingDoc = await db.collection("dailyNotes").doc(docId).get();

        if (existingDoc.exists) {
          await db
            .collection("dailyNotes")
            .doc(docId)
            .update({
              alerts: [...(existingDoc.data()?.alerts || []), newAlert],
              updatedAt: now,
              lastUpdatedBy: user.uid,
            });
        } else {
          const stableDoc = await db.collection("stables").doc(stableId).get();
          const organizationId = stableDoc.data()?.organizationId || "";

          await db
            .collection("dailyNotes")
            .doc(docId)
            .set({
              id: docId,
              organizationId,
              stableId,
              date,
              horseNotes: [],
              alerts: [newAlert],
              createdAt: now,
              updatedAt: now,
              lastUpdatedBy: user.uid,
            });
        }

        return reply.status(201).send(serializeTimestamps(newAlert));
      } catch (error) {
        request.log.error({ error }, "Failed to add alert");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to add alert",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/daily-notes/stable/:stableId/alert/:alertId
   * Remove an alert
   */
  fastify.delete(
    "/stable/:stableId/alert/:alertId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { stableId, alertId } = request.params as {
          stableId: string;
          alertId: string;
        };
        const { date } = request.query as { date: string };
        const user = (request as AuthenticatedRequest).user!;

        const hasAccess = await hasStableAccess(stableId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to remove alerts for this stable",
          });
        }

        const docId = `${stableId}_${date}`;
        const doc = await db.collection("dailyNotes").doc(docId).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Daily notes not found",
          });
        }

        const data = doc.data() as DailyNotes;
        const updatedAlerts = data.alerts.filter((a) => a.id !== alertId);

        await db.collection("dailyNotes").doc(docId).update({
          alerts: updatedAlerts,
          updatedAt: Timestamp.now(),
          lastUpdatedBy: user.uid,
        });

        return { success: true };
      } catch (error) {
        request.log.error({ error }, "Failed to remove alert");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to remove alert",
        });
      }
    },
  );
}
