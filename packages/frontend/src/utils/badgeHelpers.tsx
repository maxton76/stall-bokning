import { Badge, type BadgeProps } from "@/components/ui/badge";

/**
 * Badge variant types from shadcn/ui
 */
export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

/**
 * Badge variant mapping utilities
 *
 * Centralizes badge styling logic to ensure consistent visual representation
 * of roles, statuses, and priorities across the application.
 */
export const badgeVariants = {
  /**
   * Get badge variant for user/organization roles
   *
   * @param role - Role identifier
   * @returns Badge variant for the given role
   *
   * @example
   * ```tsx
   * <Badge variant={badgeVariants.role('administrator')}>
   *   Administrator
   * </Badge>
   * ```
   */
  role: (role: string): BadgeVariant => {
    const roleMap: Record<string, BadgeVariant> = {
      // High-privilege roles
      administrator: "destructive",
      stable_owner: "destructive",
      system_admin: "destructive",

      // Management roles
      training_admin: "destructive",

      // Professional roles
      veterinarian: "default",
      dentist: "default",
      farrier: "default",
      trainer: "default",
      schedule_planner: "default",
      inseminator: "default",

      // Standard roles
      stable_guest: "secondary",
      member: "secondary",
      customer: "secondary",
      groom: "secondary",
      saddle_maker: "secondary",
      horse_owner: "secondary",
      rider: "secondary",
      support_contact: "outline",
    };

    const lowerRole = role?.toLowerCase() || "";
    return roleMap[lowerRole] || "outline";
  },

  /**
   * Get badge variant for entity status
   *
   * @param status - Status identifier
   * @returns Badge variant for the given status
   *
   * @example
   * ```tsx
   * <Badge variant={badgeVariants.status('active')}>
   *   Active
   * </Badge>
   * ```
   */
  status: (status: string): BadgeVariant => {
    const statusMap: Record<string, BadgeVariant> = {
      // Positive statuses
      active: "default",
      completed: "default",
      approved: "default",
      success: "default",

      // Pending/intermediate statuses
      pending: "secondary",
      in_progress: "secondary",
      processing: "secondary",

      // Inactive/cancelled statuses
      inactive: "outline",
      draft: "outline",
      expired: "outline",

      // Negative statuses
      cancelled: "destructive",
      failed: "destructive",
      rejected: "destructive",
      error: "destructive",
    };

    return statusMap[status.toLowerCase()] || "secondary";
  },

  /**
   * Get badge variant for priority levels
   *
   * @param priority - Priority level
   * @returns Badge variant for the given priority
   *
   * @example
   * ```tsx
   * <Badge variant={badgeVariants.priority('high')}>
   *   High Priority
   * </Badge>
   * ```
   */
  priority: (priority: string): BadgeVariant => {
    const priorityMap: Record<string, BadgeVariant> = {
      critical: "destructive",
      high: "destructive",
      medium: "default",
      low: "secondary",
      none: "outline",
    };

    return priorityMap[priority.toLowerCase()] || "secondary";
  },

  /**
   * Get badge variant for subscription tiers
   *
   * @param tier - Subscription tier
   * @returns Badge variant for the given tier
   */
  subscription: (tier: string): BadgeVariant => {
    const tierMap: Record<string, BadgeVariant> = {
      enterprise: "destructive",
      professional: "default",
      basic: "secondary",
      free: "outline",
      trial: "outline",
    };

    return tierMap[tier.toLowerCase()] || "secondary";
  },
};

/**
 * Badge component with automatic variant selection for roles
 *
 * @example
 * ```tsx
 * <RoleBadge role="administrator">Administrator</RoleBadge>
 * ```
 */
export function RoleBadge({
  role,
  children,
  ...props
}: { role: string; children?: React.ReactNode } & Omit<BadgeProps, "variant">) {
  return (
    <Badge variant={badgeVariants.role(role)} {...props}>
      {children || role}
    </Badge>
  );
}

/**
 * Badge component with automatic variant selection for statuses
 *
 * @example
 * ```tsx
 * <StatusBadge status="active">Active</StatusBadge>
 * ```
 */
export function StatusBadge({
  status,
  children,
  ...props
}: { status: string; children?: React.ReactNode } & Omit<
  BadgeProps,
  "variant"
>) {
  return (
    <Badge variant={badgeVariants.status(status)} {...props}>
      {children || status}
    </Badge>
  );
}

/**
 * Badge component with automatic variant selection for priorities
 *
 * @example
 * ```tsx
 * <PriorityBadge priority="high">High</PriorityBadge>
 * ```
 */
export function PriorityBadge({
  priority,
  children,
  ...props
}: { priority: string; children?: React.ReactNode } & Omit<
  BadgeProps,
  "variant"
>) {
  return (
    <Badge variant={badgeVariants.priority(priority)} {...props}>
      {children || priority}
    </Badge>
  );
}

/**
 * Badge component with automatic variant selection for subscription tiers
 *
 * @example
 * ```tsx
 * <SubscriptionBadge tier="professional">Professional</SubscriptionBadge>
 * ```
 */
export function SubscriptionBadge({
  tier,
  children,
  ...props
}: { tier: string; children?: React.ReactNode } & Omit<BadgeProps, "variant">) {
  return (
    <Badge variant={badgeVariants.subscription(tier)} {...props}>
      {children || tier}
    </Badge>
  );
}
