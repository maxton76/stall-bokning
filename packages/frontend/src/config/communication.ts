/**
 * Communication Configuration
 *
 * Shared configuration for communication-related UI components.
 * This eliminates DRY violations where type icons and colors were
 * duplicated across multiple components.
 */

import {
  Mail,
  MessageSquare,
  Phone,
  Users,
  FileText,
  Send,
  Bell,
  type LucideIcon,
} from "lucide-react";
import type { CommunicationType } from "@stall-bokning/shared";

/**
 * Icons for each communication type
 */
export const communicationTypeIcons: Record<CommunicationType, LucideIcon> = {
  email: Mail,
  sms: MessageSquare,
  phone: Phone,
  meeting: Users,
  note: FileText,
  telegram: Send,
  in_app: Bell,
};

/**
 * Color classes for each communication type
 * Uses Tailwind CSS classes for light/dark mode
 */
export const communicationTypeColors: Record<CommunicationType, string> = {
  email: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  sms: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  phone:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  meeting:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  note: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  telegram: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  in_app:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
};

/**
 * Get the icon component for a communication type
 */
export function getCommunicationIcon(type: CommunicationType): LucideIcon {
  return communicationTypeIcons[type] || FileText;
}

/**
 * Get the color classes for a communication type
 */
export function getCommunicationColor(type: CommunicationType): string {
  return communicationTypeColors[type] || communicationTypeColors.note;
}

/**
 * Communication types that typically have a subject field
 */
export const typesWithSubject: CommunicationType[] = ["email", "meeting"];

/**
 * Check if a communication type should show a subject field
 */
export function hasSubjectField(type: CommunicationType): boolean {
  return typesWithSubject.includes(type);
}

/**
 * All communication types in display order
 */
export const communicationTypesOrdered: CommunicationType[] = [
  "email",
  "phone",
  "sms",
  "meeting",
  "note",
  "telegram",
  "in_app",
];
