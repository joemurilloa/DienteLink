
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { LayoutDashboard, Users, Calendar as CalendarIcon, Settings, ChevronRight } from 'lucide-react';

interface SidebarProps {
  activePath: string;
}

const Sidebar: React.FC<SidebarProps> = React.memo(({ activePath }) => {
  const navigate = useNavigate();
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { id: 'patients', label: 'Pacientes', icon: Users, path: '/patients' },
    { id: 'calendar', label: 'Calendario', icon: CalendarIcon, path: '/calendar' },
    { id: 'settings', label: 'Ajustes', icon: Settings, path: '/settings' },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[280px] h-full sidebar-dark p-6 relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-0 left-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl -ml-24 -mt-24 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/8 rounded-full blur-3xl -mr-16 -mb-16 pointer-events-none" />

      {/* Logo */}
      <div className="flex items-center gap-3.5 mb-12 px-3 cursor-pointer group relative z-10" onClick={() => navigate('/')}>
        <div className="w-11 h-11 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg shadow-teal-500/30 group-hover:scale-105 transition-transform duration-300">
          🦷
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-white tracking-tight leading-none">DienteLink</h1>
          <p className="text-[10px] font-semibold text-teal-400/80 uppercase tracking-widest mt-0.5">Gestión Dental</p>
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
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-teal-400 rounded-full" />
                )}
                <item.icon size={18} strokeWidth={isActive ? 2.5 : 1.8} className={cn("transition-colors", isActive ? "text-teal-400" : "text-slate-500 group-hover:text-slate-300")} />
                <span>{item.label}</span>
              </div>
              {!isActive && <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />}
            </button>
          );
        })}
      </nav>

      {/* Doctor Profile */}
      <div className="relative z-10 mt-auto">
        <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/settings')}>
            <div className="relative">
              <img src="https://i.pravatar.cc/150?u=dr-smith" alt="Dr. Joe" className="w-10 h-10 rounded-xl object-cover ring-2 ring-teal-500/30" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full" />
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-bold text-white truncate leading-tight">Dr. Joe Murillo</p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider leading-tight mt-0.5">Odontólogo</p>
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
