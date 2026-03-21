
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn, getInitials } from '../lib/utils';
import { LayoutDashboard, Users, Calendar as CalendarIcon, Settings, Bell, Menu } from 'lucide-react';
import { useAuth } from '../services/authService';

interface SidebarProps {
  activePath: string;
  pendingRequestsCount?: number;
}

const Sidebar: React.FC<SidebarProps> = React.memo(({ activePath, pendingRequestsCount = 0 }) => {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    return localStorage.getItem('dientelink_sidebar_collapsed') === 'true';
  });

  const handleToggle = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('dientelink_sidebar_collapsed', String(next));
  };
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
    <aside className={cn(
      "hidden md:flex flex-col h-full bg-white border-r border-slate-200 p-3 lg:py-6 transition-all duration-300 relative",
      isCollapsed ? "w-[72px]" : "w-[72px] lg:w-[260px] lg:px-4"
    )}>
      {/* Logo & Toggle */}
      <div className={cn(
        "flex items-center mb-10 transition-all",
        isCollapsed ? "justify-center px-0 flex-col gap-4" : "justify-between px-0 lg:px-3"
      )}>
        <div
          className={cn(
            "flex items-center gap-3 cursor-pointer group transition-all",
            isCollapsed ? "justify-center w-full" : "justify-center lg:justify-start"
          )}
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-[12px] flex items-center justify-center text-white text-lg shadow-sm group-hover:shadow-md group-hover:scale-[1.04] transition-all duration-300 flex-shrink-0">
            🦷
          </div>
          <div className={cn("overflow-hidden transition-all duration-300 whitespace-nowrap hidden lg:block", isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>
            <h1 className="text-[15px] font-bold text-slate-900 tracking-tight leading-none">DienteLink</h1>
            <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Gestión Dental</p>
          </div>
        </div>

        {/* Toggle inside Header */}
        <button 
          onClick={handleToggle}
          className="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
          title={isCollapsed ? "Expandir menú" : "Contraer menú"}
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const isActive = activePath === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "w-full flex items-center gap-0 lg:gap-3 py-2.5 rounded-xl transition-all duration-300 text-[13px] font-medium relative group overflow-hidden",
                isCollapsed ? "justify-center px-0" : "justify-center lg:justify-start px-0 lg:px-3",
                isActive
                  ? "shadow-lg shadow-blue-500/30 text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
              )}
              style={isActive ? { backgroundColor: '#2563eb', color: 'white' } : {}}
            >
              <item.icon
                size={18}
                strokeWidth={isActive ? 2.5 : 2}
                className={cn(
                  "flex-shrink-0 transition-colors z-10",
                  isActive ? "text-white" : "text-slate-500 group-hover:text-slate-700"
                )}
              />
              <span className={cn("transition-all duration-300 whitespace-nowrap hidden lg:inline z-10", isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>{item.label}</span>
              
              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-white rounded-r-full animate-in slide-in-from-left duration-300" />
              )}
              {item.badge != null && item.badge > 0 && (
                <span className={cn(
                  "min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center",
                  isCollapsed ? "absolute top-1 right-1" : "hidden lg:flex lg:ml-auto",
                  !isCollapsed && "hidden lg:flex",
                  isActive
                    ? "bg-white/30 text-white"
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
          className={cn(
            "flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-slate-100/80 transition-all group",
            isCollapsed ? "justify-center px-0" : "justify-center lg:justify-start lg:px-3 lg:py-2.5"
          )}
          onClick={() => navigate('/settings')}
        >
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-semibold text-[11px]">{doctorInitials}</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
          </div>
          <div className={cn("overflow-hidden flex-1 transition-all duration-300 hidden lg:block", isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>
            <p className="text-[13px] font-bold text-slate-900 truncate leading-tight">{doctorName}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-tight mt-0.5">{doctorRole}</p>
          </div>
        </div>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
