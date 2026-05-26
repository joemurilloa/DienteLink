
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { LayoutDashboard, Calendar, Users, Bell, Settings } from 'lucide-react';

interface BottomNavProps {
  activePath: string;
  onSearchOpen?: () => void;
  pendingRequestsCount?: number;
}

const BottomNav: React.FC<BottomNavProps> = React.memo(({ activePath, onSearchOpen, pendingRequestsCount = 0 }) => {
  const navigate = useNavigate();
  const items: Array<{
    id: string;
    icon: React.ElementType;
    label: string;
    path?: string;
    action?: () => void;
    isCenter?: boolean;
  }> = [
    { id: 'dashboard',   icon: LayoutDashboard, label: 'Inicio',      path: '/' },
    { id: 'patients',    icon: Users,           label: 'Pacientes',   path: '/patients' },
    { id: 'calendar',    icon: Calendar,        label: 'Agenda',      path: '/calendar', isCenter: true },
    { id: 'solicitudes', icon: Bell,            label: 'Solicitudes', path: '/booking/manage' },
    { id: 'settings',    icon: Settings,        label: 'Config.',      path: '/settings' },
  ];

  return (
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
                "flex flex-col items-center justify-center transition-all flex-1 h-full tap-effect relative py-3",
                item.isCenter ? "z-10" : "",
                isActive ? "text-blue-600" : "text-slate-500"
              )}
            >
              {item.isCenter ? (
                <div className="relative -top-5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg border-4 border-white active:scale-90 transition-all bg-blue-600 shadow-blue-500/30">
                    <item.icon size={24} strokeWidth={2.5} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center group relative">
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.8} className={cn("mb-1 transition-transform", isActive ? "scale-110" : "group-hover:scale-105")} />
                  {item.id === 'solicitudes' && pendingRequestsCount > 0 && (
                    <span className="absolute -top-1 right-0.5 min-w-[16px] h-4 px-1 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                    </span>
                  )}
                  <span className={cn("text-[9px] uppercase tracking-widest font-bold transition-opacity", isActive ? "opacity-100" : "opacity-40")}>{item.label}</span>
                  {isActive && (
                    <div className="w-1 h-1 bg-blue-600 rounded-full mt-0.5" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
});

BottomNav.displayName = 'BottomNav';

export default BottomNav;
