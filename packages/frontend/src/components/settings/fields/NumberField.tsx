import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface NumberFieldProps {
  id: string;
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | "any";
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function NumberField({
  id,
  label,
  description,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
  error,
  className,
}: NumberFieldProps) {
  const { t } = useTranslation(["settings", "common"]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      onChange(newValue);
    }
  };

  // Build enhanced description with range info
  const enhancedDescription = description
    ? min !== undefined && max !== undefined
      ? `${description} (${min}-${max})`
      : description
    : min !== undefined && max !== undefined
      ? t("settings:fields.range", { min, max })
      : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={enhancedDescription ? `${id}-description` : undefined}
      />
      {enhancedDescription && !error && (
        <p id={`${id}-description`} className="text-sm text-muted-foreground">
          {enhancedDescription}
        </p>
      )}
      {error && (
        <p id={`${id}-description`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
