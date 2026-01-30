import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFeatureRequest,
  toggleVote,
} from "@/services/featureRequestService";
import { VoteButton } from "@/components/feature-requests/VoteButton";
import { StatusBadge } from "@/components/feature-requests/StatusBadge";
import { CategoryBadge } from "@/components/feature-requests/CategoryBadge";
import { FeatureRequestCommentList } from "@/components/feature-requests/FeatureRequestCommentList";
import { FeatureRequestCommentForm } from "@/components/feature-requests/FeatureRequestCommentForm";
import { AdminFeatureRequestActions } from "@/components/feature-requests/AdminFeatureRequestActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Lightbulb,
  Loader2,
  MessageSquare,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PRIORITY_COLORS } from "@/components/feature-requests/constants";
import type { FeatureRequestPriority } from "@equiduty/shared";

export default function FeatureRequestDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const { t } = useTranslation(["featureRequests", "common"]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryKey = ["featureRequest", requestId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getFeatureRequest(requestId!),
    enabled: !!requestId,
    staleTime: 30 * 1000,
  });

  const voteMutation = useMutation({
    mutationFn: () => toggleVote(requestId!),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          request: {
            ...old.request,
            hasVoted: !old.request.hasVoted,
            voteCount: old.request.hasVoted
              ? old.request.voteCount - 1
              : old.request.voteCount + 1,
          },
        };
      });

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(queryKey, context?.previousData);
      toast({
        title: t("featureRequests:errors.voteFailed"),
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container max-w-4xl py-6 text-center text-muted-foreground">
        {t("featureRequests:errors.generic")}
      </div>
    );
  }

  const { request, comments, commentsNextCursor } = data;
  const isAdmin = user?.systemRole === "system_admin";

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Back link */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/feature-requests")}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("featureRequests:detail.back")}
      </Button>

      {/* Main content */}
      <div className="flex gap-6">
        {/* Vote column */}
        <div className="flex-shrink-0 pt-1">
          <VoteButton
            count={request.voteCount}
            hasVoted={request.hasVoted ?? false}
            onVote={() => voteMutation.mutate()}
            disabled={voteMutation.isPending}
            size="lg"
          />
        </div>

        {/* Detail column */}
        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <h1 className="text-2xl font-bold">{request.title}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <StatusBadge status={request.status} />
              <CategoryBadge category={request.category} />
              {request.priority && (
                <Badge
                  className={PRIORITY_COLORS[request.priority] ?? ""}
                  variant="secondary"
                >
                  {t(`featureRequests:priorities.${request.priority}`)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {t("featureRequests:card.by", {
                name: request.authorDisplayName,
              })}{" "}
              &middot;{" "}
              {new Date(
                request.createdAt as unknown as string,
              ).toLocaleDateString()}
            </p>
          </div>

          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {request.description}
          </p>

          {/* Admin response */}
          {request.adminResponse && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {t("featureRequests:admin.responseLabel")}
                  </span>
                  {request.adminResponseAuthorName && (
                    <span className="text-xs text-muted-foreground">
                      — {request.adminResponseAuthorName}
                    </span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">
                  {request.adminResponse}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Admin actions */}
          {isAdmin && (
            <>
              <Separator />
              <AdminFeatureRequestActions
                request={request}
                onUpdate={handleRefresh}
              />
            </>
          )}

          <Separator />

          {/* Comments section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5" />
              <h2 className="text-lg font-semibold">
                {t("featureRequests:comments.title")} ({request.commentCount})
              </h2>
            </div>

            <FeatureRequestCommentList
              requestId={requestId!}
              comments={comments}
              nextCursor={commentsNextCursor}
            />

            <div className="mt-4">
              <FeatureRequestCommentForm
                requestId={requestId!}
                onSuccess={handleRefresh}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
