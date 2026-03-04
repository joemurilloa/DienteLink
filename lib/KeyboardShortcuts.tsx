import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Enhanced keyboard shortcuts for professional app experience
export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key, ctrlKey, metaKey, altKey, shiftKey } = event;
      const isCtrlOrCmd = ctrlKey || metaKey;

      // Prevent shortcuts when typing in inputs
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'INPUT' || 
                      activeElement?.tagName === 'TEXTAREA' ||
                      (activeElement as HTMLElement)?.contentEditable === 'true';

      if (isTyping && !isCtrlOrCmd) return;

      // Global Navigation Shortcuts
      if (isCtrlOrCmd) {
        switch (key.toLowerCase()) {
          case 'h':
            event.preventDefault();
            navigate('/');
            break;
          case 'p':
            // Only navigate if not default Ctrl+P (print)
            break;
          case 'c':
            // Don't override Ctrl+C (copy)
            break;
          case 'l':
            event.preventDefault();
            navigate('/calendar');
            break;
          case 's':
            // Don't override Ctrl+S (save)
            break;
          case 'k':
            // Global search (already implemented)
            break;
          case 'n':
            event.preventDefault();
            // Trigger new patient modal if on patients page
            if (location.pathname === '/patients') {
              const newPatientBtn = document.querySelector('[data-new-patient]') as HTMLButtonElement;
              newPatientBtn?.click();
            }
            break;
          case 'b':
            event.preventDefault();
            navigate('/booking/manage');
            break;
          case 'm':
            event.preventDefault();
            navigate('/booking/manage');
            break;
        }
      }

      // Alt + Key shortcuts
      if (altKey) {
        switch (key.toLowerCase()) {
          case '1':
            event.preventDefault();
            navigate('/');
            break;
          case '2':
            event.preventDefault();
            navigate('/patients');
            break;
          case '3':
            event.preventDefault();
            navigate('/consultation');
            break;
          case '4':
            event.preventDefault();
            navigate('/calendar');
            break;
          case '5':
            event.preventDefault();
            navigate('/settings');
            break;
        }
      }

      // Single key shortcuts (when not typing)
      if (!isTyping && !isCtrlOrCmd && !altKey && !shiftKey) {
        switch (key.toLowerCase()) {
          case 'escape':
            // Close modals, cancel operations
            const closeButtons = document.querySelectorAll('[data-close], [data-cancel]');
            if (closeButtons.length > 0) {
              (closeButtons[closeButtons.length - 1] as HTMLElement).click();
            }
            break;
          case 'enter':
            // Confirm actions
            const confirmButtons = document.querySelectorAll('[data-confirm], [data-submit]');
            if (confirmButtons.length > 0 && document.activeElement !== confirmButtons[0]) {
              event.preventDefault();
              (confirmButtons[0] as HTMLElement).click();
            }
            break;
          case '?':
            // Show help/shortcuts
            event.preventDefault();
            showShortcutsHelp();
            break;
        }
      }

      // Shift + Key shortcuts
      if (shiftKey && !isCtrlOrCmd && !altKey) {
        switch (key.toLowerCase()) {
          case 'p':
            event.preventDefault();
            // Print current page
            window.print();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location.pathname]);
};

// Show keyboard shortcuts help
const showShortcutsHelp = () => {
  const shortcuts = [
    { keys: 'Ctrl+H', action: 'Ir a Dashboard' },
    { keys: 'Ctrl+L', action: 'Ir a Calendario' },
    { keys: 'Ctrl+K', action: 'Búsqueda Global' },
    { keys: 'Ctrl+N', action: 'Nuevo Paciente' },
    { keys: 'Ctrl+B', action: 'Gestión de Reservas' },
    { keys: 'Ctrl+M', action: 'Gestionar Solicitudes' },
    { keys: 'Alt+1-5', action: 'Navegación Rápida' },
    { keys: 'ESC', action: 'Cancelar/Cerrar' },
    { keys: 'Enter', action: 'Confirmar Acción' },
    { keys: 'Shift+P', action: 'Imprimir' },
    { keys: '?', action: 'Mostrar Ayuda' }
  ];

  // Create help modal
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] backdrop-blur-sm';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-2xl font-bold text-slate-900">Atajos de Teclado</h3>
        <button class="text-slate-400 hover:text-slate-600" onclick="this.closest('.fixed').remove()">
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="grid gap-3">
        ${shortcuts.map(shortcut => `
          <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <span class="text-slate-600">${shortcut.action}</span>
            <kbd class="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-800">${shortcut.keys}</kbd>
          </div>
        `).join('')}
      </div>
      <div class="mt-6 text-center">
        <button 
          onclick="this.closest('.fixed').remove()"
          class="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  
  // Close on click outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Close on escape
  const closeOnEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', closeOnEscape);
    }
  };
  document.addEventListener('keydown', closeOnEscape);
};

// Visual feedback for shortcuts
export const addShortcutAttribute = (element: HTMLElement, shortcut: string) => {
  element.setAttribute('title', `Atajo: ${shortcut}`);
  element.setAttribute('data-shortcut', shortcut);
};

// Enhanced focus management
export const useFocusManagement = () => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        // Add focus ring to focused elements
        setTimeout(() => {
          const focusedElement = document.activeElement as HTMLElement;
          if (focusedElement && focusedElement !== document.body) {
            focusedElement.classList.add('focus-visible');
          }
        }, 0);
      }
    };

    const handleClick = () => {
      // Remove focus rings on mouse click
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
  useKeyboardShortcuts,
  useFocusManagement,
  addShortcutAttribute,
};