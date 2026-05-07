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
import { useWelcomeTip, useDashboardTip } from '../ContextualTips';
import { generateMonthlyReportPDF } from '../../lib/reportsGenerator';
import { Download } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';

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
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const navigate = useNavigate();

  // Contextual tips (show once)
  useWelcomeTip();
  useDashboardTip();

  const today = useMemo(() => getLocalISODate(new Date()), []);

  // ===== Daily Pulse Metrics =====
  const pulseMetrics = useMemo(() => {
    const todayApts = allAppointments.filter(a => a.date === today);
    const totalToday = todayApts.length;
    const completedToday = todayApts.filter(a => a.status === 'Completada').length;
    const canceledToday = todayApts.filter(a => a.status === 'Eliminada').length;
    const remainingToday = Math.max(0, totalToday - completedToday - canceledToday);

    const totalDebt = allPatients.reduce((totalAcc, p) => {
        const totalBudget = p.budget?.reduce((acc, item) => acc + (item.unitCost * item.quantity), 0) || 0;
        const totalPaid = (p.payments || []).reduce((acc, pay) => acc + pay.amount, 0);
        return totalAcc + Math.max(0, totalBudget - totalPaid);
    }, 0);

    return { totalToday, completedToday, remainingToday, canceledToday, totalDebt };
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

  // ===== Chart Data Calculation =====
  const chartData = useMemo(() => {
    // 1. Appointments per day (Last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return getLocalISODate(d);
    });

    const appointmentsByDay = last7Days.map(date => {
      const count = allAppointments.filter(a => a.date === date).length;
      const dayName = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short' });
      return { name: dayName, citas: count };
    });

    // 2. Revenue per month (Last 6 months)
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return { month: d.getMonth(), year: d.getFullYear() };
    });

    const revenueByMonth = last6Months.map(({ month, year }) => {
      const monthLabel = new Date(year, month).toLocaleDateString('es-ES', { month: 'short' });
      let total = 0;
      
      allPatients.forEach(p => {
        (p.payments || []).forEach(pay => {
          const payDate = new Date(pay.date + 'T12:00:00');
          if (payDate.getMonth() === month && payDate.getFullYear() === year) {
            total += pay.amount;
          }
        });
      });

      return { name: monthLabel, ingresos: total };
    });

    return { appointmentsByDay, revenueByMonth };
  }, [allAppointments, allPatients]);

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
              onClick={async () => {
                if (isGeneratingReport) return;
                setIsGeneratingReport(true);
                const now = new Date();
                try {
                  await generateMonthlyReportPDF(
                    now.getMonth(),
                    now.getFullYear(),
                    allPatients,
                    allAppointments,
                    profile?.clinic_name || '',
                    doctorName
                  );
                } finally {
                  setIsGeneratingReport(false);
                }
              }}
              disabled={isGeneratingReport}
              className="hidden sm:flex items-center gap-2 px-4 py-3.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-2xl transition-all font-semibold text-sm shadow-sm disabled:opacity-50"
              title="Descargar Reporte Mensual"
            >
              {isGeneratingReport ? <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent animate-spin rounded-full" /> : <Download size={18} />}
              <span>{isGeneratingReport ? 'Generando...' : 'Reporte Mensual'}</span>
            </button>
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* ===== Left Column (Agenda) ===== */}
          <div className="lg:col-span-8 animate-in-up stagger-delay-2">
            <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{isShowingUpcoming ? 'Tu Agenda' : 'Agenda'}</h2>
                <button
                  onClick={() => navigate('/calendar?new=true')}
                  className="px-5 py-2.5 rounded-2xl bg-blue-600 text-white flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20 font-bold text-xs"
                >
                  <Plus size={16} /> Nueva Cita
                </button>
              </div>

              {groupedAppointments.length === 0 ? (
                <div className="py-20 text-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm ring-4 ring-slate-50">
                    <CalendarIcon size={32} className="text-slate-200" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Todo despejado</h3>
                  <p className="text-slate-400 text-sm max-w-xs mx-auto font-medium">No hay citas programadas. ¡Disfruta tu día!</p>
                </div>
              ) : (
                <div className="space-y-10">
                  {groupedAppointments.map(group => (
                    <div key={group.label} className="space-y-4">
                      <h3 className="text-[11px] font-black uppercase tracking-[2px] text-slate-400 pl-2">{group.label}</h3>
                      <div className="grid grid-cols-1 gap-4">
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

          {/* ===== Right Column (Quick Actions & Requests) ===== */}
          <div className="lg:col-span-4 space-y-8 animate-in-up stagger-delay-3">
            
            {/* Quick Actions */}
            <div className="bg-slate-50 rounded-[32px] p-8">
              <h2 className="text-[11px] font-black uppercase tracking-[2px] text-slate-400 mb-6">Accesos Rápidos</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/patients?new=true')}
                  className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl hover:shadow-xl hover:shadow-blue-900/5 transition-all group border border-transparent hover:border-blue-100"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-slate-900">Nuevo Paciente</p>
                    <p className="text-xs text-slate-400 font-medium">Crear ficha clínica</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/calendar')}
                  className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl hover:shadow-xl hover:shadow-indigo-900/5 transition-all group border border-transparent hover:border-indigo-100"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CalendarIcon size={24} />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-slate-900">Ver Calendario</p>
                    <p className="text-xs text-slate-400 font-medium">Agenda completa</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Pending Requests */}
            <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[11px] font-black uppercase tracking-[2px] text-slate-400">Solicitudes Web</h2>
                {pendingRequests.length > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white text-[10px] font-black">
                    {pendingRequests.length}
                  </span>
                )}
              </div>

              {pendingRequests.length === 0 ? (
                <p className="text-sm font-bold text-slate-300 text-center py-4 italic">Sin solicitudes pendientes</p>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.slice(0, 2).map(request => (
                    <div 
                      key={request.id} 
                      onClick={() => navigate('/booking/manage')}
                      className="group flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{request.patientName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{request.requestedDate}</p>
                      </div>
                      <ArrowUpRight size={16} className="text-slate-300 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                    </div>
                  ))}
                  <button onClick={() => navigate('/booking/manage')} className="w-full py-3 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors">
                    Ver todas las solicitudes
                  </button>
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
