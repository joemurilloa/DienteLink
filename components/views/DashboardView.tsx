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
import { Search, Plus, Calendar as CalendarIcon, ArrowUpRight, ArrowDownRight, User } from 'lucide-react';
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

  // ===== Dashboard Metrics =====
  const metrics = useMemo(() => {
    const now = new Date();
    const monthStart = getLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1));
    const monthEnd = getLocalISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    const prevMonthStart = getLocalISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const prevMonthEnd = getLocalISODate(new Date(now.getFullYear(), now.getMonth(), 0));

    const monthlyRevenue = allPatients.reduce((sum, p) => sum + (p.payments || []).filter(pay => pay.date >= monthStart && pay.date <= monthEnd).reduce((s, pay) => s + pay.amount, 0), 0);
    const prevMonthRevenue = allPatients.reduce((sum, p) => sum + (p.payments || []).filter(pay => pay.date >= prevMonthStart && pay.date <= prevMonthEnd).reduce((s, pay) => s + pay.amount, 0), 0);
    const revenueChange = prevMonthRevenue > 0 ? Math.round(((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100) : 0;

    const monthlyAppointments = allAppointments.filter(a => a.date >= monthStart && a.date <= monthEnd);
    const completedThisMonth = monthlyAppointments.filter(a => a.status === 'Completada').length;
    
    const newPatientsCount = allPatients.filter(p => {
      const history = p.history || [];
      const notes = p.evolutionNotes || [];
      const firstEvent = [...history, ...notes].sort((a, b) => a.date.localeCompare(b.date))[0];
      return firstEvent && firstEvent.date >= monthStart && firstEvent.date <= monthEnd;
    }).length;

    const totalPending = allPatients.reduce((sum, p) => {
      const budgetTotal = (p.budget || []).reduce((s, b) => s + b.unitCost * b.quantity, 0);
      const paidTotal = (p.payments || []).reduce((s, pay) => s + pay.amount, 0);
      return sum + Math.max(0, budgetTotal - paidTotal);
    }, 0);

    return { monthlyRevenue, revenueChange, totalPatientsCount: allPatients.length, newPatientsCount, totalPending, completedThisMonth };
  }, [allPatients, allAppointments]);

  const { appointments, isShowingUpcoming } = useMemo(() => {
    let todayApts = allAppointments.filter(a => a.date === today && a.status !== 'Eliminada');
    todayApts.sort((a, b) => a.time.localeCompare(b.time));

    if (todayApts.length === 0) {
      const allUpcoming = allAppointments
        .filter(a => a.date > today && a.status !== 'Eliminada')
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
      
      if (allUpcoming.length > 0) {
        return { appointments: allUpcoming.slice(0, 5), isShowingUpcoming: true };
      } else {
        return { appointments: [], isShowingUpcoming: false };
      }
    } else {
      return { appointments: todayApts, isShowingUpcoming: false };
    }
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
              className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors group flex-1 md:flex-none md:w-72"
            >
              <Search size={18} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
              <span className="text-sm font-medium text-slate-400 group-hover:text-slate-600 transition-colors">Buscar paciente...</span>
              <kbd className="hidden lg:flex items-center gap-1 px-2 py-1 bg-white rounded text-[10px] font-bold text-slate-400 ml-auto shadow-sm">⌘K</kbd>
            </button>
            <div 
              onClick={() => navigate('/settings')}
              className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors shrink-0"
              title="Ajustes"
            >
              <User size={18} className="text-slate-600" />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* ===== Left Column (Agenda) ===== */}
          <div className="lg:col-span-7 xl:col-span-8 animate-in-up stagger-delay-2">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">{isShowingUpcoming ? 'Próximas Citas' : 'Agenda'}</h2>
              <button
                onClick={() => navigate('/calendar')}
                className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors active:scale-95"
                title="Nueva Cita"
              >
                <Plus size={20} />
              </button>
            </div>

            {appointments.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CalendarIcon size={24} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Sin citas programadas</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">No tienes ninguna cita para el día de hoy. Disfruta tu tiempo libre.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map(apt => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    showDate={isShowingUpcoming}
                    onReminderSent={handleReminderStatusUpdate}
                    onNavigateToPatient={(a) => {
                      if (a.patientId) navigate(`/patient/${a.patientId}`);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ===== Right Column (Metrics & Requests) ===== */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-12 animate-in-up stagger-delay-3">
            
            {/* Minimal Metrics Summary */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 tracking-tight mb-6">Resumen del Mes</h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider">Ingresos</p>
                    {metrics.revenueChange !== 0 && (
                      <span className={cn("text-[10px] font-bold flex items-center", metrics.revenueChange > 0 ? "text-emerald-500" : "text-red-500")}>
                        {metrics.revenueChange > 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                        {Math.abs(metrics.revenueChange)}%
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-semibold text-slate-900 tracking-tight">{formatCurrency(metrics.monthlyRevenue)}</p>
                </div>
                
                <div>
                  <p className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Por Cobrar</p>
                  <p className="text-2xl font-semibold text-slate-900 tracking-tight">{formatCurrency(metrics.totalPending)}</p>
                </div>

                <div>
                  <p className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Pacientes Totales</p>
                  <p className="text-2xl font-semibold text-slate-900 tracking-tight">{metrics.totalPatientsCount}</p>
                </div>

                <div>
                  <p className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Nuevos (Mes)</p>
                  <p className="text-2xl font-semibold text-slate-900 tracking-tight">+{metrics.newPatientsCount}</p>
                </div>
              </div>
            </section>

            {/* Subtle separator */}
            <hr className="border-slate-100" />

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
