import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppointmentCard from '../AppointmentCard';
import GlobalSearch from '../GlobalSearch';
import { useRoleAccess } from '../RoleGuard';

import { bookingService } from '../../services/bookingService';
import { useAppointments, useAppointmentMutations } from '../../hooks/useAppointments';
import { usePatients } from '../../hooks/usePatients';
import { useAuth } from '../../services/authService';
import { Appointment, ReminderStatus, AppointmentRequest } from '../../types';
import { cn, formatCurrency, getInitials, getLocalISODate } from '../../lib/utils';
import { Search, Plus, Calendar as CalendarIcon, ArrowUpRight, UserPlus, TrendingUp, Clock, Users, DollarSign, Bell } from 'lucide-react';
import { sileo } from 'sileo';
import { useWelcomeTip, useDashboardTip } from '../ContextualTips';
import { useNotifications } from '../../hooks/useNotifications';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const doctorName = profile?.full_name || 'Doctor';
  const doctorInitials = getInitials(doctorName, 'DR');

  const { data: allAppointments = [] } = useAppointments();
  const { updateAppointment } = useAppointmentMutations();
  const { data: allPatients = [] } = usePatients();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<AppointmentRequest[]>([]);
  const { canViewFinancial, isAdmin } = useRoleAccess();
  const navigate = useNavigate();

  // Contextual tips (show once)
  useWelcomeTip();
  useDashboardTip();

  const { addNotification } = useNotifications();

  // ===== "Cita próxima" notifications — fire when ≤30 min away =====
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

  // ===== Daily Pulse Metrics =====
  const pulseMetrics = useMemo(() => {
    const todayApts = allAppointments.filter(a => a.date === today);
    const totalToday = todayApts.length;
    const totalDebt = allPatients.reduce((totalAcc, p) => {
        const totalBudget = p.budget?.reduce((acc, item) => acc + (item.unitCost * item.quantity), 0) || 0;
        const totalPaid = (p.payments || []).reduce((acc, pay) => acc + pay.amount, 0);
        return totalAcc + Math.max(0, totalBudget - totalPaid);
    }, 0);

    return { totalToday, totalDebt };
  }, [allAppointments, allPatients, today]);

  const { groupedAppointments, isShowingUpcoming } = useMemo(() => {
    const relevant = allAppointments
      .filter(a => {
        if (a.status === 'Eliminada') return false;
        if (a.date < today) return false;
        if (a.status === 'Completada' && a.date !== today) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
      
    const groupedMap: Record<string, typeof relevant> = {};
    
    // Función auxiliar para agrupar
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

    // Definir el orden deseado de las etiquetas
    const labelOrder = ['Hoy', 'Mañana'];
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    days.forEach(d => labelOrder.push(`El ${d}`));
    labelOrder.push('Sig. Semana', 'Más adelante', 'Completadas Hoy');

    const groups: { label: string, items: typeof relevant }[] = [];
    
    labelOrder.forEach(lbl => {
      if (groupedMap[lbl] && groupedMap[lbl].length > 0) {
        groups.push({ label: lbl, items: groupedMap[lbl] });
      }
    });

    return { 
      groupedAppointments: groups, 
      isShowingUpcoming: relevant.some(a => a.date > today && a.status !== 'Completada') 
    };
  }, [allAppointments, today]);

  const loadPendingRequests = useCallback(async () => {
    try { 
      await bookingService.refreshRequests(); 
    } catch (e) {}
    setPendingRequests(bookingService.getPendingRequests());
  }, []);

  useEffect(() => {
    loadPendingRequests();

    const handleNewRequest = (event: CustomEvent) => setPendingRequests(prev => [event.detail, ...prev]);

    window.addEventListener('newAppointmentRequest', handleNewRequest as EventListener);
    return () => {
      window.removeEventListener('newAppointmentRequest', handleNewRequest as EventListener);
    };
  }, [loadPendingRequests]);

  const handleReminderStatusUpdate = useCallback((id: string, status: ReminderStatus) => {
    const apt = allAppointments.find(a => a.id === id);
    if (!apt) return;
    updateAppointment.mutate({ ...apt, reminderStatus: status });
  }, [allAppointments, updateAppointment]);

  const todayDateStr = new Date().toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="flex-1 h-full overflow-y-auto hide-scrollbar pb-32 md:pb-6 page-transition mesh-bg relative flex flex-col">
      <div className="max-w-[1400px] w-full mx-auto p-6 lg:p-8 flex flex-col h-auto gap-6 lg:gap-8">
        
        {/* ===== Header ===== */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 animate-in-up stagger-delay-1 shrink-0">
          <div>
            <p className="text-slate-500 text-[13px] md:text-[15px] font-medium capitalize mb-1">{todayDateStr}</p>
            <h1 className="text-[28px] md:text-[40px] lg:text-[48px] font-semibold text-slate-900 tracking-tight leading-tight">
              {getGreeting()}, <span className="text-slate-900">{doctorName.replace(/^Dr\.?\s*/i, '')}</span>.
            </h1>
          </div>
          
          <div className="flex flex-row md:flex-col lg:flex-row items-stretch md:items-end gap-2 md:gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="bg-white/60 backdrop-blur-xl border border-white shadow-sm flex items-center gap-3 px-4 py-3 md:px-6 md:py-4 rounded-full transition-all hover:bg-white flex-1 md:w-80 active:scale-95 cursor-text group"
            >
              <Search size={16} className="text-slate-500 flex-shrink-0" />
              <span className="text-[14px] font-medium text-slate-500 truncate">Buscar paciente...</span>
            </button>
            <button
              onClick={() => navigate('/calendar?new=true')}
              className="bg-blue-600 border border-blue-500 text-white shadow-sm flex items-center justify-center gap-2 px-4 py-3 md:px-6 md:py-4 rounded-full transition-all hover:bg-blue-700 active:scale-95 font-bold whitespace-nowrap"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span className="text-[14px]">Nueva Cita</span>
            </button>
          </div>
        </header>

        {/* ===== Pulse Metrics ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4 animate-in-up stagger-delay-2 shrink-0">
          <div className="bg-white/60 backdrop-blur-xl border border-white rounded-2xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                <CalendarIcon size={15} className="text-blue-600" />
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hoy</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{pulseMetrics.totalToday}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">citas programadas</p>
          </div>
          <div className="bg-white/60 backdrop-blur-xl border border-white rounded-2xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Users size={15} className="text-emerald-600" />
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pacientes</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{allPatients.length}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">expedientes activos</p>
          </div>
          {canViewFinancial && (
            <div className="bg-white/60 backdrop-blur-xl border border-white rounded-2xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                  <DollarSign size={15} className="text-amber-600" />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Deuda</span>
              </div>
              <p className={cn("text-2xl font-bold", pulseMetrics.totalDebt > 0 ? "text-amber-600" : "text-slate-900")}>{formatCurrency(pulseMetrics.totalDebt)}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">saldo pendiente</p>
            </div>
          )}
          {isAdmin && (
            <div className="bg-white/60 backdrop-blur-xl border border-white rounded-2xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center">
                  <Bell size={15} className="text-violet-600" />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Solicitudes</span>
              </div>
              <p className={cn("text-2xl font-bold", pendingRequests.length > 0 ? "text-violet-600" : "text-slate-900")}>{pendingRequests.length}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">reservas pendientes</p>
            </div>
          )}
        </div>

        {/* ===== MAIN CONTENT ===== */}
        <div className="flex-1 flex flex-col">
          
          {/* Agenda */}
          <div className="bg-white/60 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-6 sm:p-8 lg:p-10 animate-in-up stagger-delay-2 flex flex-col h-auto transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <div className="flex items-center justify-between mb-6 lg:mb-8 shrink-0">
              <div>
                <h2 className="text-[24px] lg:text-[28px] font-semibold text-slate-900 tracking-tight leading-tight">Tu Agenda</h2>
                <p className="text-slate-500 text-[14px] lg:text-[15px] mt-1 font-medium">Próximos pacientes</p>
              </div>
              <button onClick={() => navigate('/calendar')} className="text-[13px] lg:text-[14px] font-semibold text-slate-900 bg-slate-100/80 hover:bg-slate-200/80 px-4 py-2 lg:px-5 lg:py-2.5 rounded-full transition-colors active:scale-95">Ver calendario</button>
            </div>
            
            <div className="flex-1 pr-2 lg:pr-3">
              {groupedAppointments.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 lg:w-24 lg:h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 ring-1 ring-slate-100">
                      <CalendarIcon size={32} className="text-slate-500" />
                    </div>
                    <h3 className="text-[20px] lg:text-[22px] font-semibold text-slate-900 mb-2 tracking-tight">Todo despejado</h3>
                    <p className="text-slate-500 text-[14px] lg:text-[15px] max-w-[250px] mb-5">No tienes citas programadas hoy. ¡Disfruta tu día!</p>
                    <button
                      onClick={() => navigate('/calendar')}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[13px] font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
                    >
                      + Programar Cita
                    </button>
                 </div>
              ) : (
                <div className="space-y-8 lg:space-y-10">
                  {groupedAppointments.map(group => (
                    <div key={group.label} className="space-y-3 lg:space-y-4">
                      <h3 className="text-sm lg:text-[13px] font-semibold uppercase tracking-widest text-slate-500 pl-1 sticky top-0 bg-white/80 backdrop-blur-xl py-2 z-10">{group.label}</h3>
                      <div className="grid grid-cols-1 gap-3 lg:gap-4">
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
            </div>
          </div>
        </div>
      </div>
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};

export default Dashboard;
