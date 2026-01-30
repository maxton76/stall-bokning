import { useState, useEffect } from "react";

/**
 * Debounces a value by the specified delay.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * const [search, setSearch] = useState("");
 * const debouncedSearch = useDebouncedValue(search, 300);
 *
 * const query = useApiQuery(
 *   ['items', debouncedSearch],
 *   () => fetchItems({ search: debouncedSearch || undefined }),
 * );
 * ```
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
