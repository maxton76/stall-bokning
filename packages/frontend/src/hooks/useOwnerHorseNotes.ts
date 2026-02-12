import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useQueryClient } from "@tanstack/react-query";
import {
  createOwnerHorseNote,
  updateOwnerHorseNote,
  deleteOwnerHorseNote,
  listOwnerHorseNotes,
} from "@/services/routineService";
import type {
  CreateOwnerHorseNoteInput,
  UpdateOwnerHorseNoteInput,
} from "@shared/types";

/**
 * Hook for managing owner horse notes with TanStack Query
 */
export function useOwnerHorseNotes(
  stableId: string | undefined,
  params?: { horseId?: string; from?: string; to?: string },
) {
  const queryClient = useQueryClient();

  const queryKey = [
    "ownerHorseNotes",
    stableId,
    params?.horseId,
    params?.from,
    params?.to,
  ];

  const query = useApiQuery(
    queryKey,
    () => listOwnerHorseNotes(stableId!, params),
    { enabled: !!stableId },
  );

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["ownerHorseNotes"] });
    // Also invalidate daily notes since they contain the owner notes
    queryClient.invalidateQueries({
      queryKey: ["routines", "dailyNotes"],
    });
  };

  const createMutation = useApiMutation(
    (data: CreateOwnerHorseNoteInput) => createOwnerHorseNote(stableId!, data),
    {
      onSuccess: invalidateAll,
    },
  );

  const updateMutation = useApiMutation(
    ({
      rangeGroupId,
      startDate,
      endDate,
      data,
    }: {
      rangeGroupId: string;
      startDate: string;
      endDate: string;
      data: UpdateOwnerHorseNoteInput;
    }) =>
      updateOwnerHorseNote(stableId!, rangeGroupId, startDate, endDate, data),
    {
      onSuccess: invalidateAll,
    },
  );

  const deleteMutation = useApiMutation(
    ({
      rangeGroupId,
      startDate,
      endDate,
    }: {
      rangeGroupId: string;
      startDate: string;
      endDate: string;
    }) => deleteOwnerHorseNote(stableId!, rangeGroupId, startDate, endDate),
    {
      onSuccess: invalidateAll,
    },
  );

  return {
    ownerNotes: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    createNote: createMutation.mutateAsync,
    updateNote: updateMutation.mutateAsync,
    deleteNote: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
