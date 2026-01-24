import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

/**
 * Options for useApiMutation with toast notifications
 */
interface ApiMutationOptions<TData, TVariables> {
  /** Success message to show in toast */
  successMessage?: string;
  /** Error message prefix to show in toast */
  errorMessage?: string;
  /** Whether to show toast on success (default: true if successMessage provided) */
  showSuccessToast?: boolean;
  /** Whether to show toast on error (default: true) */
  showErrorToast?: boolean;
  /** Callback when mutation succeeds */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Callback when mutation fails */
  onError?: (error: Error, variables: TVariables) => void;
  /** Callback before mutation runs, can return context */
  onMutate?: (variables: TVariables) => void | Promise<void>;
  /** Callback when mutation settles (either success or error) */
  onSettled?: (
    data: TData | undefined,
    error: Error | null,
    variables: TVariables,
  ) => void;
}

/**
 * API Mutation hook with toast notifications and retry configuration.
 *
 * This hook wraps TanStack Query's useMutation with:
 * - Automatic toast notifications for success/error
 * - 1 retry with 1 second delay for network failures
 * - Consistent error handling across the app
 *
 * @example
 * ```tsx
 * // Basic usage
 * const createUserMutation = useApiMutation(
 *   (data: CreateUserInput) => createUser(data),
 *   {
 *     successMessage: 'User created successfully',
 *     onSuccess: () => {
 *       queryClient.invalidateQueries({ queryKey: ['users'] });
 *       navigate('/users');
 *     },
 *   }
 * );
 *
 * // Usage in form
 * const handleSubmit = (data: CreateUserInput) => {
 *   createUserMutation.mutate(data);
 * };
 * ```
 *
 * @example
 * // Without toast notifications
 * ```tsx
 * const deleteMutation = useApiMutation(
 *   (id: string) => deleteItem(id),
 *   {
 *     showSuccessToast: false,
 *     showErrorToast: false,
 *   }
 * );
 * ```
 */
export function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: ApiMutationOptions<TData, TVariables>,
): UseMutationResult<TData, Error, TVariables, unknown> {
  const { toast } = useToast();
  const {
    successMessage,
    errorMessage,
    showSuccessToast = !!successMessage,
    showErrorToast = true,
    onSuccess: userOnSuccess,
    onError: userOnError,
    onMutate: userOnMutate,
    onSettled: userOnSettled,
  } = options ?? {};

  return useMutation<TData, Error, TVariables, unknown>({
    mutationFn,
    // Retry once for network failures
    retry: 1,
    retryDelay: 1000,
    onMutate: userOnMutate,
    onSuccess: (data, variables) => {
      if (showSuccessToast && successMessage) {
        toast({
          title: successMessage,
        });
      }
      userOnSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      if (showErrorToast) {
        toast({
          title: errorMessage ?? "An error occurred",
          description: error.message,
          variant: "destructive",
        });
      }
      userOnError?.(error, variables);
    },
    onSettled: userOnSettled,
  });
}
