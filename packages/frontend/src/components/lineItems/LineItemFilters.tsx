import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LineItemSourceType, LineItemStatus } from "@equiduty/shared";

// ============================================================================
// Constants
// ============================================================================

const SOURCE_TYPE_OPTIONS: LineItemSourceType[] = [
  "activity",
  "booking",
  "recurring",
  "manual",
  "package_purchase",
  "cancellation_fee",
  "no_show_fee",
  "reminder_fee",
];

type StatusFilter = LineItemStatus | "all";

// ============================================================================
// Props
// ============================================================================

interface LineItemFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sourceTypeFilter: LineItemSourceType | "all";
  onSourceTypeFilterChange: (value: LineItemSourceType | "all") => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function LineItemFilters({
  searchQuery,
  onSearchChange,
  sourceTypeFilter,
  onSourceTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
}: LineItemFiltersProps) {
  const { t } = useTranslation(["invoices", "common"]);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative max-w-sm flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("common:search.placeholder", "Sök...")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>
      <Select
        value={sourceTypeFilter}
        onValueChange={(value) =>
          onSourceTypeFilterChange(value as LineItemSourceType | "all")
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={t("invoices:lineItems.allSources")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {t("invoices:lineItems.allSources")}
          </SelectItem>
          {SOURCE_TYPE_OPTIONS.map((st) => (
            <SelectItem key={st} value={st}>
              {t(`invoices:lineItems.sourceTypes.${st}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={statusFilter}
        onValueChange={(value) => onStatusFilterChange(value as StatusFilter)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">
            {t("invoices:lineItems.statuses.pending")}
          </SelectItem>
          <SelectItem value="invoiced">
            {t("invoices:lineItems.statuses.invoiced")}
          </SelectItem>
          <SelectItem value="all">
            {t("invoices:lineItems.statuses.all")}
          </SelectItem>
        </SelectContent>
      </Select>
      <Input
        type="date"
        value={dateFrom}
        onChange={(e) => onDateFromChange(e.target.value)}
        className="w-[160px]"
        placeholder={t("invoices:lineItems.fields.from")}
      />
      <Input
        type="date"
        value={dateTo}
        onChange={(e) => onDateToChange(e.target.value)}
        className="w-[160px]"
        placeholder={t("invoices:lineItems.fields.to")}
      />
    </div>
  );
}
