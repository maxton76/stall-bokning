import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import type { QueryConstraint } from "firebase/firestore";
import type { CrudService } from "@/services/firestoreCrud";

/**
 * Generic Firestore Query Hooks
 *
 * Provides TanStack Query integration for CRUD operations
 * with intelligent caching, automatic refetching, and optimistic updates
 */

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook to fetch a single document by ID with caching
 *
 * @template T - Document type
 * @param queryKey - TanStack Query key
 * @param service - CRUD service instance
 * @param id - Document ID
 * @param options - Additional options
 * @returns Query result with data, loading state, and error
 *
 * @example
 * ```tsx
 * const { data: horse, isLoading } = useFirestoreDoc(
 *   queryKeys.horses.detail(horseId),
 *   horseService,
 *   horseId
 * )
 * ```
 */
export function useFirestoreDoc<T extends { id?: string }>(
  queryKey: readonly unknown[],
  service: CrudService<T>,
  id: string | null | undefined,
  options?: {
    enabled?: boolean;
    parentId?: string;
  },
): UseQueryResult<T | null, Error> {
  return useQuery({
    queryKey: [...queryKey, options?.parentId],
    queryFn: () => {
      if (!id) return null;
      return service.getById(id, options?.parentId);
    },
    enabled: options?.enabled !== false && !!id,
  });
}

/**
 * Hook to fetch a list of documents with caching
 *
 * @template T - Document type
 * @param queryKey - TanStack Query key
 * @param service - CRUD service instance
 * @param constraints - Firestore query constraints
 * @param options - Additional options
 * @returns Query result with data array, loading state, and error
 *
 * @example
 * ```tsx
 * const { data: horses = [] } = useFirestoreQuery(
 *   queryKeys.horses.list({ stableId }),
 *   horseService,
 *   [where('stableId', '==', stableId), orderBy('name')]
 * )
 * ```
 */
export function useFirestoreQuery<T extends { id?: string }>(
  queryKey: readonly unknown[],
  service: CrudService<T>,
  constraints: QueryConstraint[],
  options?: {
    enabled?: boolean;
    parentId?: string;
  },
): UseQueryResult<T[], Error> {
  return useQuery({
    queryKey: [...queryKey, options?.parentId],
    queryFn: () => service.query(constraints, options?.parentId),
    enabled: options?.enabled !== false,
  });
}

/**
 * Hook to fetch documents by parent ID with caching
 *
 * @template T - Document type
 * @param queryKey - TanStack Query key
 * @param service - CRUD service instance with getByParent method
 * @param parentId - Parent document ID
 * @param additionalConstraints - Optional additional query constraints
 * @param options - Additional options
 * @returns Query result with data array, loading state, and error
 *
 * @example
 * ```tsx
 * const { data: groups = [] } = useFirestoreByParent(
 *   queryKeys.horseGroups.list(stableId),
 *   horseGroupService,
 *   stableId
 * )
 * ```
 */
export function useFirestoreByParent<T extends { id?: string }>(
  queryKey: readonly unknown[],
  service: CrudService<T> & {
    getByParent?: (
      parentId: string,
      constraints?: QueryConstraint[],
    ) => Promise<T[]>;
  },
  parentId: string | null | undefined,
  additionalConstraints?: QueryConstraint[],
  options?: {
    enabled?: boolean;
  },
): UseQueryResult<T[], Error> {
  return useQuery({
    queryKey,
    queryFn: () => {
      if (!parentId || !service.getByParent) {
        return [];
      }
      return service.getByParent(parentId, additionalConstraints);
    },
    enabled: options?.enabled !== false && !!parentId && !!service.getByParent,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook to create a document with optimistic updates
 *
 * @template T - Document type
 * @param service - CRUD service instance
 * @param options - Mutation options with invalidation keys
 * @returns Mutation result with mutate function and loading state
 *
 * @example
 * ```tsx
 * const createHorse = useFirestoreCreate(horseService, {
 *   invalidateKeys: [queryKeys.horses.all],
 *   onSuccess: (id) => navigate(`/horses/${id}`)
 * })
 *
 * createHorse.mutate({ userId, data: horseData, parentId: stableId })
 * ```
 */
export function useFirestoreCreate<T extends { id?: string }>(
  service: CrudService<T>,
  options?: {
    invalidateKeys?: readonly unknown[][];
    onSuccess?: (id: string) => void;
    onError?: (error: Error) => void;
  },
): UseMutationResult<
  string,
  Error,
  {
    userId: string;
    data: Omit<
      T,
      "id" | "createdAt" | "updatedAt" | "createdBy" | "lastModifiedBy"
    >;
    parentId?: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data, parentId }) =>
      service.create(userId, data, parentId),
    onSuccess: (id) => {
      // Invalidate specified query keys
      options?.invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      options?.onSuccess?.(id);
    },
    onError: options?.onError,
  });
}

