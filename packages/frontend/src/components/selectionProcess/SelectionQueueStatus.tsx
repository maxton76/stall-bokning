import { useTranslation } from "react-i18next";
import { Check, Clock, Crown, Loader2, User, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  SelectionProcessWithContext,
  SelectionProcessTurn,
  SelectionTurnStatus,
} from "@equiduty/shared";

/**
 * Props for a single turn item in the queue
 */
interface TurnItemProps {
  turn: SelectionProcessTurn;
  isCurrentTurn: boolean;
  isUserTurn: boolean;
}

/**
 * Get status badge variant based on turn status
 */
function getStatusBadgeVariant(
  status: SelectionTurnStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "active":
      return "secondary";
    case "pending":
    default:
      return "outline";
  }
}

/**
 * Get icon for turn status
 */
function TurnStatusIcon({ status }: { status: SelectionTurnStatus }) {
  switch (status) {
    case "completed":
      return <Check className="h-4 w-4" />;
    case "active":
      return <CircleDot className="h-4 w-4 animate-pulse" />;
    case "pending":
    default:
      return <Clock className="h-4 w-4" />;
  }
}

/**
 * Single turn item component
 */
function TurnItem({ turn, isCurrentTurn, isUserTurn }: TurnItemProps) {
  const { t } = useTranslation("selectionProcess");

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
        isCurrentTurn && "bg-primary/10 border-primary",
        isUserTurn && !isCurrentTurn && "bg-accent/50",
        !isCurrentTurn && !isUserTurn && "bg-card",
      )}
    >
      {/* Position number */}
      <div
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold flex-shrink-0",
          turn.status === "completed" &&
            "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
          turn.status === "active" && "bg-primary text-primary-foreground",
          turn.status === "pending" && "bg-muted text-muted-foreground",
        )}
      >
        {turn.order}
      </div>

      {/* Member info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium truncate">{turn.userName}</span>
          {isUserTurn && (
            <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" />
          )}
        </div>
        {turn.selectionsCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {turn.selectionsCount} {t("labels.position").toLowerCase()}
          </span>
        )}
      </div>

      {/* Status badge */}
      <Badge
        variant={getStatusBadgeVariant(turn.status)}
        className="flex-shrink-0"
      >
        <TurnStatusIcon status={turn.status} />
        <span className="ml-1">{t(`turnStatus.${turn.status}`)}</span>
      </Badge>
    </div>
  );
}

/**
 * SelectionQueueStatus Props
 */
interface SelectionQueueStatusProps {
  /** Selection process data with user context */
  process: SelectionProcessWithContext;
  /** Callback when user completes their turn */
  onCompleteTurn: () => void;
  /** Whether the complete turn action is loading */
  isCompletingTurn?: boolean;
  /** Optional class name */
  className?: string;
}

/**
 * SelectionQueueStatus Component
 *
 * Displays the current queue status for a selection process.
 * Shows all turns with their status (pending/active/completed),
 * highlights the current turn, and provides a prominent action
 * button for the current turn user.
 *
 * @example
 * ```tsx
 * <SelectionQueueStatus
 *   process={selectionProcess}
 *   onCompleteTurn={handleCompleteTurn}
 *   isCompletingTurn={isCompleting}
 * />
 * ```
 */
export function SelectionQueueStatus({
  process,
  onCompleteTurn,
  isCompletingTurn = false,
  className,
}: SelectionQueueStatusProps) {
  const { t } = useTranslation("selectionProcess");

  const {
    turns,
    currentTurnUserId,
    isCurrentTurn,
    status: processStatus,
  } = process;

  // Count completed turns
  const completedTurns = turns.filter((t) => t.status === "completed").length;
  const totalTurns = turns.length;

  // Find current turn for display
  const activeTurn = turns.find((t) => t.status === "active");

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t("queue.title")}</CardTitle>
          <span className="text-sm text-muted-foreground">
            {completedTurns}/{totalTurns}{" "}
            {t("labels.completedTurns").toLowerCase()}
          </span>
        </div>

        {/* Current turn user notification */}
        {isCurrentTurn && processStatus === "active" && (
          <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-5 w-5 text-primary" />
              <span className="font-semibold text-primary">
                {t("messages.yourTurn")}
              </span>
            </div>
            <Button
              onClick={onCompleteTurn}
              disabled={isCompletingTurn}
              className="w-full"
            >
              {isCompletingTurn && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {t("buttons.completeTurn")}
            </Button>
          </div>
        )}

        {/* Waiting state for other users */}
        {!isCurrentTurn && processStatus === "active" && activeTurn && (
          <div className="mt-3 p-3 rounded-lg bg-muted">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-5 w-5" />
              <span className="text-sm">{t("messages.notYourTurn")}</span>
            </div>
            <p className="text-sm mt-1">
              {t("labels.currentTurn")}: <strong>{activeTurn.userName}</strong>
            </p>
          </div>
        )}

        {/* Completed state */}
        {processStatus === "completed" && (
          <div className="mt-3 p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <Check className="h-5 w-5" />
              <span className="font-medium">
                {t("messages.processCompleted")}
              </span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
            {turns.map((turn) => (
              <TurnItem
                key={turn.userId}
                turn={turn}
                isCurrentTurn={turn.userId === currentTurnUserId}
                isUserTurn={
                  turn.userId === process.currentTurnUserId && isCurrentTurn
                }
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default SelectionQueueStatus;
