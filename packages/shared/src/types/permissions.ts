/**
 * Permission types and matrices
 *
 * V2: Organization-level permission matrix system.
 * Single source of truth for what each OrganizationRole can do.
 */

import type { OrganizationRole } from "./organization.js";

// ============================================
// V2 PERMISSION SYSTEM
// ============================================

/**
 * All permission actions in the system, organized by category.
 */
export type PermissionAction =
  // Organization
  | "manage_org_settings"
  | "manage_members"
  | "view_members"
  | "manage_billing"
  // Stables
  | "create_stables"
  | "manage_stable_settings"
  | "view_stables"
  // Horses
  | "view_horses"
  | "manage_own_horses"
  | "manage_any_horse"
  // Scheduling
  | "view_schedules"
  | "manage_schedules"
  | "book_shifts"
  | "cancel_others_bookings"
  | "mark_shifts_missed"
  // Activities
  | "manage_activities"
  | "manage_routines"
  | "manage_selection_processes"
  // Lessons
  | "manage_lessons"
  // Facilities
  | "manage_facilities"
  // Records
  | "manage_records"
  | "view_records"
  // Integrations
  | "manage_integrations"
  | "send_communications"
  | "export_data";

/**
 * Permission matrix: maps each action to which roles have it.
 * Partial<Record<OrganizationRole, boolean>> so only "true" entries need be stored.
 */
export type PermissionMatrix = Record<
  PermissionAction,
  Partial<Record<OrganizationRole, boolean>>
>;

/**
 * Permission action categories for UI grouping.
 */
export type PermissionCategory =
  | "organization"
  | "stables"
  | "horses"
  | "scheduling"
  | "activities"
  | "lessons"
  | "facilities"
  | "records"
  | "integrations";

/**
 * Metadata for a single permission action.
 */
export interface PermissionActionMeta {
  action: PermissionAction;
  category: PermissionCategory;
  i18nKey: string;
  /** If set, the action is only available when this module is enabled. */
  requiredModule?: string;
}

/**
 * Metadata array describing all permission actions.
 * Used by the UI to render the matrix with proper grouping and labels.
 */
export const PERMISSION_ACTIONS: PermissionActionMeta[] = [
  // Organization
  {
    action: "manage_org_settings",
    category: "organization",
    i18nKey: "permissions.actions.manage_org_settings",
  },
  {
    action: "manage_members",
    category: "organization",
    i18nKey: "permissions.actions.manage_members",
  },
  {
    action: "view_members",
    category: "organization",
    i18nKey: "permissions.actions.view_members",
  },
  {
    action: "manage_billing",
    category: "organization",
    i18nKey: "permissions.actions.manage_billing",
  },
  // Stables
  {
    action: "create_stables",
    category: "stables",
    i18nKey: "permissions.actions.create_stables",
  },
  {
    action: "manage_stable_settings",
    category: "stables",
    i18nKey: "permissions.actions.manage_stable_settings",
  },
  {
    action: "view_stables",
    category: "stables",
    i18nKey: "permissions.actions.view_stables",
  },
  // Horses
  {
    action: "view_horses",
    category: "horses",
    i18nKey: "permissions.actions.view_horses",
  },
  {
    action: "manage_own_horses",
    category: "horses",
    i18nKey: "permissions.actions.manage_own_horses",
  },
  {
    action: "manage_any_horse",
    category: "horses",
    i18nKey: "permissions.actions.manage_any_horse",
  },
  // Scheduling
  {
    action: "view_schedules",
    category: "scheduling",
    i18nKey: "permissions.actions.view_schedules",
  },
  {
    action: "manage_schedules",
    category: "scheduling",
    i18nKey: "permissions.actions.manage_schedules",
  },
  {
    action: "book_shifts",
    category: "scheduling",
    i18nKey: "permissions.actions.book_shifts",
  },
  {
    action: "cancel_others_bookings",
    category: "scheduling",
    i18nKey: "permissions.actions.cancel_others_bookings",
  },
  {
    action: "mark_shifts_missed",
    category: "scheduling",
    i18nKey: "permissions.actions.mark_shifts_missed",
  },
  // Activities
  {
    action: "manage_activities",
    category: "activities",
    i18nKey: "permissions.actions.manage_activities",
  },
  {
    action: "manage_routines",
    category: "activities",
    i18nKey: "permissions.actions.manage_routines",
  },
  {
    action: "manage_selection_processes",
    category: "activities",
    i18nKey: "permissions.actions.manage_selection_processes",
  },
  // Lessons
  {
    action: "manage_lessons",
    category: "lessons",
    i18nKey: "permissions.actions.manage_lessons",
    requiredModule: "lessons",
  },
  // Facilities
  {
    action: "manage_facilities",
    category: "facilities",
    i18nKey: "permissions.actions.manage_facilities",
  },
  // Records
  {
    action: "manage_records",
    category: "records",
    i18nKey: "permissions.actions.manage_records",
  },
  {
    action: "view_records",
    category: "records",
    i18nKey: "permissions.actions.view_records",
  },
  // Integrations
  {
    action: "manage_integrations",
    category: "integrations",
    i18nKey: "permissions.actions.manage_integrations",
  },
  {
    action: "send_communications",
    category: "integrations",
    i18nKey: "permissions.actions.send_communications",
  },
  {
    action: "export_data",
    category: "integrations",
    i18nKey: "permissions.actions.export_data",
  },
];

