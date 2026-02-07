/**
 * Routine Assignment Preview Modal
 *
 * Shows a preview of all instances that will be created with suggested assignments
 * based on the fairness algorithm. Allows users to override any assignment before
 * creating the schedule.
 */

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarDays, Loader2, Users, Lightbulb } from "lucide-react";
import { useAssignmentSuggestions } from "@/hooks/useFairnessDistribution";
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";
import {
  getDuplicateNames,
  formatMemberDisplayName,
} from "@/utils/memberDisplayName";
import {
  generateSchedulePreview,
  formatPreviewDate,
  type PreviewInstance,
} from "@/utils/schedulePreviewGenerator";
import type { CreateRoutineScheduleInput } from "@shared/types";
import { format } from "date-fns";

interface RoutineAssignmentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleData: CreateRoutineScheduleInput | null;
  templateName: string;
  stableId: string;
  organizationId: string;
  onConfirm: (assignments: Record<string, string | null>) => void;
  isSubmitting?: boolean;
}

const UNASSIGNED_VALUE = "__unassigned__";

export function RoutineAssignmentPreviewModal({
  open,
  onOpenChange,
  scheduleData,
  templateName,
  stableId,
  organizationId,
  onConfirm,
  isSubmitting = false,
}: RoutineAssignmentPreviewModalProps) {
  const { t, i18n } = useTranslation(["routines", "common"]);
  const locale = i18n.language === "sv" ? "sv" : "en";

  // Track user assignments (key: dateKey, value: userId or null)
  const [assignments, setAssignments] = useState<Record<string, string | null>>(
    {},
  );

  // Fetch assignment suggestions from fairness algorithm
  const { data: suggestionsData, isLoading: suggestionsLoading } =
    useAssignmentSuggestions(stableId, 20);

  // Fetch all stable members for dropdown
  const { data: members = [], isLoading: membersLoading } =
    useOrganizationMembers(organizationId);

  // Generate preview instances
  const previewInstances = useMemo(() => {
    if (!scheduleData || suggestionsLoading) return [];

    return generateSchedulePreview(
      scheduleData.startDate,
      scheduleData.endDate,
      scheduleData.repeatPattern,
      scheduleData.repeatDays,
      scheduleData.scheduledStartTime,
      suggestionsData?.suggestions,
    );
  }, [scheduleData, suggestionsData?.suggestions, suggestionsLoading]);

  // Initialize assignments from suggestions when they load
  useEffect(() => {
    if (previewInstances.length > 0 && Object.keys(assignments).length === 0) {
      const initialAssignments: Record<string, string | null> = {};
      previewInstances.forEach((instance) => {
        initialAssignments[instance.dateKey] =
          instance.suggestedAssignee || null;
      });
      setAssignments(initialAssignments);
    }
  }, [previewInstances, assignments]);

  // Reset assignments when modal closes
  useEffect(() => {
    if (!open) {
      setAssignments({});
    }
  }, [open]);

  // Detect duplicate display names for disambiguation
  const duplicateNames = useMemo(() => getDuplicateNames(members), [members]);

  // Handle assignment change for a specific date
  const handleAssignmentChange = (dateKey: string, value: string) => {
    setAssignments((prev) => ({
      ...prev,
      [dateKey]: value === UNASSIGNED_VALUE ? null : value,
    }));
  };

  // Handle confirm
  const handleConfirm = () => {
    onConfirm(assignments);
  };

  // Get member display name by userId
  const getMemberName = (userId: string | null): string => {
    if (!userId) return t("routines:schedules.preview.unassigned");
    const member = members.find((m) => m.userId === userId);
    if (member) return formatMemberDisplayName(member, duplicateNames);
    // Try suggestion data as fallback
    const suggestion = suggestionsData?.suggestions.find(
      (s) => s.userId === userId,
    );
    return suggestion?.displayName || userId;
  };

  // Get dropdown item name - prefers member data over suggestion data
  const getDropdownItemName = (
    userId: string,
    suggestionDisplayName?: string,
  ): string => {
    const member = members.find((m) => m.userId === userId);
    if (member) return formatMemberDisplayName(member, duplicateNames);
    if (suggestionDisplayName && suggestionDisplayName !== "Unknown") {
      return suggestionDisplayName;
    }
    return userId;
  };

  // Count assigned instances
  const assignedCount = Object.values(assignments).filter(
    (v) => v !== null,
  ).length;

  const isLoading = suggestionsLoading || membersLoading;

  if (!scheduleData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {t("routines:schedules.preview.title")}
          </DialogTitle>
          <DialogDescription>
            {t("routines:schedules.preview.description")}
          </DialogDescription>
        </DialogHeader>

        {/* Summary section */}
        <div className="space-y-3 py-2">
          <div className="flex flex-wrap gap-3 items-center">
            <Badge variant="secondary" className="text-sm">
              {templateName}
            </Badge>
            <Badge variant="outline" className="text-sm">
              <Users className="h-3 w-3 mr-1" />
              {t("routines:schedules.preview.summary", {
                count: previewInstances.length,
              })}
            </Badge>
            <Badge variant="outline" className="text-sm">
              {t("routines:schedules.preview.dateRange", {
                start: format(new Date(scheduleData.startDate), "d MMM"),
                end: format(new Date(scheduleData.endDate), "d MMM"),
              })}
            </Badge>
          </div>

          {/* Fairness hint */}
          <Alert className="py-2">
            <Lightbulb className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {t("routines:schedules.preview.fairnessHint")}
            </AlertDescription>
          </Alert>
        </div>

        {/* Preview table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-[400px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">
                    {t("routines:schedules.preview.columns.date")}
                  </TableHead>
                  <TableHead className="w-[80px]">
                    {t("routines:schedules.preview.columns.time")}
                  </TableHead>
                  <TableHead>
                    {t("routines:schedules.preview.columns.assignedTo")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewInstances.map((instance) => (
                  <TableRow key={instance.dateKey}>
                    <TableCell className="font-medium">
                      {formatPreviewDate(instance.date, locale)}
                    </TableCell>
                    <TableCell>{instance.scheduledTime}</TableCell>
                    <TableCell>
                      <Select
                        value={
                          assignments[instance.dateKey] || UNASSIGNED_VALUE
                        }
                        onValueChange={(value) =>
                          handleAssignmentChange(instance.dateKey, value)
                        }
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue>
                            {getMemberName(
                              assignments[instance.dateKey] || null,
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED_VALUE}>
                            <span className="text-muted-foreground">
                              {t("routines:schedules.preview.unassigned")}
                            </span>
                          </SelectItem>
                          {/* Show suggestions first sorted by priority */}
                          {suggestionsData?.suggestions
                            .sort((a, b) => b.priority - a.priority)
                            .map((suggestion) => (
                              <SelectItem
                                key={suggestion.userId}
                                value={suggestion.userId}
                              >
                                <div className="flex items-center gap-2">
                                  <span>
                                    {getDropdownItemName(
                                      suggestion.userId,
                                      suggestion.displayName,
                                    )}
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1 py-0"
                                  >
                                    {suggestion.historicalPoints}p
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          {/* Show remaining members not in suggestions */}
                          {members
                            .filter(
                              (m: {
                                id: string;
                                userId: string;
                                firstName: string;
                                lastName: string;
                              }) =>
                                !suggestionsData?.suggestions.find(
                                  (s) => s.userId === m.userId,
                                ),
                            )
                            .sort(
                              (
                                a: { firstName: string; lastName: string },
                                b: { firstName: string; lastName: string },
                              ) => {
                                const nameA =
                                  `${a.firstName} ${a.lastName}`.trim();
                                const nameB =
                                  `${b.firstName} ${b.lastName}`.trim();
                                return nameA.localeCompare(nameB, "sv");
                              },
                            )
                            .map(
                              (member: {
                                id: string;
                                userId: string;
                                firstName: string;
                                lastName: string;
                                userEmail: string;
                              }) => (
                                <SelectItem
                                  key={member.userId}
                                  value={member.userId}
                                >
                                  {getDropdownItemName(member.userId)}
                                </SelectItem>
                              ),
                            )}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {assignedCount}/{previewInstances.length}{" "}
            {t("routines:schedules.preview.assigned")}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("common:cancel")}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common:saving")}
                </>
              ) : (
                t("routines:schedules.preview.create")
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
