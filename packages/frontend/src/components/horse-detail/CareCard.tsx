import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, ExternalLink } from "lucide-react";
import type { Horse } from "@/types/roles";

interface CareCardProps {
  horse: Horse;
}

export function CareCard({ horse }: CareCardProps) {
  const { t } = useTranslation(["horses", "common"]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-muted-foreground" />
          <CardTitle>{t("horses:detail.care.title")}</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
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
        {(horse.withersHeight || horse.studbook || horse.breeder) && (
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
