import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";
import { authenticate, requireOrgAccess } from "../middleware/auth.js";
import type {
  AssistantQuery,
  AssistantResponse,
  AssistantIntent,
  AssistantIntentType,
  AssistantEntity,
  AssistantConversation,
  AssistantMessage,
  AssistantSuggestion,
  ScheduleData,
  HorsesData,
  ActivitiesData,
  InventoryData,
  InvoicesData,
  FeedingData,
  HealthData,
  AvailabilityData,
  AnalyticsData,
  RecommendationsData,
  DEFAULT_QUICK_ACTIONS,
} from "@stall-bokning/shared";

// Query schema
const querySchema = z.object({
  query: z.string().min(1).max(1000),
  conversationId: z.string().optional(),
  context: z
    .object({
      stableId: z.string().optional(),
      horseId: z.string().optional(),
      contactId: z.string().optional(),
    })
    .optional(),
  language: z.enum(["sv", "en"]).default("sv"),
});

// Intent patterns for classification
const INTENT_PATTERNS: { type: AssistantIntentType; patterns: RegExp[] }[] = [
  {
    type: "query_schedule",
    patterns: [
      /schema|schedule|kalender|calendar|idag|today|imorgon|tomorrow|vecka|week|planerat|planned/i,
      /what('s| is) (happening|on|planned|scheduled)/i,
      /vad (händer|är planerat|ska ske)/i,
    ],
  },
  {
    type: "query_horses",
    patterns: [
      /häst|horse|ponny|pony|alla hästar|all horses|visa hästar/i,
      /horse (status|overview|list)/i,
      /häst(ar)?s? (status|översikt|lista)/i,
    ],
  },
  {
    type: "query_activities",
    patterns: [
      /aktivitet|activity|task|uppgift|att göra|todo|väntande|pending/i,
      /(show|list|what are).*(tasks|activities|todos)/i,
      /(visa|lista).*(uppgifter|aktiviteter)/i,
    ],
  },
  {
    type: "query_inventory",
    patterns: [
      /lager|inventory|stock|förråd|foder|feed|material|supplies/i,
      /lågt lager|low stock|slut på|out of|running low/i,
    ],
  },
  {
    type: "query_invoices",
    patterns: [
      /faktura|invoice|bill|betalning|payment|förfallen|overdue|obetald|unpaid/i,
    ],
  },
  {
    type: "query_contacts",
    patterns: [/kontakt|contact|ägare|owner|kund|customer|klient|client/i],
  },
  {
    type: "query_feeding",
    patterns: [/utfodring|feeding|mat|food|äta|eat|foder|feed|foderschema/i],
  },
  {
    type: "query_health",
    patterns: [
      /hälsa|health|veterinär|vet|sjuk|sick|medicinsk|medical|vaccination|dental/i,
    ],
  },
  {
    type: "query_availability",
    patterns: [
      /tillgänglig|available|ledig|off|arbetstid|working hours|personal|staff/i,
    ],
  },
  {
    type: "analytics",
    patterns: [
      /sammanfattning|summary|statistik|statistics|rapport|report|analys|analysis/i,
      /hur (många|mycket)|how (many|much)/i,
    ],
  },
  {
    type: "recommendations",
    patterns: [
      /rekommendation|recommendation|förslag|suggest|tips|advice|bör|should|förbättra|improve/i,
    ],
  },
  {
    type: "create_activity",
    patterns: [
      /skapa aktivitet|create activity|lägg till|add|boka|book|schemalägg|schedule/i,
    ],
  },
  {
    type: "create_reminder",
    patterns: [/påminn|remind|påminnelse|reminder|glöm inte|don't forget/i],
  },
];

// Entity extraction patterns
const ENTITY_PATTERNS: { type: AssistantEntity["type"]; pattern: RegExp }[] = [
  {
    type: "date",
    pattern:
      /\b(idag|today|imorgon|tomorrow|igår|yesterday|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2})\b/gi,
  },
  {
    type: "time",
    pattern: /\b(\d{1,2}:\d{2}|\d{1,2}\s*(am|pm|på morgonen|på kvällen))\b/gi,
  },
  {
    type: "quantity",
    pattern: /\b(\d+)\s*(kg|gram|liter|st|stycken|pieces)\b/gi,
  },
  {
    type: "status",
    pattern:
      /\b(pending|completed|cancelled|active|inactive|väntande|slutförd|avbruten|aktiv|inaktiv)\b/gi,
  },
];

// Classify intent from query
function classifyIntent(query: string): AssistantIntent {
  let bestMatch: { type: AssistantIntentType; confidence: number } = {
    type: "unknown",
    confidence: 0,
  };

  for (const { type, patterns } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(query)) {
        const confidence = 0.8 + Math.random() * 0.15; // 0.8-0.95
        if (confidence > bestMatch.confidence) {
          bestMatch = { type, confidence };
        }
        break;
      }
    }
  }

  // If no pattern matched, try general info
  if (bestMatch.type === "unknown") {
    bestMatch = { type: "general_info", confidence: 0.5 };
  }

  // Extract entities
  const entities = extractEntities(query);

  return {
    type: bestMatch.type,
    confidence: bestMatch.confidence,
    entities,
    parameters: extractParameters(query, bestMatch.type),
  };
}

