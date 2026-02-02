import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeBlockInput } from "./TimeBlockInput";
import type { TimeBlock } from "@/types/facility";

interface TimeBlockListProps {
  blocks: TimeBlock[];
  onChange: (blocks: TimeBlock[]) => void;
  maxBlocks?: number;
}

export function TimeBlockList({
  blocks,
  onChange,
  maxBlocks = 5,
}: TimeBlockListProps) {
  const { t } = useTranslation("facilities");

  const handleBlockChange = (index: number, updated: TimeBlock) => {
    const next = [...blocks];
    next[index] = updated;
    onChange(next);
  };

  const handleRemove = (index: number) => {
    onChange(blocks.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    // Default new block starts after last block ends, or 08:00
    const lastBlock = blocks[blocks.length - 1];
    const from = lastBlock ? lastBlock.to : "08:00";
    const fromMinutes =
      parseInt(from.split(":")[0]!, 10) * 60 +
      parseInt(from.split(":")[1]!, 10);
    const toMinutes = Math.min(fromMinutes + 120, 23 * 60 + 59);
    const toH = String(Math.floor(toMinutes / 60)).padStart(2, "0");
    const toM = String(toMinutes % 60).padStart(2, "0");

    onChange([...blocks, { from, to: `${toH}:${toM}` }]);
  };

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => (
        <TimeBlockInput
          key={index}
          block={block}
          onChange={(b) => handleBlockChange(index, b)}
          onRemove={() => handleRemove(index)}
          canRemove={blocks.length > 1}
        />
      ))}
      {blocks.length < maxBlocks && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={handleAdd}
        >
          <Plus className="mr-1 h-3 w-3" />
          {t("schedule.addBlock")}
        </Button>
      )}
    </div>
  );
}
