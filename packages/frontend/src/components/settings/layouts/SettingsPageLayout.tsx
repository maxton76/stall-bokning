import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SettingsPageLayoutProps {
  title: string;
  description?: string;
  backLink?: string;
  backText?: string;
  onSave?: () => void | Promise<void>;
  saveButtonText?: string;
  isSaving?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function SettingsPageLayout({
  title,
  description,
  backLink,
  backText,
  onSave,
  saveButtonText,
  isSaving = false,
  children,
  className,
}: SettingsPageLayoutProps) {
  const { t } = useTranslation(["settings", "common"]);

  const resolvedBackText = backText ?? t("common:buttons.back");
  const resolvedSaveButtonText =
    saveButtonText ?? t("common:buttons.saveChanges");

  return (
    <div className={cn("container mx-auto p-6 space-y-6", className)}>
      {/* Header */}
      <div>
        {backLink && (
          <Link to={backLink}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {resolvedBackText}
            </Button>
          </Link>
        )}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {onSave && (
            <Button onClick={onSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? t("settings:layout.saving") : resolvedSaveButtonText}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
