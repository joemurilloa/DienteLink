
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn, getInitials } from '../lib/utils';
import { Home, Users, Calendar as CalendarIcon, Settings, Bell, Menu, CreditCard, LogOut } from 'lucide-react';
import { useAuth } from '../services/authService';
import { useRoleAccess } from './RoleGuard';
import NotificationCenter from './NotificationCenter';
import { sileo } from 'sileo';

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
  const { profile, signOut } = useAuth();
  const doctorName = profile?.full_name || 'Doctor';
  const doctorRole = profile?.role || 'owner';
  const doctorInitials = getInitials(doctorName, 'DR');
  const { canViewFinancial, isAdmin, role: activeRole } = useRoleAccess();

  const ROLE_DISPLAY: Record<string, { label: string; color: string }> = {
    owner:        { label: 'Propietario',       color: 'text-indigo-600' },
    doctor:       { label: 'Doctor',            color: 'text-indigo-600' },
    admin:        { label: 'Administrador',     color: 'text-violet-600' },
    assistant:    { label: 'Asistente Clínico', color: 'text-emerald-600' },
    receptionist: { label: 'Recepcionista',     color: 'text-sky-600' },
  };
  const roleDisplay = ROLE_DISPLAY[activeRole] || { label: activeRole, color: 'text-slate-500' };

  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setIsDropdownOpen(false);
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Error signing out:', err);
      sileo.error({ title: 'Error', description: 'No se pudo cerrar sesión. Intenta de nuevo.' });
    }
  };

  const items: { id: string; label: string; icon: React.FC<any>; path: string; badge?: number; allowed: boolean }[] = [
    { id: 'dashboard',   label: 'Inicio',      icon: Home,            path: '/',              allowed: canViewFinancial },
    { id: 'patients',    label: 'Pacientes',   icon: Users,           path: '/patients',       allowed: true },
    { id: 'calendar',    label: 'Calendario',  icon: CalendarIcon,    path: '/calendar',       allowed: true },
    { id: 'solicitudes', label: 'Solicitudes', icon: Bell,            path: '/booking/manage', badge: pendingRequestsCount, allowed: true },
  ].filter(i => i.allowed);

  return (
    <aside className={cn(
      "hidden md:flex flex-col h-full bg-white border-r border-slate-300 p-3 lg:py-6 transition-all duration-300 relative z-40",
      isCollapsed ? "w-[72px]" : "w-[72px] lg:w-[260px] lg:px-4",
      "shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
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
          <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-600 rounded-[12px] flex items-center justify-center text-white text-lg shadow-sm group-hover:shadow-md group-hover:scale-[1.04] transition-all duration-300 flex-shrink-0">
            🦷
          </div>
          <div className={cn("overflow-hidden transition-all duration-300 whitespace-nowrap hidden lg:block", isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>
            <h1 className="text-[15px] font-bold text-slate-900 tracking-tight leading-none">DienteLink</h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Gestión Dental</p>
          </div>
        </div>

        {/* Toggle inside Header */}
        <button 
          onClick={handleToggle}
          className="hidden lg:flex p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
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
                  "min-w-[18px] h-[18px] px-1 text-xs font-bold rounded-full flex items-center justify-center",
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

      {/* Notification Center — desktop */}
      <div className="mt-2 flex justify-center lg:justify-start lg:px-3 py-1">
        <NotificationCenter />
      </div>

      {/* Doctor Profile */}
      <div className="mt-auto pt-4 border-t border-slate-300 relative" ref={dropdownRef}>
        {isDropdownOpen && (
            <div
              className={cn(
                "absolute bottom-full mb-2 bg-white/90 backdrop-blur-md border border-slate-300/50 rounded-2xl p-1 z-50 flex flex-col gap-0.5 min-w-[190px]",
                "shadow-[0_12px_36px_-6px_rgba(0,0,0,0.08),_0_4px_12px_-2px_rgba(0,0,0,0.03)]",
                "animate-in slide-in-from-bottom-2 fade-in duration-200",
                isCollapsed ? "left-0" : "left-0 right-0 lg:left-3 lg:right-3"
              )}
            >
              {/* iOS-style header when collapsed */}
              {isCollapsed && (
                <div className="px-3 py-2 border-b border-slate-300/60 mb-1">
                  <p className="text-sm font-bold text-slate-800 truncate leading-none">{doctorName}</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1 leading-none">{doctorRole}</p>
                </div>
              )}
              
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold text-slate-700 hover:bg-slate-100/60 active:bg-slate-200/40 transition-colors duration-200 text-left"
              >
                <Settings size={15} className="text-slate-500" />
                <span>Ajustes</span>
              </button>

              <div className="h-px bg-slate-100/80 my-1" />

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold text-red-600 hover:bg-red-50/50 active:bg-red-100/30 transition-colors duration-200 text-left"
              >
                <LogOut size={15} className="text-red-500" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}

        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-slate-100/80 active:bg-slate-200/50 transition-all group",
            isCollapsed ? "justify-center px-0" : "justify-center lg:justify-start lg:px-3 lg:py-2.5",
            isDropdownOpen && "bg-slate-100/80"
          )}
          onClick={() => setIsDropdownOpen(prev => !prev)}
        >
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300">
              <span className="text-white font-semibold text-xs">{doctorInitials}</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
          </div>
          <div className={cn("overflow-hidden flex-1 transition-all duration-300 hidden lg:block", isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>
            <p className="text-[13px] font-bold text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors duration-200">{doctorName}</p>
            <p className={`text-[11px] font-bold uppercase tracking-wider leading-tight mt-0.5 ${roleDisplay.color}`}>
              {roleDisplay.label}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
