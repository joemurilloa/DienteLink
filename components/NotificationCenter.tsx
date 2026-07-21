import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Calendar, CreditCard, CheckCheck, Trash2, BookOpen, Check } from 'lucide-react';
import { useNotifications, AppNotification, NotificationType } from '../hooks/useNotifications';
import { useAppointments } from '../hooks/useAppointments';
import { cn } from '../lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

const TYPE_CONFIG: Record<NotificationType, { icon: React.ReactNode; color: string; bg: string }> = {
  new_booking: {
    icon: <Calendar size={15} />,
    color: 'text-violet-600',
    bg: 'bg-violet-100',
  },
  appointment_soon: {
    icon: <Bell size={15} />,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
  },
  payment_received: {
    icon: <CreditCard size={15} />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
  },
  system: {
    icon: <BookOpen size={15} />,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
  },
};

// ─── Single notification row ───────────────────────────────────────────────────

const NotificationRow: React.FC<{
  notification: AppNotification;
  onRead: (id: string) => void;
  onNavigate: (path?: string) => void;
}> = ({ notification, onRead, onNavigate }) => {
  const cfg = TYPE_CONFIG[notification.type];

  const handleClick = () => {
    onRead(notification.id);
    if (notification.actionPath) onNavigate(notification.actionPath);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex items-start gap-3 px-4 py-3 transition-all cursor-pointer select-none border-b border-slate-100 last:border-0',
        notification.read
          ? 'hover:bg-slate-50/80'
          : 'bg-blue-50/40 hover:bg-blue-50/70',
      )}
    >
      {/* Icon */}
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bg, cfg.color)}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-[13px] font-semibold leading-tight truncate', notification.read ? 'text-slate-600' : 'text-slate-900')}>
            {notification.title}
          </p>
          <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap flex-shrink-0 mt-px">
            {timeAgo(notification.timestamp)}
          </span>
        </div>
        <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
          {notification.description}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.read && (
        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
      )}
    </div>
  );
};

// ─── Notification List (shared between modes) ─────────────────────────────────

const NotificationList: React.FC<{
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  onNavigate: (path?: string) => void;
  onClose?: () => void;
}> = ({ notifications, unreadCount, markRead, markAllRead, clearAll, onNavigate, onClose }) => (
  <div className="flex flex-col h-full">
    {/* Header */}
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
      <div className="flex items-center gap-2">
        <Bell size={14} className="text-slate-500" />
        <span className="font-semibold text-slate-900 text-[13px]">Notificaciones</span>
        {unreadCount > 0 && (
          <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full leading-none">
            {unreadCount}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            title="Marcar todo como leído"
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <CheckCheck size={12} />
            Todo leído
          </button>
        )}
        {notifications.length > 0 && (
          <button
            onClick={clearAll}
            title="Limpiar todo"
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={13} />
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>

    {/* List */}
    <div className="overflow-y-auto flex-1">
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-3">
            <Bell size={20} className="text-slate-300" />
          </div>
          <p className="font-semibold text-slate-600 text-[13px] mb-1">Todo tranquilo</p>
          <p className="text-slate-400 text-[12px] leading-relaxed">Las notificaciones aparecerán aquí.</p>
        </div>
      ) : (
        <div>
          {notifications.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              onRead={markRead}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

interface NotificationCenterProps {
  /** If true, renders as inline expandable (for mobile bottom nav) */
  compact?: boolean;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ compact = false }) => {
  const { notifications, unreadCount, markRead, markAllRead, clearAll, addNotification } = useNotifications();
  const { data: appointments } = useAppointments();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  // Poll for upcoming appointments (<= 30 mins)
  useEffect(() => {
    if (!appointments) return;
    const interval = setInterval(() => {
      const now = new Date();
      appointments.forEach((appt) => {
        if (appt.status !== 'Programada') return;
        const apptDateTime = new Date(`${appt.date}T${appt.time}:00`);
        const diffMs = apptDateTime.getTime() - now.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins <= 30 && diffMins >= -15) {
          addNotification(
            'appointment_soon',
            'Cita próxima',
            `${appt.patientName} tiene cita a las ${appt.time}`,
            '/calendar',
            `appt_soon_${appt.id}_${appt.date}`
          );
        }
      });
    }, 60000);
    
    const now = new Date();
    appointments.forEach((appt) => {
      if (appt.status !== 'Programada') return;
      const apptDateTime = new Date(`${appt.date}T${appt.time}:00`);
      const diffMs = apptDateTime.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins <= 30 && diffMins >= -15) {
        addNotification(
          'appointment_soon',
          'Cita próxima',
          `${appt.patientName} tiene cita a las ${appt.time}`,
          '/calendar',
          `appt_soon_${appt.id}_${appt.date}`
        );
      }
    });

    return () => clearInterval(interval);
  }, [appointments, addNotification]);

  // Position the panel based on the trigger button's location
  const updatePanelPosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelWidth = 340;
    const spaceRight = window.innerWidth - rect.right;
    const spaceBelow = window.innerHeight - rect.bottom;

    let left = rect.left;
    // If not enough space to the right, align right edge of panel to right of button
    if (left + panelWidth > window.innerWidth - 16) {
      left = window.innerWidth - panelWidth - 16;
    }
    if (left < 16) left = 16;

    const top = spaceBelow >= 300
      ? rect.bottom + 8
      : rect.top - Math.min(460, rect.top - 16) - 8;

    setPanelStyle({
      position: 'fixed',
      top,
      left,
      width: panelWidth,
      maxHeight: 460,
      zIndex: 9999,
    });
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    updatePanelPosition();
    const handler = (e: MouseEvent | TouchEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    window.addEventListener('scroll', updatePanelPosition, true);
    window.addEventListener('resize', updatePanelPosition);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
      window.removeEventListener('scroll', updatePanelPosition, true);
      window.removeEventListener('resize', updatePanelPosition);
    };
  }, [isOpen]);

  const handleNavigate = (path?: string) => {
    setIsOpen(false);
    if (path) navigate(path);
  };

  // ── COMPACT (mobile BottomNav) — inline panel, no floating ─────────────────
  if (compact) {
    return (
      <div className="w-full">
        <button
          ref={triggerRef}
          onClick={() => setIsOpen((o) => !o)}
          className="w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
        >
          <div className="relative w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="font-bold text-slate-700 text-[15px] flex-1">Notificaciones</span>
          {unreadCount > 0 && (
            <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
              {unreadCount} nueva{unreadCount !== 1 ? 's' : ''}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="mx-1 mb-2 rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            <NotificationList
              notifications={notifications}
              unreadCount={unreadCount}
              markRead={markRead}
              markAllRead={markAllRead}
              clearAll={clearAll}
              onNavigate={handleNavigate}
              onClose={() => setIsOpen(false)}
            />
          </div>
        )}
      </div>
    );
  }

  // ── DESKTOP — fixed-position floating panel ─────────────────────────────────
  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setIsOpen((o) => !o)}
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
        className={cn(
          'relative flex items-center justify-center w-11 h-11 rounded-xl transition-all active:scale-95',
          isOpen
            ? 'bg-slate-100 text-slate-800'
            : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800',
        )}
      >
        <Bell size={18} strokeWidth={isOpen ? 2.5 : 2} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          style={panelStyle}
          className="bg-white border border-slate-200 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <NotificationList
            notifications={notifications}
            unreadCount={unreadCount}
            markRead={markRead}
            markAllRead={markAllRead}
            clearAll={clearAll}
            onNavigate={handleNavigate}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
