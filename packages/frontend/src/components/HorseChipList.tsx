/**
 * HorseChipList Component
 *
 * Displays selected horses as removable Badge chips
 */

import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface HorseChipListProps {
  horses: Array<{ id: string; name: string }>;
  onRemove: (horseId: string) => void;
  disabled?: boolean;
  className?: string;
}

export function HorseChipList({
  horses,
  onRemove,
  disabled = false,
  className = "",
}: HorseChipListProps) {
  if (horses.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {horses.map((horse) => (
        <Badge key={horse.id} variant="secondary" className="gap-1 pr-1 py-1.5">
          <span>{horse.name}</span>
          <button
            type="button"
            onClick={() => onRemove(horse.id)}
            disabled={disabled}
            className="ml-1 hover:bg-muted-foreground/20 rounded-sm p-0.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Remove ${horse.name}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
