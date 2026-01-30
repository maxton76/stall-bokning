import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { SubscriptionAddons } from "@equiduty/shared";
import { ADDON_LABELS } from "@equiduty/shared";

interface SubscriptionAddonsEditorProps {
  addons: SubscriptionAddons;
  onToggle: (key: keyof SubscriptionAddons) => void;
  disabled?: boolean;
}

const addonKeys = Object.keys(ADDON_LABELS) as Array<keyof SubscriptionAddons>;

export function SubscriptionAddonsEditor({
  addons,
  onToggle,
  disabled,
}: SubscriptionAddonsEditorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {addonKeys.map((key) => (
        <div
          key={key}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <Label htmlFor={`addon-${key}`} className="cursor-pointer">
            {ADDON_LABELS[key]}
          </Label>
          <Switch
            id={`addon-${key}`}
            checked={addons[key]}
            onCheckedChange={() => onToggle(key)}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
}
