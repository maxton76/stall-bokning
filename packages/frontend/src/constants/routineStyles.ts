/**
 * Shared styling constants for routine components
 * Centralizes TYPE, STATUS, and PRIORITY styles to avoid duplication
 */

import {
  Sunrise,
  Sun,
  Sunset,
  Settings2,
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { RoutineType, RoutineInstanceStatus } from "@shared/types";

/**
 * Icons for routine types
 */
export const ROUTINE_TYPE_ICONS: Record<
  RoutineType,
  React.ComponentType<{ className?: string }>
> = {
  morning: Sunrise,
  midday: Sun,
  evening: Sunset,
  custom: Settings2,
};

/**
 * Badge/card styling for routine types (includes border and text colors)
 * Use for: badges, cards, list items
 */
export const ROUTINE_TYPE_BADGE_COLORS: Record<RoutineType, string> = {
  morning: "bg-amber-100 text-amber-800 border-amber-200",
  midday: "bg-yellow-100 text-yellow-800 border-yellow-200",
  evening: "bg-indigo-100 text-indigo-800 border-indigo-200",
  custom: "bg-gray-100 text-gray-800 border-gray-200",
};

/**
 * Solid background colors for routine types
 * Use for: charts, progress bars, analytics visualizations
 */
export const ROUTINE_TYPE_SOLID_COLORS: Record<RoutineType, string> = {
  morning: "bg-amber-500",
  midday: "bg-yellow-500",
  evening: "bg-indigo-500",
  custom: "bg-gray-500",
};

/**
 * Badge/card styling for routine instance statuses
 */
export const ROUTINE_STATUS_COLORS: Record<RoutineInstanceStatus, string> = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  started: "bg-yellow-100 text-yellow-800 border-yellow-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  missed: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200",
};

/**
 * Icons for routine instance statuses
 */
export const ROUTINE_STATUS_ICONS: Record<
  RoutineInstanceStatus,
  React.ComponentType<{ className?: string }>
> = {
  scheduled: Clock,
  started: Play,
  in_progress: Play,
  completed: CheckCircle2,
  missed: AlertCircle,
  cancelled: AlertCircle,
};

/**
 * Priority level styles for alerts and notes
 */
export const PRIORITY_STYLES = {
  critical: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    icon: "text-red-500",
    badge: "bg-red-100 text-red-800 border-red-300",
  },
  warning: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-800",
    icon: "text-yellow-500",
    badge: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    icon: "text-blue-500",
    badge: "bg-blue-100 text-blue-800 border-blue-300",
  },
} as const;

export type PriorityLevel = keyof typeof PRIORITY_STYLES;
