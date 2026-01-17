/**
 * Communication History Types
 *
 * Types for tracking communication with contacts including
 * emails, phone calls, meetings, and notes.
 */
// ============================================================================
// Constants
// ============================================================================
/**
 * Communication type display configuration
 */
export const COMMUNICATION_TYPE_CONFIG = {
  email: { label: "Email", icon: "Mail", color: "blue" },
  sms: { label: "SMS", icon: "MessageSquare", color: "green" },
  phone: { label: "Phone", icon: "Phone", color: "purple" },
  meeting: { label: "Meeting", icon: "Users", color: "orange" },
  note: { label: "Note", icon: "FileText", color: "gray" },
  telegram: { label: "Telegram", icon: "Send", color: "cyan" },
  in_app: { label: "In-app", icon: "Bell", color: "indigo" },
};
/**
 * Communication status display configuration
 */
export const COMMUNICATION_STATUS_CONFIG = {
  draft: { label: "Draft", color: "gray" },
  sent: { label: "Sent", color: "blue" },
  delivered: { label: "Delivered", color: "green" },
  read: { label: "Read", color: "emerald" },
  failed: { label: "Failed", color: "red" },
  scheduled: { label: "Scheduled", color: "yellow" },
};
