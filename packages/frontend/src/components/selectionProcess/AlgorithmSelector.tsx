import { useTranslation } from "react-i18next";
import { GripVertical, Scale, TrendingDown, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { SelectionAlgorithm } from "@equiduty/shared";

interface AlgorithmSelectorProps {
  selected: SelectionAlgorithm;
  onSelect: (algorithm: SelectionAlgorithm) => void;
  defaultAlgorithm?: SelectionAlgorithm;
}

const ALGORITHMS: {
  id: SelectionAlgorithm;
  icon: React.ElementType;
  i18nKey: string;
  detailKeys: string[];
}[] = [
  {
    id: "manual",
    icon: GripVertical,
    i18nKey: "manual",
    detailKeys: ["detail"],
  },
  {
    id: "quota_based",
    icon: Scale,
    i18nKey: "quotaBased",
    detailKeys: ["detail1", "detail2", "detail3"],
  },
  {
    id: "points_balance",
    icon: TrendingDown,
    i18nKey: "pointsBalance",
    detailKeys: ["detail1", "detail2", "detail3"],
  },
  {
    id: "fair_rotation",
    icon: RotateCw,
    i18nKey: "fairRotation",
    detailKeys: ["detail1", "detail2", "detail3"],
  },
];

export function AlgorithmSelector({
  selected,
  onSelect,
  defaultAlgorithm,
}: AlgorithmSelectorProps) {
  const { t } = useTranslation(["selectionProcess"]);

  return (
    <div className="space-y-3">
      {ALGORITHMS.map((algo) => {
        const Icon = algo.icon;
        const isSelected = selected === algo.id;
        const isDefault = defaultAlgorithm === algo.id;

        return (
          <button
            key={algo.id}
            type="button"
            onClick={() => onSelect(algo.id)}
            className={cn(
              "w-full text-left p-4 rounded-lg border-2 transition-all",
              isSelected
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border hover:border-primary/40 hover:bg-muted/50",
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 rounded-md p-2",
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">
                    {t(`selectionProcess:algorithm.${algo.i18nKey}.name`)}
                  </span>
                  {isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      {t("selectionProcess:algorithm.recommended")}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t(`selectionProcess:algorithm.${algo.i18nKey}.description`)}
                </p>
                {isSelected && (
                  <ul className="mt-2 space-y-1">
                    {algo.detailKeys.map((key) => (
                      <li
                        key={key}
                        className="text-sm text-muted-foreground flex items-start gap-1.5"
                      >
                        <span className="text-primary mt-0.5">-</span>
                        {t(`selectionProcess:algorithm.${algo.i18nKey}.${key}`)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
