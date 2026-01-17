import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toDate } from "@/utils/timestampUtils";
import type { Horse } from "@/types/roles";

interface CareCardProps {
  horse: Horse;
}

export function CareCard({ horse }: CareCardProps) {
  const { t } = useTranslation(["horses", "common"]);

  const birthDate =
    horse.dateOfBirth && toDate(horse.dateOfBirth)
      ? format(toDate(horse.dateOfBirth)!, "MMM d, yyyy")
      : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-muted-foreground" />
          <CardTitle>{t("horses:detail.care.title")}</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Vaccination Rules */}
        <div>
          <h3 className="text-sm font-semibold mb-3">
            {t("horses:detail.care.vaccinationSection")}
          </h3>
          {horse.vaccinationRuleId && horse.vaccinationRuleName ? (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <p className="font-medium">{horse.vaccinationRuleName}</p>
                {horse.nextVaccinationDue &&
                  toDate(horse.nextVaccinationDue) && (
                    <p className="text-sm text-muted-foreground">
                      {t("horses:detail.care.nextDue")}{" "}
                      {format(toDate(horse.nextVaccinationDue)!, "MMM d, yyyy")}
                    </p>
                  )}
              </div>
              {horse.vaccinationStatus && (
                <Badge
                  variant={
                    horse.vaccinationStatus === "current"
                      ? "default"
                      : horse.vaccinationStatus === "expiring_soon"
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {horse.vaccinationStatus === "current" &&
                    t("horses:detail.vaccination.status.upToDate")}
                  {horse.vaccinationStatus === "expiring_soon" &&
                    t("horses:detail.vaccination.status.dueSoon")}
                  {horse.vaccinationStatus === "expired" &&
                    t("horses:detail.vaccination.status.overdue")}
                  {horse.vaccinationStatus === "no_records" &&
                    t("horses:detail.vaccination.status.noRecords")}
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("horses:detail.care.noVaccinationRule")}
            </p>
          )}
        </div>

        {/* Care Schedules */}
        <div>
          <h3 className="text-sm font-semibold mb-3">
            {t("horses:detail.care.careSchedules")}
          </h3>
          <div className="space-y-2">
            <Link
              to={`/activities/care?horseId=${horse.id}&type=farrier`}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-medium">{t("horses:detail.care.farrier")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("horses:detail.care.viewScheduleInActivities")}
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              to={`/activities/care?horseId=${horse.id}&type=dentist`}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-medium">{t("horses:detail.care.dentist")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("horses:detail.care.viewScheduleInActivities")}
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              to={`/activities/care?horseId=${horse.id}&type=deworm`}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-medium">
                  {t("horses:detail.care.deworming")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("horses:detail.care.viewScheduleInActivities")}
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </div>

        {/* Vital Stats */}
        {(horse.withersHeight || birthDate || horse.studbook) && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">
              {t("horses:detail.care.vitalStats")}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {horse.withersHeight && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("horses:detail.care.height")}
                  </p>
                  <p className="font-medium">
                    {horse.withersHeight} {t("horses:detail.basicInfo.cm")}
                  </p>
                </div>
              )}
              {birthDate && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("horses:detail.care.dateOfBirth")}
                  </p>
                  <p className="font-medium">{birthDate}</p>
                </div>
              )}
              {horse.studbook && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">
                    {t("horses:detail.care.studbook")}
                  </p>
                  <p className="font-medium">{horse.studbook}</p>
                </div>
              )}
              {horse.breeder && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">
                    {t("horses:detail.care.breeder")}
                  </p>
                  <p className="font-medium">{horse.breeder}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
