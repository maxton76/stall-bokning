import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { authFetchJSON } from "@/utils/authFetch";
import { EquipmentDisplay } from "@/components/EquipmentDisplay";
import type { EquipmentItem } from "@stall-bokning/shared";

interface SpecialInstructionsData {
  specialInstructions: string;
  equipment: EquipmentItem[];
}

interface SpecialInstructionsPopoverProps {
  horseId: string;
  horseName: string;
}

export function SpecialInstructionsPopover({
  horseId,
  horseName,
}: SpecialInstructionsPopoverProps) {
  const { t } = useTranslation(["horses"]);
  const [data, setData] = useState<SpecialInstructionsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchInstructions = async () => {
    if (data) return; // Already loaded

    setIsLoading(true);
    setError(null);

    try {
      const result = await authFetchJSON<SpecialInstructionsData>(
        `/api/v1/horses/${horseId}/special-instructions`,
      );
      setData(result);
    } catch (err) {
      console.error("Failed to fetch special instructions:", err);
      setError(t("specialInstructionsPopover.loadError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      fetchInstructions();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
          title={t("specialInstructionsPopover.title", { horseName })}
        >
          <Bell className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500" />
            <h4 className="font-semibold text-sm">{horseName}</h4>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && <p className="text-sm text-destructive py-2">{error}</p>}

          {data && !isLoading && (
            <div className="space-y-3">
              {data.specialInstructions && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {data.specialInstructions}
                </p>
              )}

              {data.equipment && data.equipment.length > 0 && (
                <EquipmentDisplay equipment={data.equipment} compact />
              )}

              {!data.specialInstructions &&
                (!data.equipment || data.equipment.length === 0) && (
                  <p className="text-sm text-muted-foreground italic">
                    {t("specialInstructionsPopover.noInstructions")}
                  </p>
                )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
