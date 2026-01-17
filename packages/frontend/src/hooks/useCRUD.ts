import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import i18n from "@/i18n";

/**
 * Options for useCRUD hook
 * @template T - Type of entity being managed (must have an id field)
 */
interface UseCRUDOptions<T> {
  /** Function to create a new entity */
  createFn?: (data: Partial<T>) => Promise<string | void>;
  /** Function to update an existing entity */
  updateFn?: (id: string, data: Partial<T>) => Promise<void>;
  /** Function to delete an entity */
  deleteFn?: (id: string) => Promise<void>;
  /** Callback executed after successful operation */
  onSuccess?: (
    action: "create" | "update" | "delete",
    data?: any,
  ) => void | Promise<void>;
  /** Custom success messages for each operation */
  successMessages?: {
    create?: string;
    update?: string;
    delete?: string;
  };
}

/**
 * CRUD operations hook with error handling and reload coordination
 * Standardizes create/update/delete patterns across all components
 *
 * @template T - Type of entity being managed (must have an id field)
 * @param options - Configuration options
 * @returns CRUD operation functions and loading state
 *
 * @example
 * ```tsx
 * // Before: 7 separate CRUD handlers
 * const handleSaveHorse = async (horseData) => { ... } // 20 lines
 * const handleDeleteHorse = async (horse) => { ... }   // 15 lines
 *
 * // After: Single hook call
 * const horseCRUD = useCRUD<Horse>({
 *   createFn: (data) => createHorse(user!.uid, data),
 *   updateFn: (id, data) => updateHorse(id, user!.uid, data),
 *   deleteFn: (id) => deleteHorse(id),
 *   onSuccess: () => loadData(),
 *   successMessages: {
 *     create: t('horses:messages.addSuccess'),
 *     update: t('horses:messages.updateSuccess'),
 *     delete: t('horses:messages.deleteSuccess')
 *   }
 * })
 *
 * // Usage:
 * horseCRUD.create(data)
 * horseCRUD.update(id, data)
 * horseCRUD.remove(id, 'Are you sure?')
 * horseCRUD.loading  // Check if operation in progress
 * ```
 */
export function useCRUD<T extends { id: string }>(options: UseCRUDOptions<T>) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  /**
   * Create a new entity
   * @param data - Entity data
   * @returns Promise resolving to the created entity ID (if returned by createFn)
   */
  const create = async (data: Partial<T>): Promise<string | void> => {
    if (!options.createFn) {
      throw new Error("Create function not provided");
    }

    setLoading(true);
    try {
      const result = await options.createFn(data);
      toast({
        title: i18n.t("errors:titles.success"),
        description:
          options.successMessages?.create ||
          i18n.t("errors:crud.createSuccess"),
      });
      await options.onSuccess?.("create", result);
      return result;
    } catch (error) {
      console.error("Create error:", error);
      toast({
        title: i18n.t("errors:titles.error"),
        description: i18n.t("errors:crud.createFailed"),
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update an existing entity
   * @param id - Entity ID
   * @param data - Updated entity data
   */
  const update = async (id: string, data: Partial<T>): Promise<void> => {
    if (!options.updateFn) {
      throw new Error("Update function not provided");
    }

    setLoading(true);
    try {
      await options.updateFn(id, data);
      toast({
        title: i18n.t("errors:titles.success"),
        description:
          options.successMessages?.update ||
          i18n.t("errors:crud.updateSuccess"),
      });
      await options.onSuccess?.("update");
    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: i18n.t("errors:titles.error"),
        description: i18n.t("errors:crud.updateFailed"),
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete an entity
   * @param id - Entity ID
   * @param confirmMessage - Optional confirmation message (uses window.confirm)
   */
  const remove = async (id: string, confirmMessage?: string): Promise<void> => {
    if (!options.deleteFn) {
      throw new Error("Delete function not provided");
    }

    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    try {
      await options.deleteFn(id);
      toast({
        title: i18n.t("errors:titles.success"),
        description:
          options.successMessages?.delete ||
          i18n.t("errors:crud.deleteSuccess"),
      });
      await options.onSuccess?.("delete");
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: i18n.t("errors:titles.error"),
        description: i18n.t("errors:crud.deleteFailed"),
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    create,
    update,
    remove,
    loading,
  };
}
