import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, CalendarOff, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExceptionFormDialog } from "./ExceptionFormDialog";
import type { ScheduleException, TimeBlock } from "@/types/facility";

interface FacilityExceptionsManagerProps {
  exceptions: ScheduleException[];
  onAdd: (exception: {
    date: string;
    type: "closed" | "modified";
    timeBlocks: TimeBlock[];
    reason?: string;
  }) => Promise<void>;
  onRemove: (date: string) => void;
}

export function FacilityExceptionsManager({
  exceptions,
  onAdd,
  onRemove,
}: FacilityExceptionsManagerProps) {
  const { t } = useTranslation("facilities");
  const [dialogOpen, setDialogOpen] = useState(false);

  const sortedExceptions = [...exceptions].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("schedule.exceptionsDescription")}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="mr-1 h-3 w-3" />
          {t("schedule.addException")}
        </Button>
      </div>

      {sortedExceptions.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          {t("schedule.noExceptions")}
        </p>
      ) : (
        <div className="space-y-2">
          {sortedExceptions.map((exception) => (
            <div
              key={exception.date}
              className="flex items-center justify-between rounded-md border p-2"
            >
              <div className="flex items-center gap-2">
                {exception.type === "closed" ? (
                  <CalendarOff className="h-4 w-4 text-destructive" />
                ) : (
                  <Clock className="h-4 w-4 text-blue-500" />
                )}
                <span className="text-sm font-medium">{exception.date}</span>
                <Badge
                  variant={
                    exception.type === "closed" ? "destructive" : "secondary"
                  }
                >
                  {t(`schedule.exceptionType.${exception.type}`)}
                </Badge>
                {exception.reason && (
                  <span className="text-xs text-muted-foreground">
                    {exception.reason}
                  </span>
                )}
                {exception.type === "modified" &&
                  exception.timeBlocks.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {exception.timeBlocks
                        .map((b) => `${b.from}–${b.to}`)
                        .join(", ")}
                    </span>
                  )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(exception.date)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <ExceptionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={onAdd}
        existingDates={exceptions.map((e) => e.date)}
      />
    </div>
  );
}
