import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppointmentCard from '../AppointmentCard';
import GlobalSearch from '../GlobalSearch';
import NewAppointmentModal from '../NewAppointmentModal';

import { bookingService } from '../../services/bookingService';
import { useAppointments, useAppointmentMutations } from '../../hooks/useAppointments';
import { usePatients } from '../../hooks/usePatients';
import { useAuth } from '../../services/authService';
import { Appointment, ReminderStatus, AppointmentRequest } from '../../types';
import { cn, getLocalISODate } from '../../lib/utils';
import { Search, Plus, Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import { useWelcomeTip, useDashboardTip } from '../ContextualTips';
import { useNotifications } from '../../hooks/useNotifications';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

// ── Stat Pill ──────────────────────────────────────────────────────────────────
const StatPill: React.FC<{ label: string; value: string | number; sub?: string }> = ({ label, value, sub }) => (
  <div className="card-premium flex flex-col px-4 sm:px-5 py-3.5 sm:py-4 gap-1">
    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
    <div className="flex items-baseline gap-1.5">
      <span className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums leading-none tracking-tight">{value}</span>
      {sub && <span className="text-xs text-slate-400 font-medium hidden sm:inline">{sub}</span>}
    </div>
  </div>
);

// ── Section Header ─────────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ title: string; action?: { label: string; onClick: () => void } }> = ({ title, action }) => (
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-slate-400">{title}</h2>
    {action && (
      <button
        onClick={action.onClick}
        className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-150 flex items-center gap-1 group cursor-pointer"
      >
        {action.label}
        <ArrowRight size={13} className="transition-transform duration-150 group-hover:translate-x-0.5" />
      </button>
    )}
  </div>
);

