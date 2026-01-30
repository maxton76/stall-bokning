import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SubscriptionLimits } from "@equiduty/shared";
import { LIMIT_LABELS } from "@equiduty/shared";

interface SubscriptionLimitsEditorProps {
  limits: SubscriptionLimits;
  onChange: (key: keyof SubscriptionLimits, value: string) => void;
  disabled?: boolean;
}

const limitKeys = Object.keys(LIMIT_LABELS) as Array<keyof SubscriptionLimits>;

export function SubscriptionLimitsEditor({
  limits,
  onChange,
  disabled,
}: SubscriptionLimitsEditorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {limitKeys.map((key) => (
        <div key={key} className="space-y-1">
          <Label htmlFor={`limit-${key}`}>{LIMIT_LABELS[key]}</Label>
          <Input
            id={`limit-${key}`}
            type="number"
            value={limits[key]}
            onChange={(e) => onChange(key, e.target.value)}
            disabled={disabled}
            className="w-full"
          />
        </div>
      ))}
    </div>
  );
}
