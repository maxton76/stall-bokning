import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Truck,
  AlertTriangle,
  Phone,
  Edit,
  Loader2,
  CheckCircle,
  XCircle,
  User,
  Thermometer,
  Clock,
  Info,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { authFetch } from "@/lib/authFetch";
import { TransportForm } from "./TransportForm";
import type { Horse } from "@/types/roles";
import type {
  TransportInstructions,
  LoadingBehavior,
} from "@shared/types/transport";

interface TransportCardProps {
  horse: Horse;
}

const LOADING_BEHAVIOR_COLORS: Record<LoadingBehavior, string> = {
  easy_loader:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  needs_patience:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  needs_handler:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  difficult: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  unknown: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

export function TransportCard({ horse }: TransportCardProps) {
  const { t, i18n } = useTranslation(["horses", "common"]);
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch transport instructions
  const { data: transportData, isLoading } = useQuery<TransportInstructions>({
    queryKey: ["horse-transport", horse.id],
    queryFn: async () => {
      const response = await authFetch(`/api/v1/horses/${horse.id}/transport`);
      if (!response.ok) {
        if (response.status === 404) {
          return {} as TransportInstructions;
        }
        throw new Error("Failed to fetch transport instructions");
      }
      return response.json();
    },
  });

  // Update transport instructions mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<TransportInstructions>) => {
      const response = await authFetch(`/api/v1/horses/${horse.id}/transport`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message || "Failed to update transport instructions",
        );
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["horse-transport", horse.id],
      });
      setIsEditDialogOpen(false);
    },
  });

  const getLoadingBehaviorLabel = (behavior: LoadingBehavior): string => {
    const labels: Record<LoadingBehavior, { en: string; sv: string }> = {
      easy_loader: { en: "Easy Loader", sv: "Går på lätt" },
      needs_patience: { en: "Needs Patience", sv: "Behöver tålamod" },
      needs_handler: { en: "Needs Handler", sv: "Behöver hjälp" },
      difficult: { en: "Difficult", sv: "Svår" },
      unknown: { en: "Unknown", sv: "Okänd" },
    };
    return labels[behavior]?.[i18n.language as "en" | "sv"] || behavior;
  };

  const hasInstructions =
    transportData &&
    (transportData.loadingBehavior ||
      transportData.sedationRequired ||
      transportData.needsCompanion ||
      transportData.emergencyContacts?.length);

  // Count special requirements
  const specialRequirements: string[] = [];
  if (transportData?.sedationRequired) {
    specialRequirements.push(
      t("horses:transport.sedationRequired", "Sedation Required"),
    );
  }
  if (transportData?.needsCompanion) {
    specialRequirements.push(
      t("horses:transport.needsCompanion", "Needs Companion"),
    );
  }
  if (transportData?.travelAnxiety) {
    specialRequirements.push(
      t("horses:transport.travelAnxiety", "Travel Anxiety"),
    );
  }
  if (transportData?.motionSickness) {
    specialRequirements.push(
      t("horses:transport.motionSickness", "Motion Sickness"),
    );
  }

  const handleSave = (data: Partial<TransportInstructions>) => {
    updateMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-muted-foreground" />
            <CardTitle>
              {t("horses:transport.title", "Transport Instructions")}
            </CardTitle>
            {hasInstructions && specialRequirements.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {specialRequirements.length}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Edit className="h-4 w-4 mr-1" />
            {hasInstructions
              ? t("common:buttons.edit", "Edit")
              : t("common:buttons.add", "Add")}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            {t("common:loading", "Loading...")}
          </div>
        ) : !hasInstructions ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Truck className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {t(
                "horses:transport.noInstructions",
                "No transport instructions",
              )}
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              {t(
                "horses:transport.addInstructionsHint",
                "Add transport instructions to help handlers prepare for travel",
              )}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Edit className="h-4 w-4 mr-1" />
              {t("horses:transport.addInstructions", "Add Instructions")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Loading Behavior */}
            {transportData.loadingBehavior && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("horses:transport.loadingBehavior", "Loading Behavior")}
                </span>
                <Badge
                  className={
                    LOADING_BEHAVIOR_COLORS[transportData.loadingBehavior]
                  }
                >
                  {getLoadingBehaviorLabel(transportData.loadingBehavior)}
                </Badge>
              </div>
            )}

            {/* Special Requirements */}
            {specialRequirements.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-medium text-amber-800 dark:text-amber-200">
                    {t(
                      "horses:transport.specialRequirements",
                      "Special Requirements",
                    )}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {specialRequirements.map((req, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="border-amber-400"
                    >
                      {req}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Key Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {/* Position Preference */}
              {transportData.positionPreference &&
                transportData.positionPreference !== "any" && (
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {t("horses:transport.positionPreference", "Position")}
                      </p>
                      <p className="text-muted-foreground">
                        {t(
                          `horses:transport.positions.${transportData.positionPreference}`,
                          transportData.positionPreference,
                        )}
                      </p>
                    </div>
                  </div>
                )}

              {/* Companion */}
              {transportData.needsCompanion && (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {t("horses:transport.companion", "Companion")}
                    </p>
                    <p className="text-muted-foreground">
                      {transportData.preferredCompanion ||
                        t(
                          "horses:transport.anyCompanion",
                          "Any companion needed",
                        )}
                    </p>
                  </div>
                </div>
              )}

              {/* Temperature */}
              {transportData.temperaturePreference &&
                transportData.temperaturePreference !== "normal" && (
                  <div className="flex items-start gap-2">
                    <Thermometer className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {t("horses:transport.temperature", "Temperature")}
                      </p>
                      <p className="text-muted-foreground">
                        {t(
                          `horses:transport.temperatures.${transportData.temperaturePreference}`,
                          transportData.temperaturePreference,
                        )}
                      </p>
                    </div>
                  </div>
                )}

              {/* Max Travel Time */}
              {transportData.maxTravelTime && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {t("horses:transport.maxTravelTime", "Max Travel Time")}
                    </p>
                    <p className="text-muted-foreground">
                      {t("horses:transport.hours", "{{count}} hours", {
                        count: transportData.maxTravelTime,
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Equipment Checklist */}
            {(transportData.travelBoots ||
              transportData.travelBlanket ||
              transportData.headProtection ||
              transportData.tailGuard ||
              transportData.pollGuard ||
              transportData.hayNetRequired) && (
              <div>
                <p className="text-sm font-medium mb-2">
                  {t("horses:transport.equipment", "Equipment")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {transportData.travelBoots && (
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t("horses:transport.travelBoots", "Travel Boots")}
                    </Badge>
                  )}
                  {transportData.travelBlanket && (
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t("horses:transport.travelBlanket", "Travel Blanket")}
                    </Badge>
                  )}
                  {transportData.headProtection && (
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t("horses:transport.headProtection", "Head Protection")}
                    </Badge>
                  )}
                  {transportData.tailGuard && (
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t("horses:transport.tailGuard", "Tail Guard")}
                    </Badge>
                  )}
                  {transportData.pollGuard && (
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t("horses:transport.pollGuard", "Poll Guard")}
                    </Badge>
                  )}
                  {transportData.hayNetRequired && (
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t("horses:transport.hayNet", "Hay Net")}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Loading Notes */}
            {transportData.loadingNotes && (
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium mb-1">
                  {t("horses:transport.loadingNotes", "Loading Notes")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {transportData.loadingNotes}
                </p>
              </div>
            )}

            {/* General Notes */}
            {transportData.notes && (
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium mb-1">
                  {t("horses:transport.notes", "Notes")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {transportData.notes}
                </p>
              </div>
            )}

            {/* Emergency Contacts */}
            {transportData.emergencyContacts &&
              transportData.emergencyContacts.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">
                    {t(
                      "horses:transport.emergencyContacts",
                      "Emergency Contacts",
                    )}
                  </p>
                  <div className="space-y-2">
                    {transportData.emergencyContacts.map((contact, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border p-2"
                      >
                        <div className="flex items-center gap-2">
                          {contact.isPrimary && (
                            <Badge variant="default" className="text-xs">
                              {t("horses:transport.primary", "Primary")}
                            </Badge>
                          )}
                          <span className="font-medium">{contact.name}</span>
                          {contact.relationship && (
                            <span className="text-muted-foreground text-sm">
                              ({contact.relationship})
                            </span>
                          )}
                        </div>
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Phone className="h-4 w-4" />
                          {contact.phone}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t(
                "horses:transport.editInstructions",
                "Edit Transport Instructions",
              )}
            </DialogTitle>
            <DialogDescription>
              {t(
                "horses:transport.editInstructionsDescription",
                "Update transport instructions for this horse",
              )}
            </DialogDescription>
          </DialogHeader>
          <TransportForm
            defaultValues={transportData}
            onSubmit={handleSave}
            onCancel={() => setIsEditDialogOpen(false)}
            isSubmitting={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
