/**
 * ViewModeSelector Component
 * Allows users to switch between different persona-optimized views
 */

import { useTranslation } from "react-i18next";
import {
  User,
  BarChart3,
  ClipboardList,
  Shield,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { ViewMode } from "@/types/viewMode";
import type { StableMemberRole } from "@equiduty/shared";
import { cn } from "@/lib/utils";

interface ViewModeOption {
  mode: ViewMode;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  descriptionKey: string;
  requiredRoles?: StableMemberRole[];
}

const VIEW_MODE_OPTIONS: ViewModeOption[] = [
  {
    mode: "customer",
    icon: User,
    labelKey: "facilities:views.customer",
    descriptionKey: "facilities:views.customerDescription",
    requiredRoles: undefined, // Available to all
  },
  {
    mode: "operations",
    icon: ClipboardList,
    labelKey: "facilities:views.operations",
    descriptionKey: "facilities:views.operationsDescription",
    requiredRoles: ["owner", "administrator", "groomer", "staff", "rider"],
  },
  {
    mode: "manager",
    icon: BarChart3,
    labelKey: "facilities:views.manager",
    descriptionKey: "facilities:views.managerDescription",
    requiredRoles: ["owner", "administrator"],
  },
  {
    mode: "admin",
    icon: Shield,
    labelKey: "facilities:views.admin",
    descriptionKey: "facilities:views.adminDescription",
    requiredRoles: ["owner", "administrator"],
  },
];

interface ViewModeSelectorProps {
  /** Current view mode */
  viewMode: ViewMode;
  /** Callback when view mode changes */
  onChange: (mode: ViewMode) => void;
  /** Available view modes (filtered by permissions) */
  availableViewModes: ViewMode[];
  /** Optional className for styling */
  className?: string;
  /** Show as compact mode (icon only) */
  compact?: boolean;
}

export function ViewModeSelector({
  viewMode,
  onChange,
  availableViewModes,
  className,
  compact = false,
}: ViewModeSelectorProps) {
  const { t } = useTranslation(["facilities", "common"]);

  // Filter options based on available modes
  const availableOptions = VIEW_MODE_OPTIONS.filter((option) =>
    availableViewModes.includes(option.mode),
  );

  // Get current mode option
  const currentOption = VIEW_MODE_OPTIONS.find((opt) => opt.mode === viewMode);
  const CurrentIcon = currentOption?.icon || User;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn("flex items-center gap-2", className)}
          size={compact ? "icon" : "default"}
        >
          <CurrentIcon className="h-4 w-4" />
          {!compact && (
            <>
              <span>
                {t(currentOption?.labelKey || "facilities:views.customer")}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>
          {t("facilities:views.selectView")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableOptions.map((option) => {
          const Icon = option.icon;
          const isActive = option.mode === viewMode;

          return (
            <DropdownMenuItem
              key={option.mode}
              onClick={() => onChange(option.mode)}
              className={cn(
                "flex flex-col items-start gap-1 p-3 cursor-pointer",
                isActive && "bg-accent",
              )}
            >
              <div className="flex items-center gap-2 w-full">
                <Icon className="h-4 w-4" />
                <span className="font-medium flex-1">{t(option.labelKey)}</span>
                {isActive && (
                  <Badge variant="secondary" className="text-xs">
                    {t("common:labels.active")}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {t(option.descriptionKey)}
              </p>
            </DropdownMenuItem>
          );
        })}
        {availableOptions.length === 0 && (
          <div className="p-3 text-center text-sm text-muted-foreground">
            {t("facilities:views.noAvailableViews")}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