// Extract entities from query
function extractEntities(query: string): AssistantEntity[] {
  const entities: AssistantEntity[] = [];

  for (const { type, pattern } of ENTITY_PATTERNS) {
    let match;
    while ((match = pattern.exec(query)) !== null) {
      entities.push({
        type,
        value: match[0],
        normalizedValue: normalizeEntity(type, match[0]),
        start: match.index,
        end: match.index + match[0].length,
        confidence: 0.9,
      });
    }
  }

  return entities;
}

// Normalize entity values
function normalizeEntity(type: AssistantEntity["type"], value: string): string {
  switch (type) {
    case "date":
      if (/idag|today/i.test(value)) {
        return new Date().toISOString().split("T")[0];
      }
      if (/imorgon|tomorrow/i.test(value)) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split("T")[0];
      }
      if (/igår|yesterday/i.test(value)) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split("T")[0];
      }
      return value;
    default:
      return value.toLowerCase();
  }
}

// Extract parameters based on intent type
function extractParameters(
  query: string,
  intentType: AssistantIntentType,
): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  // Extract date range
  if (/denna vecka|this week/i.test(query)) {
    params.dateRange = "this_week";
  } else if (/förra veckan|last week/i.test(query)) {
    params.dateRange = "last_week";
  } else if (/nästa vecka|next week/i.test(query)) {
    params.dateRange = "next_week";
  } else if (/denna månad|this month/i.test(query)) {
    params.dateRange = "this_month";
  }

  // Extract limit
  const limitMatch = query.match(/(\d+)\s*(första|senaste|top|latest|first)/i);
  if (limitMatch) {
    params.limit = parseInt(limitMatch[1], 10);
  }

  return params;
}

