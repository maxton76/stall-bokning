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
export declare const STABLE_PERMISSIONS: Record<
  StableAction,
  {
    owner: boolean;
    manager: boolean;
    member: boolean;
  }
>;
/**
 * Permission matrix for horse operations
 * Maps each action to allowed roles
 */
export declare const HORSE_PERMISSIONS: Record<
  HorseAction,
  {
    owner: boolean;
    manager: boolean;
    member: boolean;
  }
>;
/**
 * Check if a role has permission for a stable action
 *
 * @param action - Stable action to check
 * @param accessType - User's access type (owner, manager, member)
 * @returns true if role has permission
 */
export declare function hasStablePermission(
  action: StableAction,
  accessType: StableAccessType,
): boolean;
/**
 * Check if a role has permission for a horse action
 *
 * @param action - Horse action to check
 * @param accessType - User's access type (owner, manager, member)
 * @returns true if role has permission
 */
export declare function hasHorsePermission(
  action: HorseAction,
  accessType: StableAccessType,
): boolean;
//# sourceMappingURL=permissions.d.ts.map
