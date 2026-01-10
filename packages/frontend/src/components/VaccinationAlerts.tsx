import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, ShieldX, ChevronRight, AlertCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { getExpiringSoon } from "@/services/vaccinationService";
import { toDate } from "@/utils/timestampUtils";
import { queryKeys } from "@/lib/queryClient";
import type { Horse } from "@/types/roles";

interface VaccinationAlertsProps {
  organizationId?: string;
  userId?: string;
  onHorseClick?: (horse: Horse) => void;
  className?: string;
  compact?: boolean;
}

interface VaccinationAlert {
  horse: Horse;
  daysUntilDue: number;
  nextDueDate: Date;
  vaccinationRuleName?: string;
}

export function VaccinationAlerts({
  organizationId,
  userId,
  onHorseClick,
  className,
  compact = false,
}: VaccinationAlertsProps) {
  // Fetch expiring vaccinations with TanStack Query
  const {
    data: horses = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.vaccinations.expiringSoon(),
    queryFn: () => {
      if (!organizationId) return [];
      return getExpiringSoon(organizationId, 30);
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes - vaccination alerts should be relatively fresh
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Calculate alerts with days until due
  const alerts = useMemo<VaccinationAlert[]>(() => {
    return (
      horses
        .filter((horse) => horse.nextVaccinationDue)
        .map((horse) => {
          const nextDueDate = toDate(horse.nextVaccinationDue!);
          return {
            horse,
            daysUntilDue: nextDueDate
              ? differenceInDays(nextDueDate, new Date())
              : 0,
            nextDueDate: nextDueDate || new Date(),
            vaccinationRuleName: horse.vaccinationRuleName,
          };
        })
        // Sort by urgency (most urgent first)
        .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
    );
  }, [horses]);

  const error = queryError ? "Failed to load vaccination alerts" : null;

  // Split into overdue and upcoming
  const overdueAlerts = alerts.filter((a) => a.daysUntilDue < 0);
  const upcomingAlerts = alerts.filter(
    (a) => a.daysUntilDue >= 0 && a.daysUntilDue <= 30,
  );

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Vaccination Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading alerts...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Vaccination Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return compact ? null : (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-green-500" />
            Vaccination Alerts
          </CardTitle>
          <CardDescription>
            All horses have up-to-date vaccinations
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          Vaccination Alerts
        </CardTitle>
        <CardDescription>
          {overdueAlerts.length > 0 && (
            <span className="text-destructive font-medium">
              {overdueAlerts.length} overdue
            </span>
          )}
          {overdueAlerts.length > 0 && upcomingAlerts.length > 0 && " • "}
          {upcomingAlerts.length > 0 && (
            <span className="text-amber-600 font-medium">
              {upcomingAlerts.length} due soon
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overdue Vaccinations */}
        {overdueAlerts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShieldX className="h-4 w-4 text-destructive" />
              <h4 className="text-sm font-semibold text-destructive">
                Overdue ({overdueAlerts.length})
              </h4>
            </div>
            <div className="space-y-2">
              {overdueAlerts.map((alert) => (
                <VaccinationAlertItem
                  key={alert.horse.id}
                  alert={alert}
                  onHorseClick={onHorseClick}
                  variant="overdue"
                  compact={compact}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Vaccinations */}
        {upcomingAlerts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-500">
                Due Soon ({upcomingAlerts.length})
              </h4>
            </div>
            <div className="space-y-2">
              {upcomingAlerts.slice(0, compact ? 3 : 10).map((alert) => (
                <VaccinationAlertItem
                  key={alert.horse.id}
                  alert={alert}
                  onHorseClick={onHorseClick}
                  variant="upcoming"
                  compact={compact}
                />
              ))}
              {compact && upcomingAlerts.length > 3 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{upcomingAlerts.length - 3} more
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface VaccinationAlertItemProps {
  alert: VaccinationAlert;
  onHorseClick?: (horse: Horse) => void;
  variant: "overdue" | "upcoming";
  compact?: boolean;
}

function VaccinationAlertItem({
  alert,
  onHorseClick,
  variant,
  compact = false,
}: VaccinationAlertItemProps) {
  const { horse, daysUntilDue, nextDueDate, vaccinationRuleName } = alert;

  const isOverdue = variant === "overdue";
  const badgeVariant = isOverdue ? "destructive" : "outline";
  const badgeText = isOverdue
    ? `${Math.abs(daysUntilDue)} days overdue`
    : `${daysUntilDue} days`;

  return (
    <div
      className={`
        flex items-center justify-between p-3 rounded-lg border
        ${isOverdue ? "border-destructive/50 bg-destructive/5" : "border-amber-500/50 bg-amber-500/5"}
        hover:bg-accent/50 transition-colors
        ${onHorseClick ? "cursor-pointer" : ""}
      `}
      onClick={() => onHorseClick?.(horse)}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{horse.name}</span>
          <Badge variant={badgeVariant} className="shrink-0 font-normal">
            {badgeText}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {vaccinationRuleName && (
            <span className="truncate">{vaccinationRuleName}</span>
          )}
          {vaccinationRuleName && <span>•</span>}
          <span className="shrink-0">
            Due: {format(nextDueDate, "MMM d, yyyy")}
          </span>
        </div>
        {!compact && horse.currentStableName && (
          <div className="text-xs text-muted-foreground">
            {horse.currentStableName}
          </div>
        )}
      </div>
      {onHorseClick && (
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
      )}
    </div>
  );
}
