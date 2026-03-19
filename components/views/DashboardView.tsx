import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppointmentCard from '../AppointmentCard';
import GlobalSearch from '../GlobalSearch';
import { whatsappService } from '../../services/whatsappService';
import { persistenceService } from '../../services/persistenceService';
import { bookingService } from '../../services/bookingService';
import { useAuth } from '../../services/authService';
import { Appointment, ReminderStatus, AppointmentRequest } from '../../types';
import { cn, formatCurrency, getInitials } from '../../lib/utils';
import { Plus, Calendar as CalendarIcon, Search, Settings, Users, Activity, Bell, DollarSign, UserCheck, BarChart3 } from 'lucide-react';
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

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allPatients, setAllPatients] = useState(() => persistenceService.getPatients());
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<AppointmentRequest[]>([]);
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];
  const allAppointments = useMemo(() => persistenceService.getAppointments(), []);

  // Weekly procedures count
  const weeklyProcedures = useMemo(() => {
    const now = new Date();
    const weekAgoStr = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
    return allPatients.reduce((sum, p) => sum + (p.history || []).filter(e => e.date >= weekAgoStr && e.date <= today).length, 0);
  }, [allPatients, today]);

  // ===== Dashboard Metrics =====
  const metrics = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    // Monthly revenue (sum of all payments this month)
    const monthlyRevenue = allPatients.reduce((sum, p) => {
      return sum + (p.payments || []).filter(pay => pay.date >= monthStart && pay.date <= monthEnd).reduce((s, pay) => s + pay.amount, 0);
    }, 0);
    const prevMonthRevenue = allPatients.reduce((sum, p) => {
      return sum + (p.payments || []).filter(pay => pay.date >= prevMonthStart && pay.date <= prevMonthEnd).reduce((s, pay) => s + pay.amount, 0);
    }, 0);
    const revenueChange = prevMonthRevenue > 0 ? Math.round(((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100) : 0;

    // Patients this month
    const monthlyAppointments = allAppointments.filter(a => a.date >= monthStart && a.date <= monthEnd);
    const completedThisMonth = monthlyAppointments.filter(a => a.status === 'Completada').length;
    const totalThisMonth = monthlyAppointments.length;
    const attendanceRate = totalThisMonth > 0 ? Math.round((completedThisMonth / totalThisMonth) * 100) : 0;

    // New patients this month (patients whose first event/note is this month)
    const newPatientsCount = allPatients.filter(p => {
      const history = p.history || [];
      const notes = p.evolutionNotes || [];
      const firstEvent = [...history, ...notes].sort((a, b) => a.date.localeCompare(b.date))[0];
      return firstEvent && firstEvent.date >= monthStart && firstEvent.date <= monthEnd;
    }).length;

    // Pending balance total (safely handle undefined budget)
    const totalPending = allPatients.reduce((sum, p) => {
      const budgetTotal = (p.budget || []).reduce((s, b) => s + b.unitCost * b.quantity, 0);
      const paidTotal = (p.payments || []).reduce((s, pay) => s + pay.amount, 0);
      return sum + Math.max(0, budgetTotal - paidTotal);
    }, 0);

    return { monthlyRevenue, revenueChange, attendanceRate, totalPatientsCount: allPatients.length, newPatientsCount, weeklyProcedures, totalPending, completedThisMonth };
  }, [allPatients, allAppointments, weeklyProcedures]);

  const loadPendingRequests = useCallback(async () => {
    try {
      await bookingService.refreshRequests();
    } catch (e) {
      // refreshRequests might fail if not initialized yet
    }
    const requests = bookingService.getPendingRequests();
    setPendingRequests(requests);
  }, []);

  useEffect(() => {
    setAppointments(persistenceService.getAppointmentsForDate(today));
    loadPendingRequests();

    // Listen for new appointment requests
    const handleNewRequest = (event: CustomEvent) => {
      const newRequest = event.detail as AppointmentRequest;
      setPendingRequests(prev => [newRequest, ...prev]);
    };

    window.addEventListener('newAppointmentRequest', handleNewRequest as EventListener);

    // When a request is approved and a real appointment is created, refresh today's list
    const handleAppointmentCreated = () => {
      setAppointments(persistenceService.getAppointmentsForDate(today));
      loadPendingRequests();
    };
    window.addEventListener('appointmentCreated', handleAppointmentCreated);

    const unsubscribe = whatsappService.subscribe(({ appointmentId, status }) => {
      setAppointments(prev => {
        const updated = prev.map(apt => apt.id === appointmentId ? { ...apt, status: status as any } : apt);
        const apt = updated.find(a => a.id === appointmentId);
        if (apt) {
          persistenceService.saveAppointment(apt).catch(console.error);
          if ((status as string) === 'confirmed') {
            sileo.success({ title: `${apt.patientName} confirmo su cita`, description: 'Todo listo para recibirle' });
          } else if ((status as string) === 'cancelled') {
            sileo.warning({ title: `${apt.patientName} cancelo su cita`, description: 'Puedes reprogramarla cuando gustes' });
          }
        }
        return updated;
      });
    });

    return () => {
      window.removeEventListener('newAppointmentRequest', handleNewRequest as EventListener);
      window.removeEventListener('appointmentCreated', handleAppointmentCreated);
      unsubscribe();
    };
  }, [loadPendingRequests, today]);

  const handleReminderStatusUpdate = useCallback((id: string, status: ReminderStatus) => {
    setAppointments(prev => {
      const updated = prev.map(apt => apt.id === id ? { ...apt, reminderStatus: status } : apt);
      const apt = updated.find(a => a.id === id);
      if (apt) {
        persistenceService.saveAppointment(apt).catch(console.error);
        if (status === 'sent') {
          sileo.success({ title: `Recordatorio enviado a ${apt.patientName}`, description: 'Le llegará por WhatsApp en unos segundos' });
        } else if ((status as string) === 'failed') {
          sileo.error({ title: `No pudimos contactar a ${apt.patientName}`, description: 'Revisa el número de teléfono o inténtalo de nuevo' });
        }
      }
      return updated;
    });
  }, []);

  return (
    <div className="flex-1 h-full overflow-y-auto hide-scrollbar pb-32 md:pb-8 p-5 lg:p-8 page-transition bg-slate-50">
      <div className="space-y-6 lg:space-y-8">
        
        {/* ===== Header Bento ===== */}
        <section className="animate-in-up stagger-delay-1">
          <div className="bg-white rounded-[24px] border border-slate-100 p-6 lg:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
              <div className="flex-1">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight mb-1">
                  {getGreeting()}, <span className="text-blue-600">{doctorName.replace(/^Dr\.?\s*/i, '')}</span>
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  {new Date().toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="flex items-center gap-3 px-4 py-3 bg-slate-50/80 hover:bg-blue-50/80 rounded-[16px] border border-slate-200/60 hover:border-blue-200 transition-all group flex-1 lg:flex-none lg:min-w-[280px]"
                >
                  <Search size={18} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                  <span className="text-sm text-slate-400 group-hover:text-slate-600 transition-colors">Buscar pacientes...</span>
                  <div className="hidden lg:flex items-center gap-1 px-2 py-1 bg-slate-200/50 group-hover:bg-slate-300/50 rounded-lg text-[10px] font-semibold text-slate-500 ml-auto">
                    <kbd>⌘K</kbd>
                  </div>
                </button>
                
                <div 
                  onClick={() => navigate('/settings')}
                  className="w-12 h-12 rounded-[16px] overflow-hidden shadow-[0_4px_12px_rgba(37,99,235,0.2)] bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center cursor-pointer hover:shadow-[0_8px_16px_rgba(37,99,235,0.3)] hover:-translate-y-0.5 transition-all"
                  title="Ir a Ajustes"
                >
                  <span className="text-white font-bold text-sm">{doctorInitials}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Bento Grid Principal (Ingresos + Citas + Tratamientos) ===== */}
        <section className="animate-in-up stagger-delay-2 grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
          
          {/* Tarjeta Oscura de Ingresos (Col 1 y 2) */}
          <div className="col-span-1 lg:col-span-2 bg-slate-900 rounded-[32px] p-6 lg:p-8 shadow-modern-xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
            <div className="absolute -top-10 -right-10 p-8 opacity-10 blur-xl transform group-hover:scale-110 transition-transform duration-700 pointer-events-none">
              <DollarSign size={200} className="text-emerald-400" />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex items-center justify-between mb-8">
                <div className="w-12 h-12 bg-slate-800 rounded-[16px] flex items-center justify-center border border-slate-700">
                  <DollarSign size={24} className="text-emerald-400" />
                </div>
                {metrics.revenueChange !== 0 && (
                  <span className={cn('text-sm font-bold px-3 py-1.5 rounded-full', metrics.revenueChange > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>
                    {metrics.revenueChange > 0 ? '+' : ''}{metrics.revenueChange}% ext. mes
                  </span>
                )}
              </div>
              <div>
                <p className="text-slate-400 font-medium mb-1 relative z-10">Ingresos del Mes</p>
                <p className="text-5xl lg:text-5xl font-black text-white tracking-tight relative z-10">{formatCurrency(metrics.monthlyRevenue)}</p>
              </div>
            </div>
          </div>

          {/* Tarjeta Bento: Citas de Hoy (Col 3) */}
          <div onClick={() => navigate('/calendar')} className="col-span-1 bg-white rounded-[32px] border border-slate-100 p-6 lg:p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group cursor-pointer">
            <div className="flex items-center justify-between mb-8">
              <div className="w-12 h-12 bg-blue-500/10 rounded-[16px] flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <CalendarIcon size={24} className="text-blue-600" />
              </div>
              {appointments.length > 0 && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
              )}
            </div>
            <div>
              <p className="text-slate-500 font-medium mb-1">Citas de Hoy</p>
              <p className="text-5xl lg:text-5xl font-black text-slate-900 tracking-tight">{appointments.length}</p>
            </div>
          </div>

          {/* Tarjeta Bento: Tratamientos/Pacientes (Col 4) */}
          <div onClick={() => navigate('/patients')} className="col-span-1 bg-white rounded-[32px] border border-slate-100 p-6 lg:p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group cursor-pointer">
            <div className="flex items-center justify-between mb-8">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-[16px] flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                <Users size={24} className="text-indigo-600" />
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">Total</span>
            </div>
            <div>
              <p className="text-slate-500 font-medium mb-1">Pacientes Activos</p>
              <p className="text-5xl lg:text-5xl font-black text-slate-900 tracking-tight">{metrics.totalPatientsCount}</p>
            </div>
          </div>
        </section>

        {/* ===== Métricas Secundarias ===== */}
        <section className="animate-in-up stagger-delay-3 grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {/* Tasa de Asistencia */}
            <div className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-violet-500/10 rounded-[12px] flex items-center justify-center">
                  <UserCheck size={18} className="text-violet-600" />
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-violet-50 text-violet-600">
                  {metrics.completedThisMonth} OK
                </span>
              </div>
              <p className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">{metrics.attendanceRate}%</p>
              <p className="text-[12px] text-slate-400 font-medium mt-1">Tasa de asistencia</p>
            </div>

            {/* Saldo Pendiente */}
            <div className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-amber-500/10 rounded-[12px] flex items-center justify-center">
                  <BarChart3 size={18} className="text-amber-600" />
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-600">
                  CxP
                </span>
              </div>
              <p className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">{formatCurrency(metrics.totalPending)}</p>
              <p className="text-[12px] text-slate-400 font-medium mt-1">Saldo pendiente por cobrar</p>
            </div>
            
            {/* Nuevos este mes */}
            <div className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-sky-500/10 rounded-[12px] flex items-center justify-center">
                  <Plus size={18} className="text-sky-600" />
                </div>
              </div>
              <p className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">+{metrics.newPatientsCount}</p>
              <p className="text-[12px] text-slate-400 font-medium mt-1">Nuevos pacientes (mes)</p>
            </div>

            {/* Procedimientos Semanales */}
            <div className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-fuchsia-500/10 rounded-[12px] flex items-center justify-center">
                  <Activity size={18} className="text-fuchsia-600" />
                </div>
              </div>
              <p className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">{metrics.weeklyProcedures}</p>
              <p className="text-[12px] text-slate-400 font-medium mt-1">Tratamientos activos (7 d.)</p>
            </div>
        </section>

        {/* ===== Agenda y Solicitudes ===== */}
        <section className="animate-in-up stagger-delay-4 grid grid-cols-1 xl:grid-cols-3 gap-6">
            
          {/* Citas de Hoy Listado (Col 1 y 2) */}
          <div className="xl:col-span-2 flex flex-col">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <h3 className="text-lg lg:text-xl font-bold text-slate-900 tracking-tight">Agenda de Hoy</h3>
              <button
                onClick={() => navigate('/calendar')}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 transition-all shadow-md hover:-translate-y-0.5"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Nueva Cita</span>
                <span className="sm:hidden">Nueva</span>
              </button>
            </div>
            
            {appointments.length === 0 ? (
              <div className="bg-white border border-slate-100 shadow-sm rounded-[24px] p-8 lg:p-12 text-center flex-1 flex flex-col justify-center items-center h-full min-h-[280px]">
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-blue-50/50 rounded-full flex items-center justify-center mb-4 lg:mb-6">
                  <CalendarIcon size={32} className="text-blue-300" />
                </div>
                <h4 className="text-lg font-bold text-slate-700 mb-2">Día despejado</h4>
                <p className="text-slate-400 mb-6 text-sm max-w-sm mx-auto">No hay citas registradas para hoy. Tómate un descanso o programa una nueva consulta.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-4 flex-1">
                {appointments.map(apt => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    onReminderSent={handleReminderStatusUpdate}
                    onNavigateToPatient={(a) => {
                      if (a.patientId) navigate(`/patient/${a.patientId}`);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Solicitudes de Cita (Col 3) */}
          <div className="xl:col-span-1">
            <div className={cn(
              'rounded-[24px] border p-6 lg:p-6 shadow-sm h-full flex flex-col',
              pendingRequests.length > 0
                ? 'bg-gradient-to-b from-amber-50 to-white border-amber-200'
                : 'bg-white border-slate-100'
            )}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  {pendingRequests.length > 0 && <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span></span>}
                  <h3 className={cn('text-lg font-bold tracking-tight', pendingRequests.length > 0 ? 'text-amber-900' : 'text-slate-900')}>
                    Solicitudes {pendingRequests.length > 0 && `(${pendingRequests.length})`}
                  </h3>
                </div>
                {pendingRequests.length > 0 && (
                <button
                  onClick={() => navigate('/booking/manage')}
                  className="px-3 py-1.5 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-lg text-xs font-bold transition-all"
                >
                  Gestión
                </button>
                )}
              </div>
              
              {pendingRequests.length > 0 ? (
                <div className="space-y-3 flex-1">
                  {pendingRequests.slice(0, 4).map(request => {
                    const fmtTime = (timeStr: string) => {
                      if (!timeStr) return '';
                      const [hours, minutes] = timeStr.split(':');
                      return new Date(0, 0, 0, parseInt(hours || '0', 10), parseInt(minutes || '0', 10)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
                    };
                    return (
                      <div key={request.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-amber-200 hover:-translate-y-0.5 transition-all flex items-center justify-between cursor-pointer" onClick={() => navigate('/booking/manage')}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-[12px] flex items-center justify-center text-white font-bold text-xs shadow-sm">
                            {getInitials(request.patientName)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{request.patientName}</div>
                            <div className="text-xs text-slate-500 font-medium">
                              {request.requestedDate} · {fmtTime(request.requestedTime)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {pendingRequests.length > 4 && (
                    <div className="pt-2 pb-1 text-center">
                      <span className="text-xs font-semibold text-amber-600 cursor-pointer hover:underline" onClick={()=>navigate('/booking/manage')}>+{pendingRequests.length - 4} más...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 flex-1 flex flex-col justify-center">
                  <Bell size={28} className="text-slate-200 mx-auto mb-4" />
                  <p className="text-sm text-slate-500 font-semibold mb-1">Sin solicitudes</p>
                  <p className="text-xs text-slate-400 max-w-[200px] mx-auto leading-relaxed">Las solicitudes de citas agendadas desde tu enlace aparecerán aquí.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};

export default Dashboard;
