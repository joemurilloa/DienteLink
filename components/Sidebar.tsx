
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn, getInitials } from '../lib/utils';
import { LayoutDashboard, Users, Calendar as CalendarIcon, Settings, Bell } from 'lucide-react';
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
  const doctorInitials = getInitials(doctorName, 'DR');

  const items: { id: string; label: string; icon: React.FC<any>; path: string; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { id: 'patients', label: 'Pacientes', icon: Users, path: '/patients' },
    { id: 'calendar', label: 'Calendario', icon: CalendarIcon, path: '/calendar' },
    { id: 'solicitudes', label: 'Solicitudes', icon: Bell, path: '/booking/manage', badge: pendingRequestsCount },
    { id: 'settings', label: 'Ajustes', icon: Settings, path: '/settings' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-[72px] lg:w-[260px] h-full bg-white/80 backdrop-blur-xl border-r border-slate-200/60 p-3 lg:px-4 lg:py-6 transition-all">
      {/* Logo */}
      <div
        className="flex items-center gap-3 mb-10 px-0 lg:px-3 cursor-pointer group justify-center lg:justify-start"
        onClick={() => navigate('/')}
      >
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-[12px] flex items-center justify-center text-white text-lg shadow-sm group-hover:shadow-md group-hover:scale-[1.04] transition-all duration-300">
          🦷
        </div>
        <div className="hidden lg:block">
          <h1 className="text-[15px] font-bold text-slate-900 tracking-tight leading-none">DienteLink</h1>
          <p className="text-[10px] font-medium text-slate-400 mt-0.5">Gestión Dental</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const isActive = activePath === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center justify-center lg:justify-start gap-0 lg:gap-3 px-0 lg:px-3 py-2.5 rounded-xl transition-all duration-200 text-[13px] font-medium relative group",
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/80"
              )}
            >
              <item.icon
                size={18}
                strokeWidth={isActive ? 2 : 1.7}
                className={cn(
                  "flex-shrink-0 transition-colors",
                  isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                )}
              />
              <span className="hidden lg:inline">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className={cn(
                  "lg:ml-auto min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-red-500 text-white"
                )}>
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Doctor Profile */}
      <div className="mt-auto pt-4 border-t border-slate-100">
        <div
          className="flex items-center gap-3 p-2 lg:px-3 lg:py-2.5 rounded-xl cursor-pointer hover:bg-slate-100/80 transition-all group justify-center lg:justify-start"
          onClick={() => navigate('/settings')}
        >
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-semibold text-[11px]">{doctorInitials}</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
          </div>
          <div className="overflow-hidden flex-1 hidden lg:block">
            <p className="text-[13px] font-semibold text-slate-900 truncate leading-tight">{doctorName}</p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider leading-tight mt-0.5">{doctorRole}</p>
          </div>
        </div>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
