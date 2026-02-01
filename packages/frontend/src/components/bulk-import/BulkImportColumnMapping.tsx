import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import type {
  ColumnMapping,
  MappableField,
  ParseResult,
} from "@/lib/importParser";
import { getSampleValues } from "@/lib/importParser";

interface BulkImportColumnMappingProps {
  parseResult: ParseResult;
  columnMappings: ColumnMapping[];
  hasEmailMapping: boolean;
  onUpdateMapping: (sourceColumn: string, targetField: MappableField) => void;
  onNext: () => void;
  onBack: () => void;
}

const MAPPING_OPTIONS: { value: MappableField; labelKey: string }[] = [
  { value: "email", labelKey: "organizations:bulkImport.mapping.email" },
  {
    value: "firstName",
    labelKey: "organizations:bulkImport.mapping.firstName",
  },
  { value: "lastName", labelKey: "organizations:bulkImport.mapping.lastName" },
  {
    value: "phoneNumber",
    labelKey: "organizations:bulkImport.mapping.phoneNumber",
  },
  { value: "skip", labelKey: "organizations:bulkImport.mapping.skip" },
];

export function BulkImportColumnMapping({
  parseResult,
  columnMappings,
  hasEmailMapping,
  onUpdateMapping,
  onNext,
  onBack,
}: BulkImportColumnMappingProps) {
  const { t } = useTranslation(["organizations", "common"]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("organizations:bulkImport.mapping.description")}
      </p>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {t("organizations:bulkImport.mapping.column")}
              </TableHead>
              <TableHead>
                {t("organizations:bulkImport.mapping.sampleValues")}
              </TableHead>
              <TableHead>
                {t("organizations:bulkImport.mapping.mapTo")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {columnMappings.map((mapping) => {
              const samples = getSampleValues(
                parseResult.rows,
                mapping.sourceColumn,
              );
              return (
                <TableRow key={mapping.sourceColumn}>
                  <TableCell className="font-medium">
                    {mapping.sourceColumn}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {samples.map((s, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="text-xs font-normal max-w-[150px] truncate"
                          title={s}
                        >
                          {s}
                        </Badge>
                      ))}
                      {samples.length === 0 && (
                        <span className="text-xs text-muted-foreground italic">
                          {t("organizations:bulkImport.mapping.noData")}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={mapping.targetField}
                      onValueChange={(value) =>
                        onUpdateMapping(
                          mapping.sourceColumn,
                          value as MappableField,
                        )
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MAPPING_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {t(opt.labelKey)}
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

      {/* Email mapping required warning */}
      {!hasEmailMapping && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {t("organizations:bulkImport.mapping.emailRequired")}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          {t("common:buttons.back")}
        </Button>
        <Button onClick={onNext} disabled={!hasEmailMapping}>
          {t("common:buttons.next")}
        </Button>
      </div>
    </div>
  );
}