/**
 * All permission action values as a Set for quick lookup.
 */
export const ALL_PERMISSION_ACTIONS: ReadonlySet<PermissionAction> = new Set(
  PERMISSION_ACTIONS.map((m) => m.action),
);

/**
 * Permissions that CANNOT be removed from the administrator role.
 * Prevents lockout scenarios.
 */
export const PROTECTED_PERMISSIONS: readonly PermissionAction[] = [
  "manage_org_settings",
  "manage_members",
] as const;

/**
 * Category labels for UI grouping (i18n keys).
 */
export const PERMISSION_CATEGORIES: Record<PermissionCategory, string> = {
  organization: "permissions.categories.organization",
  stables: "permissions.categories.stables",
  horses: "permissions.categories.horses",
  scheduling: "permissions.categories.scheduling",
  activities: "permissions.categories.activities",
  lessons: "permissions.categories.lessons",
  facilities: "permissions.categories.facilities",
  records: "permissions.categories.records",
  integrations: "permissions.categories.integrations",
};

// Helper to build a role entry where the action is granted to specific roles
function grant(
  ...roles: OrganizationRole[]
): Partial<Record<OrganizationRole, boolean>> {
  const entry: Partial<Record<OrganizationRole, boolean>> = {};
  for (const role of roles) {
    entry[role] = true;
  }
  return entry;
}

/**
 * Default permission matrix used when an organization has no custom matrix stored.
 *
 * Principles:
 * - administrator: full access
 * - schedule_planner: scheduling + activities + records
 * - groom: daily care (view, book shifts, manage activities)
 * - rider / customer / horse_owner: view + book shifts + own horses
 * - veterinarian / farrier / dentist: view-only + view records
 * - trainer / training_admin: lesson management + view
 * - Other roles: minimal view access
 */
export const DEFAULT_PERMISSION_MATRIX: PermissionMatrix = {
  // Organization
  manage_org_settings: grant("administrator"),
  manage_members: grant("administrator"),
  view_members: grant(
    "administrator",
    "schedule_planner",
    "groom",
    "trainer",
    "training_admin",
    "customer",
    "horse_owner",
    "rider",
    "veterinarian",
    "farrier",
    "dentist",
    "saddle_maker",
    "inseminator",
    "support_contact",
  ),
  manage_billing: grant("administrator"),

  // Stables
  create_stables: grant("administrator"),
  manage_stable_settings: grant("administrator"),
  view_stables: grant(
    "administrator",
    "schedule_planner",
    "groom",
    "trainer",
    "training_admin",
    "customer",
    "horse_owner",
    "rider",
    "veterinarian",
    "farrier",
    "dentist",
    "saddle_maker",
    "inseminator",
    "support_contact",
  ),

  // Horses
  view_horses: grant(
    "administrator",
    "schedule_planner",
    "groom",
    "trainer",
    "training_admin",
    "customer",
    "horse_owner",
    "rider",
    "veterinarian",
    "farrier",
    "dentist",
    "saddle_maker",
    "inseminator",
  ),
  manage_own_horses: grant(
    "administrator",
    "customer",
    "horse_owner",
    "rider",
    "groom",
  ),
  manage_any_horse: grant("administrator"),

  // Scheduling
  view_schedules: grant(
    "administrator",
    "schedule_planner",
    "groom",
    "trainer",
    "training_admin",
    "customer",
    "horse_owner",
    "rider",
  ),
  manage_schedules: grant("administrator", "schedule_planner"),
  book_shifts: grant(
    "administrator",
    "schedule_planner",
    "groom",
    "customer",
    "horse_owner",
    "rider",
  ),
  cancel_others_bookings: grant("administrator", "schedule_planner"),
  mark_shifts_missed: grant("administrator", "schedule_planner"),

  // Activities
  manage_activities: grant("administrator", "schedule_planner", "groom"),
  manage_routines: grant("administrator", "schedule_planner"),
  manage_selection_processes: grant("administrator", "schedule_planner"),

  // Lessons
  manage_lessons: grant("administrator", "trainer", "training_admin"),

  // Facilities
  manage_facilities: grant("administrator"),

  // Records
  manage_records: grant("administrator", "schedule_planner"),
  view_records: grant(
    "administrator",
    "schedule_planner",
    "groom",
    "veterinarian",
    "farrier",
    "dentist",
    "trainer",
    "training_admin",
  ),

  // Integrations
  manage_integrations: grant("administrator"),
  send_communications: grant("administrator", "schedule_planner"),
  export_data: grant("administrator"),
};

