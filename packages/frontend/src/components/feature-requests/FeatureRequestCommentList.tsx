import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FeatureRequestComment } from "@equiduty/shared";
import { formatRelativeTime } from "@/utils/formatRelativeTime";

interface FeatureRequestCommentListProps {
  requestId: string;
  comments: FeatureRequestComment[];
  nextCursor: string | null;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

export function FeatureRequestCommentList({
  comments,
  nextCursor,
  onLoadMore,
  isLoadingMore = false,
}: FeatureRequestCommentListProps) {
  const { t } = useTranslation(["featureRequests", "common"]);

  if (comments.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {t("featureRequests:noComments")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div
          key={comment.id}
          className="rounded-lg border bg-card p-4 text-card-foreground"
        >
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {comment.authorDisplayName}
            </span>
            {comment.isAdmin && (
              <Badge
                variant="secondary"
                className="px-1.5 py-0 text-[10px] font-semibold uppercase"
              >
                {t("featureRequests:adminBadge")}
              </Badge>
            )}
            <span aria-hidden="true">&middot;</span>
            <time>{formatRelativeTime(comment.createdAt, t)}</time>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {comment.body}
          </p>
        </div>
      ))}

      {nextCursor && onLoadMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore
              ? t("common:labels.loading")
              : t("featureRequests:loadMoreComments")}
          </Button>
        </div>
      )}
    </div>
  );
}
