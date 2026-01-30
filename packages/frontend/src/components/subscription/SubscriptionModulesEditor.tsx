import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ModuleFlags } from "@equiduty/shared";
import { MODULE_LABELS } from "@equiduty/shared";

interface SubscriptionModulesEditorProps {
  modules: ModuleFlags;
  onToggle: (key: keyof ModuleFlags) => void;
  disabled?: boolean;
}

const moduleKeys = Object.keys(MODULE_LABELS) as Array<keyof ModuleFlags>;

export function SubscriptionModulesEditor({
  modules,
  onToggle,
  disabled,
}: SubscriptionModulesEditorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {moduleKeys.map((key) => (
        <div
          key={key}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <Label htmlFor={`module-${key}`} className="cursor-pointer">
            {MODULE_LABELS[key]}
          </Label>
          <Switch
            id={`module-${key}`}
            checked={modules[key]}
            onCheckedChange={() => onToggle(key)}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
}
