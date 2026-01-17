import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Wheat } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { HorseFeeding } from "@shared/types";
import { QUANTITY_MEASURE_ABBREVIATIONS } from "@/constants/feeding";

interface FeedingCellPopoverProps {
  feedings: HorseFeeding[];
  horseName: string;
  feedingTimeName: string;
  onAddClick: () => void;
  onEditClick: (feeding: HorseFeeding) => void;
  onDeleteClick: (feeding: HorseFeeding) => void;
  children: React.ReactNode;
}

export function FeedingCellPopover({
  feedings,
  horseName,
  feedingTimeName,
  onAddClick,
  onEditClick,
  onDeleteClick,
  children,
}: FeedingCellPopoverProps) {
  const { t } = useTranslation(["feeding", "common"]);

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-sm">{horseName}</h4>
              <p className="text-xs text-muted-foreground">{feedingTimeName}</p>
            </div>
            <Button size="sm" variant="outline" onClick={onAddClick}>
              <Plus className="h-4 w-4 mr-1" />
              {t("feeding:popover.add")}
            </Button>
          </div>

          {feedings.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              {t("feeding:popover.noFeedingsConfigured")}
            </div>
          ) : (
            <div className="space-y-2">
              {feedings.map((feeding) => (
                <div
                  key={feeding.id}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Wheat className="h-4 w-4 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium">
                        {feeding.feedTypeName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {feeding.quantity}{" "}
                        {
                          QUANTITY_MEASURE_ABBREVIATIONS[
                            feeding.quantityMeasure
                          ]
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => onEditClick(feeding)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => onDeleteClick(feeding)}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {feedings.some((f) => f.notes) && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground font-medium mb-1">
                {t("feeding:popover.notes")}
              </p>
              {feedings
                .filter((f) => f.notes)
                .map((f) => (
                  <p key={f.id} className="text-xs text-muted-foreground">
                    - {f.feedTypeName}: {f.notes}
                  </p>
                ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