// ── Main Inicio / Home ────────────────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const doctorName = profile?.full_name || 'Doctor';

  const { data: allAppointments = [] } = useAppointments();
  const { updateAppointment } = useAppointmentMutations();
  const { data: allPatients = [] } = usePatients();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNewAptOpen, setIsNewAptOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<AppointmentRequest[]>([]);
  const navigate = useNavigate();

  useWelcomeTip();
  useDashboardTip();

  const { addNotification } = useNotifications();

  // Upcoming appointment notifications (≤30 min)
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const todayStr = getLocalISODate(now);
      allAppointments
        .filter(a => a.date === todayStr && a.status !== 'Eliminada' && a.status !== 'Completada')
        .forEach(a => {
          const [h, m] = a.time.split(':').map(Number);
          const aptTime = new Date();
          aptTime.setHours(h, m, 0, 0);
          const diffMin = (aptTime.getTime() - now.getTime()) / 60000;
          if (diffMin >= 0 && diffMin <= 30) {
            addNotification(
              'appointment_soon',
              `Cita en ${Math.round(diffMin)} min`,
              `${a.patientName} — ${a.type} a las ${a.time}`,
              '/calendar',
              `soon-${a.id}-${todayStr}`,
            );
          }
        });
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [allAppointments, addNotification]);

  const today = useMemo(() => getLocalISODate(new Date()), []);

  // Stats
  const todayCount = useMemo(
    () => allAppointments.filter(a => a.date === today && a.status !== 'Eliminada').length,
    [allAppointments, today]
  );
  const pendingCount = useMemo(
    () => allAppointments.filter(a => a.date === today && a.status === 'Programada').length,
    [allAppointments, today]
  );

  const { groupedAppointments } = useMemo(() => {
    const relevant = allAppointments
      .filter(a => {
        if (a.status === 'Eliminada') return false;
        if (a.date < today) return false;
        if (a.status === 'Completada' && a.date !== today) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

    const groupedMap: Record<string, typeof relevant> = {};
    const addToGroup = (lbl: string, apt: any) => {
      if (!groupedMap[lbl]) groupedMap[lbl] = [];
      groupedMap[lbl].push(apt);
    };

    relevant.forEach(apt => {
      const dateObj = new Date(apt.date + 'T12:00:00');
      const todayObj = new Date(today + 'T12:00:00');
      const diffDays = Math.round((dateObj.getTime() - todayObj.getTime()) / (1000 * 3600 * 24));
      if (apt.status === 'Completada') {
        addToGroup('Completadas Hoy', apt);
      } else if (diffDays === 0) {
        addToGroup('Hoy', apt);
      } else if (diffDays === 1) {
        addToGroup('Mañana', apt);
      } else if (diffDays < 7) {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        addToGroup(`El ${days[dateObj.getDay()]}`, apt);
      } else if (diffDays < 14) {
        addToGroup('Sig. Semana', apt);
      } else {
        addToGroup('Más adelante', apt);
      }
    });

    const labelOrder = ['Hoy', 'Mañana'];
    ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].forEach(d => labelOrder.push(`El ${d}`));
    labelOrder.push('Sig. Semana', 'Más adelante', 'Completadas Hoy');

    const groups: { label: string; items: typeof relevant }[] = [];
    labelOrder.forEach(lbl => {
      if (groupedMap[lbl]?.length > 0) groups.push({ label: lbl, items: groupedMap[lbl] });
    });

    return { groupedAppointments: groups };
  }, [allAppointments, today]);

  const loadPendingRequests = useCallback(async () => {
    try { await bookingService.refreshRequests(); } catch (e) {}
    setPendingRequests(bookingService.getPendingRequests());
  }, []);

  useEffect(() => {
    loadPendingRequests();
    const handleNewRequest = (event: CustomEvent) => setPendingRequests(prev => [event.detail, ...prev]);
    window.addEventListener('newAppointmentRequest', handleNewRequest as EventListener);
    return () => window.removeEventListener('newAppointmentRequest', handleNewRequest as EventListener);
  }, [loadPendingRequests]);

  const handleReminderStatusUpdate = useCallback((id: string, status: ReminderStatus) => {
    const apt = allAppointments.find(a => a.id === id);
    if (!apt) return;
    updateAppointment.mutate({ ...apt, reminderStatus: status });
  }, [allAppointments, updateAppointment]);

  const todayDateStr = new Date().toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' });
  const firstName = doctorName.replace(/^Dr\.?\s*/i, '').split(' ')[0];

  return (
    <div className="flex-1 h-full overflow-y-auto hide-scrollbar bg-[#f5f7fa]">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8 flex flex-col gap-7 pb-28 md:pb-12">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium text-slate-400 capitalize mb-1 tracking-wide">{todayDateStr}</p>
            <h1 className="text-[26px] sm:text-[32px] font-bold text-slate-900 tracking-tight leading-tight">
              {getGreeting()}, {firstName}.
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2.5 px-3.5 sm:px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:border-blue-300 hover:text-slate-800 transition-all duration-200 ease-out active:scale-[0.97] shadow-sm cursor-pointer group"
            >
              <Search size={15} className="flex-shrink-0 text-slate-400 group-hover:text-blue-500 transition-colors" />
              <span className="text-[13px] font-medium hidden sm:inline w-36 text-left">Buscar paciente...</span>
            </button>

            {/* Nueva Cita */}
            <button
              onClick={() => setIsNewAptOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-semibold text-[13px] transition-all duration-200 ease-out active:scale-[0.97] shadow-sm shadow-blue-500/25 whitespace-nowrap cursor-pointer hover:shadow-md hover:shadow-blue-500/30"
            >
              <Plus size={15} strokeWidth={2.5} />
              Nueva Cita
            </button>
          </div>
        </header>

        {/* ── Pending Requests Banner (Clean alert if any) ──────────────── */}
        {pendingRequests.length > 0 && (
          <div
            onClick={() => navigate('/booking/manage')}
            className="flex items-center justify-between p-3.5 sm:p-4 bg-blue-50/80 border border-blue-200 rounded-2xl cursor-pointer hover:bg-blue-100/70 transition-all duration-200 active:scale-[0.99] group shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                {pendingRequests.length}
              </span>
              <div>
                <p className="text-sm font-semibold text-blue-950 leading-tight">
                  {pendingRequests.length === 1 ? '1 solicitud de cita pendiente de confirmación' : `${pendingRequests.length} solicitudes de cita pendientes de confirmación`}
                </p>
                <p className="text-xs text-blue-600 mt-0.5">Recibidas por el enlace de reserva en línea</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-blue-700 group-hover:translate-x-0.5 transition-transform duration-150">
              <span className="hidden sm:inline">Revisar</span>
              <ArrowRight size={13} />
            </div>
          </div>
        )}

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <StatPill label="Citas hoy" value={todayCount} sub="agendadas" />
          <StatPill label="Pendientes" value={pendingCount} sub="por atender" />
          <StatPill label="Pacientes" value={allPatients.length} sub="en total" />
        </div>

        {/* ── Agenda ──────────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3 min-w-0">
          <SectionHeader
            title="Tu Agenda"
            action={{ label: 'Ver calendario completo', onClick: () => navigate('/calendar') }}
          />

          {groupedAppointments.length === 0 ? (
            <div className="card-premium flex flex-col items-center justify-center text-center py-16 px-6">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-3.5 border border-slate-200">
                <CalendarIcon size={24} className="text-slate-400" />
              </div>
              <h3 className="text-[15px] font-semibold text-slate-800 mb-1">Sin citas programadas</h3>
              <p className="text-[13px] text-slate-400 mb-5 max-w-[240px]">No hay citas pendientes para hoy. ¡Todo despejado!</p>
              <button
                onClick={() => setIsNewAptOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-semibold transition-all duration-200 ease-out active:scale-[0.97] shadow-sm cursor-pointer"
              >
                + Programar Cita
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedAppointments.map(group => (
                <div key={group.label}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-3 px-1">
                    {group.label}
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {group.items.map(apt => (
                      <AppointmentCard
                        key={apt.id}
                        appointment={apt}
                        showDate={group.label === 'Sig. Semana' || group.label === 'Más adelante'}
                        onReminderSent={handleReminderStatusUpdate}
                        onNavigateToPatient={(a) => {
                          if (a.patientId) navigate(`/patient/${a.patientId}`);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <NewAppointmentModal isOpen={isNewAptOpen} onClose={() => setIsNewAptOpen(false)} />
    </div>
  );
};

export default Dashboard;
