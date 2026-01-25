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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar,
  Loader2,
  AlertCircle,
  CalendarDays,
  Users,
  Scale,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useAssignmentSuggestions } from "@/hooks/useFairnessDistribution";
import { scheduledRoutinesKeys } from "@/hooks/useScheduledRoutines";
import type { RoutineTemplate } from "@shared/types";
import { format, addDays, eachDayOfInterval, isWeekend } from "date-fns";
import { sv } from "date-fns/locale";

interface BulkScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: RoutineTemplate[];
  stableId: string;
}

type AssignmentMode = "auto" | "manual" | "unassigned";
type RepeatPattern = "daily" | "weekdays" | "custom";

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Måndag" },
  { value: 2, label: "Tisdag" },
  { value: 3, label: "Onsdag" },
  { value: 4, label: "Torsdag" },
  { value: 5, label: "Fredag" },
  { value: 6, label: "Lördag" },
  { value: 0, label: "Söndag" },
];

interface BulkCreateResponse {
  success: boolean;
  createdCount: number;
  instanceIds: string[];
}

export function BulkScheduleModal({
  open,
  onOpenChange,
  templates,
  stableId,
}: BulkScheduleModalProps) {
  // Form state
  const [templateId, setTemplateId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState<string>(
    format(addDays(new Date(), 7), "yyyy-MM-dd"),
  );
  const [repeatPattern, setRepeatPattern] = useState<RepeatPattern>("daily");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Weekdays by default
  const [assignmentMode, setAssignmentMode] =
    useState<AssignmentMode>("unassigned");

  const queryClient = useQueryClient();

  // Get fairness suggestions for preview
  const { data: suggestionsData } = useAssignmentSuggestions(stableId, 5);

  // Calculate dates to be created
  const previewDates = useMemo(() => {
    if (!startDate || !endDate) return [];

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) return [];

    const allDays = eachDayOfInterval({ start, end });

    return allDays.filter((day) => {
      const dayOfWeek = day.getDay();

      switch (repeatPattern) {
        case "daily":
          return true;
        case "weekdays":
          return !isWeekend(day);
        case "custom":
          return selectedDays.includes(dayOfWeek);
        default:
          return false;
      }
    });
  }, [startDate, endDate, repeatPattern, selectedDays]);

  // Get selected template
  const selectedTemplate = templates.find((t) => t.id === templateId);

  // Calculate total points
  const totalPoints = selectedTemplate
    ? previewDates.length * selectedTemplate.pointsValue
    : 0;

  // Bulk create mutation
  const bulkCreateMutation = useMutation({
    mutationFn: async (): Promise<BulkCreateResponse> => {
      const repeatDays =
        repeatPattern === "daily"
          ? undefined
          : repeatPattern === "weekdays"
            ? [1, 2, 3, 4, 5]
            : selectedDays;

      const response = await apiClient.post<BulkCreateResponse>(
        "/routines/instances/bulk",
        {
          templateId,
          stableId,
          startDate,
          endDate,
          repeatDays,
          assignmentMode,
        },
      );

      return response;
    },
    onSuccess: (data) => {
      // Invalidate scheduled routines queries
      queryClient.invalidateQueries({ queryKey: scheduledRoutinesKeys.all });

      // Close modal
      onOpenChange(false);

      // Reset form
      setTemplateId("");
      setRepeatPattern("daily");
      setAssignmentMode("unassigned");
    },
  });

  const handleSubmit = () => {
    if (!templateId || previewDates.length === 0) return;
    bulkCreateMutation.mutate();
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort(),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Masskapitel rutiner
          </DialogTitle>
          <DialogDescription>
            Skapa flera rutininstanser samtidigt för en tidsperiod.
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

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Startdatum</Label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Slutdatum</Label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {/* Repeat Pattern */}
          <div className="space-y-2">
            <Label>Upprepningsmönster</Label>
            <Select
              value={repeatPattern}
              onValueChange={(v) => setRepeatPattern(v as RepeatPattern)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Varje dag</SelectItem>
                <SelectItem value="weekdays">Vardagar (mån-fre)</SelectItem>
                <SelectItem value="custom">Anpassade dagar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Days Selection */}
          {repeatPattern === "custom" && (
            <div className="space-y-2">
              <Label>Välj dagar</Label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_OPTIONS.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={selectedDays.includes(day.value)}
                      onCheckedChange={() => toggleDay(day.value)}
                    />
                    <label
                      htmlFor={`day-${day.value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {day.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Assignment Mode */}
          <div className="space-y-2">
            <Label>Tilldelningsläge</Label>
            <Select
              value={assignmentMode}
              onValueChange={(v) => setAssignmentMode(v as AssignmentMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Lämna otilldelade</SelectItem>
                <SelectItem value="auto">
                  Automatisk tilldelning (rättvis)
                </SelectItem>
                <SelectItem value="manual">
                  Manuell tilldelning senare
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {assignmentMode === "auto" &&
                "Rutiner tilldelas automatiskt baserat på rättvisealgoritmen."}
              {assignmentMode === "unassigned" &&
                "Rutiner skapas utan tilldelning - kan bokas av medlemmar."}
              {assignmentMode === "manual" &&
                "Rutiner skapas otilldelade - du tilldelar manuellt efteråt."}
            </p>
          </div>

          {/* Fairness Preview */}
          {assignmentMode === "auto" && suggestionsData && (
            <Alert>
              <Scale className="h-4 w-4" />
              <AlertDescription>
                <strong>Rättvis fördelning:</strong> Rutiner kommer att fördelas
                till de med lägst poäng först.
                {suggestionsData.suggestions.length > 0 && (
                  <div className="mt-2 text-xs">
                    <span className="font-medium">
                      Prioriterade medlemmar:{" "}
                    </span>
                    {suggestionsData.suggestions.slice(0, 3).map((s, i) => (
                      <span key={s.userId}>
                        {s.displayName} ({s.historicalPoints} p)
                        {i < 2 && ", "}
                      </span>
                    ))}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Preview */}
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span>Förhandsgranskning</span>
              <Badge variant="secondary">{previewDates.length} rutiner</Badge>
            </Label>
            {previewDates.length > 0 ? (
              <ScrollArea className="h-32 rounded-md border p-2">
                <div className="space-y-1">
                  {previewDates.slice(0, 14).map((date, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50"
                    >
                      <span>{format(date, "EEEE d MMMM", { locale: sv })}</span>
                      <span className="text-muted-foreground">
                        {selectedTemplate?.defaultStartTime || "--:--"}
                      </span>
                    </div>
                  ))}
                  {previewDates.length > 14 && (
                    <div className="text-xs text-muted-foreground text-center py-1">
                      + {previewDates.length - 14} fler dagar...
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-32 rounded-md border flex items-center justify-center text-muted-foreground text-sm">
                Inga dagar matchar valt mönster
              </div>
            )}
          </div>

          {/* Summary */}
          {selectedTemplate && previewDates.length > 0 && (
            <div className="bg-muted/50 rounded-md p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Antal rutiner:</span>
                <strong>{previewDates.length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Poäng per rutin:</span>
                <strong>{selectedTemplate.pointsValue}</strong>
              </div>
              <div className="flex justify-between">
                <span>Totalt poäng:</span>
                <strong>{totalPoints}</strong>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Uppskattad tid:</span>
                <span>
                  ~
                  {Math.round(
                    (previewDates.length * selectedTemplate.estimatedDuration) /
                      60,
                  )}{" "}
                  timmar
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {bulkCreateMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Kunde inte skapa rutiner:{" "}
                {(bulkCreateMutation.error as Error)?.message || "Okänt fel"}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !templateId ||
              previewDates.length === 0 ||
              bulkCreateMutation.isPending
            }
          >
            {bulkCreateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Skapar...
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Skapa {previewDates.length} rutiner
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