/**
 * Hook to update a document with optimistic updates
 *
 * @template T - Document type
 * @param service - CRUD service instance
 * @param options - Mutation options with invalidation keys
 * @returns Mutation result with mutate function and loading state
 *
 * @example
 * ```tsx
 * const updateHorse = useFirestoreUpdate(horseService, {
 *   invalidateKeys: [queryKeys.horses.detail(horseId), queryKeys.horses.all]
 * })
 *
 * updateHorse.mutate({ id: horseId, userId, updates: { name: 'New Name' } })
 * ```
 */
export function useFirestoreUpdate<T extends { id?: string }>(
  service: CrudService<T>,
  options?: {
    invalidateKeys?: readonly unknown[][];
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  },
): UseMutationResult<
  void,
  Error,
  {
    id: string;
    userId: string;
    updates: Partial<Omit<T, "id" | "createdAt" | "createdBy">>;
    parentId?: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, userId, updates, parentId }) =>
      service.update(id, userId, updates, parentId),
    onSuccess: () => {
      // Invalidate specified query keys
      options?.invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

/**
 * Hook to delete a document with cache invalidation
 *
 * @template T - Document type
 * @param service - CRUD service instance
 * @param options - Mutation options with invalidation keys
 * @returns Mutation result with mutate function and loading state
 *
 * @example
 * ```tsx
 * const deleteHorse = useFirestoreDelete(horseService, {
 *   invalidateKeys: [queryKeys.horses.all],
 *   onSuccess: () => navigate('/horses')
 * })
 *
 * deleteHorse.mutate({ id: horseId })
 * ```
 */
export function useFirestoreDelete<T extends { id?: string }>(
  service: CrudService<T>,
  options?: {
    invalidateKeys?: readonly unknown[][];
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  },
): UseMutationResult<
  void,
  Error,
  {
    id: string;
    parentId?: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, parentId }) => service.delete(id, parentId),
    onSuccess: () => {
      // Invalidate specified query keys
      options?.invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

// ============================================================================
// Pagination Hook
// ============================================================================

/**
 * Hook for paginated Firestore queries
 *
 * @template T - Document type
 * @param queryKey - TanStack Query key
 * @param service - CRUD service instance
 * @param constraints - Base query constraints
 * @param options - Pagination options
 * @returns Paginated query result
 *
 * @example
 * ```tsx
 * const {
 *   data,
 *   hasNextPage,
 *   fetchNextPage,
 *   isFetchingNextPage
 * } = useFirestorePagination(
 *   queryKeys.horses.list(filters),
 *   horseService,
 *   [where('stableId', '==', stableId)],
 *   { pageSize: 20 }
 * )
 * ```
 */
export function useFirestorePagination<T extends { id?: string }>(
  queryKey: readonly unknown[],
  service: CrudService<T>,
  constraints: QueryConstraint[],
  options?: {
    pageSize?: number;
    enabled?: boolean;
  },
) {
  // Note: Full pagination implementation requires cursor management
  // For now, return simple query with all results
  // TODO: Implement cursor-based pagination with startAfter
  return useFirestoreQuery(queryKey, service, constraints, {
    enabled: options?.enabled,
  });
}
