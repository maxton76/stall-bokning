import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getWeekNumber } from "@equiduty/shared";

interface CalendarHeaderProps {
  currentWeekStart: Date;
  onNavigate: (direction: "prev" | "next" | "today") => void;
  viewMode: "day" | "week";
  onViewModeChange: (mode: "day" | "week") => void;
  onAddActivity: () => void;
  onFilterClick: () => void;
  disableAdd?: boolean;
}

export function CalendarHeader({
  currentWeekStart,
  onNavigate,
  viewMode,
  onViewModeChange,
  onAddActivity,
  onFilterClick,
  disableAdd = false,
}: CalendarHeaderProps) {
  const { t, i18n } = useTranslation(["common", "activities"]);
  const locale = i18n.language === "sv" ? sv : enUS;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-4 border-b gap-2">
      {/* Left: Navigation */}
      <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
        <Button variant="outline" size="sm" onClick={() => onNavigate("today")}>
          {t("common:time.today")}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => onNavigate("prev")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => onNavigate("next")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="ml-2 sm:ml-4 flex items-center gap-2">
          <h2 className="text-base sm:text-xl font-semibold">
            {format(currentWeekStart, "MMMM yyyy", { locale })}
          </h2>
          <Badge variant="outline" className="text-xs">
            {t("common:time.week")} {getWeekNumber(currentWeekStart)}
          </Badge>
        </div>
      </div>

      {/* Right: View controls */}
      <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onFilterClick}
          className="flex-1 sm:flex-none"
        >
          <Filter className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{t("common:buttons.filter")}</span>
        </Button>
        <Tabs
          value={viewMode}
          onValueChange={(value) => onViewModeChange(value as "day" | "week")}
          className="hidden sm:block"
        >
          <TabsList>
            <TabsTrigger value="day">
              {t("activities:calendar.day")}
            </TabsTrigger>
            <TabsTrigger value="week">
              {t("activities:calendar.week")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          onClick={onAddActivity}
          disabled={disableAdd}
          className="flex-1 sm:flex-none"
        >
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="sm:inline">{t("common:buttons.add")}</span>
        </Button>
      </div>
    </div>
  );
}
