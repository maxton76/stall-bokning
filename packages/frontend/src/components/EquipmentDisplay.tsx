import { useTranslation } from "react-i18next";
import type { EquipmentItem } from "@equiduty/shared";

interface EquipmentDisplayProps {
  equipment: EquipmentItem[];
  showHeader?: boolean;
  compact?: boolean;
}

export function EquipmentDisplay({
  equipment,
  showHeader = true,
  compact = false,
}: EquipmentDisplayProps) {
  const { t } = useTranslation(["horses"]);
  if (!equipment || equipment.length === 0) return null;

  return (
    <div className="space-y-2">
      {showHeader && (
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("equipmentDisplay.header")}
        </p>
      )}
      <div className="space-y-1">
        {equipment.map((item) => (
          <div
            key={item.id}
            className={`flex flex-wrap items-start text-sm bg-muted/30 rounded px-2 py-1 ${
              compact ? "gap-1" : "gap-2"
            }`}
          >
            <span className="font-medium">{item.name}</span>
            {item.location && (
              <span className="text-muted-foreground">({item.location})</span>
            )}
            {item.notes && (
              <span
                className={`text-muted-foreground italic ${compact ? "text-xs" : ""}`}
              >
                - {item.notes}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