// Generate suggestions based on intent and response
function generateSuggestions(
  intent: AssistantIntent,
  language: "sv" | "en",
): AssistantSuggestion[] {
  const suggestions: AssistantSuggestion[] = [];

  const suggestionMap: Record<AssistantIntentType, AssistantSuggestion[]> = {
    query_schedule: [
      {
        text:
          language === "sv"
            ? "Visa morgondagens schema"
            : "Show tomorrow's schedule",
        query:
          language === "sv"
            ? "Vad händer imorgon?"
            : "What's happening tomorrow?",
        icon: "calendar",
      },
      {
        text:
          language === "sv"
            ? "Visa veckans schema"
            : "Show this week's schedule",
        query:
          language === "sv"
            ? "Vad är planerat denna vecka?"
            : "What's planned this week?",
        icon: "calendar",
      },
    ],
    query_horses: [
      {
        text: language === "sv" ? "Visa hälsostatus" : "Show health status",
        query:
          language === "sv" ? "Hur mår hästarna?" : "How are the horses doing?",
        icon: "heart",
      },
    ],
    query_inventory: [
      {
        text:
          language === "sv" ? "Visa kritiska artiklar" : "Show critical items",
        query:
          language === "sv"
            ? "Vilka artiklar behöver beställas?"
            : "What items need to be ordered?",
        icon: "alert-triangle",
      },
    ],
    query_invoices: [
      {
        text:
          language === "sv" ? "Visa obetalda fakturor" : "Show unpaid invoices",
        query:
          language === "sv"
            ? "Vilka fakturor är obetalda?"
            : "Which invoices are unpaid?",
        icon: "file-text",
      },
    ],
    query_activities: [],
    query_contacts: [],
    query_feeding: [],
    query_health: [],
    query_availability: [],
    create_activity: [],
    create_booking: [],
    create_reminder: [],
    update_record: [],
    general_info: [],
    recommendations: [],
    analytics: [],
    unknown: [],
  };

  return suggestionMap[intent.type] || [];
}

// Generate response message
function generateResponseMessage(
  intent: AssistantIntent,
  data: unknown,
  language: "sv" | "en",
): string {
  const messages: Record<AssistantIntentType, { sv: string; en: string }> = {
    query_schedule: {
      sv: "Här är det kommande schemat:",
      en: "Here's the upcoming schedule:",
    },
    query_horses: {
      sv: "Här är en översikt över hästarna:",
      en: "Here's an overview of the horses:",
    },
    query_activities: {
      sv: "Här är aktiviteterna:",
      en: "Here are the activities:",
    },
    query_inventory: {
      sv: "Här är lagerstatus:",
      en: "Here's the inventory status:",
    },
    query_invoices: {
      sv: "Här är fakturorna:",
      en: "Here are the invoices:",
    },
    query_contacts: {
      sv: "Här är kontakterna:",
      en: "Here are the contacts:",
    },
    query_feeding: {
      sv: "Här är utfodringsschemat:",
      en: "Here's the feeding schedule:",
    },
    query_health: {
      sv: "Här är hälsoinformationen:",
      en: "Here's the health information:",
    },
    query_availability: {
      sv: "Här är tillgängligheten:",
      en: "Here's the availability:",
    },
    analytics: {
      sv: "Här är sammanfattningen:",
      en: "Here's the summary:",
    },
    recommendations: {
      sv: "Här är mina rekommendationer:",
      en: "Here are my recommendations:",
    },
    create_activity: {
      sv: "Jag kan hjälpa dig skapa en aktivitet. Vad vill du göra?",
      en: "I can help you create an activity. What would you like to do?",
    },
    create_booking: {
      sv: "Jag kan hjälpa dig boka. Vad vill du boka?",
      en: "I can help you book. What would you like to book?",
    },
    create_reminder: {
      sv: "Jag kan skapa en påminnelse åt dig. Vad ska jag påminna om?",
      en: "I can create a reminder for you. What should I remind you about?",
    },
    update_record: {
      sv: "Jag kan hjälpa dig uppdatera. Vad vill du ändra?",
      en: "I can help you update. What would you like to change?",
    },
    general_info: {
      sv: "Hur kan jag hjälpa dig idag?",
      en: "How can I help you today?",
    },
    unknown: {
      sv: "Jag förstår inte riktigt. Kan du omformulera din fråga?",
      en: "I don't quite understand. Could you rephrase your question?",
    },
  };

  return messages[intent.type][language];
}

