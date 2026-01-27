
import React from 'react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activePath: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activePath }) => {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'patients', label: 'Patients', icon: '👥' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 h-full bg-white border-r border-slate-100 p-6">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl">
          ✚
        </div>
        <h1 className="text-xl font-bold text-slate-900">MedPulse</h1>
      </div>

      <nav className="flex-1 space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium",
              activePath === item.id 
                ? "bg-blue-50 text-blue-600" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            )}
          >
            <span className="text-xl">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto p-4 bg-slate-50 rounded-2xl">
        <div className="flex items-center gap-3">
          <img src="https://i.pravatar.cc/150?u=dr-smith" alt="Dr. Smith" className="w-10 h-10 rounded-full border border-white" />
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-slate-800 truncate">Dr. Smith</p>
            <p className="text-xs text-slate-500 truncate">Cardiologist</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
