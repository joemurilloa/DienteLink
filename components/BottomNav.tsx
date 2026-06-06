
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { LayoutDashboard, Calendar, Users, Bell, Menu as MenuIcon, Settings, CreditCard, LogOut, X } from 'lucide-react';
import { useAuth } from '../services/authService';
import { useRoleAccess } from './RoleGuard';
import { motion, AnimatePresence } from 'framer-motion';

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
  const menuRef = useRef<HTMLDivElement>(null);

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
    }
  };

  const items: Array<{
    id: string;
    icon: React.ElementType;
    label: string;
    path?: string;
    action?: () => void;
  }> = [
    { id: 'dashboard',   icon: LayoutDashboard, label: 'Inicio',      path: '/' },
    { id: 'patients',    icon: Users,           label: 'Pacientes',   path: '/patients' },
    { id: 'calendar',    icon: Calendar,        label: 'Agenda',      path: '/calendar' },
    { id: 'solicitudes', icon: Bell,            label: 'Solicitudes', path: '/booking/manage' },
    { id: 'menu',        icon: MenuIcon,        label: 'Menú',        action: () => setIsMenuOpen(true) },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 rounded-t-2xl safe-bottom z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
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
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                  </span>
                )}
                <span className={cn(
                  "text-[10px] font-semibold transition-opacity tracking-tight", 
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
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[55]"
            />
            <motion.div
              ref={menuRef}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="md:hidden fixed bottom-[72px] left-2 right-2 bg-white rounded-3xl p-2 z-[60] shadow-[0_10px_40px_rgba(0,0,0,0.2)]"
            >
              <div className="p-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 text-lg ml-2">Menú</h3>
                  <button 
                    onClick={() => setIsMenuOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                  >
                    <X size={18} />
                  </button>
                </div>
                
                <div className="space-y-1">
                  <button
                    onClick={() => { setIsMenuOpen(false); navigate('/settings'); }}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                      <Settings size={20} />
                    </div>
                    <span className="font-bold text-slate-700 text-[15px]">Ajustes</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => { setIsMenuOpen(false); navigate('/billing'); }}
                      className="w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
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
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                      <LogOut size={20} />
                    </div>
                    <span className="font-bold text-red-600 text-[15px]">Cerrar sesión</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
});

BottomNav.displayName = 'BottomNav';

export default BottomNav;
