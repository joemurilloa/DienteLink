
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

interface SidebarProps {
  activePath: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activePath }) => {
  const navigate = useNavigate();
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/' },
    { id: 'patients', label: 'Dental Chart', icon: '🦷', path: '/dental' },
    { id: 'ai', label: 'IA Assistant', icon: '✨', path: '/ai' },
    { id: 'calendar', label: 'Calendario', icon: '📅', path: '/' },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-72 h-full bg-white/50 backdrop-blur-xl border-r border-slate-200/50 p-8">
      <div className="flex items-center gap-4 mb-16 px-2 cursor-pointer group" onClick={() => navigate('/')}>
        <div className="w-12 h-12 bg-blue-600 rounded-[18px] flex items-center justify-center text-white text-2xl shadow-[0_15px_30px_rgba(59,130,246,0.3)] group-hover:scale-110 transition-transform">
          ✚
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tighter">MedPulse</h1>
      </div>

      <nav className="flex-1 space-y-4">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={cn(
              "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 font-bold text-sm tracking-tight",
              activePath === item.id 
                ? "bg-white text-blue-600 shadow-xl shadow-slate-200/50 translate-x-1" 
                : "text-slate-400 hover:text-slate-900 hover:bg-white/50"
            )}
          >
            <span className="text-xl">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto glass-panel p-5 rounded-[28px] border-white/60">
        <div className="flex items-center gap-4">
          <img src="https://i.pravatar.cc/150?u=dr-smith" alt="Dr. Smith" className="w-12 h-12 rounded-xl shadow-md" />
          <div className="overflow-hidden">
            <p className="text-sm font-extrabold text-slate-900 truncate tracking-tight">Dr. Smith</p>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Cardiólogo</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
