import type { LucideIcon } from "lucide-react";

export interface CommandItem {
  id: string;
  /** Display label (active language) */
  label: string;
  /** sv label + en label + any aliases for bilingual fuzzy search */
  searchTerms: string[];
  icon: LucideIcon;
  group: "recent" | "navigation" | "organization";
  href: string;
}

export interface RecentPage {
  id: string;
  href: string;
  label: string;
  /** Icon name from lucide-react for serialization */
  iconName: string;
}
