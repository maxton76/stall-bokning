/**
 * Date Edit Section Component
 *
 * Extracted from AdminControlsCard to improve modularity.
 * Handles date editing UI with start/end date pickers and save/cancel actions.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format, Locale } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import { Calendar, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import i18n from "@/i18n";

interface DateEditSectionProps {
  currentStartDate: Date;
  currentEndDate: Date;
  onSave: (dates: {
    selectionStartDate?: string;
    selectionEndDate?: string;
  }) => void;
  onCancel: () => void;
  isSaving: boolean;
}

/**
 * Date editing UI section with start/end date pickers
 *
 * Features:
 * - Warning alert about date changes
 * - Localized date pickers (Swedish/English)
 * - Prevents selecting dates in the past for end date
 * - Only saves changed dates
 */
export function DateEditSection({
  currentStartDate,
  currentEndDate,
  onSave,
  onCancel,
  isSaving,
}: DateEditSectionProps) {
  const { t } = useTranslation(["selectionProcess", "common"]);

  const [newStartDate, setNewStartDate] = useState<Date | undefined>(
    currentStartDate,
  );
  const [newEndDate, setNewEndDate] = useState<Date | undefined>(
    currentEndDate,
  );

  const locale: Locale = i18n.language === "sv" ? sv : enUS;

  const handleSave = () => {
    const dates: { selectionStartDate?: string; selectionEndDate?: string } =
      {};

    if (newStartDate && newStartDate.getTime() !== currentStartDate.getTime()) {
      dates.selectionStartDate = newStartDate.toISOString();
    }
    if (newEndDate && newEndDate.getTime() !== currentEndDate.getTime()) {
      dates.selectionEndDate = newEndDate.toISOString();
    }

    if (Object.keys(dates).length > 0) {
      onSave(dates);
    } else {
      onCancel(); // Nothing changed, just cancel
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {t("selectionProcess:admin.dateChangeWarning")}
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Start Date Picker */}
        <div className="space-y-2">
          <Label>{t("selectionProcess:admin.startDate")}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {newStartDate
                  ? format(newStartDate, "PPP", { locale })
                  : t("common:labels.selectDate")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={newStartDate}
                onSelect={setNewStartDate}
                locale={locale}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date Picker */}
        <div className="space-y-2">
          <Label>{t("selectionProcess:admin.endDate")}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {newEndDate
                  ? format(newEndDate, "PPP", { locale })
                  : t("common:labels.selectDate")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={newEndDate}
                onSelect={setNewEndDate}
                disabled={(date) =>
                  date < new Date(new Date().setHours(0, 0, 0, 0))
                }
                locale={locale}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving
            ? t("common:labels.loading")
            : t("selectionProcess:admin.saveDates")}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          {t("common:buttons.cancel")}
        </Button>
      </div>
    </div>
  );
}
