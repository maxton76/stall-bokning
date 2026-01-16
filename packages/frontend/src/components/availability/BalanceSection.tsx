import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface BalanceDetailItem {
  label: string;
  value: number;
}

interface BalanceSectionProps {
  title: string;
  total: number;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  details: BalanceDetailItem[];
}

/**
 * Reusable collapsible section for displaying balance breakdown.
 * Used in the Balance sidebar to show Build up, Corrections, Leave, and Overtime sections.
 */
export function BalanceSection({
  title,
  total,
  isOpen,
  onToggle,
  details,
}: BalanceSectionProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-accent rounded px-2 -mx-2">
        <span className="font-medium">{title}</span>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{total}h</span>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-2 space-y-1 text-sm text-muted-foreground mt-2">
          {details.map((detail, index) => (
            <div key={index} className="flex justify-between">
              <span>{detail.label}</span>
              <span>{detail.value}h</span>
            </div>
          ))}
          <div className="flex justify-between font-medium text-foreground pt-1 border-t">
            <span>Total</span>
            <span>{total}h</span>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
