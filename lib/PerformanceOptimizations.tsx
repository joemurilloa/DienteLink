import React, { memo, useMemo, useCallback } from 'react';

// Debounce utility function
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Performance optimization utilities

// Debounced search hook
export const useDebouncedValue = (value: string, delay: number = 300) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// Optimized search function
export const useOptimizedSearch = (items: any[], searchTerm: string, searchKeys: string[]) => {
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 200);
  
  return useMemo(() => {
    if (!debouncedSearchTerm.trim()) return items;
    
    const lowercaseSearch = debouncedSearchTerm.toLowerCase();
    
    return items.filter(item => 
      searchKeys.some(key => {
        const value = getNestedValue(item, key);
        return value && String(value).toLowerCase().includes(lowercaseSearch);
      })
    );
  }, [items, debouncedSearchTerm, searchKeys]);
};

// Get nested object value by dot notation
const getNestedValue = (obj: any, path: string) => {
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
};

// Memoized list item component factory
export const createMemoizedListItem = <T,>(
  Component: React.ComponentType<T>
) => {
  return memo(Component, (prevProps, nextProps) => {
    // Shallow comparison for performance
    return JSON.stringify(prevProps) === JSON.stringify(nextProps);
  });
};

// Virtualized list hook for large datasets
export const useVirtualizedList = (
  items: any[], 
  containerHeight: number, 
  itemHeight: number
) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const visibleItems = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2; // Buffer
    const end = Math.min(start + visibleCount, items.length);
    
    return {
      start,
      end,
      items: items.slice(start, end),
      totalHeight: items.length * itemHeight,
      offsetY: start * itemHeight
    };
  }, [items, scrollTop, itemHeight, containerHeight]);

  const handleScroll = useCallback(
    debounce((e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }, 16), // 60fps
    []
  );

  return { visibleItems, handleScroll };
};

// Optimized image loading hook
export const useOptimizedImage = (src: string) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isError, setIsError] = React.useState(false);

  React.useEffect(() => {
    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.onerror = () => setIsError(true);
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return { isLoaded, isError };
};

// Performance monitoring hook
export const usePerformanceMonitor = (componentName: string) => {
  React.useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      if (renderTime > 16) { // More than 1 frame at 60fps
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    };
  });
};

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
) => {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(callback, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [callback, options]);

  return ref;
};

// Lazy loading component wrapper
export const LazyWrapper: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  delay?: number;
}> = ({ children, fallback = <div>Loading...</div>, delay = 0 }) => {
  const [shouldRender, setShouldRender] = React.useState(delay === 0);
  
  const ref = useIntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        if (delay > 0) {
          setTimeout(() => setShouldRender(true), delay);
        } else {
          setShouldRender(true);
        }
      }
    },
    { threshold: 0.1, rootMargin: '100px' }
  );

  return (
    <div ref={ref}>
      {shouldRender ? children : fallback}
    </div>
  );
};

// Batch state updates hook
export const useBatchedState = <T,>(initialState: T) => {
  const [state, setState] = React.useState(initialState);
  const batchedUpdates = React.useRef<Partial<T>[]>([]);
  
  const batchUpdate = useCallback((update: Partial<T>) => {
    batchedUpdates.current.push(update);
    
    // Batch updates for better performance
    setState(prevState => ({
      ...prevState,
      ...batchedUpdates.current.reduce((acc, update) => ({ ...acc, ...update }), {})
    }));
    batchedUpdates.current = [];
  }, []);

  return [state, batchUpdate] as const;
};

// Memory leak prevention hook
export const useCleanup = (cleanup: () => void) => {
  React.useEffect(() => {
    return cleanup;
  }, [cleanup]);
};

export default {
  useDebouncedValue,
  useOptimizedSearch,
  createMemoizedListItem,
  useVirtualizedList,
  useOptimizedImage,
  usePerformanceMonitor,
  useIntersectionObserver,
  LazyWrapper,
  useBatchedState,
  useCleanup
};