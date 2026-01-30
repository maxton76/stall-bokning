import { useTranslation } from "react-i18next";
import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoteButtonProps {
  count: number;
  hasVoted: boolean;
  onVote: (e?: React.MouseEvent) => void;
  disabled?: boolean;
  size?: "sm" | "lg";
}

export function VoteButton({
  count,
  hasVoted,
  onVote,
  disabled = false,
  size = "sm",
}: VoteButtonProps) {
  const { t } = useTranslation("featureRequests");
  const isVertical = size === "lg";

  return (
    <Button
      variant={hasVoted ? "default" : "ghost"}
      size="sm"
      disabled={disabled}
      onClick={onVote}
      aria-label={hasVoted ? t("vote.ariaRemoveVote") : t("vote.ariaVote")}
      aria-pressed={hasVoted}
      className={cn(
        "gap-0.5",
        isVertical
          ? "flex-col h-auto px-3 py-2 min-w-[3.5rem]"
          : "flex-row h-8 px-2",
        !hasVoted &&
          "text-muted-foreground hover:text-primary hover:bg-primary/10",
      )}
    >
      <ChevronUp className={cn(isVertical ? "h-5 w-5" : "h-4 w-4")} />
      <span
        className={cn(
          "font-semibold tabular-nums",
          isVertical ? "text-base" : "text-sm",
        )}
      >
        {count}
      </span>
    </Button>
  );
}
