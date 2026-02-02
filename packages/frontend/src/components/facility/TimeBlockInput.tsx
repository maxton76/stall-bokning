import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { TimeBlock } from "@/types/facility";

interface TimeBlockInputProps {
  block: TimeBlock;
  onChange: (block: TimeBlock) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function TimeBlockInput({
  block,
  onChange,
  onRemove,
  canRemove,
}: TimeBlockInputProps) {
  const { t } = useTranslation("facilities");

  return (
    <div className="flex items-center gap-2">
      <Input
        type="time"
        value={block.from}
        onChange={(e) => onChange({ ...block, from: e.target.value })}
        className="w-[120px]"
        aria-label={t("schedule.from")}
      />
      <span className="text-muted-foreground">–</span>
      <Input
        type="time"
        value={block.to}
        onChange={(e) => onChange({ ...block, to: e.target.value })}
        className="w-[120px]"
        aria-label={t("schedule.to")}
      />
      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
