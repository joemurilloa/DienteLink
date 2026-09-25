
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Home, Calendar, Users, Bell, Menu as MenuIcon, Settings, CreditCard, LogOut, X, Plus } from 'lucide-react';
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
  const { signOut } = useAuth();
  const { isAdmin } = useRoleAccess();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { unreadCount } = useNotifications();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 rounded-t-2xl safe-bottom z-50 shadow-[0_-2px_20px_rgba(0,0,0,0.06)]">
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
                  isActive ? "text-blue-600" : "text-slate-500"
                )}
              >
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "scale-110" : ""} />
                <span className={cn("text-[10px] font-semibold tracking-tight", isActive ? "opacity-100" : "opacity-60")}>
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
                className="absolute -top-2 right-1 bg-amber-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shadow-sm border-2 border-white"
                aria-label={`${pendingRequestsCount} solicitudes`}
              >
                {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
              </button>
            )}
            <button
              onClick={() => setIsNewAptOpen(true)}
              aria-label="Nueva Cita"
              className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
            >
              <Plus size={26} strokeWidth={2.5} />
            </button>
            <span className="text-[10px] font-semibold text-slate-500 mt-0.5">Nueva</span>
          </div>

          {coreItems.slice(2).map((item) => {
            const isActive = activePath === item.id || (item.id === 'menu' && isMenuOpen);
            return (
              <button
                key={item.id}
                onClick={() => item.action ? item.action() : navigate(item.path!)}
                aria-label={item.label}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all",
                  isActive ? "text-blue-600" : "text-slate-500"
                )}
              >
                <div className="relative">
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "scale-110" : ""} />
                  {item.id === 'menu' && (unreadCount > 0 || pendingRequestsCount > 0) && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
                  )}
                </div>
                <span className={cn("text-[10px] font-semibold tracking-tight", isActive ? "opacity-100" : "opacity-60")}>
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
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[50] md:hidden animate-in fade-in duration-200"
            />
            <div
              ref={menuRef}
              className="md:hidden fixed bottom-[72px] left-2 right-2 bg-white rounded-3xl p-2 z-[60] shadow-[0_10px_40px_rgba(0,0,0,0.2)] animate-in slide-in-from-bottom-12 duration-300"
            >
              <div className="p-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 text-lg ml-2">Menú</h3>
                  <button 
                    onClick={() => setIsMenuOpen(false)}
                    className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                  >
                    <X size={18} />
                  </button>
                </div>
                
                <div className="space-y-1">
                  {/* Solicitudes shortcut — always accessible from menu */}
                  <button
                    onClick={() => { setIsMenuOpen(false); navigate('/booking/manage'); }}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-amber-50 active:bg-amber-100 transition-colors text-left"
                  >
                    <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 relative">
                      <Bell size={20} />
                      {pendingRequestsCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
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
                      className="w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-blue-50 active:bg-blue-100 transition-colors text-left"
                    >
                      <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 relative">
                        <Bell size={20} />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
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
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
                  >
                    <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                      <Settings size={20} />
                    </div>
                    <span className="font-bold text-slate-700 text-[15px]">Ajustes</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => { setIsMenuOpen(false); navigate('/billing'); }}
                      className="w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
                    >
                      <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <CreditCard size={20} />
                      </div>
                      <span className="font-bold text-slate-700 text-[15px]">Plan y Facturación</span>
                    </button>
                  )}

                  <div className="h-px bg-slate-100 my-2 mx-3" />

                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-red-50 active:bg-red-100 transition-colors text-left"
                  >
                    <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
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