export async function assistantRoutes(fastify: FastifyInstance) {
  // Query the assistant
  fastify.post<{
    Params: { organizationId: string };
    Body: z.infer<typeof querySchema>;
  }>(
    "/organizations/:organizationId/assistant/query",
    {
      preHandler: [authenticate, requireOrgAccess("params")],
    },
    async (request, reply) => {
      const { organizationId } = request.params;
      const userId = request.user!.uid;

      const result = querySchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: "Invalid request",
          details: result.error.issues,
        });
      }

      const { query, conversationId, context, language } = result.data;

      try {
        // Classify intent
        const intent = classifyIntent(query);

        // Execute query based on intent
        const data = await executeQuery(
          intent,
          organizationId,
          context,
          request.user!.uid,
        );

        // Generate response
        const message = generateResponseMessage(intent, data, language);
        const suggestions = generateSuggestions(intent, language);

        // Create or update conversation
        const conversationRef = conversationId
          ? db.collection("assistantConversations").doc(conversationId)
          : db.collection("assistantConversations").doc();

        const newMessage: AssistantMessage = {
          id: `msg_${Date.now()}`,
          role: "user",
          content: query,
          timestamp: Timestamp.now(),
        };

        const assistantMessage: AssistantMessage = {
          id: `msg_${Date.now() + 1}`,
          role: "assistant",
          content: message,
          timestamp: Timestamp.now(),
          metadata: {
            model: "stallbokning-assistant-v1",
          },
        };

        if (conversationId) {
          // Update existing conversation
          await conversationRef.update({
            messages: require("firebase-admin").firestore.FieldValue.arrayUnion(
              newMessage,
              assistantMessage,
            ),
            updatedAt: Timestamp.now(),
          });
        } else {
          // Create new conversation
          const conversation: Omit<AssistantConversation, "id"> = {
            organizationId,
            userId,
            title: query.substring(0, 50),
            messages: [newMessage, assistantMessage],
            context: context || {},
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };

          await conversationRef.set(conversation);
        }

        const response: AssistantResponse = {
          message,
          intent,
          data,
          suggestions,
          followUp: generateFollowUpQuestions(intent, language),
        };

        return reply.send({
          ...response,
          conversationId: conversationRef.id,
        });
      } catch (error) {
        console.error("Assistant query error:", error);
        return reply.status(500).send({
          error: "Failed to process query",
        });
      }
    },
  );

  // Get conversation history
  fastify.get<{
    Params: { organizationId: string; conversationId: string };
  }>(
    "/organizations/:organizationId/assistant/conversations/:conversationId",
    {
      preHandler: [authenticate, requireOrgAccess("params")],
    },
    async (request, reply) => {
      const { organizationId, conversationId } = request.params;

      const doc = await db
        .collection("assistantConversations")
        .doc(conversationId)
        .get();

      if (!doc.exists) {
        return reply.status(404).send({ error: "Conversation not found" });
      }

      const conversation = doc.data() as AssistantConversation;

      if (conversation.organizationId !== organizationId) {
        return reply.status(403).send({ error: "Access denied" });
      }

      return reply.send({ id: doc.id, ...conversation });
    },
  );

  // List conversations
  fastify.get<{
    Params: { organizationId: string };
    Querystring: { limit?: number };
  }>(
    "/organizations/:organizationId/assistant/conversations",
    {
      preHandler: [authenticate, requireOrgAccess("params")],
    },
    async (request, reply) => {
      const { organizationId } = request.params;
      const { limit = 20 } = request.query;
      const userId = request.user!.uid;

      const snapshot = await db
        .collection("assistantConversations")
        .where("organizationId", "==", organizationId)
        .where("userId", "==", userId)
        .orderBy("updatedAt", "desc")
        .limit(limit)
        .get();

      const conversations = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title,
        updatedAt: doc.data().updatedAt,
        messageCount: doc.data().messages?.length || 0,
      }));

      return reply.send({ conversations });
    },
  );

  // Delete conversation
  fastify.delete<{
    Params: { organizationId: string; conversationId: string };
  }>(
    "/organizations/:organizationId/assistant/conversations/:conversationId",
    {
      preHandler: [authenticate, requireOrgAccess("params")],
    },
    async (request, reply) => {
      const { organizationId, conversationId } = request.params;

      const doc = await db
        .collection("assistantConversations")
        .doc(conversationId)
        .get();

      if (!doc.exists) {
        return reply.status(404).send({ error: "Conversation not found" });
      }

      const conversation = doc.data() as AssistantConversation;

      if (conversation.organizationId !== organizationId) {
        return reply.status(403).send({ error: "Access denied" });
      }

      await doc.ref.delete();

      return reply.send({ success: true });
    },
  );

  // Get quick actions
  fastify.get<{
    Params: { organizationId: string };
    Querystring: { language?: "sv" | "en" };
  }>(
    "/organizations/:organizationId/assistant/quick-actions",
    {
      preHandler: [authenticate, requireOrgAccess("params")],
    },
    async (request, reply) => {
      const { language = "sv" } = request.query;

      // Return quick actions with appropriate language
      const actions = DEFAULT_QUICK_ACTIONS.map((action) => ({
        id: action.id,
        label: language === "sv" ? action.labelSv : action.label,
        icon: action.icon,
        query: action.query,
        category: action.category,
      }));

      return reply.send({ quickActions: actions });
    },
  );
}

