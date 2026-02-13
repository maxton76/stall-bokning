/**
 * FacilityPreparationNotes Component
 * Shows preparation checklist and special notes for facility bookings
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardList, AlertTriangle } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Facility } from "@/types/facility";
import type { FacilityReservation } from "@/types/facilityReservation";

interface FacilityPreparationNotesProps {
  facility: Facility;
  reservation: FacilityReservation;
}

export function FacilityPreparationNotes({
  facility,
  reservation,
}: FacilityPreparationNotesProps) {
  const { t } = useTranslation(["facilities", "common"]);

  // Generate facility-specific preparation checklist
  const preparationChecklist = useMemo(() => {
    const items: string[] = [];

    // Add facility-type specific preparations
    switch (facility.type) {
      case "indoor_arena":
      case "outdoor_arena":
        items.push("Check arena footing and drag if needed");
        items.push("Set up jumps if requested");
        items.push("Ensure proper lighting");
        break;
      case "wash_stall":
        items.push("Check hot water availability");
        items.push("Prepare towels and grooming supplies");
        break;
      case "solarium":
        items.push("Test solarium lights");
        items.push("Check timer settings");
        break;
      case "walker":
        items.push("Inspect walker mechanism");
        items.push("Clear any obstacles");
        break;
      case "water_treadmill":
      case "treadmill":
        items.push("Check equipment functionality");
        items.push("Verify safety systems");
        break;
    }

    // Add general preparations
    items.push("Confirm equipment availability");
    items.push("Verify facility is clean and ready");

    return items;
  }, [facility.type]);

  // Check if there are special notes
  const hasNotes = reservation.notes && reservation.notes.trim().length > 0;
  const hasPreparation = preparationChecklist.length > 0 || hasNotes;

  if (!hasPreparation) return null;

  return (
    <Collapsible className="mt-3">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            {t("facilities:operations.preparationNotes")}
          </span>
          <Badge variant="secondary" className="ml-2">
            {preparationChecklist.length}
          </Badge>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {/* Special Notes */}
        {hasNotes && (
          <div className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-1">
                  Special Notes
                </p>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  {reservation.notes}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Preparation Checklist */}
        {preparationChecklist.length > 0 && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">
              {t("facilities:operations.preparationChecklist")}
            </p>
            <ul className="space-y-1.5">
              {preparationChecklist.map((item, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <input
                    type="checkbox"
                    className="mt-1 rounded border-muted-foreground"
                    id={`prep-${reservation.id}-${index}`}
                  />
                  <label
                    htmlFor={`prep-${reservation.id}-${index}`}
                    className="cursor-pointer flex-1"
                  >
                    {item}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
