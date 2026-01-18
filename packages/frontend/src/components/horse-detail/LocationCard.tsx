import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowRight, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { MoveHorseDialog } from "@/components/MoveHorseDialog";
import { toDate } from "@/utils/timestampUtils";
import { getStable } from "@/services/stableService";
import type { Horse, Stable } from "@/types/roles";

interface LocationCardProps {
  horse: Horse;
  onUpdate: () => void;
}

export function LocationCard({ horse, onUpdate }: LocationCardProps) {
  const { t } = useTranslation(["horses", "common"]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stable, setStable] = useState<Stable | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fetch stable data when horse has a stable assignment
  useEffect(() => {
    async function fetchStable() {
      if (horse.currentStableId) {
        try {
          const stableData = await getStable(horse.currentStableId);
          setStable(stableData);
        } catch (error) {
          console.error("Failed to fetch stable:", error);
        }
      } else {
        setStable(null);
      }
    }
    fetchStable();
  }, [horse.currentStableId]);

  // Copy to clipboard handler
  const handleCopy = async (value: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Determine current location status
  const getCurrentLocation = () => {
    // External location takes priority
    if (horse.externalLocation) {
      return {
        location: horse.externalLocation,
        type: "external",
        moveType: horse.externalMoveType,
        since: horse.externalDepartureDate,
      };
    }

    // Then check stable assignment
    if (horse.currentStableId) {
      return {
        location:
          horse.currentStableName || t("horses:detail.location.ownStable"),
        type: "stable",
        since: horse.assignedAt,
      };
    }

    // No location info
    return {
      location: t("horses:detail.location.unknown"),
      type: "unknown",
    };
  };

  const currentLocation = getCurrentLocation();

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <CardTitle>{t("horses:detail.location.title")}</CardTitle>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Current Location Display */}
            <div className="flex flex-col gap-2 p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {currentLocation.location}
                  </span>

                  {/* Badge for external moves */}
                  {currentLocation.type === "external" &&
                    currentLocation.moveType && (
                      <Badge
                        variant={
                          currentLocation.moveType === "temporary"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {currentLocation.moveType === "temporary"
                          ? t("horses:detail.location.temporaryAway")
                          : t("horses:detail.location.permanent")}
                      </Badge>
                    )}

                  {/* Badge for stable */}
                  {currentLocation.type === "stable" && (
                    <Badge variant="outline" className="text-xs">
                      {t("horses:detail.location.atStable")}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Date info */}
              {currentLocation.since && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">
                    {currentLocation.type === "external"
                      ? t("horses:detail.location.departed")
                      : t("horses:detail.location.since")}
                    :
                  </span>{" "}
                  {format(
                    toDate(currentLocation.since) || new Date(),
                    "MMM d, yyyy",
                  )}
                </div>
              )}

              {/* Reason for permanent moves */}
              {currentLocation.type === "external" &&
                currentLocation.moveType === "permanent" &&
                horse.externalMoveReason && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">
                      {t("horses:detail.location.reason")}
                    </span>{" "}
                    {horse.externalMoveReason.charAt(0).toUpperCase() +
                      horse.externalMoveReason.slice(1)}
                  </div>
                )}

              {/* Facility Number - shown when horse is at a stable with facilityNumber */}
              {currentLocation.type === "stable" && stable?.facilityNumber && (
                <div className="text-sm text-muted-foreground pt-2 border-t">
                  <span className="font-medium">
                    {t("horses:detail.location.facilityNumber")}:
                  </span>{" "}
                  <span className="font-mono">{stable.facilityNumber}</span>
                  <button
                    onClick={() =>
                      handleCopy(stable.facilityNumber!, "facilityNumber")
                    }
                    className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
                    title={t("horses:detail.location.copyFacilityNumber")}
                  >
                    {copiedField === "facilityNumber" ? (
                      <Check className="h-3 w-3 inline text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3 inline" />
                    )}
                  </button>
                  {copiedField === "facilityNumber" && (
                    <span className="ml-1 text-xs text-green-600">
                      {t("horses:detail.location.copied")}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Move Horse Button */}
            <Button
              onClick={() => setDialogOpen(true)}
              variant="outline"
              className="w-full"
            >
              {t("horses:detail.location.moveHorse")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Move Horse Dialog */}
      <MoveHorseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        horse={horse}
        onSuccess={() => {
          setDialogOpen(false);
          onUpdate();
        }}
      />
    </>
  );
}