// Execute query based on intent
async function executeQuery(
  intent: AssistantIntent,
  organizationId: string,
  context?: Partial<{ stableId: string; horseId: string; contactId: string }>,
  userId?: string,
): Promise<AssistantResponse["data"]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  switch (intent.type) {
    case "query_schedule":
    case "query_activities": {
      const snapshot = await db
        .collection("activities")
        .where("organizationId", "==", organizationId)
        .where("scheduledDate", ">=", Timestamp.fromDate(today))
        .where("scheduledDate", "<", Timestamp.fromDate(nextWeek))
        .orderBy("scheduledDate", "asc")
        .limit(20)
        .get();

      const items = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || data.activityType,
          date: data.scheduledDate?.toDate().toISOString().split("T")[0],
          time: data.scheduledTime,
          status: data.status,
          assignee: data.assignedTo?.[0],
          horseName: data.horseName,
        };
      });

      return {
        type: "schedule",
        items,
        summary: `${items.length} aktiviteter planerade för den kommande veckan`,
      } as ScheduleData;
    }

    case "query_horses": {
      const snapshot = await db
        .collection("horses")
        .where("organizationId", "==", organizationId)
        .orderBy("name", "asc")
        .limit(50)
        .get();

      const items = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          breed: data.breed,
          status: data.status || "active",
          owner: data.ownerName,
          lastActivity: data.lastActivityDate
            ?.toDate()
            .toISOString()
            .split("T")[0],
        };
      });

      return {
        type: "horses",
        items,
        summary: `${items.length} hästar registrerade`,
      } as HorsesData;
    }

    case "query_inventory": {
      const snapshot = await db
        .collection("feedInventory")
        .where("organizationId", "==", organizationId)
        .orderBy("currentQuantity", "asc")
        .limit(20)
        .get();

      const items = snapshot.docs.map((doc) => {
        const data = doc.data();
        const isLow = data.currentQuantity <= data.minimumStockLevel;
        return {
          id: doc.id,
          name: data.feedTypeName,
          quantity: data.currentQuantity,
          unit: data.unit || "kg",
          status: isLow ? "low-stock" : "in-stock",
          lowStockAlert: isLow,
        };
      });

      const lowStockCount = items.filter((i) => i.lowStockAlert).length;

      return {
        type: "inventory",
        items,
        summary:
          lowStockCount > 0
            ? `${lowStockCount} artiklar med lågt lager`
            : "Alla artiklar har tillräckligt lager",
      } as InventoryData;
    }

    case "query_invoices": {
      const snapshot = await db
        .collection("invoices")
        .where("organizationId", "==", organizationId)
        .orderBy("dueDate", "asc")
        .limit(20)
        .get();

      const items = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          invoiceNumber: data.invoiceNumber,
          contactName: data.contactName,
          total: data.total,
          currency: data.currency || "SEK",
          status: data.status,
          dueDate: data.dueDate?.toDate().toISOString().split("T")[0],
        };
      });

      const unpaidTotal = items
        .filter((i) => i.status !== "paid")
        .reduce((sum, i) => sum + i.total, 0);

      return {
        type: "invoices",
        items,
        summary: `${items.filter((i) => i.status !== "paid").length} obetalda fakturor`,
        totalAmount: unpaidTotal,
      } as InvoicesData;
    }

    case "query_feeding": {
      // Query horse feedings for today
      const snapshot = await db
        .collection("horseFeedings")
        .where("organizationId", "==", organizationId)
        .limit(50)
        .get();

      const items = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          horseName: data.horseName || "Unknown",
          feedingTime: data.feedingTime || "morning",
          feedType: data.feedTypeName || "Standard",
          quantity: data.quantity || 0,
          unit: data.unit || "kg",
          status: "pending",
        };
      });

      return {
        type: "feeding",
        items,
        summary: `${items.length} utfodringsuppgifter`,
      } as FeedingData;
    }

    case "query_health": {
      const snapshot = await db
        .collection("healthRecords")
        .where("organizationId", "==", organizationId)
        .orderBy("date", "desc")
        .limit(20)
        .get();

      const items = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          horseName: data.horseName || "Unknown",
          recordType: data.type || "general",
          date: data.date?.toDate().toISOString().split("T")[0],
          description: data.description || data.notes || "",
          veterinarian: data.veterinarian,
          nextCheckup: data.nextCheckup?.toDate().toISOString().split("T")[0],
        };
      });

      return {
        type: "health",
        items,
        summary: `${items.length} hälsojournaler`,
      } as HealthData;
    }

    case "query_availability": {
      const snapshot = await db
        .collection("leaveRequests")
        .where("organizationId", "==", organizationId)
        .where("startDate", ">=", Timestamp.fromDate(today))
        .where("status", "==", "approved")
        .orderBy("startDate", "asc")
        .limit(20)
        .get();

      const items = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          userName: data.userName || "Unknown",
          date: data.startDate?.toDate().toISOString().split("T")[0],
          status: "on-leave",
          leaveType: data.leaveType,
        };
      });

      return {
        type: "availability",
        items,
        summary: `${items.length} godkända ledighetsansökningar`,
      } as AvailabilityData;
    }

    case "analytics": {
      // Gather various metrics
      const [horsesSnap, activitiesSnap, invoicesSnap] = await Promise.all([
        db
          .collection("horses")
          .where("organizationId", "==", organizationId)
          .count()
          .get(),
        db
          .collection("activities")
          .where("organizationId", "==", organizationId)
          .where("scheduledDate", ">=", Timestamp.fromDate(today))
          .where("scheduledDate", "<", Timestamp.fromDate(nextWeek))
          .count()
          .get(),
        db
          .collection("invoices")
          .where("organizationId", "==", organizationId)
          .where("status", "==", "pending")
          .count()
          .get(),
      ]);

      return {
        type: "analytics",
        metrics: [
          {
            label: "Totalt antal hästar",
            value: horsesSnap.data().count,
            trend: "stable",
          },
          {
            label: "Aktiviteter denna vecka",
            value: activitiesSnap.data().count,
            trend: "up",
          },
          {
            label: "Väntande fakturor",
            value: invoicesSnap.data().count,
            trend: "stable",
          },
        ],
        summary: "Här är en sammanfattning av verksamheten",
      } as AnalyticsData;
    }

    case "recommendations": {
      // Generate recommendations based on data
      const recommendations = [];

      // Check for low inventory
      const inventorySnap = await db
        .collection("feedInventory")
        .where("organizationId", "==", organizationId)
        .where("status", "==", "low-stock")
        .limit(5)
        .get();

      if (!inventorySnap.empty) {
        recommendations.push({
          title: "Fyll på lager",
          description: `${inventorySnap.size} artiklar har lågt lager och bör fyllas på`,
          priority: "high" as const,
          category: "inventory",
          action: "Gå till lagerhantering",
        });
      }

      // Check for overdue invoices
      const overdueSnap = await db
        .collection("invoices")
        .where("organizationId", "==", organizationId)
        .where("status", "==", "overdue")
        .limit(5)
        .get();

      if (!overdueSnap.empty) {
        recommendations.push({
          title: "Förfallna fakturor",
          description: `${overdueSnap.size} fakturor har passerat förfallodatum`,
          priority: "high" as const,
          category: "invoices",
          action: "Skicka påminnelser",
        });
      }

      // Check for upcoming vet visits
      const upcomingVetSnap = await db
        .collection("healthRecords")
        .where("organizationId", "==", organizationId)
        .where("nextCheckup", ">=", Timestamp.fromDate(today))
        .where("nextCheckup", "<", Timestamp.fromDate(nextWeek))
        .limit(5)
        .get();

      if (!upcomingVetSnap.empty) {
        recommendations.push({
          title: "Kommande veterinärbesök",
          description: `${upcomingVetSnap.size} hästar har planerade veterinärbesök denna vecka`,
          priority: "medium" as const,
          category: "health",
          action: "Visa hälsojournaler",
        });
      }

      return {
        type: "recommendations",
        items: recommendations,
        summary:
          recommendations.length > 0
            ? `${recommendations.length} rekommendationer`
            : "Inga akuta rekommendationer just nu",
      } as RecommendationsData;
    }

    default:
      return undefined;
  }
}

