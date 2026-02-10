import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Loader2,
  AlertCircle,
  CalendarDays,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useRoutineTemplates } from "@/hooks/useRoutines";
import { useUserStables } from "@/hooks/useUserStables";
import { useAuth } from "@/contexts/AuthContext";
import { scheduledRoutinesKeys } from "@/hooks/useScheduledRoutines";
import { bulkCreateRoutineInstances } from "@/services/routineService";
import type { BulkCreateRoutineInstancesResponse } from "@/services/routineService";
import { holidayService } from "@equiduty/shared";
import { format, addDays, eachDayOfInterval, isWeekend } from "date-fns";
import { sv } from "date-fns/locale";

interface RoutineCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stableId: string;
  initialDate?: Date;
  onSuccess?: (instanceIds: string[]) => void;
}

type RepeatPattern = "single" | "daily" | "weekdays" | "custom";

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Mån" },
  { value: 2, label: "Tis" },
  { value: 3, label: "Ons" },
  { value: 4, label: "Tor" },
  { value: 5, label: "Fre" },
  { value: 6, label: "Lör" },
  { value: 0, label: "Sön" },
];

export function RoutineCreationModal({
  open,
  onOpenChange,
  stableId,
  initialDate,
  onSuccess,
}: RoutineCreationModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get stable to find organizationId
  const { stables } = useUserStables(user?.uid);
  const stable = stables.find((s) => s.id === stableId);
  const organizationId = stable?.organizationId;

  // Fetch templates for this stable/org
  const { templates, loading: templatesLoading } = useRoutineTemplates(
    organizationId,
    stableId,
  );

  // Form state
  const [templateId, setTemplateId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(
    initialDate
      ? format(initialDate, "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState<string>(
    initialDate
      ? format(initialDate, "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd"),
  );
  const [repeatPattern, setRepeatPattern] = useState<RepeatPattern>("single");
  const [selectedDays, setSelectedDays] = useState<number[]>([
    initialDate ? initialDate.getDay() : new Date().getDay(),
  ]);
  const [includeHolidays, setIncludeHolidays] = useState(false);

  // Reset form when modal opens with new date
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && initialDate) {
      setStartDate(format(initialDate, "yyyy-MM-dd"));
      setEndDate(format(initialDate, "yyyy-MM-dd"));
      setRepeatPattern("single");
      setSelectedDays([initialDate.getDay()]);
    }
    if (!newOpen) {
      // Reset form when closing
      setTemplateId("");
      setRepeatPattern("single");
      setIncludeHolidays(false);
    }
    onOpenChange(newOpen);
  };

  // Calculate dates to be created
  const previewDates = useMemo(() => {
    if (!startDate) return [];

    const start = new Date(startDate);
    const end = repeatPattern === "single" ? start : new Date(endDate);

    if (start > end) return [];

    const allDays = eachDayOfInterval({ start, end });

    return allDays.filter((day) => {
      const dayOfWeek = day.getDay();

      switch (repeatPattern) {
        case "single":
          return true;
        case "daily":
          return true;
        case "weekdays":
          return !isWeekend(day);
        case "custom": {
          const matchesDay = selectedDays.includes(dayOfWeek);
          return matchesDay || (includeHolidays && holidayService.isHoliday(day));
        }
        default:
          return false;
      }
    });
  }, [startDate, endDate, repeatPattern, selectedDays, includeHolidays]);

  // Get selected template
  const selectedTemplate = templates.find((t) => t.id === templateId);

  // Bulk create mutation
  const createMutation = useMutation({
    mutationFn: async (): Promise<BulkCreateRoutineInstancesResponse> => {
      const repeatDays =
        repeatPattern === "single"
          ? undefined
          : repeatPattern === "daily"
            ? undefined
            : repeatPattern === "weekdays"
              ? [1, 2, 3, 4, 5]
              : selectedDays;

      return bulkCreateRoutineInstances({
        templateId,
        stableId,
        startDate,
        endDate: repeatPattern === "single" ? startDate : endDate,
        repeatDays,
        includeHolidays: repeatPattern === "custom" ? includeHolidays : undefined,
        assignmentMode: "unassigned",
      });
    },
    onSuccess: (data) => {
      // Invalidate scheduled routines queries
      queryClient.invalidateQueries({ queryKey: scheduledRoutinesKeys.all });

      // Close modal
      handleOpenChange(false);

      // Call onSuccess callback
      if (onSuccess && data.instanceIds.length > 0) {
        onSuccess(data.instanceIds);
      }
    },
  });

  const handleSubmit = () => {
    if (!templateId || previewDates.length === 0) return;
    createMutation.mutate();
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort(),
    );
  };

  // Loading state for templates
  if (templatesLoading) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Skapa rutin
            </DialogTitle>
            <DialogDescription>Laddar rutinmallar...</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // No templates available
  if (templates.length === 0) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Skapa rutin
            </DialogTitle>
            <DialogDescription>Inga rutinmallar tillgängliga</DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Inga rutinmallar finns tillgängliga för detta stall. Skapa först
                en rutinmall under Inställningar.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button variant="outline" asChild>
              <Link
                to="/schedule/routinetemplates"
                onClick={() => handleOpenChange(false)}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Gå till rutinmallar
              </Link>
            </Button>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Stäng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Skapa rutin
          </DialogTitle>
          <DialogDescription>
            Välj en rutinmall och datum för att skapa nya rutininstanser.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template">Rutinmall</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Välj rutinmall..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      <span>{template.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {template.pointsValue} poäng
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate">
              {repeatPattern === "single" ? "Datum" : "Startdatum"}
            </Label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Repeat Pattern */}
          <div className="space-y-2">
            <Label>Upprepning</Label>
            <Select
              value={repeatPattern}
              onValueChange={(v) => {
                setRepeatPattern(v as RepeatPattern);
                if (v !== "custom") setIncludeHolidays(false);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Endast detta datum</SelectItem>
                <SelectItem value="daily">Varje dag</SelectItem>
                <SelectItem value="weekdays">Vardagar (mån-fre)</SelectItem>
                <SelectItem value="custom">Anpassade dagar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* End Date (only for repeating) */}
          {repeatPattern !== "single" && (
            <div className="space-y-2">
              <Label htmlFor="endDate">Slutdatum</Label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          )}

          {/* Custom Days Selection */}
          {repeatPattern === "custom" && (
            <div className="space-y-2">
              <Label>Välj dagar</Label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_OPTIONS.map((day) => (
                  <div
                    key={day.value}
                    className="flex items-center space-x-1.5"
                  >
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={selectedDays.includes(day.value)}
                      onCheckedChange={() => toggleDay(day.value)}
                    />
                    <label
                      htmlFor={`day-${day.value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {day.label}
                    </label>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex items-center space-x-1.5">
                  <Checkbox
                    id="includeHolidays"
                    checked={includeHolidays}
                    onCheckedChange={(checked) =>
                      setIncludeHolidays(checked === true)
                    }
                  />
                  <label
                    htmlFor="includeHolidays"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Helgdagar (svenska helgdagar)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          {selectedTemplate && previewDates.length > 0 && previewDates[0] && (
            <div className="bg-muted/50 rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Förhandsgranskning</span>
                <Badge variant="secondary">
                  {previewDates.length} rutin
                  {previewDates.length !== 1 ? "er" : ""}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {previewDates.length === 1 ? (
                  <span>
                    {format(previewDates[0], "EEEE d MMMM yyyy", {
                      locale: sv,
                    })}
                  </span>
                ) : (
                  <span>
                    {format(previewDates[0], "d MMM", { locale: sv })} -{" "}
                    {format(
                      previewDates[previewDates.length - 1]!,
                      "d MMM yyyy",
                      { locale: sv },
                    )}
                  </span>
                )}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  Totalt poäng:{" "}
                  {previewDates.length * selectedTemplate.pointsValue}
                </span>
                <span>
                  ~
                  {Math.round(
                    (previewDates.length * selectedTemplate.estimatedDuration) /
                      60,
                  )}{" "}
                  tim
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {createMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Kunde inte skapa rutiner:{" "}
                {(createMutation.error as Error)?.message || "Okänt fel"}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Avbryt
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !templateId ||
              previewDates.length === 0 ||
              createMutation.isPending
            }
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Skapar...
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Skapa{" "}
                {previewDates.length > 1
                  ? `${previewDates.length} rutiner`
                  : "rutin"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
