import { useTranslation } from "react-i18next";
import { AlertTriangle, Info, FileText, Cloud, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { DailyNotes } from "@shared/types";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { PRIORITY_STYLES } from "@/constants/routineStyles";

interface DailyNotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: DailyNotes | null;
  onAcknowledge: () => void;
}

export function DailyNotesModal({
  open,
  onOpenChange,
  notes,
  onAcknowledge,
}: DailyNotesModalProps) {
  const { t } = useTranslation(["routines", "common"]);
  const [acknowledged, setAcknowledged] = useState(false);

  const hasContent =
    notes &&
    (notes.generalNotes ||
      notes.weatherNotes ||
      (notes.alerts && notes.alerts.length > 0) ||
      (notes.horseNotes && notes.horseNotes.length > 0));

  const handleAcknowledge = () => {
    if (acknowledged) {
      onAcknowledge();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("routines:dailyNotes.title")}
          </DialogTitle>
          <DialogDescription>
            {t("routines:flow.readNotesFirst")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {!hasContent ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("routines:dailyNotes.noNotes")}
            </div>
          ) : (
            <div className="space-y-4 pr-4">
              {/* Critical Alerts First */}
              {notes?.alerts
                ?.filter((a) => a.priority === "critical")
                .map((alert) => (
                  <AlertCard
                    key={alert.id}
                    title={alert.title}
                    message={alert.message}
                    priority="critical"
                    t={t}
                  />
                ))}

              {/* Warning Alerts */}
              {notes?.alerts
                ?.filter((a) => a.priority === "warning")
                .map((alert) => (
                  <AlertCard
                    key={alert.id}
                    title={alert.title}
                    message={alert.message}
                    priority="warning"
                    t={t}
                  />
                ))}

              {/* Weather Notes */}
              {notes?.weatherNotes && (
                <div className="p-4 bg-sky-50 rounded-lg border border-sky-200">
                  <div className="flex items-start gap-3">
                    <Cloud className="h-5 w-5 text-sky-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sky-800">
                        {t("routines:dailyNotes.weatherNotes")}
                      </p>
                      <p className="text-sm text-sky-700 mt-1">
                        {notes.weatherNotes}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* General Notes */}
              {notes?.generalNotes && (
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {t("routines:dailyNotes.generalNotes")}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                        {notes.generalNotes}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Alerts */}
              {notes?.alerts
                ?.filter((a) => a.priority === "info")
                .map((alert) => (
                  <AlertCard
                    key={alert.id}
                    title={alert.title}
                    message={alert.message}
                    priority="info"
                    t={t}
                  />
                ))}

              {/* Horse-Specific Notes */}
              {notes?.horseNotes && notes.horseNotes.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      {t("routines:dailyNotes.horseNotes")}
                      <Badge variant="outline">{notes.horseNotes.length}</Badge>
                    </h4>
                    <div className="space-y-2">
                      {notes.horseNotes.map((horseNote, idx) => {
                        const styles =
                          PRIORITY_STYLES[horseNote.priority] ||
                          PRIORITY_STYLES.info;
                        return (
                          <div
                            key={`${horseNote.horseId}-${idx}`}
                            className={cn(
                              "p-3 rounded-lg border",
                              styles.bg,
                              styles.border,
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <AlertTriangle
                                className={cn("h-4 w-4 mt-0.5", styles.icon)}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {/* TODO: Get horse name from context */}
                                    {t("routines:horse.feeding")}
                                  </span>
                                  {horseNote.category && (
                                    <Badge
                                      variant="outline"
                                      className={styles.badge}
                                    >
                                      {t(
                                        `routines:dailyNotes.noteCategory.${horseNote.category}`,
                                      )}
                                    </Badge>
                                  )}
                                </div>
                                <p className={cn("text-sm mt-1", styles.text)}>
                                  {horseNote.note}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </ScrollArea>

        <Separator />

        <div className="flex items-center gap-2">
          <Checkbox
            id="acknowledge-notes"
            checked={acknowledged}
            onCheckedChange={(checked) => setAcknowledged(checked === true)}
          />
          <label
            htmlFor="acknowledge-notes"
            className="text-sm font-medium cursor-pointer"
          >
            {t("routines:flow.acknowledgeNotes")}
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common:buttons.cancel")}
          </Button>
          <Button onClick={handleAcknowledge} disabled={!acknowledged}>
            <Check className="h-4 w-4 mr-2" />
            {t("routines:actions.start")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AlertCardProps {
  title: string;
  message: string;
  priority: "critical" | "warning" | "info";
  t: (key: string) => string;
}

function AlertCard({ title, message, priority, t }: AlertCardProps) {
  const styles = PRIORITY_STYLES[priority];

  return (
    <div
      className={cn(
        "p-4 rounded-lg border-l-4",
        styles.bg,
        priority === "critical" && "border-l-red-500",
        priority === "warning" && "border-l-yellow-500",
        priority === "info" && "border-l-blue-500",
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className={cn("h-5 w-5 mt-0.5", styles.icon)} />
        <div>
          <div className="flex items-center gap-2">
            <p className={cn("font-medium", styles.text)}>{title}</p>
            <Badge variant="outline" className={styles.badge}>
              {t(`routines:dailyNotes.priority.${priority}`)}
            </Badge>
          </div>
          <p className={cn("text-sm mt-1", styles.text)}>{message}</p>
        </div>
      </div>
    </div>
  );
}
