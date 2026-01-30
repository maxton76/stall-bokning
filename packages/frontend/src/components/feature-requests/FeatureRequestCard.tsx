import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FeatureRequest } from "@equiduty/shared";
import { formatRelativeTime } from "@/utils/formatRelativeTime";
import { PRIORITY_COLORS } from "./constants";
import { StatusBadge } from "./StatusBadge";
import { CategoryBadge } from "./CategoryBadge";
import { VoteButton } from "./VoteButton";

interface FeatureRequestCardProps {
  request: FeatureRequest;
  onVote: (id: string) => void;
}

export function FeatureRequestCard({
  request,
  onVote,
}: FeatureRequestCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation(["featureRequests", "common"]);

  function handleCardClick() {
    navigate(`/feature-requests/${request.id}`);
  }

  function handleVoteClick(e?: React.MouseEvent) {
    e?.stopPropagation();
    onVote(request.id);
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className="flex cursor-pointer items-start gap-4 p-4 transition-colors hover:bg-accent/50"
    >
      <div className="flex-shrink-0 pt-0.5">
        <VoteButton
          count={request.voteCount}
          hasVoted={request.hasVoted ?? false}
          onVote={handleVoteClick}
          size="lg"
        />
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <h3 className="text-sm font-semibold leading-tight text-foreground">
          {request.title}
        </h3>

        <p className="line-clamp-2 text-sm text-muted-foreground">
          {request.description}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={request.status} />
          <CategoryBadge category={request.category} />

          {request.priority && (
            <Badge
              className={cn(
                "border-transparent text-xs font-medium",
                PRIORITY_COLORS[request.priority],
              )}
            >
              {t(`featureRequests:priorities.${request.priority}`)}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{request.authorDisplayName}</span>
          <span aria-hidden="true">&middot;</span>
          <span>{formatRelativeTime(request.createdAt, t)}</span>
          <span aria-hidden="true">&middot;</span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {request.commentCount}
          </span>
        </div>
      </div>
    </Card>
  );
}
