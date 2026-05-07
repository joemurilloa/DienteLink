import { useCallback } from 'react';

export type Theme = 'light';

export function useTheme() {
  const theme: Theme = 'light';
  const resolvedTheme: Theme = 'light';

  const setTheme = useCallback((_newTheme: any) => {
    // Do nothing, dark mode disabled
  }, []);

  const toggleTheme = useCallback(() => {
    // Do nothing, dark mode disabled
  }, []);

  return { theme, resolvedTheme, setTheme, toggleTheme };
}
