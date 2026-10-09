
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Home, Calendar, Users, Bell, Menu as MenuIcon, Settings, CreditCard, LogOut, X, Plus, Inbox, LifeBuoy } from 'lucide-react';
import { openProblemReport } from '../lib/support';
import { useAuth } from '../services/authService';
import { useRoleAccess } from './RoleGuard';
import NotificationCenter from './NotificationCenter';
import NewAppointmentModal from './NewAppointmentModal';
import { useNotifications } from '../hooks/useNotifications';
import { sileo } from 'sileo';

interface BottomNavProps {
  activePath: string;
  onSearchOpen?: () => void;
  pendingRequestsCount?: number;
}

const BottomNav: React.FC<BottomNavProps> = React.memo(({ activePath, onSearchOpen, pendingRequestsCount = 0 }) => {
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { isAdmin } = useRoleAccess();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { unreadCount } = useNotifications();

  // Make the menu behave as an accessible modal: Escape closes it, focus stays
  // inside while open, and returns to the element that opened it afterwards.
  useEffect(() => {
    if (!isMenuOpen) return;

    const previousOverflow = document.body.style.overflow;

    const getFocusableElements = () => Array.from<HTMLElement>(
      menuRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) ?? []
    ).filter((element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true');

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsMenuOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        menuRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      if (menuTriggerRef.current?.isConnected) menuTriggerRef.current.focus();
    };
  }, [isMenuOpen]);

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Error signing out:', err);
      sileo.error({ title: 'Error', description: 'No se pudo cerrar sesión. Intenta de nuevo.' });
    }
  };

  const [isNewAptOpen, setIsNewAptOpen] = useState(false);

  // Core tabs: Inicio, Pacientes, [FAB], Agenda, Menú
  const coreItems: Array<{ id: string; icon: React.ElementType; label: string; path?: string; action?: () => void }> = [
    { id: 'dashboard',   icon: Home,     label: 'Inicio',    path: '/' },
    { id: 'patients',    icon: Users,    label: 'Pacientes', path: '/patients' },
    { id: 'calendar',    icon: Calendar, label: 'Agenda',    path: '/calendar' },
    { id: 'menu',        icon: MenuIcon, label: 'Menú',      action: () => setIsMenuOpen(true) },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 safe-bottom z-50">
        <div className="flex items-center justify-around px-2" style={{ height: '64px' }}>
          {coreItems.slice(0, 2).map((item) => {
            const isActive = activePath === item.id;
            return (
              <button
                key={item.id}
                onClick={() => item.action ? item.action() : navigate(item.path!)}
                aria-label={item.label}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all",
                  isActive ? "text-blue-600" : "text-slate-600"
                )}
              >
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "scale-110" : ""} />
                <span className="text-[11px] font-semibold tracking-tight">
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Central FAB — Nueva Cita */}
          <div className="flex flex-col items-center justify-center flex-1 relative" style={{ marginTop: '-20px' }}>
            {/* Solicitudes badge sits above FAB when there are pending requests */}
            {pendingRequestsCount > 0 && (
              <button
                onClick={() => navigate('/booking/manage')}
                className="absolute -top-2 right-1 bg-amber-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shadow-sm border-2 border-white"
                aria-label={`${pendingRequestsCount} solicitudes`}
              >
                {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
              </button>
            )}
            <button
              onClick={() => setIsNewAptOpen(true)}
              aria-label="Nueva Cita"
              className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-[var(--shadow-md)] active:scale-95 transition-all"
            >
              <Plus size={26} strokeWidth={2.5} />
            </button>
            <span className="text-[11px] font-semibold text-slate-600 mt-0.5">Cita</span>
          </div>

          {coreItems.slice(2).map((item) => {
            const isActive = activePath === item.id || (item.id === 'menu' && isMenuOpen);
            return (
              <button
                key={item.id}
                ref={item.id === 'menu' ? menuTriggerRef : undefined}
                onClick={() => item.action ? item.action() : navigate(item.path!)}
                aria-label={item.label}
                aria-expanded={item.id === 'menu' ? isMenuOpen : undefined}
                aria-controls={item.id === 'menu' ? 'mobile-menu-dialog' : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all",
                  isActive ? "text-blue-600" : "text-slate-600"
                )}
              >
                <div className="relative">
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "scale-110" : ""} />
                  {item.id === 'menu' && (unreadCount > 0 || pendingRequestsCount > 0) && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
                  )}
                </div>
                <span className="text-[11px] font-semibold tracking-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* New Appointment Modal */}
      <NewAppointmentModal isOpen={isNewAptOpen} onClose={() => setIsNewAptOpen(false)} />
      
      {/* Mobile Bottom Sheet Menu */}
        {isMenuOpen && (
          <>
            <div 
              onClick={() => setIsMenuOpen(false)}
              aria-hidden="true"
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[50] md:hidden animate-in fade-in duration-200"
            />
            <div
              id="mobile-menu-dialog"
              ref={menuRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-menu-title"
              tabIndex={-1}
              className="md:hidden fixed left-2 right-2 bg-white rounded-[var(--radius-xl)] z-[60] shadow-[var(--shadow-lg)] animate-in slide-in-from-bottom-12 duration-300 flex flex-col overflow-hidden"
              style={{
                bottom: 'calc(64px + env(safe-area-inset-bottom) + 8px)',
                maxHeight: 'calc(100dvh - 64px - env(safe-area-inset-bottom) - 16px)',
              }}
            >
              <div className="flex flex-none items-center justify-between bg-white px-5 py-3 border-b border-slate-100 z-10">
                  <h3 id="mobile-menu-title" className="font-bold text-slate-900 text-lg">Menú</h3>
                  <button 
                    ref={closeButtonRef}
                    onClick={() => setIsMenuOpen(false)}
                    className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                    aria-label="Cerrar menú"
                  >
                    <X size={18} />
                  </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3">
                <div className="space-y-1">
                  {/* Solicitudes shortcut — always accessible from menu */}
                  <button
                    onClick={() => { setIsMenuOpen(false); navigate('/booking/manage'); }}
                    className="w-full flex items-center gap-3 p-3.5 rounded-[var(--radius-lg)] hover:bg-amber-50 active:bg-amber-100 transition-colors text-left"
                  >
                    <div className="w-11 h-11 rounded-[var(--radius-md)] bg-amber-50 flex items-center justify-center text-amber-600 relative">
                      <Inbox size={20} />
                      {pendingRequestsCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                          {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-slate-700 text-[15px] flex-1">Solicitudes de Cita</span>
                    {pendingRequestsCount > 0 && (
                      <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                        {pendingRequestsCount} pendiente{pendingRequestsCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </button>

                  {/* Notification entry in mobile menu */}
                  <div className="relative">
                    <button
                      onClick={() => setIsNotifOpen((o) => !o)}
                      className="w-full flex items-center gap-3 p-3.5 rounded-[var(--radius-lg)] hover:bg-blue-50 active:bg-blue-100 transition-colors text-left"
                    >
                      <div className="w-11 h-11 rounded-[var(--radius-md)] bg-blue-50 flex items-center justify-center text-blue-600 relative">
                        <Bell size={20} />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-slate-700 text-[15px] flex-1">Notificaciones</span>
                      {unreadCount > 0 && (
                        <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                          {unreadCount} nueva{unreadCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </button>
                    {/* Inline notification panel */}
                    {isNotifOpen && (
                      <div className="mt-1">
                        <NotificationCenter compact />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => { setIsMenuOpen(false); navigate('/settings'); }}
                    className="w-full flex items-center gap-3 p-3.5 rounded-[var(--radius-lg)] hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
                  >
                    <div className="w-11 h-11 rounded-[var(--radius-md)] bg-slate-100 flex items-center justify-center text-slate-600">
                      <Settings size={20} />
                    </div>
                    <span className="font-bold text-slate-700 text-[15px]">Ajustes</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => { setIsMenuOpen(false); navigate('/subscription'); }}
                      className="w-full flex items-center gap-3 p-3.5 rounded-[var(--radius-lg)] hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
                    >
                      <div className="w-11 h-11 rounded-[var(--radius-md)] bg-blue-50 flex items-center justify-center text-blue-600">
                        <CreditCard size={20} />
                      </div>
                      <span className="font-bold text-slate-700 text-[15px]">Plan y Facturación</span>
                    </button>
                  )}

                  <button
                    onClick={() => { setIsMenuOpen(false); openProblemReport({ doctorName: profile?.full_name, clinicName: profile?.clinic_name }); }}
                    className="w-full flex items-center gap-3 p-3.5 rounded-[var(--radius-lg)] hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
                  >
                    <div className="w-11 h-11 rounded-[var(--radius-md)] bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <LifeBuoy size={20} />
                    </div>
                    <span className="font-bold text-slate-700 text-[15px]">Reportar problema</span>
                  </button>

                  <div className="h-px bg-slate-100 my-2 mx-3" />

                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 p-3.5 rounded-[var(--radius-lg)] hover:bg-red-50 active:bg-red-100 transition-colors text-left"
                  >
                    <div className="w-11 h-11 rounded-[var(--radius-md)] bg-red-50 flex items-center justify-center text-red-600">
                      <LogOut size={20} />
                    </div>
                    <span className="font-bold text-red-600 text-[15px]">Cerrar sesión</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
    </>
  );
});

BottomNav.displayName = 'BottomNav';

export default BottomNav;
