import { useState, useCallback, useMemo } from "react";
import type { ParseResult } from "@/lib/importParser";
import { parseImportFile, MAX_ROWS } from "@/lib/importParser";
import { unpivotHorseData, type HorseImportRow } from "@/lib/horseImportParser";
import {
  validateHorseImportRows,
  computeHorseValidationSummary,
  type HorsePreviewRow,
  type HorseValidationSummary,
} from "@/lib/horseImportValidator";
import type { BulkImportHorse } from "@equiduty/shared";

export type HorseWizardStep = 1 | 2 | 3;

export interface HorseBulkImportState {
  step: HorseWizardStep;
  // Step 1
  file: File | null;
  hasHeaders: boolean;
  parseResult: ParseResult | null;
  parseError: string | null;
  unpivotedRows: HorseImportRow[];
  // Step 2
  previewRows: HorsePreviewRow[];
  defaultStableId: string | null;
  defaultStableName: string | null;
  perHorseStableOverrides: Map<
    number,
    { stableId: string; stableName: string }
  >;
  resolving: boolean;
  // Step 3
  jobId: string | null;
  submitting: boolean;
  submitError: string | null;
  // Subscription limit
  wasTruncated: boolean;
  truncatedCount: number;
}

const initialState: HorseBulkImportState = {
  step: 1,
  file: null,
  hasHeaders: true,
  parseResult: null,
  parseError: null,
  unpivotedRows: [],
  previewRows: [],
  defaultStableId: null,
  defaultStableName: null,
  perHorseStableOverrides: new Map(),
  resolving: false,
  jobId: null,
  submitting: false,
  submitError: null,
  wasTruncated: false,
  truncatedCount: 0,
};

export function useHorseBulkImport(remainingSlots: number) {
  const [state, setState] = useState<HorseBulkImportState>({
    ...initialState,
    perHorseStableOverrides: new Map(),
  });

  const reset = useCallback(() => {
    setState({
      ...initialState,
      perHorseStableOverrides: new Map(),
    });
  }, []);

  // Step 1: File handling
  const setHasHeaders = useCallback((hasHeaders: boolean) => {
    setState((prev) => ({ ...prev, hasHeaders }));
  }, []);

  const handleFileSelect = useCallback(
    async (file: File, hasHeaders: boolean) => {
      setState((prev) => ({
        ...prev,
        file,
        hasHeaders,
        parseError: null,
      }));
      try {
        // Parse with large max rows — we'll truncate after unpivoting
        const result = await parseImportFile(file, hasHeaders, MAX_ROWS);

        // Unpivot: each horse cell becomes a row
        let unpivoted = unpivotHorseData(result);

        // Truncate if exceeds subscription limit
        let wasTruncated = false;
        let truncatedCount = 0;
        if (unpivoted.length > remainingSlots && remainingSlots !== Infinity) {
          truncatedCount = unpivoted.length;
          unpivoted = unpivoted.slice(0, remainingSlots);
          wasTruncated = true;
        }

        setState((prev) => ({
          ...prev,
          parseResult: result,
          unpivotedRows: unpivoted,
          parseError: null,
          wasTruncated,
          truncatedCount,
        }));
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          parseResult: null,
          unpivotedRows: [],
          parseError: err.message || "PARSE_ERROR",
        }));
      }
    },
    [remainingSlots],
  );

  // Step 2: Preview configuration
  const setDefaultStable = useCallback(
    (stableId: string, stableName: string) => {
      setState((prev) => ({
        ...prev,
        defaultStableId: stableId,
        defaultStableName: stableName,
      }));
    },
    [],
  );

  const setHorseStableOverride = useCallback(
    (rowIndex: number, stableId: string, stableName: string) => {
      setState((prev) => {
        const overrides = new Map(prev.perHorseStableOverrides);
        overrides.set(rowIndex, { stableId, stableName });
        return { ...prev, perHorseStableOverrides: overrides };
      });
    },
    [],
  );

  const setPreviewRows = useCallback(
    (
      resolvedMembers: Array<{ email: string; userId: string; name: string }>,
      unresolvedEmails: string[],
    ) => {
      const validated = validateHorseImportRows(
        state.unpivotedRows,
        resolvedMembers,
        unresolvedEmails,
      );
      setState((prev) => ({
        ...prev,
        previewRows: validated,
        resolving: false,
      }));
    },
    [state.unpivotedRows],
  );

  const setResolving = useCallback((resolving: boolean) => {
    setState((prev) => ({ ...prev, resolving }));
  }, []);

  const toggleRowExclusion = useCallback((rowIndex: number) => {
    setState((prev) => ({
      ...prev,
      previewRows: prev.previewRows.map((r) =>
        r.index === rowIndex ? { ...r, excluded: !r.excluded } : r,
      ),
    }));
  }, []);

  const validationSummary: HorseValidationSummary = useMemo(
    () => computeHorseValidationSummary(state.previewRows),
    [state.previewRows],
  );

  const canSubmit = useMemo(() => {
    const activeValid = state.previewRows.filter(
      (r) => !r.excluded && r.validation.status !== "error",
    );
    return (
      activeValid.length > 0 && !state.submitting && !!state.defaultStableId
    );
  }, [state.previewRows, state.submitting, state.defaultStableId]);

  // Build submission payload
  const getSubmissionPayload = useCallback((): BulkImportHorse[] => {
    return state.previewRows
      .filter((r) => !r.excluded && r.validation.status !== "error")
      .map((r) => {
        const stableOverride = state.perHorseStableOverrides.get(r.index);
        return {
          name: r.horseName,
          ownerEmail: r.ownerEmail,
          ownerId: r.ownerId!,
          ownerName: r.ownerName || r.ownerEmail,
          color: "brown",
          currentStableId: stableOverride?.stableId || state.defaultStableId!,
          currentStableName:
            stableOverride?.stableName || state.defaultStableName!,
        };
      });
  }, [
    state.previewRows,
    state.perHorseStableOverrides,
    state.defaultStableId,
    state.defaultStableName,
  ]);

  // Navigation
  const goToStep = useCallback((step: HorseWizardStep) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => {
      const next = Math.max(prev.step - 1, 1) as HorseWizardStep;
      return { ...prev, step: next };
    });
  }, []);

  // Step 3: Submission
  const setSubmitting = useCallback((submitting: boolean) => {
    setState((prev) => ({ ...prev, submitting }));
  }, []);

  const setJobId = useCallback((jobId: string) => {
    setState((prev) => ({ ...prev, jobId, step: 3, submitting: false }));
  }, []);

  const setSubmitError = useCallback((error: string) => {
    setState((prev) => ({
      ...prev,
      submitError: error,
      submitting: false,
    }));
  }, []);

  return {
    state,
    reset,
    setHasHeaders,
    handleFileSelect,
    setDefaultStable,
    setHorseStableOverride,
    setPreviewRows,
    setResolving,
    toggleRowExclusion,
    validationSummary,
    canSubmit,
    getSubmissionPayload,
    goToStep,
    prevStep,
    setSubmitting,
    setJobId,
    setSubmitError,
  };
}
