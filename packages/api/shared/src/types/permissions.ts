/**
 * Permission types and matrices
 * CONSOLIDATED from frontend/types/roles.ts
 */

/**
 * Stable-level actions
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
 * Horse-level actions
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
 * User's stable access type
 */
export type StableAccessType = "owner" | "manager" | "member";

/**
 * Permission matrix for stable operations
 * Maps each action to allowed roles
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
 * Permission matrix for horse operations
 * Maps each action to allowed roles
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
 * Check if a role has permission for a stable action
 *
 * @param action - Stable action to check
 * @param accessType - User's access type (owner, manager, member)
 * @returns true if role has permission
 */
export function hasStablePermission(
  action: StableAction,
  accessType: StableAccessType,
): boolean {
  return STABLE_PERMISSIONS[action][accessType];
}

/**
 * Check if a role has permission for a horse action
 *
 * @param action - Horse action to check
 * @param accessType - User's access type (owner, manager, member)
 * @returns true if role has permission
 */
export function hasHorsePermission(
  action: HorseAction,
  accessType: StableAccessType,
): boolean {
  return HORSE_PERMISSIONS[action][accessType];
}
