import type { LucideIcon } from "lucide-react";
import {
  CalendarIcon,
  SettingsIcon,
  UsersIcon,
  House as HorseIcon,
  History,
  Settings as Settings2Icon,
  Building2,
  Plug,
  Tractor,
  Shield,
  CreditCard,
  Warehouse,
  ClipboardList,
  Heart,
  Wheat,
  UserCircle,
  BarChart3,
  ListChecks,
  ListOrdered,
  Play,
  LayoutDashboard,
  Calendar,
  CalendarClock,
  Bell,
  User,
  Lightbulb,
  GraduationCap,
  BookOpen,
  FileText,
} from "lucide-react";

/**
 * Maps icon names (strings) to LucideIcon components.
 * Used to serialize/deserialize icons for localStorage (recent pages).
 */
const iconMap: Record<string, LucideIcon> = {
  CalendarIcon,
  SettingsIcon,
  UsersIcon,
  HorseIcon,
  History,
  Settings2Icon,
  Building2,
  Plug,
  Tractor,
  Shield,
  CreditCard,
  Warehouse,
  ClipboardList,
  Heart,
  Wheat,
  UserCircle,
  BarChart3,
  ListChecks,
  ListOrdered,
  Play,
  LayoutDashboard,
  Calendar,
  CalendarClock,
  Bell,
  User,
  Lightbulb,
  GraduationCap,
  BookOpen,
  FileText,
};

export function getIconByName(name: string): LucideIcon {
  return iconMap[name] ?? FileText;
}

export function getIconName(icon: LucideIcon): string {
  for (const [name, component] of Object.entries(iconMap)) {
    if (component === icon) return name;
  }
  return "FileText";
}
