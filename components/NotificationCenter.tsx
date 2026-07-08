import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Calendar, CreditCard, CheckCheck, Trash2, BookOpen } from 'lucide-react';
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
  if (minutes < 60) return `hace ${minutes} min`;
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${days}d`;
}

const TYPE_CONFIG: Record<NotificationType, { icon: React.ReactNode; color: string; bg: string }> = {
  new_booking: {
    icon: <Calendar size={14} />,
    color: 'text-violet-600',
    bg: 'bg-violet-100',
  },
  appointment_soon: {
    icon: <Bell size={14} />,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
  },
  payment_received: {
    icon: <CreditCard size={14} />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
  },
  system: {
    icon: <BookOpen size={14} />,
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
      layout
      onClick={handleClick}
      className={cn(
        'flex items-start gap-3 p-3.5 rounded-2xl transition-all cursor-pointer select-none',
        notification.read
          ? 'hover:bg-slate-50'
          : 'bg-blue-50/60 hover:bg-blue-50 border border-blue-100/60',
      )}
    >
      {/* Icon */}
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bg, cfg.color)}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-[13px] font-bold leading-tight', notification.read ? 'text-slate-600' : 'text-slate-900')}>
            {notification.title}
          </p>
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap flex-shrink-0 mt-0.5">
            {timeAgo(notification.timestamp)}
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
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

// ─── Main Component ───────────────────────────────────────────────────────────

interface NotificationCenterProps {
  /** If true, renders as a compact icon button for the mobile bottom nav */
  compact?: boolean;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ compact = false }) => {
  const { notifications, unreadCount, markRead, markAllRead, clearAll, addNotification } = useNotifications();
  const { data: appointments } = useAppointments();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

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
        
        // If appointment is within the next 30 minutes, and hasn't passed by more than 15 mins
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
    }, 60000); // Check every minute
    
    // Initial check on mount
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

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [isOpen]);

  const handleNavigate = (path?: string) => {
    setIsOpen(false);
    if (path) navigate(path);
  };

  // ── Trigger button ──────────────────────────────────────────────────────────
  const triggerButton = (
    <button
      onClick={() => setIsOpen((o) => !o)}
      aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
      className={cn(
        'relative flex items-center justify-center transition-all active:scale-95',
        compact
          ? 'w-11 h-11 rounded-full hover:bg-slate-100'
          : 'w-11 h-11 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800',
      )}
    >
      <Bell size={compact ? 22 : 18} strokeWidth={isOpen ? 2.5 : 2} />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );

  // ── Dropdown panel ──────────────────────────────────────────────────────────
  const panel = isOpen && (
        <div
          ref={panelRef}
          className={cn(
            'absolute z-[100] bg-white border border-slate-300/60 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.12)] overflow-hidden',
            compact
              ? 'bottom-full mb-3 left-0 right-0 max-w-[calc(100vw-2rem)] mx-auto w-[360px]'
              : 'top-full mt-2 right-0 w-[360px]',
          )}
          style={{ maxHeight: '480px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-300 bg-white sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-slate-700" />
              <h3 className="font-bold text-slate-900 text-[14px]">Notificaciones</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  title="Marcar todo como leído"
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <CheckCheck size={13} />
                  Todo leído
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  title="Limpiar todo"
                  className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto" style={{ maxHeight: '380px' }}>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                  <Bell size={24} className="text-slate-400" />
                </div>
                <p className="font-bold text-slate-700 text-[14px] mb-1">Todo tranquilo por aquí</p>
                <p className="text-slate-500 text-sm">Las notificaciones de nuevas reservas y recordatorios aparecerán aquí.</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                                  {notifications.map((n) => (
                    <NotificationRow
                      key={n.id}
                      notification={n}
                      onRead={markRead}
                      onNavigate={handleNavigate}
                    />
                  ))}
                              </div>
            )}
          </div>
        </div>
      );

  return (
    <div className="relative">
      {triggerButton}
      {panel}
    </div>
  );
};

export default NotificationCenter;
