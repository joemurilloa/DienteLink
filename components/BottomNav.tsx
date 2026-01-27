
import React from 'react';
import { cn } from '../lib/utils';

interface BottomNavProps {
  activePath: string;
}

const BottomNav: React.FC<BottomNavProps> = ({ activePath }) => {
  const items = [
    { id: 'dashboard', icon: '📊', label: 'Stats' },
    { id: 'patients', icon: '👥', label: 'Patients' },
    { id: 'add', icon: '⊕', label: 'New', isCenter: true },
    { id: 'calendar', icon: '📅', label: 'Events' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass border-t border-slate-200 safe-bottom z-50">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => (
          <button
            key={item.id}
            className={cn(
              "flex flex-col items-center justify-center transition-colors",
              item.isCenter ? "relative -top-3" : "",
              activePath === item.id ? "text-blue-600" : "text-slate-400"
            )}
          >
            {item.isCenter ? (
              <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl shadow-lg shadow-blue-200 active:scale-95 transition-transform">
                {item.icon}
              </div>
            ) : (
              <>
                <span className="text-xl mb-0.5">{item.icon}</span>
                <span className="text-[10px] font-semibold">{item.label}</span>
              </>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
