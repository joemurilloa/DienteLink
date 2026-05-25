import { useEffect } from 'react';

export const useFocusManagement = () => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setTimeout(() => {
          const focusedElement = document.activeElement as HTMLElement;
          if (focusedElement && focusedElement !== document.body) {
            focusedElement.classList.add('focus-visible');
          }
        }, 0);
      }
    };

    const handleClick = () => {
      const focusedElement = document.activeElement as HTMLElement;
      if (focusedElement) {
        focusedElement.classList.remove('focus-visible');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClick);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClick);
    };
  }, []);
};

export default {
  useFocusManagement,
};
