/**
 * Resource Service Factory
 *
 * Creates standardized CRUD services for resources with common patterns.
 * Reduces boilerplate by 50-70% for typical entity services.
 *
 * @example
 * ```typescript
 * // Simple service
 * const feedTypeService = createResourceService<FeedType, CreateFeedTypeData>({
 *   basePath: '/feed-types',
 *   listPath: (stableId) => `/feed-types/stable/${stableId}`,
 *   responseKey: 'feedTypes',
 * });
 *
 * // Usage
 * const types = await feedTypeService.list(stableId);
 * const type = await feedTypeService.get(id);
 * const id = await feedTypeService.create({ stableId, ...data });
 * await feedTypeService.update(id, updates);
 * await feedTypeService.delete(id);
 * ```
 */

import { apiClient } from "@/lib/apiClient";

// =============================================================================
// Types
// =============================================================================

type QueryParams = Record<string, string | number | boolean | undefined>;

/**
 * Configuration for creating a resource service
 */
export interface ResourceServiceConfig<T, TCreate = Partial<T>> {
  /**
   * Base API path for the resource (e.g., '/feed-types')
   */
  basePath: string;

  /**
   * Function to generate list endpoint path
   * @param parentId - Parent resource ID (e.g., stableId, organizationId)
   * @returns Full API path for listing
   */
  listPath?: (parentId: string) => string;

  /**
   * Key in response object that contains the array of items
   * (e.g., 'feedTypes', 'activityTypes', 'horseGroups')
   */
  responseKey?: string;

  /**
   * Transform function for list results (optional)
   */
  transformList?: (items: T[]) => T[];

  /**
   * Transform function for single item results (optional)
   */
  transformItem?: (item: T) => T;
}

/**
 * Standard resource service interface
 */
export interface ResourceService<
  T,
  TCreate = Partial<T>,
  TUpdate = Partial<T>,
> {
  /**
   * List resources by parent ID
   */
  list: (parentId: string, params?: QueryParams) => Promise<T[]>;

  /**
   * Get a single resource by ID
   */
  get: (id: string) => Promise<T | null>;

  /**
   * Create a new resource
   */
  create: (data: TCreate) => Promise<string>;

  /**
   * Update an existing resource
   */
  update: (id: string, data: TUpdate) => Promise<void>;

  /**
   * Delete a resource
   */
  delete: (id: string) => Promise<void>;
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a standardized CRUD service for a resource type
 *
 * @param config - Service configuration
 * @returns ResourceService with standard CRUD operations
 */
export function createResourceService<
  T extends { id: string },
  TCreate = Omit<T, "id" | "createdAt" | "updatedAt">,
  TUpdate = Partial<TCreate>,
>(
  config: ResourceServiceConfig<T, TCreate>,
): ResourceService<T, TCreate, TUpdate> {
  const { basePath, listPath, responseKey, transformList, transformItem } =
    config;

  return {
    /**
     * List resources by parent ID
     */
    async list(parentId: string, params?: QueryParams): Promise<T[]> {
      const path = listPath
        ? listPath(parentId)
        : `${basePath}?parentId=${parentId}`;
      const response = await apiClient.get<Record<string, T[]>>(path, params);

      // Extract items from response using responseKey or return first array found
      let items: T[];
      if (responseKey && response[responseKey]) {
        items = response[responseKey];
      } else {
        // Find first array in response
        const values = Object.values(response);
        items = (values.find((v) => Array.isArray(v)) as T[]) || [];
      }

      return transformList ? transformList(items) : items;
    },

    /**
     * Get a single resource by ID
     */
    async get(id: string): Promise<T | null> {
      try {
        const item = await apiClient.get<T>(`${basePath}/${id}`);
        return transformItem ? transformItem(item) : item;
      } catch (error) {
        // Return null for 404 errors
        if (error instanceof Error && error.message.includes("404")) {
          return null;
        }
        throw error;
      }
    },

    /**
     * Create a new resource
     */
    async create(data: TCreate): Promise<string> {
      const response = await apiClient.post<{ id: string }>(basePath, data);
      return response.id;
    },

    /**
     * Update an existing resource
     */
    async update(id: string, data: TUpdate): Promise<void> {
      await apiClient.patch(`${basePath}/${id}`, data);
    },

    /**
     * Delete a resource
     */
    async delete(id: string): Promise<void> {
      await apiClient.delete(`${basePath}/${id}`);
    },
  };
}

// =============================================================================
// Extended Factory for Stable-Scoped Resources
// =============================================================================

/**
 * Configuration for stable-scoped resources
 */
export interface StableResourceConfig<T> {
  /**
   * Resource name in plural form (e.g., 'feed-types', 'activity-types')
   */
  resourceName: string;

  /**
   * Key in response object that contains the array
   */
  responseKey: string;
}

/**
 * Create a service for resources scoped to a stable
 * Provides standard patterns for stable-owned resources
 *
 * @example
 * ```typescript
 * const feedTypeService = createStableResourceService<FeedType>({
 *   resourceName: 'feed-types',
 *   responseKey: 'feedTypes',
 * });
 * ```
 */
export function createStableResourceService<
  T extends { id: string; stableId: string },
  TCreate = Omit<
    T,
    "id" | "createdAt" | "updatedAt" | "createdBy" | "lastModifiedBy"
  >,
  TUpdate = Partial<Omit<TCreate, "stableId">>,
>(
  config: StableResourceConfig<T>,
): ResourceService<T, TCreate & { stableId: string }, TUpdate> {
  const { resourceName, responseKey } = config;

  return createResourceService<T, TCreate & { stableId: string }, TUpdate>({
    basePath: `/${resourceName}`,
    listPath: (stableId) => `/${resourceName}/stable/${stableId}`,
    responseKey,
  });
}

// =============================================================================
// Extended Factory for Organization-Scoped Resources
// =============================================================================

/**
 * Configuration for organization-scoped resources
 */
export interface OrganizationResourceConfig<T> {
  /**
   * Resource name in plural form (e.g., 'horse-groups', 'contacts')
   */
  resourceName: string;

  /**
   * Key in response object that contains the array
   */
  responseKey: string;
}

/**
 * Create a service for resources scoped to an organization
 *
 * @example
 * ```typescript
 * const horseGroupService = createOrganizationResourceService<HorseGroup>({
 *   resourceName: 'horse-groups',
 *   responseKey: 'horseGroups',
 * });
 * ```
 */
export function createOrganizationResourceService<
  T extends { id: string; organizationId: string },
  TCreate = Omit<
    T,
    "id" | "createdAt" | "updatedAt" | "createdBy" | "lastModifiedBy"
  >,
  TUpdate = Partial<Omit<TCreate, "organizationId">>,
>(
  config: OrganizationResourceConfig<T>,
): ResourceService<T, TCreate & { organizationId: string }, TUpdate> {
  const { resourceName, responseKey } = config;

  return createResourceService<
    T,
    TCreate & { organizationId: string },
    TUpdate
  >({
    basePath: `/${resourceName}`,
    listPath: (organizationId) =>
      `/${resourceName}/organization/${organizationId}`,
    responseKey,
  });
}
