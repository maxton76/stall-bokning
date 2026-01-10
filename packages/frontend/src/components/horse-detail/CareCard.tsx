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
  const birthDate =
    horse.dateOfBirth && toDate(horse.dateOfBirth)
      ? format(toDate(horse.dateOfBirth)!, "MMM d, yyyy")
      : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Care</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Vaccination Rules */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Vaccination</h3>
          {horse.vaccinationRuleId && horse.vaccinationRuleName ? (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <p className="font-medium">{horse.vaccinationRuleName}</p>
                {horse.nextVaccinationDue &&
                  toDate(horse.nextVaccinationDue) && (
                    <p className="text-sm text-muted-foreground">
                      Next due:{" "}
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
                  {horse.vaccinationStatus === "current" && "Up to date"}
                  {horse.vaccinationStatus === "expiring_soon" && "Due soon"}
                  {horse.vaccinationStatus === "expired" && "Overdue"}
                  {horse.vaccinationStatus === "no_records" && "No records"}
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No vaccination rule assigned
            </p>
          )}
        </div>

        {/* Care Schedules */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Care Schedules</h3>
          <div className="space-y-2">
            <Link
              to={`/activities/care?horseId=${horse.id}&type=farrier`}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-medium">Farrier</p>
                <p className="text-sm text-muted-foreground">
                  View schedule in Activities
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              to={`/activities/care?horseId=${horse.id}&type=dentist`}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-medium">Dentist</p>
                <p className="text-sm text-muted-foreground">
                  View schedule in Activities
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              to={`/activities/care?horseId=${horse.id}&type=deworm`}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-medium">Deworming</p>
                <p className="text-sm text-muted-foreground">
                  View schedule in Activities
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </div>

        {/* Vital Stats */}
        {(horse.withersHeight || birthDate || horse.studbook) && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">Vital Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              {horse.withersHeight && (
                <div>
                  <p className="text-sm text-muted-foreground">Height</p>
                  <p className="font-medium">{horse.withersHeight} cm</p>
                </div>
              )}
              {birthDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">{birthDate}</p>
                </div>
              )}
              {horse.studbook && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Studbook</p>
                  <p className="font-medium">{horse.studbook}</p>
                </div>
              )}
              {horse.breeder && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Breeder</p>
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
