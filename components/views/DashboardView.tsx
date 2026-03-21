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
import { Search, Plus, Calendar as CalendarIcon, ArrowUpRight, User, UserPlus } from 'lucide-react';
import { sileo } from 'sileo';

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

  const { data: allAppointments = [], isLoading: isLoadingAppointments } = useAppointments();
  const { updateAppointment } = useAppointmentMutations();
  const { data: allPatients = [] } = usePatients();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<AppointmentRequest[]>([]);
  const navigate = useNavigate();

  const today = useMemo(() => getLocalISODate(new Date()), []);

  // ===== Daily Pulse Metrics =====
  const pulseMetrics = useMemo(() => {
    const todayApts = allAppointments.filter(a => a.date === today);
    const totalToday = todayApts.length;
    const completedToday = todayApts.filter(a => a.status === 'Completada').length;
    const canceledToday = todayApts.filter(a => a.status === 'Eliminada').length;
    const remainingToday = Math.max(0, totalToday - completedToday - canceledToday);

    return { totalToday, completedToday, remainingToday, canceledToday };
  }, [allAppointments, today]);

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
    <div className="flex-1 h-full overflow-y-auto hide-scrollbar pb-32 md:pb-8 page-transition bg-white">
      <div className="max-w-[1200px] mx-auto p-6 lg:p-12 space-y-12">
        
        {/* ===== Invisible Header ===== */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-in-up stagger-delay-1">
          <div>
            <h1 className="text-3xl lg:text-4xl font-semibold text-slate-900 tracking-tight leading-tight mb-1">
              {getGreeting()}, <br className="hidden md:block"/>
              <span className="text-slate-500">{doctorName.replace(/^Dr\.?\s*/i, '')}.</span>
            </h1>
            <p className="text-slate-400 font-medium capitalize mt-2">{todayDateStr}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-3 px-5 py-3.5 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors group flex-1 md:flex-none md:w-72"
            >
              <Search size={18} className="text-slate-500 group-hover:text-slate-700 transition-colors" />
              <span className="text-sm font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">Buscar paciente...</span>
              <kbd className="hidden lg:flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500 ml-auto shadow-sm">⌘K</kbd>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* ===== Left Column (Agenda) ===== */}
          <div className="lg:col-span-7 xl:col-span-8 animate-in-up stagger-delay-2">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">{isShowingUpcoming ? 'Próximas Citas' : 'Agenda'}</h2>
              <button
                onClick={() => navigate('/calendar?new=true')}
                className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors active:scale-95"
                title="Nueva Cita"
              >
                <Plus size={20} />
              </button>
            </div>

            {groupedAppointments.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CalendarIcon size={24} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Sin citas programadas</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">No tienes citas próximas en tu agenda. Disfruta tu tiempo libre o registra a un nuevo paciente.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {groupedAppointments.map(group => (
                  <div key={group.label} className="space-y-3">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 pl-2">{group.label}</h3>
                    <div className="space-y-3">
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

          {/* ===== Right Column (Metrics & Requests) ===== */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-10 animate-in-up stagger-delay-3">
            
            {/* Quick Actions (Accesos Rápidos) */}
            <section>
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 pl-1 mb-4">Accesos Rápidos</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate('/patient/new')}
                  className="flex flex-col gap-3 p-5 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5 transition-all group text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-slate-900 leading-tight">Nuevo Paciente</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">Crear expediente</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/calendar')}
                  className="flex flex-col gap-3 p-5 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-900/5 transition-all group text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CalendarIcon size={20} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-slate-900 leading-tight">Ver Agenda</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">Calendario general</p>
                  </div>
                </button>
              </div>
            </section>

            {/* Pulso del Día */}
            <section>
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 pl-1 mb-4">Pulso del Día</h2>
              <div className="bg-slate-900 rounded-[24px] p-6 sm:p-8 shadow-xl shadow-slate-900/10 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                
                <div className="relative z-10 grid grid-cols-3 gap-6 divide-x divide-slate-800">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total Hoy</p>
                    <p className="text-4xl font-light tracking-tight">{pulseMetrics.totalToday}</p>
                  </div>
                  <div className="text-center pl-6">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2">Atendidas</p>
                    <p className="text-4xl font-light tracking-tight text-emerald-300">{pulseMetrics.completedToday}</p>
                  </div>
                  <div className="text-center pl-6">
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-2">En Espera</p>
                    <p className="text-4xl font-light tracking-tight text-amber-300">{pulseMetrics.remainingToday}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Pending Requests */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Solicitudes</h2>
                  {pendingRequests.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                      {pendingRequests.length}
                    </span>
                  )}
                </div>
                {pendingRequests.length > 0 && (
                  <button onClick={() => navigate('/booking/manage')} className="text-sm font-medium text-blue-600 hover:text-blue-700">Gestionar</button>
                )}
              </div>

              {pendingRequests.length === 0 ? (
                <div className="bg-slate-50 rounded-2xl p-6 text-center">
                  <p className="text-sm font-medium text-slate-500">Todo al día</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.slice(0, 3).map(request => (
                    <div 
                      key={request.id} 
                      onClick={() => navigate('/booking/manage')}
                      className="group flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{request.patientName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{request.requestedDate}</p>
                      </div>
                      <ArrowUpRight size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                    </div>
                  ))}
                  {pendingRequests.length > 3 && (
                    <button onClick={() => navigate('/booking/manage')} className="w-full py-3 text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors">
                      Ver {pendingRequests.length - 3} solicitudes más
                    </button>
                  )}
                </div>
              )}
            </section>

          </div>
        </div>
      </div>
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};

export default Dashboard;
