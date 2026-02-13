/**
 * QuickBookButton Component
 * One-click booking button for favorite facilities with smart time suggestions
 */

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, addHours, setHours, setMinutes } from "date-fns";
import { Star, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Facility } from "@/types/facility";
import { cn } from "@/lib/utils";

interface QuickBookButtonProps {
  facility: Facility;
  onQuickBook: (
    facilityId: string,
    date: Date,
    startTime: string,
    endTime: string,
  ) => void;
}

export function QuickBookButton({
  facility,
  onQuickBook,
}: QuickBookButtonProps) {
  const { t } = useTranslation(["facilities", "common"]);
  const [showDialog, setShowDialog] = useState(false);

  // Generate suggested time slots based on typical usage
  const suggestedTimes = useMemo(() => {
    const now = new Date();
    const suggestions: Array<{ start: Date; end: Date; label: string }> = [];

    // Morning slot (9:00 - 10:00)
    const morning = setMinutes(setHours(now, 9), 0);
    suggestions.push({
      start: morning,
      end: addHours(morning, 1),
      label: t("common:labels.morning"),
    });

    // Midday slot (12:00 - 13:00)
    const midday = setMinutes(setHours(now, 12), 0);
    suggestions.push({
      start: midday,
      end: addHours(midday, 1),
      label: t("common:labels.afternoon"),
    });

    // Evening slot (17:00 - 18:00)
    const evening = setMinutes(setHours(now, 17), 0);
    suggestions.push({
      start: evening,
      end: addHours(evening, 1),
      label: t("common:labels.evening"),
    });

    return suggestions;
  }, [t]);

  const handleQuickBook = (start: Date, end: Date) => {
    const startTime = format(start, "HH:mm");
    const endTime = format(end, "HH:mm");
    onQuickBook(facility.id, start, startTime, endTime);
    setShowDialog(false);
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-auto p-4 flex flex-col items-start gap-2",
            "hover:border-primary hover:bg-primary/5",
          )}
        >
          <div className="flex items-center gap-2 w-full">
            <Star className="h-4 w-4 text-yellow-500 shrink-0" />
            <span className="font-medium text-sm truncate">
              {facility.name}
            </span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {t(`constants:facilityTypes.${facility.type}`)}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{t("facilities:quickBook.bookAgain")}</span>
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("facilities:quickBook.title")} - {facility.name}
          </DialogTitle>
          <DialogDescription>
            {t("facilities:quickBook.suggestedTimes")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {suggestedTimes.map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              className="w-full justify-start h-auto p-4"
              onClick={() => handleQuickBook(suggestion.start, suggestion.end)}
            >
              <div className="flex items-center gap-3 w-full">
                <Clock className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 text-left">
                  <div className="font-medium">{suggestion.label}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(suggestion.start, "HH:mm")} -{" "}
                    {format(suggestion.end, "HH:mm")}
                  </div>
                </div>
              </div>
            </Button>
          ))}

          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                // Trigger the main booking dialog with pre-filled facility
                const now = new Date();
                const startTime = format(now, "HH:mm");
                const endTime = format(addHours(now, 1), "HH:mm");
                onQuickBook(facility.id, now, startTime, endTime);
                setShowDialog(false);
              }}
            >
              {t("common:labels.customTime")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
