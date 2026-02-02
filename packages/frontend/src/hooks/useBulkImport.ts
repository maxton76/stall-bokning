import { useState, useCallback, useMemo } from "react";
import type {
  OrganizationRole,
  OrganizationMember,
  OrganizationInvite,
} from "@equiduty/shared";
import type {
  ParseResult,
  ColumnMapping,
  MappableField,
} from "@/lib/importParser";
import {
  parseImportFile,
  autoDetectMappings,
  applyMappings,
} from "@/lib/importParser";
import {
  validateImportRows,
  computeValidationSummary,
  type PreviewRow,
  type ValidationSummary,
} from "@/lib/importValidator";

export type WizardStep = 1 | 2 | 3 | 4;

export interface BulkImportState {
  step: WizardStep;
  // Step 1
  file: File | null;
  hasHeaders: boolean;
  parseResult: ParseResult | null;
  parseError: string | null;
  // Step 2
  columnMappings: ColumnMapping[];
  // Step 3
  previewRows: PreviewRow[];
  globalRoles: OrganizationRole[];
  globalPrimaryRole: OrganizationRole;
  perRowRoleOverrides: Map<
    number,
    { roles: OrganizationRole[]; primaryRole: OrganizationRole }
  >;
  // Step 4
  jobId: string | null;
  submitting: boolean;
  submitError: string | null;
}

const DEFAULT_ROLE: OrganizationRole = "customer";

const initialState: BulkImportState = {
  step: 1,
  file: null,
  hasHeaders: true,
  parseResult: null,
  parseError: null,
  columnMappings: [],
  previewRows: [],
  globalRoles: [DEFAULT_ROLE],
  globalPrimaryRole: DEFAULT_ROLE,
  perRowRoleOverrides: new Map(),
  jobId: null,
  submitting: false,
  submitError: null,
};

export function useBulkImport(
  existingMembers: OrganizationMember[],
  existingInvites: (OrganizationInvite & { id: string })[],
) {
  const [state, setState] = useState<BulkImportState>({ ...initialState });

  const reset = useCallback(() => {
    setState({ ...initialState, perRowRoleOverrides: new Map() });
  }, []);

  // Step 1: File handling
  const setHasHeaders = useCallback((hasHeaders: boolean) => {
    setState((prev) => ({ ...prev, hasHeaders }));
  }, []);

  const handleFileSelect = useCallback(
    async (file: File, hasHeaders: boolean, maxRows?: number) => {
      setState((prev) => ({
        ...prev,
        file,
        hasHeaders,
        parseError: null,
      }));
      try {
        const result = await parseImportFile(file, hasHeaders, maxRows);
        const mappings = hasHeaders
          ? autoDetectMappings(result.headers)
          : result.headers.map((h) => ({
              sourceColumn: h,
              targetField: "skip" as MappableField,
            }));
        setState((prev) => ({
          ...prev,
          parseResult: result,
          columnMappings: mappings,
          parseError: null,
        }));
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          parseResult: null,
          parseError: err.message || "PARSE_ERROR",
        }));
      }
    },
    [],
  );

  // Step 2: Column mapping
  const updateMapping = useCallback(
    (sourceColumn: string, targetField: MappableField) => {
      setState((prev) => ({
        ...prev,
        columnMappings: prev.columnMappings.map((m) =>
          m.sourceColumn === sourceColumn ? { ...m, targetField } : m,
        ),
      }));
    },
    [],
  );

  const hasEmailMapping = useMemo(
    () => state.columnMappings.some((m) => m.targetField === "email"),
    [state.columnMappings],
  );

  // Step 3: Preview + roles
  const goToPreview = useCallback(() => {
    if (!state.parseResult) return;
    if (!state.columnMappings.some((m) => m.targetField === "email")) return;
    const mapped = applyMappings(state.parseResult.rows, state.columnMappings);
    const validated = validateImportRows(
      mapped,
      existingMembers,
      existingInvites,
    );
    setState((prev) => ({
      ...prev,
      step: 3,
      previewRows: validated,
      perRowRoleOverrides: new Map(),
    }));
  }, [
    state.parseResult,
    state.columnMappings,
    existingMembers,
    existingInvites,
  ]);

  const setGlobalRoles = useCallback(
    (roles: OrganizationRole[], primaryRole: OrganizationRole) => {
      setState((prev) => ({
        ...prev,
        globalRoles: roles,
        globalPrimaryRole: primaryRole,
      }));
    },
    [],
  );

  const setRowRoleOverride = useCallback(
    (
      rowIndex: number,
      roles: OrganizationRole[],
      primaryRole: OrganizationRole,
    ) => {
      setState((prev) => {
        const overrides = new Map(prev.perRowRoleOverrides);
        overrides.set(rowIndex, { roles, primaryRole });
        return { ...prev, perRowRoleOverrides: overrides };
      });
    },
    [],
  );

  const clearRowRoleOverride = useCallback((rowIndex: number) => {
    setState((prev) => {
      const overrides = new Map(prev.perRowRoleOverrides);
      overrides.delete(rowIndex);
      return { ...prev, perRowRoleOverrides: overrides };
    });
  }, []);

  const toggleRowExclusion = useCallback((rowIndex: number) => {
    setState((prev) => ({
      ...prev,
      previewRows: prev.previewRows.map((r) =>
        r.index === rowIndex ? { ...r, excluded: !r.excluded } : r,
      ),
    }));
  }, []);

  const validationSummary: ValidationSummary = useMemo(
    () => computeValidationSummary(state.previewRows),
    [state.previewRows],
  );

  const canSubmit = useMemo(() => {
    const activeValid = state.previewRows.filter(
      (r) => !r.excluded && r.validation.status !== "error",
    );
    return activeValid.length > 0 && !state.submitting;
  }, [state.previewRows, state.submitting]);

  // Build submission payload
  const getSubmissionPayload = useCallback(() => {
    return state.previewRows
      .filter((r) => !r.excluded && r.validation.status !== "error")
      .map((r) => {
        const override = state.perRowRoleOverrides.get(r.index);
        return {
          email: r.email,
          firstName: r.firstName,
          lastName: r.lastName,
          phoneNumber: r.phoneNumber,
          roles: override?.roles || state.globalRoles,
          primaryRole: override?.primaryRole || state.globalPrimaryRole,
        };
      });
  }, [
    state.previewRows,
    state.perRowRoleOverrides,
    state.globalRoles,
    state.globalPrimaryRole,
  ]);

  // Navigation
  const goToStep = useCallback((step: WizardStep) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => {
      if (prev.step === 2) {
        // Will be handled by goToPreview
        return prev;
      }
      const next = Math.min(prev.step + 1, 4) as WizardStep;
      return { ...prev, step: next };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => {
      const next = Math.max(prev.step - 1, 1) as WizardStep;
      return { ...prev, step: next };
    });
  }, []);

  // Step 4: Submission
  const setSubmitting = useCallback((submitting: boolean) => {
    setState((prev) => ({ ...prev, submitting }));
  }, []);

  const setJobId = useCallback((jobId: string) => {
    setState((prev) => ({ ...prev, jobId, step: 4, submitting: false }));
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
    updateMapping,
    hasEmailMapping,
    goToPreview,
    setGlobalRoles,
    setRowRoleOverride,
    clearRowRoleOverride,
    toggleRowExclusion,
    validationSummary,
    canSubmit,
    getSubmissionPayload,
    goToStep,
    nextStep,
    prevStep,
    setSubmitting,
    setJobId,
    setSubmitError,
  };
}
