import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppointmentCard from '../AppointmentCard';
import GlobalSearch from '../GlobalSearch';
import { whatsappService } from '../../services/whatsappService';
import { persistenceService } from '../../services/persistenceService';
import { bookingService } from '../../services/bookingService';
import { useAuth } from '../../services/authService';
import { Appointment, ReminderStatus, AppointmentRequest } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
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
  const doctorInitials = doctorName.split(' ').filter(w => w.length > 0).map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'DR';

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
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    return allPatients.reduce((sum, p) => {
      return sum + p.history.filter(e => e.date >= weekAgoStr && e.date <= today).length;
    }, 0);
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
      const firstEvent = [...p.history, ...p.evolutionNotes].sort((a, b) => a.date.localeCompare(b.date))[0];
      return firstEvent && firstEvent.date >= monthStart && firstEvent.date <= monthEnd;
    }).length;

    // Pending balance total
    const totalPending = allPatients.reduce((sum, p) => {
      const budgetTotal = p.budget.reduce((s, b) => s + b.unitCost * b.quantity, 0);
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
  }, [loadPendingRequests]);

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
    <div className="flex-1 h-full overflow-y-auto hide-scrollbar pb-32 md:pb-8 p-5 lg:p-8 page-transition">
        {/* Eliminar el header anterior ya integrado arriba */}

      <div className="space-y-6 lg:space-y-8">
        {/* ===== Header mejorado con búsqueda integrada ===== */}
        <section className="animate-in-up stagger-delay-1">
          <div className="bg-white rounded-2xl lg:rounded-3xl border border-slate-100 p-6 lg:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
              <div className="flex-1">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight mb-1">
                  {getGreeting()}, <span className="text-blue-600">{doctorName.replace(/^Dr\.?\s*/i, '')}</span>
                </h2>
                <p className="text-sm text-slate-500">
                  {new Date().toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              
              {/* Búsqueda integrada - mobile first */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-blue-50 rounded-xl border border-slate-200 hover:border-blue-200 transition-all group flex-1 lg:flex-none lg:min-w-[280px]"
                >
                  <Search size={18} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                  <span className="text-sm text-slate-400 group-hover:text-slate-600 transition-colors">Buscar pacientes...</span>
                  <div className="hidden lg:flex items-center gap-1 px-2 py-1 bg-slate-200 group-hover:bg-slate-300 rounded-lg text-[10px] font-semibold text-slate-500 ml-auto">
                    <kbd>⌘K</kbd>
                  </div>
                </button>
                
                <div 
                  onClick={() => navigate('/settings')}
                  className="w-12 h-12 rounded-xl overflow-hidden ring-2 ring-blue-100 shadow-sm bg-blue-600 flex items-center justify-center cursor-pointer hover:ring-blue-300 transition-all active:scale-95"
                  title="Ir a Ajustes"
                >
                  <span className="text-white font-bold text-sm">{doctorInitials}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* ===== Métricas del Mes ===== */}
        <section className="animate-in-up stagger-delay-2">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {/* Ingresos del mes */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <DollarSign size={18} className="text-emerald-600" />
                </div>
                {metrics.revenueChange !== 0 && (
                  <span className={cn('text-[10px] font-bold px-2 py-1 rounded-lg', metrics.revenueChange > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500')}>
                    {metrics.revenueChange > 0 ? '+' : ''}{metrics.revenueChange}%
                  </span>
                )}
              </div>
              <p className="text-lg lg:text-xl font-bold text-slate-900">{formatCurrency(metrics.monthlyRevenue)}</p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Ingresos del mes</p>
            </div>

            {/* Pacientes totales */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Users size={18} className="text-blue-600" />
                </div>
                {metrics.newPatientsCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-600">
                    +{metrics.newPatientsCount} nuevos
                  </span>
                )}
              </div>
              <p className="text-lg lg:text-xl font-bold text-slate-900">{metrics.totalPatientsCount}</p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Pacientes registrados</p>
            </div>

            {/* Tasa de asistencia */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                  <UserCheck size={18} className="text-violet-600" />
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-violet-50 text-violet-600">
                  {metrics.completedThisMonth} completadas
                </span>
              </div>
              <p className="text-lg lg:text-xl font-bold text-slate-900">{metrics.attendanceRate}%</p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Tasa de asistencia</p>
            </div>

            {/* Saldo pendiente */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                  <BarChart3 size={18} className="text-amber-600" />
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-600">
                  {metrics.weeklyProcedures} esta semana
                </span>
              </div>
              <p className="text-lg lg:text-xl font-bold text-slate-900">{formatCurrency(metrics.totalPending)}</p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Saldo por cobrar</p>
            </div>
          </div>
        </section>

        {/* ===== Citas de Hoy — Principal ===== */}
        <section className="animate-in-up stagger-delay-3">
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <h3 className="text-lg lg:text-xl font-bold text-slate-900 tracking-tight">Agenda de Hoy</h3>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-semibold">{appointments.length} citas</span>
              <button
                onClick={() => navigate('/calendar')}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Nueva Cita</span>
                <span className="sm:hidden">Nueva</span>
              </button>
            </div>
          </div>
          
          {appointments.length === 0 ? (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl border border-slate-100 p-8 lg:p-12 text-center">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 lg:mb-6">
                <CalendarIcon size={32} className="text-slate-300" />
              </div>
              <h4 className="text-lg lg:text-xl font-semibold text-slate-600 mb-2">Sin citas programadas</h4>
              <p className="text-slate-400 mb-6 lg:mb-8 max-w-sm mx-auto">No hay citas para el día de hoy. Programa la primera cita del día.</p>
              <button
                onClick={() => navigate('/calendar')}
                className="px-6 py-3 lg:px-8 lg:py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25"
              >
                Programar Primera Cita
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
              {appointments.map(apt => (
                <AppointmentCard
                  key={apt.id}
                  appointment={apt}
                  onReminderSent={handleReminderStatusUpdate}
                  onNavigateToPatient={(a) => {
                    if (a.patientId) {
                      navigate(`/patient/${a.patientId}`);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* ===== Solicitudes de Cita ===== */}
        <section className="animate-in-up stagger-delay-4">
          <div className={cn(
            'rounded-2xl lg:rounded-3xl border p-6 lg:p-8',
            pendingRequests.length > 0
              ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
              : 'bg-white border-slate-100'
          )}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {pendingRequests.length > 0 && <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>}
                <h3 className={cn('text-lg lg:text-xl font-bold', pendingRequests.length > 0 ? 'text-amber-800' : 'text-slate-900')}>
                  Solicitudes de Cita {pendingRequests.length > 0 && `(${pendingRequests.length})`}
                </h3>
              </div>
              <button
                onClick={() => navigate('/booking/manage')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all',
                  pendingRequests.length > 0
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                )}
              >
                <Bell size={16} />
                <span className="hidden sm:inline">Ver Solicitudes</span>
                <span className="sm:hidden">Ver</span>
              </button>
            </div>
            
            {pendingRequests.length > 0 ? (
              <>
                <div className="space-y-3">
                  {pendingRequests.slice(0, 3).map(request => {
                    const fmtDate = (dateStr: string) => {
                      return new Date(dateStr).toLocaleDateString('es-ES', {
                        month: 'short',
                        day: 'numeric'
                      });
                    };

                    const fmtTime = (timeStr: string) => {
                      const [hours, minutes] = timeStr.split(':');
                      return new Date(0, 0, 0, parseInt(hours), parseInt(minutes))
                        .toLocaleTimeString('es-ES', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: true 
                        });
                    };

                    return (
                      <div key={request.id} className="bg-white rounded-xl p-4 border border-amber-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                            {request.patientName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">{request.patientName}</div>
                            <div className="text-xs text-slate-500">
                              {fmtDate(request.requestedDate)} - {fmtTime(request.requestedTime)} ({request.appointmentType})
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate('/booking/manage')}
                          className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-200 transition-colors"
                        >
                          Revisar
                        </button>
                      </div>
                    );
                  })}
                </div>

                {pendingRequests.length > 3 && (
                  <div className="mt-4 text-center">
                    <span className="text-sm text-amber-600">
                      +{pendingRequests.length - 3} solicitudes más
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <Bell size={32} className="text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-medium">No hay solicitudes pendientes</p>
                <p className="text-xs text-slate-300 mt-1">Las citas solicitadas desde tu enlace público aparecerán aquí</p>
              </div>
            )}
          </div>
        </section>

        {/* ===== Acciones Rápidas de Gestión ===== */}
        <section className="animate-in-up stagger-delay-5">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 lg:mb-6">Herramientas de Gestión</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            <button
              onClick={() => navigate('/patients?new=true')}
              className="flex flex-col items-center gap-3 lg:gap-4 p-4 lg:p-6 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all shadow-sm group"
            >
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Plus size={20} className="lg:hidden" />
                <Plus size={24} className="hidden lg:block" />
              </div>
              <span className="font-semibold text-slate-700 text-sm lg:text-base text-center leading-tight">Nuevo Paciente</span>
            </button>
            
            <button
              onClick={() => navigate('/patients')}
              className="flex flex-col items-center gap-3 lg:gap-4 p-4 lg:p-6 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all shadow-sm group"
            >
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Users size={20} className="lg:hidden" />
                <Users size={24} className="hidden lg:block" />
              </div>
              <span className="font-semibold text-slate-700 text-sm lg:text-base text-center leading-tight">Ver Pacientes</span>
            </button>
            
            <button
              onClick={() => navigate('/settings')}
              className="flex flex-col items-center gap-3 lg:gap-4 p-4 lg:p-6 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all shadow-sm group"
            >
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 group-hover:bg-slate-600 group-hover:text-white transition-all">
                <Settings size={20} className="lg:hidden" />
                <Settings size={24} className="hidden lg:block" />
              </div>
              <span className="font-semibold text-slate-700 text-sm lg:text-base text-center leading-tight">Configuración</span>
            </button>
            
            <button
              onClick={() => navigate('/consultation')}
              className="flex flex-col items-center gap-3 lg:gap-4 p-4 lg:p-6 bg-gradient-to-br from-blue-50 to-slate-50 rounded-2xl border border-blue-100 hover:border-blue-200 hover:from-blue-100 hover:to-slate-100 transition-all shadow-sm group col-span-2 lg:col-span-1"
            >
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all">
                <Activity size={20} className="lg:hidden" />
                <Activity size={24} className="hidden lg:block" />
              </div>
              <span className="font-semibold text-blue-700 text-sm lg:text-base text-center leading-tight">Iniciar Consulta</span>
            </button>
          </div>
        </section>
      </div>

      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};

export default Dashboard;
