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
    <div className="flex-1 h-full overflow-y-auto md:overflow-hidden hide-scrollbar pb-32 md:pb-6 page-transition mesh-bg relative flex flex-col">
      <div className="max-w-[1400px] w-full mx-auto p-6 lg:p-8 flex flex-col h-auto md:h-full gap-6 lg:gap-8">
        
        {/* ===== Header ===== */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-in-up stagger-delay-1 shrink-0">
          <div>
            <p className="text-slate-500 text-[15px] font-medium capitalize mb-2">{todayDateStr}</p>
            <h1 className="text-[40px] md:text-[48px] font-semibold text-slate-900 tracking-tight leading-none">
              {getGreeting()}, <br className="hidden md:block" />
              <span className="text-slate-900">{doctorName.replace(/^Dr\.?\s*/i, '')}</span>.
            </h1>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="bg-white/60 backdrop-blur-xl border border-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center gap-3 px-6 py-4 rounded-full transition-all duration-300 hover:shadow-[0_4px_20px_rgb(0,0,0,0.06)] hover:bg-white flex-1 md:flex-none md:w-80 active:scale-95 cursor-text group"
            >
              <Search size={18} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
              <span className="text-[15px] font-medium text-slate-400 group-hover:text-slate-600 transition-colors">Buscar paciente...</span>
            </button>
          </div>
        </header>

        {/* ===== MAIN CONTENT ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 flex-1 min-h-0">
          
          {/* Agenda */}
          <div className="lg:col-span-2 bg-white/60 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-6 sm:p-8 lg:p-10 animate-in-up stagger-delay-2 flex flex-col h-[500px] md:h-full transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <div className="flex items-center justify-between mb-6 lg:mb-8 shrink-0">
              <div>
                <h2 className="text-[24px] lg:text-[28px] font-semibold text-slate-900 tracking-tight leading-tight">Tu Agenda</h2>
                <p className="text-slate-500 text-[14px] lg:text-[15px] mt-1 font-medium">Próximos pacientes</p>
              </div>
              <button onClick={() => navigate('/calendar')} className="text-[13px] lg:text-[14px] font-semibold text-slate-900 bg-slate-100/80 hover:bg-slate-200/80 px-4 py-2 lg:px-5 lg:py-2.5 rounded-full transition-colors active:scale-95">Ver calendario</button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 lg:pr-3">
              {groupedAppointments.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 lg:w-24 lg:h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 ring-1 ring-slate-100">
                      <CalendarIcon size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-[20px] lg:text-[22px] font-semibold text-slate-900 mb-2 tracking-tight">Todo despejado</h3>
                    <p className="text-slate-500 text-[14px] lg:text-[15px] max-w-[250px]">No tienes citas programadas hoy. ¡Disfruta tu día!</p>
                 </div>
              ) : (
                <div className="space-y-8 lg:space-y-10">
                  {/* Limit to showing only the first 3 groups */}
                  {groupedAppointments.slice(0, 3).map(group => (
                    <div key={group.label} className="space-y-3 lg:space-y-4">
                      <h3 className="text-[12px] lg:text-[13px] font-semibold uppercase tracking-widest text-slate-400 pl-1 sticky top-0 bg-white/80 backdrop-blur-xl py-2 z-10">{group.label}</h3>
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

          {/* Quick Actions Stack */}
          <div className="space-y-4 lg:space-y-6 animate-in-up stagger-delay-3 flex flex-col h-auto md:h-full">
             <button
                onClick={() => navigate('/patients?new=true')}
                className="flex-1 bg-white/60 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-6 lg:p-8 flex flex-col items-center justify-center gap-4 lg:gap-5 transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 active:scale-95 group text-center min-h-[200px] md:min-h-0"
              >
                <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <UserPlus size={28} className="lg:w-8 lg:h-8" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-[18px] lg:text-[20px] font-semibold text-slate-900 tracking-tight">Nuevo Paciente</h3>
                  <p className="text-[13px] lg:text-[14px] text-slate-500 mt-1">Crear ficha clínica</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/calendar?new=true')}
                className="flex-1 bg-white/60 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-6 lg:p-8 flex flex-col items-center justify-center gap-4 lg:gap-5 transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 active:scale-95 group text-center min-h-[200px] md:min-h-0"
              >
                <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                  <Plus size={28} className="lg:w-8 lg:h-8" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-[18px] lg:text-[20px] font-semibold text-slate-900 tracking-tight">Agendar Cita</h3>
                  <p className="text-[13px] lg:text-[14px] text-slate-500 mt-1">Bloquear horario</p>
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