// ============================================
// V1 LEGACY TYPES (deprecated)
// ============================================

/**
 * @deprecated Use PermissionAction instead.
 */
export type StableAction =
  | "view_stable"
  | "update_settings"
  | "delete_stable"
  | "view_members"
  | "invite_members"
  | "remove_members"
  | "change_roles"
  | "create_schedules"
  | "edit_schedules"
  | "delete_schedules"
  | "view_schedules"
  | "book_shifts"
  | "cancel_own_bookings"
  | "cancel_others_bookings";

/**
 * @deprecated Use PermissionAction instead.
 */
export type HorseAction =
  | "add_horse"
  | "view_horses"
  | "edit_own_horse"
  | "edit_any_horse"
  | "delete_own_horse"
  | "delete_any_horse"
  | "assign_to_shift";

/**
 * Permission check result
 */
export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * @deprecated Use OrganizationRole-based permission checks instead.
 */
export type StableAccessType = "owner" | "manager" | "member";

/**
 * @deprecated Use DEFAULT_PERMISSION_MATRIX instead.
 */
export const STABLE_PERMISSIONS: Record<
  StableAction,
  { owner: boolean; manager: boolean; member: boolean }
> = {
  view_stable: { owner: true, manager: true, member: true },
  update_settings: { owner: true, manager: false, member: false },
  delete_stable: { owner: true, manager: false, member: false },
  view_members: { owner: true, manager: true, member: true },
  invite_members: { owner: true, manager: true, member: false },
  remove_members: { owner: true, manager: false, member: false },
  change_roles: { owner: true, manager: false, member: false },
  create_schedules: { owner: true, manager: true, member: false },
  edit_schedules: { owner: true, manager: true, member: false },
  delete_schedules: { owner: true, manager: false, member: false },
  view_schedules: { owner: true, manager: true, member: true },
  book_shifts: { owner: true, manager: true, member: true },
  cancel_own_bookings: { owner: true, manager: true, member: true },
  cancel_others_bookings: { owner: true, manager: true, member: false },
};

/**
 * @deprecated Use DEFAULT_PERMISSION_MATRIX instead.
 */
export const HORSE_PERMISSIONS: Record<
  HorseAction,
  { owner: boolean; manager: boolean; member: boolean }
> = {
  add_horse: { owner: true, manager: true, member: true },
  view_horses: { owner: true, manager: true, member: true },
  edit_own_horse: { owner: true, manager: true, member: true },
  edit_any_horse: { owner: false, manager: false, member: false },
  delete_own_horse: { owner: true, manager: true, member: true },
  delete_any_horse: { owner: false, manager: false, member: false },
  assign_to_shift: { owner: true, manager: true, member: true },
};

/**
 * @deprecated Use permission engine hasPermission() instead.
 */
export function hasStablePermission(
  action: StableAction,
  accessType: StableAccessType,
): boolean {
  return STABLE_PERMISSIONS[action][accessType];
}

/**
 * @deprecated Use permission engine hasPermission() instead.
 */
export function hasHorsePermission(
  action: HorseAction,
  accessType: StableAccessType,
): boolean {
  return HORSE_PERMISSIONS[action][accessType];
}
