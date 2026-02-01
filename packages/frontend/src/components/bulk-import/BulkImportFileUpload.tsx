import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, FileSpreadsheet, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MAX_FILE_SIZE, MAX_ROWS } from "@/lib/importParser";

interface BulkImportFileUploadProps {
  file: File | null;
  hasHeaders: boolean;
  parseError: string | null;
  onFileSelect: (file: File, hasHeaders: boolean) => void;
  onHasHeadersChange: (hasHeaders: boolean) => void;
  onNext: () => void;
  canProceed: boolean;
}

const ACCEPTED_EXTENSIONS = ".xlsx,.xls,.csv";

export function BulkImportFileUpload({
  file,
  hasHeaders,
  parseError,
  onFileSelect,
  onHasHeadersChange,
  onNext,
  canProceed,
}: BulkImportFileUploadProps) {
  const { t } = useTranslation(["organizations", "common"]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(
    (selectedFile: File) => {
      onFileSelect(selectedFile, hasHeaders);
    },
    [onFileSelect, hasHeaders],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) handleFile(selectedFile);
    },
    [handleFile],
  );

  const handleHeaderToggle = useCallback(
    (checked: boolean) => {
      onHasHeadersChange(checked);
      if (file) {
        onFileSelect(file, checked);
      }
    },
    [onHasHeadersChange, onFileSelect, file],
  );

  const getErrorMessage = (error: string) => {
    switch (error) {
      case "FILE_TOO_LARGE":
        return t("organizations:bulkImport.errors.fileTooLarge", {
          maxSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
        });
      case "INVALID_FILE_TYPE":
        return t("organizations:bulkImport.errors.invalidFileType");
      case "EMPTY_FILE":
        return t("organizations:bulkImport.errors.emptyFile");
      case "NO_DATA_ROWS":
        return t("organizations:bulkImport.errors.noDataRows");
      case "PARSE_ERROR":
        return t("organizations:bulkImport.errors.parseError");
      case "READ_ERROR":
        return t("organizations:bulkImport.errors.readError");
      default:
        return error;
    }
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
          ${file && !parseError ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleInputChange}
          className="hidden"
        />
        {file && !parseError ? (
          <div className="flex flex-col items-center gap-2">
            <FileSpreadsheet className="h-10 w-10 text-green-600" />
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              {t("organizations:bulkImport.upload.changeFile")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">
              {t("organizations:bulkImport.upload.dropzone")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("organizations:bulkImport.upload.formats")}
            </p>
          </div>
        )}
      </div>

      {/* Parse error */}
      {parseError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {getErrorMessage(parseError)}
        </div>
      )}

      {/* Header toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor="has-headers">
            {t("organizations:bulkImport.upload.hasHeaders")}
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                {t("organizations:bulkImport.upload.hasHeadersTooltip")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Switch
          id="has-headers"
          checked={hasHeaders}
          onCheckedChange={handleHeaderToggle}
        />
      </div>

      {/* Google Sheets tip */}
      <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <p>{t("organizations:bulkImport.upload.googleSheetsTip")}</p>
      </div>

      {/* Max rows info */}
      <p className="text-xs text-muted-foreground text-center">
        {t("organizations:bulkImport.upload.maxRows", { max: MAX_ROWS })}
      </p>

      {/* Next button */}
      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canProceed}>
          {t("common:buttons.next")}
        </Button>
      </div>
    </div>
  );
}
