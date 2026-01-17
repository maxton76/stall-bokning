/**
 * Permission types and matrices
 * CONSOLIDATED from frontend/types/roles.ts
 */
/**
 * Permission matrix for stable operations
 * Maps each action to allowed roles
 */
export const STABLE_PERMISSIONS = {
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
export const HORSE_PERMISSIONS = {
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
export function hasStablePermission(action, accessType) {
  return STABLE_PERMISSIONS[action][accessType];
}
/**
 * Check if a role has permission for a horse action
 *
 * @param action - Horse action to check
 * @param accessType - User's access type (owner, manager, member)
 * @returns true if role has permission
 */
export function hasHorsePermission(action, accessType) {
  return HORSE_PERMISSIONS[action][accessType];
}
