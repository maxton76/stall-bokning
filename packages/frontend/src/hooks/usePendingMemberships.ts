import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPendingInvites,
  acceptMembershipInvite,
  declineMembershipInvite,
} from "@/services/inviteService";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface PendingMembership {
  id: string;
  organizationId: string;
  organizationName: string;
  inviterName: string;
  roles: string[];
  primaryRole: string;
  expiresAt?: { seconds: number; nanoseconds: number };
  status: string;
}

export function usePendingMemberships() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation(["invites", "common"]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["pendingMemberships", user?.uid],
    queryFn: async () => {
      const response = (await getPendingInvites()) as {
        invites: unknown[];
        pendingMemberships: PendingMembership[];
      };
      return response.pendingMemberships || [];
    },
    enabled: !!user,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const acceptMutation = useMutation({
    mutationFn: (memberId: string) => {
      setProcessingId(memberId);
      return acceptMembershipInvite(memberId);
    },
    onSuccess: (_data, memberId) => {
      const membership = query.data?.find((m) => m.id === memberId);
      toast({
        title: t("invites:pendingBanner.accept"),
        description: t("invites:pendingBanner.acceptSuccess", {
          organizationName: membership?.organizationName || "",
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["pendingMemberships"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organizationMembers"] });
    },
    onError: (_error, _memberId) => {
      toast({
        title: t("common:labels.error"),
        description: t("invites:errors.acceptFailed"),
        variant: "destructive",
      });
    },
    onSettled: () => {
      setProcessingId(null);
    },
  });

  const declineMutation = useMutation({
    mutationFn: (memberId: string) => {
      setProcessingId(memberId);
      return declineMembershipInvite(memberId);
    },
    onSuccess: () => {
      toast({
        title: t("invites:pendingBanner.decline"),
        description: t("invites:pendingBanner.declineSuccess"),
      });
      queryClient.invalidateQueries({ queryKey: ["pendingMemberships"] });
    },
    onError: () => {
      toast({
        title: t("common:labels.error"),
        description: t("invites:errors.declineFailed"),
        variant: "destructive",
      });
    },
    onSettled: () => {
      setProcessingId(null);
    },
  });

  return {
    pendingMemberships: query.data || [],
    isLoading: query.isLoading,
    accept: acceptMutation.mutate,
    decline: declineMutation.mutate,
    processingId,
    isAccepting: acceptMutation.isPending,
    isDeclining: declineMutation.isPending,
  };
}
