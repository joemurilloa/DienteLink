import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppointmentCard from '../AppointmentCard';
import GlobalSearch from '../GlobalSearch';

import { bookingService } from '../../services/bookingService';
import { useAppointments, useAppointmentMutations } from '../../hooks/useAppointments';
import { usePatients } from '../../hooks/usePatients';
import { useAuth } from '../../services/authService';
import { Appointment, ReminderStatus, AppointmentRequest } from '../../types';
import { cn, formatCurrency, getInitials, getLocalISODate } from '../../lib/utils';
import { Search, Plus, Calendar as CalendarIcon, ArrowUpRight, UserPlus, TrendingUp, Clock } from 'lucide-react';
import { sileo } from 'sileo';
import { useWelcomeTip, useDashboardTip } from '../ContextualTips';

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
  const navigate = useNavigate();

  // Contextual tips (show once)
  useWelcomeTip();
  useDashboardTip();

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
        // Limit total upcoming to avoid endless scroll, but keeping completed visible
        if (groups.length < 5 || lbl === 'Completadas Hoy') {
           groups.push({ label: lbl, items: groupedMap[lbl] });
        }
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
    <div className="flex-1 h-full overflow-y-auto hide-scrollbar pb-32 md:pb-8 page-transition mesh-bg relative">
      <div className="max-w-[1400px] mx-auto p-6 lg:p-10 space-y-8">
        
        {/* ===== Header ===== */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-in-up stagger-delay-1">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-1">
              {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{doctorName.replace(/^Dr\.?\s*/i, '')}</span>.
            </h1>
            <p className="text-slate-500 font-medium capitalize mt-1">{todayDateStr}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="glass-panel flex items-center gap-3 px-5 py-3.5 hover:bg-white/80 rounded-[20px] transition-all group flex-1 md:flex-none md:w-72 active:scale-95 cursor-text"
            >
              <Search size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
              <span className="text-sm font-semibold text-slate-400 group-hover:text-slate-600 transition-colors">Buscar paciente...</span>
            </button>
          </div>
        </header>

        {/* ===== BENTO GRID ===== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Bento Box 1: Citas Hoy */}
          <div className="glass-panel rounded-[28px] p-6 animate-in-up stagger-delay-2 flex flex-col justify-between">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <CalendarIcon size={24} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pacientes Hoy</p>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-black text-slate-900">{pulseMetrics.totalToday}</span>
              </div>
            </div>
          </div>

          {/* Bento Box 2: Solicitudes Web */}
          <div className="glass-panel rounded-[28px] p-6 animate-in-up stagger-delay-2 flex flex-col justify-between cursor-pointer hover:bg-white/80 transition-all active:scale-95" onClick={() => navigate('/booking/manage')}>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center">
                <Clock size={24} />
              </div>
              <ArrowUpRight size={20} className="text-slate-300" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-1">Buzón Web</p>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-black text-slate-900">{pendingRequests.length}</span>
                <span className="text-sm font-bold text-amber-500 mb-1 animate-pulse">Pendientes</span>
              </div>
            </div>
          </div>

          {/* Bento Box 3: Ingresos */}
          <div className="glass-panel rounded-[28px] p-6 animate-in-up stagger-delay-2 flex flex-col justify-between">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-1">Por Cobrar</p>
              <div className="flex items-end gap-3">
                <span className="text-2xl font-black text-slate-900 truncate">{formatCurrency(pulseMetrics.totalDebt)}</span>
              </div>
            </div>
          </div>

          {/* Agenda */}
          <div className="md:col-span-2 glass-panel rounded-[32px] p-8 animate-in-up stagger-delay-3 flex flex-col h-[560px]">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Tu Agenda</h2>
              <button onClick={() => navigate('/calendar')} className="text-[13px] font-bold text-blue-600 hover:text-blue-700 transition-colors bg-blue-50/80 px-4 py-2 rounded-xl active:scale-95">Ver Todo</button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {groupedAppointments.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center">
                    <div className="w-24 h-24 bg-white/50 backdrop-blur-md rounded-[32px] flex items-center justify-center mb-6 shadow-sm ring-1 ring-white">
                      <CalendarIcon size={40} className="text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Todo despejado</h3>
                    <p className="text-slate-500 text-sm font-medium">No tienes citas programadas hoy. ¡Disfruta tu día!</p>
                 </div>
              ) : (
                <div className="space-y-8">
                  {/* Limit to showing only the first 3 groups to keep Bento clean */}
                  {groupedAppointments.slice(0, 3).map(group => (
                    <div key={group.label} className="space-y-3">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 pl-2 sticky top-0 bg-white/60 backdrop-blur-md py-2 z-10 rounded-xl">{group.label}</h3>
                      <div className="grid grid-cols-1 gap-3">
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

          {/* Quick Actions */}
          <div className="space-y-6 animate-in-up stagger-delay-4 flex flex-col">
             <button
                onClick={() => navigate('/patients?new=true')}
                className="flex-1 glass-panel rounded-[32px] p-8 flex flex-col items-center justify-center gap-4 hover:bg-white/80 transition-all active:scale-95 border border-white/80 group text-center"
              >
                <div className="w-16 h-16 rounded-[24px] bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
                  <UserPlus size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Nuevo Paciente</h3>
                  <p className="text-[13px] font-medium text-slate-500 mt-1">Crear ficha clínica</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/calendar?new=true')}
                className="flex-1 glass-panel rounded-[32px] p-8 flex flex-col items-center justify-center gap-4 hover:bg-indigo-50/50 transition-all active:scale-95 border border-white/80 group text-center"
              >
                <div className="w-16 h-16 rounded-[24px] bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">
                  <Plus size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Agendar Cita</h3>
                  <p className="text-[13px] font-medium text-slate-500 mt-1">Bloquear horario</p>
                </div>
              </button>
          </div>

        </div>

      </div>

      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};

export default Dashboard;
