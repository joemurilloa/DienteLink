
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { LayoutDashboard, Users, Calendar as CalendarIcon, Settings, ChevronRight, Bell } from 'lucide-react';
import { useAuth } from '../services/authService';

interface SidebarProps {
  activePath: string;
  pendingRequestsCount?: number;
}

const Sidebar: React.FC<SidebarProps> = React.memo(({ activePath, pendingRequestsCount = 0 }) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const doctorName = profile?.full_name || 'Doctor';
  const doctorRole = profile?.role || 'Odontólogo';
  const doctorInitials = doctorName.split(' ').filter(w => w.length > 0).map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'DR';

  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { id: 'patients', label: 'Pacientes', icon: Users, path: '/patients' },
    { id: 'calendar', label: 'Calendario', icon: CalendarIcon, path: '/calendar' },
    { id: 'solicitudes', label: 'Solicitudes', icon: Bell, path: '/booking/manage', badge: pendingRequestsCount },
    { id: 'settings', label: 'Ajustes', icon: Settings, path: '/settings' },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[280px] h-full sidebar-dark p-6 relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -ml-24 -mt-24 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/8 rounded-full blur-3xl -mr-16 -mb-16 pointer-events-none" />

      {/* Logo */}
      <div className="flex items-center gap-3.5 mb-12 px-3 cursor-pointer group relative z-10" onClick={() => navigate('/')}>
        <div className="w-11 h-11 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform duration-300">
          🦷
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-white tracking-tight leading-none">DienteLink</h1>
          <p className="text-[10px] font-semibold text-blue-400/80 uppercase tracking-widest mt-0.5">Gestión Dental</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 relative z-10">
        {items.map((item) => {
          const isActive = activePath === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm tracking-tight relative group",
                isActive
                  ? "bg-white/10 text-white shadow-lg shadow-black/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              )}
            >
              <div className="flex items-center gap-3">
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-400 rounded-full" />
                )}
                <item.icon size={18} strokeWidth={isActive ? 2.5 : 1.8} className={cn("transition-colors", isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
                <span>{item.label}</span>
                {'badge' in item && (item as any).badge > 0 && (
                  <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {(item as any).badge > 9 ? '9+' : (item as any).badge}
                  </span>
                )}
              </div>
              {!isActive && !('badge' in item && (item as any).badge > 0) && <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />}
            </button>
          );
        })}
      </nav>

      {/* Doctor Profile */}
      <div className="relative z-10 mt-auto">
        <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/settings')}>
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center ring-2 ring-blue-500/30">
                <span className="text-white font-bold text-xs">{doctorInitials}</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-400 border-2 border-slate-900 rounded-full" />
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-bold text-white truncate leading-tight">{doctorName}</p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider leading-tight mt-0.5">{doctorRole}</p>
            </div>
            <Settings size={14} className="text-slate-600 group-hover:text-slate-400 group-hover:rotate-90 transition-all duration-300" />
          </div>
        </div>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
