
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Home, Calendar, Users, Bell, Menu as MenuIcon, Settings, CreditCard, LogOut, X } from 'lucide-react';
import { useAuth } from '../services/authService';
import { useRoleAccess } from './RoleGuard';
import NotificationCenter from './NotificationCenter';
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

  const items: Array<{
    id: string;
    icon: React.ElementType;
    label: string;
    path?: string;
    action?: () => void;
  }> = [
    { id: 'dashboard',   icon: Home,            label: 'Inicio',      path: '/' },
    { id: 'patients',    icon: Users,           label: 'Pacientes',   path: '/patients' },
    { id: 'calendar',    icon: Calendar,        label: 'Agenda',      path: '/calendar' },
    { id: 'solicitudes', icon: Bell,            label: 'Solicitudes', path: '/booking/manage' },
    { id: 'menu',        icon: MenuIcon,        label: 'Menú',        action: () => setIsMenuOpen(true) },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-300 rounded-t-2xl safe-bottom z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-around h-18 px-4">
        {items.map((item) => {
          const isActive = activePath === item.id;
          return (
            <button
              key={item.id}
              onClick={() => item.action ? item.action() : navigate(item.path)}
              aria-label={item.label}
              className={cn(
                "flex flex-col items-center justify-center transition-all flex-1 h-full tap-effect py-2",
                isActive || (item.id === 'menu' && isMenuOpen) ? "text-blue-600" : "text-slate-500"
              )}
            >
              <div className="flex flex-col items-center group relative">
                <item.icon 
                  size={22} 
                  strokeWidth={isActive || (item.id === 'menu' && isMenuOpen) ? 2.5 : 2} 
                  className={cn("mb-1 transition-transform", (isActive || (item.id === 'menu' && isMenuOpen)) ? "scale-110" : "active:scale-95")} 
                />
                {item.id === 'solicitudes' && pendingRequestsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                  </span>
                )}
                <span className={cn(
                  "text-xs font-semibold transition-opacity tracking-tight", 
                  isActive || (item.id === 'menu' && isMenuOpen) ? "opacity-100" : "opacity-60"
                )}>
                  {item.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
      
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
