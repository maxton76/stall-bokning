import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Share, Trash2, Edit, Copy, Check, Bell } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { HORSE_USAGE_OPTIONS } from "@/constants/horseConstants";
import { toDate } from "@/utils/timestampUtils";
import type { Horse, HorseUsage } from "@/types/roles";
import { EquipmentDisplay } from "@/components/EquipmentDisplay";
import type { Timestamp } from "firebase/firestore";

interface BasicInfoCardProps {
  horse: Horse;
  onEdit?: () => void; // Edit handler
  onShare?: () => void; // Future feature
  onRemove?: () => void; // Future feature
}

export function BasicInfoCard({
  horse,
  onEdit,
  onShare,
  onRemove,
}: BasicInfoCardProps) {
  const { t } = useTranslation(["horses", "common"]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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
  // Helper function to render usage badges
  const renderUsageBadge = (usage: HorseUsage) => {
    const config = HORSE_USAGE_OPTIONS.find((opt) => opt.value === usage);
    if (!config) return null;

    return (
      <Badge
        key={usage}
        variant="outline"
        className={cn(
          "text-xs",
          usage === "care" && "border-purple-300 text-purple-700 bg-purple-50",
          usage === "sport" && "border-green-300 text-green-700 bg-green-50",
          usage === "breeding" && "border-amber-300 text-amber-700 bg-amber-50",
        )}
      >
        {config.icon} {config.label}
      </Badge>
    );
  };

  // Helper function to get FEI expiry warning
  const getFeiExpiryWarning = (expiryDate: Timestamp | string) => {
    const date = toDate(expiryDate);
    if (!date) return null;

    const daysUntilExpiry = differenceInDays(date, new Date());

    if (daysUntilExpiry < 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          {t("horses:detail.basicInfo.expired")}
        </Badge>
      );
    }
    if (daysUntilExpiry <= 60) {
      return (
        <Badge
          variant="outline"
          className="text-xs border-amber-300 text-amber-700"
        >
          {t("horses:detail.basicInfo.expiresSoon")}
        </Badge>
      );
    }
    return null;
  };

  // Conditional flags
  const hasIdentification = !!(
    horse.ueln ||
    horse.chipNumber ||
    horse.federationNumber ||
    horse.feiPassNumber ||
    horse.feiExpiryDate
  );
  const hasPedigree = !!(
    horse.sire ||
    horse.dam ||
    horse.damsire ||
    horse.breeder
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          {/* Left: Avatar + Name + Badges */}
          <div className="flex gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback>
                {horse.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{horse.name}</CardTitle>
              {/* Pedigree subtitle: "Sire × Dam" */}
              {(horse.sire || horse.dam) && (
                <p className="text-sm text-muted-foreground">
                  {horse.sire && horse.dam
                    ? `${horse.sire} × ${horse.dam}`
                    : horse.sire || horse.dam}
                </p>
              )}
              {/* Usage badges */}
              {horse.usage && horse.usage.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {horse.usage.map((usage) => renderUsageBadge(usage))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              disabled
              title={t("horses:detail.basicInfo.shareComingSoon")}
            >
              <Share className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled
              title={t("horses:detail.basicInfo.removeComingSoon")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                title={t("horses:detail.basicInfo.editHorse")}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 1. Basic Info Grid (3 columns) */}
        <div className="grid grid-cols-3 gap-4">
          {horse.gender && (
            <div>
              <p className="text-sm text-muted-foreground">
                {t("horses:detail.basicInfo.gender")}
              </p>
              <p className="font-medium capitalize">{horse.gender}</p>
            </div>
          )}
          {horse.color && (
            <div>
              <p className="text-sm text-muted-foreground">
                {t("horses:detail.basicInfo.color")}
              </p>
              <p className="font-medium">{horse.color}</p>
            </div>
          )}
          {horse.studbook && (
            <div>
              <p className="text-sm text-muted-foreground">
                {t("horses:detail.basicInfo.studbook")}
              </p>
              <p className="font-medium">{horse.studbook}</p>
            </div>
          )}
        </div>

        {/* 2. Birth Info */}
        {(horse.dateOfBirth || horse.horseGroupName) && (
          <div className="border-t pt-4 grid grid-cols-2 gap-4">
            {horse.dateOfBirth &&
              (() => {
                const birthDate = toDate(horse.dateOfBirth);
                return birthDate ? (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("horses:detail.basicInfo.dateOfBirth")}
                    </p>
                    <p className="font-medium">
                      {format(birthDate, "M/d/yy")}
                      {horse.age &&
                        ` (${horse.age} ${t("horses:detail.basicInfo.years")})`}
                    </p>
                  </div>
                ) : null;
              })()}
            {horse.horseGroupName && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("horses:detail.basicInfo.group")}
                </p>
                <p className="font-medium">{horse.horseGroupName}</p>
              </div>
            )}
          </div>
        )}

        {/* 3. Expanded Identification (5 fields with FEI expiry warning) */}
        {hasIdentification && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">
              {t("horses:detail.basicInfo.identification")}
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {horse.ueln && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("horses:detail.basicInfo.ueln")}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm">{horse.ueln}</p>
                    <button
                      onClick={() => handleCopy(horse.ueln!, "ueln")}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title={t("horses:detail.basicInfo.copyToClipboard")}
                    >
                      {copiedField === "ueln" ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              )}
              {horse.chipNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("horses:detail.basicInfo.chipNumber")}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm">{horse.chipNumber}</p>
                    <button
                      onClick={() =>
                        handleCopy(horse.chipNumber!, "chipNumber")
                      }
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title={t("horses:detail.basicInfo.copyToClipboard")}
                    >
                      {copiedField === "chipNumber" ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              )}
              {horse.federationNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("horses:detail.basicInfo.federation")}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm">
                      {horse.federationNumber}
                    </p>
                    <button
                      onClick={() =>
                        handleCopy(horse.federationNumber!, "federationNumber")
                      }
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title={t("horses:detail.basicInfo.copyToClipboard")}
                    >
                      {copiedField === "federationNumber" ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              )}
              {horse.feiPassNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("horses:detail.basicInfo.feiPass")}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm">{horse.feiPassNumber}</p>
                    <button
                      onClick={() =>
                        handleCopy(horse.feiPassNumber!, "feiPassNumber")
                      }
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title={t("horses:detail.basicInfo.copyToClipboard")}
                    >
                      {copiedField === "feiPassNumber" ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              )}
              {horse.feiExpiryDate &&
                (() => {
                  const expiryDate = toDate(horse.feiExpiryDate);
                  return expiryDate ? (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("horses:detail.basicInfo.feiExpiry")}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm">
                          {format(expiryDate, "M/d/yy")}
                        </p>
                        {getFeiExpiryWarning(horse.feiExpiryDate)}
                      </div>
                    </div>
                  ) : null;
                })()}
            </div>
          </div>
        )}

        {/* 4. Pedigree (with Breeder) */}
        {hasPedigree && (
          <div className="border-t pt-4">
            <p className="text-sm font-semibold mb-2">
              {t("horses:detail.basicInfo.pedigree")}
            </p>
            <div className="space-y-1 text-sm">
              {horse.sire && (
                <div>
                  <span className="text-muted-foreground">
                    {t("horses:detail.basicInfo.sire")}{" "}
                  </span>
                  <span>{horse.sire}</span>
                </div>
              )}
              {horse.dam && (
                <div>
                  <span className="text-muted-foreground">
                    {t("horses:detail.basicInfo.dam")}{" "}
                  </span>
                  <span>{horse.dam}</span>
                </div>
              )}
              {horse.damsire && (
                <div>
                  <span className="text-muted-foreground">
                    {t("horses:detail.basicInfo.damsire")}{" "}
                  </span>
                  <span>{horse.damsire}</span>
                </div>
              )}
              {horse.breeder && (
                <div>
                  <span className="text-muted-foreground">
                    {t("horses:detail.basicInfo.breeder")}{" "}
                  </span>
                  <span>{horse.breeder}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. Physical Characteristics */}
        {horse.withersHeight && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {t("horses:detail.basicInfo.withersHeight")}
            </p>
            <p className="font-medium">
              {horse.withersHeight} {t("horses:detail.basicInfo.cm")}
            </p>
          </div>
        )}

        {/* 6. Special Instructions */}
        {horse.hasSpecialInstructions && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-semibold">
                {t("horses:detail.basicInfo.specialInstructions")}
              </p>
            </div>
            {horse.specialInstructions && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">
                {horse.specialInstructions}
              </p>
            )}
            {horse.equipment && horse.equipment.length > 0 && (
              <EquipmentDisplay equipment={horse.equipment} />
            )}
          </div>
        )}

        {/* 7. Notes */}
        {horse.notes && (
          <div className="border-t pt-4">
            <p className="text-sm font-semibold mb-2">
              {t("horses:detail.basicInfo.notes")}
            </p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {horse.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
