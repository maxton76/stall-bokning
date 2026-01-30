import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FeatureRequestCategory } from "@equiduty/shared";

interface CategoryBadgeProps {
  category: FeatureRequestCategory;
  className?: string;
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const { t } = useTranslation(["featureRequests"]);

  return (
    <Badge variant="outline" className={cn("font-normal", className)}>
      {t(`featureRequests:categories.${category}`)}
    </Badge>
  );
}
