import type { Timestamp } from "firebase/firestore";
/**
 * AI Assistant types for natural language stable management
 */
export type AssistantMessageRole = "user" | "assistant" | "system";
export interface AssistantMessage {
  id: string;
  role: AssistantMessageRole;
  content: string;
  timestamp: Timestamp;
  metadata?: {
    tokens?: number;
    model?: string;
    duration?: number;
  };
}
export interface AssistantConversation {
  id: string;
  organizationId: string;
  userId: string;
  title?: string;
  messages: AssistantMessage[];
  context?: AssistantContext;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
export interface AssistantContext {
  stableId?: string;
  horseId?: string;
  contactId?: string;
  dateRange?: {
    start: Timestamp;
    end: Timestamp;
  };
  mentionedHorses?: string[];
  mentionedContacts?: string[];
  mentionedDates?: string[];
}
export type AssistantIntentType =
  | "query_schedule"
  | "query_horses"
  | "query_activities"
  | "query_inventory"
  | "query_invoices"
  | "query_contacts"
  | "query_feeding"
  | "query_health"
  | "query_availability"
  | "create_activity"
  | "create_booking"
  | "create_reminder"
  | "update_record"
  | "general_info"
  | "recommendations"
  | "analytics"
  | "unknown";
export interface AssistantIntent {
  type: AssistantIntentType;
  confidence: number;
  entities: AssistantEntity[];
  parameters: Record<string, unknown>;
}
export interface AssistantEntity {
  type:
    | "horse"
    | "contact"
    | "date"
    | "time"
    | "activity"
    | "location"
    | "quantity"
    | "status";
  value: string;
  normalizedValue?: string;
  start: number;
  end: number;
  confidence: number;
}
export interface AssistantQuery {
  query: string;
  conversationId?: string;
  context?: Partial<AssistantContext>;
  language?: "sv" | "en";
}
export interface AssistantResponse {
  message: string;
  intent: AssistantIntent;
  data?: AssistantResponseData;
  suggestions?: AssistantSuggestion[];
  actions?: AssistantAction[];
  followUp?: string[];
}
export type AssistantResponseData =
  | ScheduleData
  | HorsesData
  | ActivitiesData
  | InventoryData
  | InvoicesData
  | ContactsData
  | FeedingData
  | HealthData
  | AvailabilityData
  | AnalyticsData
  | RecommendationsData;
export interface ScheduleData {
  type: "schedule";
  items: {
    id: string;
    title: string;
    date: string;
    time?: string;
    status: string;
    assignee?: string;
    horseName?: string;
  }[];
  summary?: string;
}
export interface HorsesData {
  type: "horses";
  items: {
    id: string;
    name: string;
    breed?: string;
    status: string;
    owner?: string;
    lastActivity?: string;
  }[];
  summary?: string;
}
export interface ActivitiesData {
  type: "activities";
  items: {
    id: string;
    title: string;
    activityType: string;
    date: string;
    status: string;
    horseName?: string;
    assignee?: string;
  }[];
  summary?: string;
}
export interface InventoryData {
  type: "inventory";
  items: {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    status: string;
    lowStockAlert?: boolean;
  }[];
  summary?: string;
}
export interface InvoicesData {
  type: "invoices";
  items: {
    id: string;
    invoiceNumber: string;
    contactName: string;
    total: number;
    currency: string;
    status: string;
    dueDate: string;
  }[];
  summary?: string;
  totalAmount?: number;
}
export interface ContactsData {
  type: "contacts";
  items: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    type: string;
    horsesCount?: number;
  }[];
  summary?: string;
}
export interface FeedingData {
  type: "feeding";
  items: {
    horseName: string;
    feedingTime: string;
    feedType: string;
    quantity: number;
    unit: string;
    status: string;
  }[];
  summary?: string;
}
export interface HealthData {
  type: "health";
  items: {
    horseName: string;
    recordType: string;
    date: string;
    description: string;
    veterinarian?: string;
    nextCheckup?: string;
  }[];
  summary?: string;
}
export interface AvailabilityData {
  type: "availability";
  items: {
    userName: string;
    date: string;
    status: string;
    workingHours?: string;
    leaveType?: string;
  }[];
  summary?: string;
}
export interface AnalyticsData {
  type: "analytics";
  metrics: {
    label: string;
    value: number | string;
    change?: number;
    trend?: "up" | "down" | "stable";
  }[];
  summary?: string;
}
export interface RecommendationsData {
  type: "recommendations";
  items: {
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    category: string;
    action?: string;
  }[];
  summary?: string;
}
export interface AssistantSuggestion {
  text: string;
  query: string;
  icon?: string;
}
export interface AssistantAction {
  id: string;
  label: string;
  type: "navigate" | "create" | "update" | "delete" | "export";
  target: string;
  params?: Record<string, unknown>;
  confirmRequired?: boolean;
}
export interface QuickAction {
  id: string;
  label: string;
  labelSv: string;
  icon: string;
  query: string;
  category: "schedule" | "horses" | "tasks" | "inventory" | "analytics";
}
export declare const DEFAULT_QUICK_ACTIONS: QuickAction[];
//# sourceMappingURL=assistant.d.ts.map
