import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { RoutineCategory } from "@shared/types";
import {
  Pill,
  Stethoscope,
  ShirtIcon,
  DoorOpen,
  Droplets,
  Brush,
  HeartPulse,
  Shield,
  Sparkles,
  MoreHorizontal,
} from "lucide-react";

interface CategoryInstructionsDropdownProps {
  value: Partial<Record<RoutineCategory, string>>;
  onChange: (value: Partial<Record<RoutineCategory, string>>) => void;
}

const CATEGORIES: RoutineCategory[] = [
  "preparation",
  "feeding",
  "medication",
  "blanket",
  "turnout",
  "bring_in",
  "mucking",
  "water",
  "health_check",
  "safety",
  "cleaning",
  "other",
];

const CATEGORY_ICONS: Record<RoutineCategory, React.ComponentType<any>> = {
  preparation: Sparkles,
  feeding: Pill,
  medication: Stethoscope,
  blanket: ShirtIcon,
  turnout: DoorOpen,
  bring_in: DoorOpen,
  mucking: Brush,
  water: Droplets,
  health_check: HeartPulse,
  safety: Shield,
  cleaning: Sparkles,
  other: MoreHorizontal,
};

export function CategoryInstructionsDropdown({
  value,
  onChange,
}: CategoryInstructionsDropdownProps) {
  const { t } = useTranslation(["routines", "horses"]);
  const [selectedCategory, setSelectedCategory] =
    useState<RoutineCategory>("medication");

  const handleCategoryChange = (category: RoutineCategory) => {
    setSelectedCategory(category);
  };

  const handleInstructionChange = (instruction: string) => {
    onChange({
      ...value,
      [selectedCategory]: instruction,
    });
  };

  const Icon = CATEGORY_ICONS[selectedCategory];
  const currentInstruction = value[selectedCategory] || "";
  const instructionCount = Object.entries(value).filter(([_, v]) =>
    v?.trim(),
  ).length;

  return (
    <div className="space-y-3">
      {/* Category Selector */}
      <div className="space-y-2">
        <Label htmlFor="category-select">
          {t("horses:form.labels.selectCategory")}
        </Label>
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger id="category-select">
            <SelectValue
              placeholder={t("horses:form.labels.selectCategoryPlaceholder")}
            />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((category) => {
              const CategoryIcon = CATEGORY_ICONS[category];
              return (
                <SelectItem key={category} value={category}>
                  <div className="flex items-center gap-2">
                    <CategoryIcon className="h-4 w-4" />
                    <span>{t(`routines:categories.${category}`)}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Instruction Textarea for Selected Category */}
      <div className="space-y-2">
        <Label
          htmlFor="category-instruction"
          className="flex items-center gap-2"
        >
          <Icon className="h-4 w-4" />
          {t(`routines:categories.${selectedCategory}`)}
        </Label>
        <Textarea
          id="category-instruction"
          value={currentInstruction}
          onChange={(e) => handleInstructionChange(e.target.value)}
          placeholder={t("horses:form.labels.categoryInstructionsPlaceholder", {
            category: t(`routines:categories.${selectedCategory}`),
          })}
          rows={4}
          className="resize-none"
        />
      </div>

      {/* Show indicator if other categories have instructions */}
      {instructionCount > 0 && (
        <div className="text-xs text-muted-foreground">
          {t("horses:form.labels.categoriesWithInstructions", {
            count: instructionCount,
          })}
        </div>
      )}
    </div>
  );
}
