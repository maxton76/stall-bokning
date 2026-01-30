import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { FeedAnalytics } from "@equiduty/shared";
import { cn } from "@/lib/utils";

interface FeedConsumptionTableProps {
  analytics: FeedAnalytics;
}

type SortField = "horseName" | "totalFeedings" | "totalCost";
type SortDirection = "asc" | "desc";

export function FeedConsumptionTable({ analytics }: FeedConsumptionTableProps) {
  const { t, i18n } = useTranslation(["feeding", "common"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("totalCost");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [expandedHorses, setExpandedHorses] = useState<Set<string>>(new Set());

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(i18n.language === "sv" ? "sv-SE" : "en-US", {
      style: "currency",
      currency: "SEK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Filter and sort horses
  const filteredHorses = useMemo(() => {
    let horses = analytics.horseBreakdown;

    // Filter by search
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      horses = horses.filter((horse) =>
        horse.horseName.toLowerCase().includes(searchLower),
      );
    }

    // Sort
    horses = [...horses].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "horseName":
          comparison = a.horseName.localeCompare(b.horseName);
          break;
        case "totalFeedings":
          comparison = a.totalFeedings - b.totalFeedings;
          break;
        case "totalCost":
          comparison = a.totalCost - b.totalCost;
          break;
      }
      return sortDirection === "desc" ? -comparison : comparison;
    });

    return horses;
  }, [analytics.horseBreakdown, searchQuery, sortField, sortDirection]);

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Toggle horse expansion
  const toggleHorse = (horseId: string) => {
    setExpandedHorses((prev) => {
      const next = new Set(prev);
      if (next.has(horseId)) {
        next.delete(horseId);
      } else {
        next.add(horseId);
      }
      return next;
    });
  };

  // Sort header component
  const SortHeader = ({
    field,
    children,
    className,
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead className={className}>
      <Button
        variant="ghost"
        className="h-auto p-0 hover:bg-transparent"
        onClick={() => handleSort(field)}
      >
        {children}
        {sortField === field && (
          <span className="ml-1">
            {sortDirection === "desc" ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </span>
        )}
      </Button>
    </TableHead>
  );

  if (analytics.horseBreakdown.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("feeding:analytics.horseConsumption")}</CardTitle>
          <CardDescription>
            {t("feeding:analytics.horseConsumptionDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            {t("feeding:analytics.noData")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t("feeding:analytics.horseConsumption")}</CardTitle>
            <CardDescription>
              {t("feeding:analytics.horseConsumptionDescription")}
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("common:search.placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <SortHeader field="horseName">
                  {t("feeding:analytics.horse")}
                </SortHeader>
                <SortHeader field="totalFeedings" className="text-right">
                  {t("feeding:analytics.feedings")}
                </SortHeader>
                <SortHeader field="totalCost" className="text-right">
                  {t("feeding:analytics.cost")}
                </SortHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHorses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <p className="text-muted-foreground">
                      {t("common:messages.noResults")}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredHorses.map((horse) => {
                  const isExpanded = expandedHorses.has(horse.horseId);
                  const hasFeedTypes = horse.feedTypes.length > 0;

                  return (
                    <Collapsible
                      key={horse.horseId}
                      open={isExpanded}
                      onOpenChange={() => toggleHorse(horse.horseId)}
                      asChild
                    >
                      <>
                        <TableRow
                          className={cn(
                            "cursor-pointer hover:bg-muted/50",
                            isExpanded && "bg-muted/30",
                          )}
                          onClick={() =>
                            hasFeedTypes && toggleHorse(horse.horseId)
                          }
                        >
                          <TableCell>
                            {hasFeedTypes && (
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleHorse(horse.horseId);
                                  }}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {horse.horseName}
                              </span>
                              {horse.feedTypes.length > 1 && (
                                <Badge variant="secondary" className="text-xs">
                                  {horse.feedTypes.length}{" "}
                                  {t("feeding:analytics.feedTypes")}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {horse.totalFeedings}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(horse.totalCost)}
                          </TableCell>
                        </TableRow>

                        {hasFeedTypes && (
                          <CollapsibleContent asChild>
                            <>
                              {horse.feedTypes.map((feedType) => (
                                <TableRow
                                  key={`${horse.horseId}-${feedType.feedTypeId}`}
                                  className="bg-muted/10"
                                >
                                  <TableCell></TableCell>
                                  <TableCell className="pl-10 text-sm text-muted-foreground">
                                    {feedType.feedTypeName}
                                  </TableCell>
                                  <TableCell className="text-right text-sm text-muted-foreground">
                                    {Math.round(feedType.quantity * 10) / 10}
                                  </TableCell>
                                  <TableCell className="text-right text-sm text-muted-foreground">
                                    {formatCurrency(feedType.cost)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </>
                          </CollapsibleContent>
                        )}
                      </>
                    </Collapsible>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary footer */}
        <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
          <span className="text-muted-foreground">
            {filteredHorses.length} {t("feeding:analytics.horsesTotal")}
          </span>
          <span className="font-medium">
            {t("feeding:analytics.totalCost")}:{" "}
            {formatCurrency(analytics.totalCost)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
