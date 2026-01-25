import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys, cacheInvalidation } from "@/lib/queryClient";
import i18n from "@/i18n";
import {
  getPendingInvitations,
  acceptInvitation,
  declineInvitation,
  type Invitation,
} from "@/services/inviteService";

interface UsePendingInvitationsResult {
  invitations: Invitation[];
  loading: boolean;
  accept: (inviteId: string, stableId: string) => Promise<void>;
  decline: (inviteId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook to manage pending stable invitations using TanStack Query.
 *
 * Provides accept/decline functionality with toast notifications.
 * Auto-loads when user email is available and auto-refreshes on window focus.
 *
 * Migrated from useAsyncData to TanStack Query for:
 * - Automatic cache invalidation
 * - Background refetching
 * - Optimistic updates
 *
 * @example
 * ```tsx
 * const { invitations, loading, accept, decline } = usePendingInvitationsQuery();
 *
 * // Accept an invitation
 * await accept(inviteId, stableId);
 *
 * // Decline an invitation
 * await decline(inviteId);
 * ```
 */
export function usePendingInvitationsQuery(): UsePendingInvitationsResult {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useApiQuery<Invitation[]>(
    queryKeys.invitations.pending(user?.uid || ""),
    async () => {
      if (!user?.email) return [];
      return getPendingInvitations(user.email);
    },
    {
      enabled: !!user?.email,
      staleTime: 2 * 60 * 1000, // Invitations should refresh often
      refetchOnWindowFocus: true,
    },
  );

  const accept = async (inviteId: string, stableId: string) => {
    if (!user?.uid || !user?.email) return;

    try {
      const invitations = query.data || [];
      const invite = invitations.find((i) => i.id === inviteId);

      if (!invite) throw new Error(i18n.t("invites:errors.notFound"));

      // Validate all required fields
      const missing: string[] = [];
      if (!invite.role) missing.push("role");
      if (!invite.stableName) missing.push("stableName");
      if (!stableId) missing.push("stableId");

      if (missing.length > 0) {
        throw new Error(
          i18n.t("invites:errors.incompleteInvitation", {
            missing: missing.join(", "),
          }),
        );
      }

      const stableName = invite.stableName;
      if (!stableName) {
        throw new Error(i18n.t("invites:errors.stableNotFound"));
      }

      // Validate user has firstName/lastName
      if (!user.firstName || !user.lastName) {
        throw new Error(i18n.t("invites:errors.profileIncomplete"));
      }

      // Optimistic update - remove the invitation from the list
      queryClient.setQueryData<Invitation[]>(
        queryKeys.invitations.pending(user.uid),
        (old) => old?.filter((i) => i.id !== inviteId) ?? [],
      );

      await acceptInvitation(
        inviteId,
        user.uid,
        user.email,
        user.firstName,
        user.lastName,
        stableId,
        stableName,
        invite.role,
      );

      toast({
        title: i18n.t("errors:titles.success"),
        description: i18n.t("invites:messages.acceptedRole", {
          role: invite.role,
          stableName: stableName,
        }),
      });

      // Invalidate related caches
      await Promise.all([
        cacheInvalidation.invitations.pending(user.uid),
        cacheInvalidation.userStables.byUser(user.uid),
        cacheInvalidation.stables.lists(),
      ]);
    } catch (error) {
      console.error("Error accepting invitation:", error);

      // Rollback optimistic update on error
      await cacheInvalidation.invitations.pending(user.uid);

      const errorMessage =
        error instanceof Error
          ? error.message
          : i18n.t("invites:errors.acceptFailed");

      toast({
        title: i18n.t("errors:titles.error"),
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const decline = async (inviteId: string) => {
    if (!user?.uid) return;

    try {
      // Optimistic update - remove the invitation from the list
      queryClient.setQueryData<Invitation[]>(
        queryKeys.invitations.pending(user.uid),
        (old) => old?.filter((i) => i.id !== inviteId) ?? [],
      );

      await declineInvitation(inviteId, user.uid);

      toast({
        title: i18n.t("invites:messages.declined"),
        description: i18n.t("invites:messages.declinedDescription"),
      });

      // Invalidate to ensure consistency
      await cacheInvalidation.invitations.pending(user.uid);
    } catch (error) {
      console.error("Error declining invitation:", error);

      // Rollback optimistic update on error
      await cacheInvalidation.invitations.pending(user.uid);

      toast({
        title: i18n.t("errors:titles.error"),
        description: i18n.t("invites:errors.declineFailed"),
        variant: "destructive",
      });
    }
  };

  return {
    invitations: query.data || [],
    loading: query.isLoading,
    accept,
    decline,
    refresh: async () => {
      await query.refetch();
    },
  };
}
