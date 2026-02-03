import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getHorseValidationMessageKey,
  type HorsePreviewRow,
  type HorseValidationSummary,
  type HorseValidationCode,
} from "@/lib/horseImportValidator";
import type { Stable } from "@equiduty/shared";

interface HorseBulkImportPreviewProps {
  previewRows: HorsePreviewRow[];
  stables: Stable[];
  defaultStableId: string | null;
  defaultStableName: string | null;
  perHorseStableOverrides: Map<
    number,
    { stableId: string; stableName: string }
  >;
  validationSummary: HorseValidationSummary;
  canSubmit: boolean;
  submitting: boolean;
  submitError: string | null;
  wasTruncated: boolean;
  truncatedCount: number;
  onSetDefaultStable: (stableId: string, stableName: string) => void;
  onSetHorseStableOverride: (
    rowIndex: number,
    stableId: string,
    stableName: string,
  ) => void;
  onToggleRowExclusion: (rowIndex: number) => void;
  onSubmit: () => void;
  onBack: () => void;
}

function StatusIcon({
  status,
}: {
  status: HorsePreviewRow["validation"]["status"];
}) {
  switch (status) {
    case "valid":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    case "error":
      return <XCircle className="h-4 w-4 text-destructive" />;
  }
}

export function HorseBulkImportPreview({
  previewRows,
  stables,
  defaultStableId,
  defaultStableName,
  perHorseStableOverrides,
  validationSummary,
  canSubmit,
  submitting,
  submitError,
  wasTruncated,
  truncatedCount,
  onSetDefaultStable,
  onSetHorseStableOverride,
  onToggleRowExclusion,
  onSubmit,
  onBack,
}: HorseBulkImportPreviewProps) {
  const { t } = useTranslation(["horses", "common"]);

  return (
    <div className="space-y-4">
      {/* Truncation warning */}
      {wasTruncated && (
        <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 p-3 text-sm text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            {t("horses:bulkImport.preview.truncationWarning", {
              fileCount: truncatedCount,
              importCount: previewRows.length,
            })}
          </p>
        </div>
      )}

      {/* Default stable selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {t("horses:bulkImport.preview.defaultStable")} *
        </label>
        <Select
          value={defaultStableId || ""}
          onValueChange={(value) => {
            const stable = stables.find((s) => s.id === value);
            if (stable) {
              onSetDefaultStable(stable.id, stable.name);
            }
          }}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={t("horses:bulkImport.preview.selectStable")}
            />
          </SelectTrigger>
          <SelectContent>
            {stables.map((stable) => (
              <SelectItem key={stable.id} value={stable.id}>
                {stable.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-4 text-sm rounded-md bg-muted/50 p-3">
        <span className="font-medium">
          {t("horses:bulkImport.preview.summary", {
            horses: validationSummary.total,
            owners: validationSummary.uniqueOwners,
          })}
        </span>
        {validationSummary.errors > 0 && (
          <span className="text-destructive flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5" />
            {t("horses:bulkImport.preview.errors", {
              count: validationSummary.errors,
            })}
          </span>
        )}
        {validationSummary.warnings > 0 && (
          <span className="text-yellow-600 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t("horses:bulkImport.preview.warnings", {
              count: validationSummary.warnings,
            })}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border max-h-[400px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead className="w-10" />
              <TableHead>{t("horses:bulkImport.preview.ownerEmail")}</TableHead>
              <TableHead>{t("horses:bulkImport.preview.ownerName")}</TableHead>
              <TableHead>{t("horses:bulkImport.preview.horseName")}</TableHead>
              <TableHead>{t("horses:bulkImport.preview.stable")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewRows.map((row) => {
              const stableOverride = perHorseStableOverrides.get(row.index);
              const effectiveStableId =
                stableOverride?.stableId || defaultStableId;
              const effectiveStableName =
                stableOverride?.stableName || defaultStableName;

              return (
                <TableRow
                  key={row.index}
                  className={row.excluded ? "opacity-40" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={!row.excluded}
                      onCheckedChange={() => onToggleRowExclusion(row.index)}
                    />
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <StatusIcon status={row.validation.status} />
                        </TooltipTrigger>
                        <TooltipContent>
                          {[
                            ...row.validation.errors,
                            ...row.validation.warnings,
                          ]
                            .map((code) =>
                              t(
                                getHorseValidationMessageKey(
                                  code as HorseValidationCode,
                                ),
                              ),
                            )
                            .join(", ") || t("horses:bulkImport.preview.valid")}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-sm">{row.ownerEmail}</TableCell>
                  <TableCell className="text-sm">
                    {row.ownerName || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {row.horseName}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={effectiveStableId || ""}
                      onValueChange={(value) => {
                        const stable = stables.find((s) => s.id === value);
                        if (stable) {
                          onSetHorseStableOverride(
                            row.index,
                            stable.id,
                            stable.name,
                          );
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue>
                          {effectiveStableName ||
                            t("horses:bulkImport.preview.selectStable")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {stables.map((stable) => (
                          <SelectItem key={stable.id} value={stable.id}>
                            {stable.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Submit error */}
      {submitError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          {t("common:buttons.back")}
        </Button>
        <Button onClick={onSubmit} disabled={!canSubmit || submitting}>
          {submitting
            ? t("common:buttons.submitting")
            : t("horses:bulkImport.preview.importButton", {
                count: validationSummary.valid + validationSummary.warnings,
              })}
        </Button>
      </div>
    </div>
  );
}
