
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { LayoutDashboard, Calendar, Users, Settings } from 'lucide-react';

interface BottomNavProps {
  activePath: string;
}

const BottomNav: React.FC<BottomNavProps> = React.memo(({ activePath }) => {
  const navigate = useNavigate();
  const items = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Inicio', path: '/' },
    { id: 'calendar', icon: Calendar, label: 'Agenda', path: '/calendar' },
    { id: 'patients', icon: Users, label: 'Pacientes', path: '/patients', isCenter: true },
    { id: 'settings', icon: Settings, label: 'Ajustes', path: '/settings' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 rounded-t-2xl safe-bottom z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-around h-18 px-4">
        {items.map((item) => {
          const isActive = activePath === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center transition-all flex-1 h-full tap-effect relative py-3",
                item.isCenter ? "z-10" : "",
                isActive ? "text-teal-600" : "text-slate-300"
              )}
            >
              {item.isCenter ? (
                <div className="relative -top-5">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg border-4 border-white active:scale-90 transition-all",
                    isActive ? "bg-teal-600 shadow-teal-500/30" : "bg-slate-800 shadow-slate-800/20"
                  )}>
                    <item.icon size={24} strokeWidth={2.5} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center group">
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.8} className={cn("mb-1 transition-transform", isActive ? "scale-110" : "group-hover:scale-105")} />
                  <span className={cn("text-[9px] uppercase tracking-widest font-bold transition-opacity", isActive ? "opacity-100" : "opacity-40")}>{item.label}</span>
                  {isActive && (
                    <div className="w-1 h-1 bg-teal-600 rounded-full mt-0.5" />
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