// Generate follow-up questions
function generateFollowUpQuestions(
  intent: AssistantIntent,
  language: "sv" | "en",
): string[] {
  const followUps: Record<AssistantIntentType, { sv: string[]; en: string[] }> =
    {
      query_schedule: {
        sv: [
          "Vill du se morgondagens schema?",
          "Ska jag visa detaljerna för en specifik aktivitet?",
        ],
        en: [
          "Would you like to see tomorrow's schedule?",
          "Should I show details for a specific activity?",
        ],
      },
      query_horses: {
        sv: [
          "Vill du se hälsohistorik för en specifik häst?",
          "Ska jag visa utfodringsschema?",
        ],
        en: [
          "Would you like to see health history for a specific horse?",
          "Should I show the feeding schedule?",
        ],
      },
      query_inventory: {
        sv: [
          "Ska jag skapa en beställning?",
          "Vill du se förbrukningsstatistik?",
        ],
        en: [
          "Should I create an order?",
          "Would you like to see consumption statistics?",
        ],
      },
      query_invoices: {
        sv: ["Vill du skicka påminnelser?", "Ska jag visa betalningshistorik?"],
        en: [
          "Would you like to send reminders?",
          "Should I show payment history?",
        ],
      },
      query_activities: {
        sv: [],
        en: [],
      },
      query_contacts: {
        sv: [],
        en: [],
      },
      query_feeding: {
        sv: [],
        en: [],
      },
      query_health: {
        sv: [],
        en: [],
      },
      query_availability: {
        sv: [],
        en: [],
      },
      create_activity: {
        sv: [],
        en: [],
      },
      create_booking: {
        sv: [],
        en: [],
      },
      create_reminder: {
        sv: [],
        en: [],
      },
      update_record: {
        sv: [],
        en: [],
      },
      general_info: {
        sv: [],
        en: [],
      },
      recommendations: {
        sv: [],
        en: [],
      },
      analytics: {
        sv: [],
        en: [],
      },
      unknown: {
        sv: [],
        en: [],
      },
    };

  return followUps[intent.type]?.[language] || [];
}
