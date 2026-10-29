/**
 * PerformanceOptimizations.tsx
 *
 * Previously 219 lines of mostly dead code. Trimmed to only the hook
 * that is actually imported and used: `useOptimizedSearch` in PatientList.
 *
 * Dead exports removed:
 *   - createMemoizedListItem  (use React.memo directly)
 *   - useVirtualizedList      (not used; tanstack-virtual preferred if needed)
 *   - useOptimizedImage       (not used)
 *   - usePerformanceMonitor   (console.warn left in prod — bad practice)
 *   - useIntersectionObserver (not used)
 *   - LazyWrapper             (not used)
 *   - useBatchedState         (not used)
 *   - useCleanup              (not used; useEffect return already does this)
 */

import React, { useMemo } from 'react';

// ---------------------------------------------------------------------------
// useDebouncedValue — debounces a string value by `delay` ms.
// ---------------------------------------------------------------------------
export const useDebouncedValue = (value: string, delay = 300): string => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// ---------------------------------------------------------------------------
// getNestedValue — resolves a dot-notation path on an object.
// ---------------------------------------------------------------------------
const getNestedValue = (obj: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((current, prop) =>
    current && typeof current === 'object' ? (current as Record<string, unknown>)[prop] : undefined,
  obj);

// ---------------------------------------------------------------------------
// useOptimizedSearch — debounced multi-key search over an array of objects.
// Used in: PatientList.tsx
// ---------------------------------------------------------------------------
export function useOptimizedSearch<T>(
  items: T[],
  searchTerm: string,
  searchKeys: string[],
): T[] {
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 200);

  return useMemo(() => {
    if (!debouncedSearchTerm.trim()) return items;
    const lower = debouncedSearchTerm.toLowerCase();
    return items.filter(item =>
      searchKeys.some(key => {
        const value = getNestedValue(item, key);
        return value && String(value).toLowerCase().includes(lower);
      }),
    );
  }, [items, debouncedSearchTerm, searchKeys]);
}