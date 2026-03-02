
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import AppointmentCard from './components/AppointmentCard';
import Odontogram from './components/Odontogram';
import Periodontogram from './components/Periodontogram';
import BudgetPlanner from './components/BudgetPlanner';
import XRayViewer from './components/XRayViewer';
import PatientList from './components/PatientList';
import PatientRecord from './components/PatientRecord';
import NewPatientModal from './components/NewPatientModal';
import { whatsappService } from './services/whatsappService';
import { persistenceService } from './services/persistenceService';
import WebhookSimulator from './components/WebhookSimulator';
import { Appointment, ReminderStatus, PatientRecord as PatientRecordType, AppointmentType } from './types';
import { formatCurrency, cn, generateId } from './lib/utils';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { Plus, Calendar as CalendarIcon, History, Search, Settings, Trash2, Users, DollarSign, Activity, ArrowUpRight, ArrowDownRight, TrendingUp, Clock } from 'lucide-react';
import GlobalSearch from './components/GlobalSearch';

// --- DOCTOR CONFIG (until auth is implemented) ---
const DOCTOR_CONFIG = {
  name: 'Dr. Joe Murillo',
  role: 'Odontólogo',
  avatar: 'https://i.pravatar.cc/150?u=dr-smith'
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

const Dashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allPatients, setAllPatients] = useState(() => persistenceService.getPatients());
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];
  const totalBalance = useMemo(() => allPatients.reduce((sum, p) => sum + p.balance, 0), [allPatients]);

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

  // Build chart data from recent clinical events
  const chartData = useMemo(() => {
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayIncome = allPatients.reduce((sum, p) => {
        return sum + p.history.filter(e => e.date === dateStr).reduce((s, e) => s + e.cost, 0);
      }, 0);
      result.push({ name: dayNames[d.getDay()], income: dayIncome });
    }
    return result;
  }, [allPatients]);

  const weeklyTotal = useMemo(() => chartData.reduce((s, d) => s + d.income, 0), [chartData]);

  useEffect(() => {
    setAppointments(persistenceService.getAppointmentsForDate(today));

    const unsubscribe = whatsappService.subscribe(({ appointmentId, status }) => {
      setAppointments(prev => {
        const updated = prev.map(apt => apt.id === appointmentId ? { ...apt, status } : apt);
        const apt = updated.find(a => a.id === appointmentId);
        if (apt) persistenceService.saveAppointment(apt);
        return updated;
      });
    });

    return () => unsubscribe();
  }, []);

  const handleReminderStatusUpdate = useCallback((id: string, status: ReminderStatus) => {
    setAppointments(prev => {
      const updated = prev.map(apt => apt.id === id ? { ...apt, reminderStatus: status } : apt);
      const apt = updated.find(a => a.id === id);
      if (apt) persistenceService.saveAppointment(apt);
      return updated;
    });
  }, []);

  return (
    <div className="flex-1 h-full overflow-y-auto hide-scrollbar pb-32 lg:pb-8 p-5 lg:p-8 page-transition">
      {/* ===== Header — Greeting ===== */}
      <header className="flex items-center justify-between mb-8 animate-in-up stagger-delay-1">
        <div>
          <p className="text-sm font-medium text-slate-400 mb-1">
            {new Date().toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
            {getGreeting()}, <span className="text-teal-600">{DOCTOR_CONFIG.name.replace('Dr. ', '')}</span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            En línea
          </div>
          <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-teal-500/20">
            <img src={DOCTOR_CONFIG.avatar} alt="Doctor" className="w-full h-full object-cover" loading="lazy" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===== Main Content ===== */}
        <div className="lg:col-span-8 space-y-6">

          {/* Quick Actions — compact row */}
          <div className="flex gap-3 animate-in-up stagger-delay-1">
            <button
              onClick={() => navigate('/patients?new=true')}
              className="flex items-center gap-2.5 px-5 py-3 bg-teal-600 text-white rounded-xl font-semibold text-sm shadow-md shadow-teal-600/20 hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-600/25 transition-all duration-200 active:scale-[0.97]"
            >
              <Plus size={18} strokeWidth={2.5} />
              Nuevo Paciente
            </button>
            <button
              onClick={() => navigate('/calendar')}
              className="flex items-center gap-2.5 px-5 py-3 bg-white text-slate-700 rounded-xl font-semibold text-sm border border-slate-200 hover:border-teal-200 hover:text-teal-700 hover:bg-teal-50/50 transition-all duration-200 active:scale-[0.97]"
            >
              <CalendarIcon size={18} strokeWidth={2} />
              Nueva Cita
            </button>
          </div>

          {/* KPI Metrics — 4 compact cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in-up stagger-delay-2">
            {/* Total Pacientes */}
            <div className="card-premium kpi-accent-teal p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600">
                  <Users size={18} />
                </div>
                <div className="flex items-center gap-0.5 text-emerald-600">
                  <ArrowUpRight size={14} />
                  <span className="text-[11px] font-semibold">Activo</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 leading-none">{allPatients.length}</p>
              <p className="text-[11px] font-medium text-slate-400 mt-1">Total pacientes</p>
            </div>

            {/* Citas Hoy */}
            <div className="card-premium kpi-accent-blue p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                  <CalendarIcon size={18} />
                </div>
                <div className="flex items-center gap-0.5 text-blue-600">
                  <Clock size={12} />
                  <span className="text-[11px] font-semibold">Hoy</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 leading-none">{appointments.length}</p>
              <p className="text-[11px] font-medium text-slate-400 mt-1">Citas del día</p>
            </div>

            {/* Balance */}
            <div className="card-premium kpi-accent-emerald p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                  <DollarSign size={18} />
                </div>
                <div className="flex items-center gap-0.5 text-emerald-600">
                  <TrendingUp size={14} />
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-600 leading-none">{formatCurrency(totalBalance)}</p>
              <p className="text-[11px] font-medium text-slate-400 mt-1">Balance clínica</p>
            </div>

            {/* Procedimientos Semana */}
            <div className="card-premium kpi-accent-indigo p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                  <Activity size={18} />
                </div>
                <div className="flex items-center gap-0.5 text-indigo-500">
                  <span className="text-[11px] font-semibold">7d</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 leading-none">{weeklyProcedures}</p>
              <p className="text-[11px] font-medium text-slate-400 mt-1">Procedimientos</p>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="card-premium p-6 animate-in-up stagger-delay-3">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={14} className="text-teal-500" />
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ingresos · Últimos 7 días</p>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrency(weeklyTotal)}</h3>
              </div>
              <button
                onClick={() => navigate('/patients')}
                className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-teal-50"
              >
                Ver detalle →
              </button>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #f1f5f9',
                      boxShadow: '0 10px 30px -8px rgba(0, 0, 0, 0.1)',
                      padding: '10px 14px',
                      fontWeight: '600',
                      fontSize: '12px'
                    }}
                    itemStyle={{ color: '#0d9488' }}
                    labelStyle={{ color: '#64748b', fontWeight: '500', fontSize: '11px' }}
                  />
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} dy={8} />
                  <Area type="monotone" dataKey="income" stroke="#0d9488" strokeWidth={2.5} fill="url(#chartGradient)" animationDuration={1200} dot={false} activeDot={{ r: 5, fill: '#0d9488', strokeWidth: 2, stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ===== Sidebar — Today's Agenda ===== */}
        <div className="lg:col-span-4 flex flex-col gap-4 animate-in-up stagger-delay-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Agenda de Hoy</h3>
            <span className="px-2.5 py-1 bg-teal-50 text-teal-700 rounded-lg text-[11px] font-semibold">{appointments.length} citas</span>
          </div>
          <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-1 hide-scrollbar pb-10">
            {appointments.length === 0 ? (
              <div className="card-premium p-8 text-center">
                <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <CalendarIcon size={24} className="text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-400 mb-1">Sin citas programadas</p>
                <p className="text-xs text-slate-300 mb-4">No hay citas para hoy</p>
                <button
                  onClick={() => navigate('/calendar')}
                  className="text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors"
                >
                  Ir al calendario →
                </button>
              </div>
            ) : (
              appointments.map(apt => (
                <AppointmentCard key={apt.id} appointment={apt} onReminderSent={handleReminderStatusUpdate} />
              ))
            )}
          </div>

          {/* Quick Stats mini-card */}
          <div className="card-premium p-4 mt-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Accesos Rápidos</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate('/patients')}
                className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition-colors"
              >
                <Users size={14} />
                Pacientes
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition-colors"
              >
                <Settings size={14} />
                Ajustes
              </button>
            </div>
          </div>
        </div>
      </div>
      <WebhookSimulator appointments={appointments} />
    </div>
  );
};

const PatientsView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [patients, setPatients] = useState<PatientRecordType[]>(persistenceService.getPatients());
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('new') === 'true');

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const handleSave = (newPatient: PatientRecordType) => {
    persistenceService.savePatient(newPatient);
    setPatients(persistenceService.getPatients());
    navigate(`/patient/${newPatient.id}`);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 lg:p-12 pb-32">
      <PatientList
        patients={patients}
        onSelect={(p) => navigate(`/patient/${p.id}`)}
        onAdd={() => setIsModalOpen(true)}
      />
      <NewPatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
};

const PatientDetailView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientRecordType | undefined>(persistenceService.getPatientById(id || ''));

  if (!patient) return <div className="p-12 font-bold">Paciente no encontrado</div>;

  const handleUpdate = (updated: PatientRecordType) => {
    persistenceService.savePatient(updated);
    setPatient(updated);
  };

  const handleDelete = () => {
    if (window.confirm(`¿Eliminar el expediente de ${patient.identification.fullName}? Esta acción no se puede deshacer.`)) {
      persistenceService.deletePatient(patient.id);
      navigate('/patients');
    }
  };

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col p-5 lg:p-8 pb-32 page-transition">
      <header className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/patients')} className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 border border-slate-200 hover:text-teal-600 transition-all">←</button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-1">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{patient.identification.fullName}</h2>
            <p className="text-slate-400 font-medium text-xs mt-0.5">Expediente #{patient.id.slice(0, 8)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-red-50 text-red-500 rounded-xl font-semibold text-sm hover:bg-red-100 transition-all border border-red-100"
            >
              <Trash2 size={14} /> Eliminar
            </button>
            <button
              onClick={() => navigate(`/calendar?patient=${encodeURIComponent(patient.identification.fullName)}&id=${patient.id}`)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700 transition-all shadow-md shadow-teal-600/20"
            >
              <History size={14} /> Agendar Cita
            </button>
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <PatientRecord patient={patient} onUpdate={handleUpdate} />
      </div>
    </div>
  );
};

const APPOINTMENT_TYPES: AppointmentType[] = ['Consulta', 'Seguimiento', 'Cirugía', 'Revisión'];

const CalendarView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [appointments, setAppointments] = useState(persistenceService.getAppointments());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAdding, setIsAdding] = useState(false);

  const patientNameFromParams = searchParams.get('patient') || '';
  const patientIdFromParams = searchParams.get('id') || '';

  const [newApt, setNewApt] = useState({
    patientName: patientNameFromParams,
    patientId: patientIdFromParams,
    time: '09:00',
    date: new Date().toISOString().split('T')[0],
    type: 'Consulta' as AppointmentType
  });

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleAddAppointment = () => {
    if (!newApt.patientName) return;

    // Try to find patient by name if no patientId is provided
    let patientId = newApt.patientId;
    if (!patientId) {
      const found = persistenceService.getPatients().find(
        p => p.identification.fullName.toLowerCase() === newApt.patientName.toLowerCase()
      );
      patientId = found?.id || '';
    }

    const appointment: Appointment = {
      id: generateId(),
      patientId,
      patientName: newApt.patientName,
      phoneNumber: '',
      time: newApt.time,
      date: newApt.date,
      type: newApt.type,
      status: 'Programada',
      reminderStatus: 'not_sent'
    };
    persistenceService.saveAppointment(appointment);
    setAppointments(persistenceService.getAppointments());
    setIsAdding(false);
    setNewApt({ patientName: '', patientId: '', time: '09:00', date: newApt.date, type: 'Consulta' });
  };

  const handleDeleteAppointment = (e: React.MouseEvent, aptId: string) => {
    e.stopPropagation();
    if (window.confirm('¿Eliminar esta cita?')) {
      persistenceService.deleteAppointment(aptId);
      setAppointments(persistenceService.getAppointments());
    }
  };

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = daysInMonth(year, month);
  const skip = firstDayOfMonth(year, month);

  return (
    <div className="flex-1 h-full overflow-y-auto p-5 lg:p-8 pb-32 page-transition">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 border border-slate-200 hover:text-teal-600 transition-all active:scale-95">←</button>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Agenda</h2>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-5 py-3 bg-teal-600 text-white rounded-xl font-semibold text-sm shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all active:scale-[0.97]"
        >
          <Plus size={16} /> Nueva Cita
        </button>
      </header>

      <div className="card-premium p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900">{monthNames[month]} {year}</h3>
          <div className="flex gap-2">
            <button onClick={handlePrevMonth} className="p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-slate-600">←</button>
            <button onClick={handleNextMonth} className="p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-slate-600">→</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(d => (
            <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-3">{d}</div>
          ))}
          {Array.from({ length: skip }).map((_, i) => <div key={`skip-${i}`} />)}
          {Array.from({ length: days }).map((_, i) => {
            const d = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayApts = appointments.filter(a => a.date === dateStr);
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            return (
              <div
                key={d}
                onClick={() => {
                  setNewApt(prev => ({ ...prev, date: dateStr }));
                  setIsAdding(true);
                }}
                className={cn(
                  "min-h-[100px] p-3 rounded-xl border transition-all cursor-pointer group hover:border-teal-200 hover:shadow-md",
                  isToday ? "bg-teal-50 border-teal-200" : "bg-white border-slate-100"
                )}
              >
                <span className={cn(
                  "text-xs font-bold mb-1.5 block",
                  isToday ? "text-teal-600" : "text-slate-400 group-hover:text-teal-500"
                )}>{d}</span>
                <div className="space-y-1">
                  {dayApts.map(a => (
                    <div key={a.id} className="px-2 py-1 bg-teal-600 text-white rounded-md text-[9px] font-medium truncate flex items-center justify-between gap-1">
                      <span className="truncate">{a.time} - {a.patientName}</span>
                      <button
                        onClick={(e) => handleDeleteAppointment(e, a.id)}
                        className="text-red-300 hover:text-red-100 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  {dayApts.length === 0 && (
                    <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus size={12} className="text-teal-300" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm page-transition">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md page-transition">
            <h3 className="text-xl font-bold text-slate-900 mb-5 tracking-tight">Agendar Cita</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Paciente</label>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none text-sm font-medium focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all"
                  value={newApt.patientName}
                  onChange={e => setNewApt(p => ({ ...p, patientName: e.target.value }))}
                  placeholder="Nombre del paciente..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Fecha</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none text-sm font-medium focus:border-teal-500 transition-all"
                    value={newApt.date}
                    onChange={e => setNewApt(p => ({ ...p, date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Hora</label>
                  <input
                    type="time"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none text-sm font-medium focus:border-teal-500 transition-all"
                    value={newApt.time}
                    onChange={e => setNewApt(p => ({ ...p, time: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tipo de Cita</label>
                <div className="flex gap-2 flex-wrap">
                  {APPOINTMENT_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewApt(p => ({ ...p, type: t }))}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-semibold transition-all",
                        newApt.type === t
                          ? "bg-teal-600 text-white shadow-sm"
                          : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-teal-50 hover:text-teal-600"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleAddAppointment}
                className="w-full py-3.5 bg-teal-600 text-white rounded-xl font-semibold text-sm shadow-md shadow-teal-600/20 hover:bg-teal-700 active:scale-[0.98] transition-all mt-3"
              >
                Confirmar y Agendar
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="w-full py-3 text-slate-400 text-xs font-semibold hover:text-red-500 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsView: React.FC = () => {
  const navigate = useNavigate();

  const handleClearData = () => {
    if (window.confirm('¿Borrar todos los datos? Esto eliminará pacientes, citas y toda la información almacenada. Esta acción no se puede deshacer.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-5 lg:p-8 pb-32 page-transition">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/')} className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 border border-slate-200 hover:text-teal-600 transition-all active:scale-95">←</button>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Ajustes</h2>
      </header>

      <div className="max-w-2xl space-y-5">
        <div className="card-premium p-6">
          <h3 className="text-base font-bold text-slate-900 mb-5">Perfil del Doctor</h3>
          <div className="flex items-center gap-5">
            <img src={DOCTOR_CONFIG.avatar} alt="Doctor" className="w-16 h-16 rounded-xl object-cover ring-2 ring-teal-500/20" />
            <div>
              <p className="text-lg font-bold text-slate-900">{DOCTOR_CONFIG.name}</p>
              <p className="text-sm font-medium text-slate-400">{DOCTOR_CONFIG.role}</p>
            </div>
          </div>
        </div>

        <div className="card-premium p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4">Información de la App</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-sm font-medium text-slate-400">Versión</span>
              <span className="text-sm font-bold text-slate-900">1.0.0</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-sm font-medium text-slate-400">Pacientes Registrados</span>
              <span className="text-sm font-bold text-slate-900">{persistenceService.getPatients().length}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-slate-400">Citas Totales</span>
              <span className="text-sm font-bold text-slate-900">{persistenceService.getAppointments().length}</span>
            </div>
          </div>
        </div>

        <div className="card-premium p-6 border-red-100">
          <h3 className="text-base font-bold text-red-600 mb-3">Zona de Peligro</h3>
          <p className="text-sm text-slate-400 mb-4">Borrar todos los datos almacenados localmente. Esta acción no se puede deshacer.</p>
          <button
            onClick={handleClearData}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 rounded-xl font-semibold text-sm hover:bg-red-100 transition-all border border-red-100"
          >
            <Trash2 size={14} />
            Borrar Todos los Datos
          </button>
        </div>
      </div>
    </div>
  );
};

const Layout: React.FC = () => {
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Ctrl+K keyboard shortcut for global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getActivePath = () => {
    if (location.pathname.startsWith('/patient')) return 'patients';
    if (location.pathname === '/calendar') return 'calendar';
    if (location.pathname === '/settings') return 'settings';
    return 'dashboard';
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activePath={getActivePath()} />
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Global Search Button */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="fixed top-6 right-6 z-[60] hidden lg:flex items-center gap-3 px-4 py-2.5 bg-white/90 backdrop-blur-md rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-200 transition-all duration-200 group active:scale-95"
        >
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-all duration-200">
            <Search size={14} strokeWidth={2.5} />
          </div>
          <span className="text-sm font-medium text-slate-400 group-hover:text-slate-700 transition-colors">Buscar...</span>
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded-md text-[10px] font-semibold text-slate-400">
            <kbd>⌘K</kbd>
          </div>
        </button>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/patients" element={<PatientsView />} />
          <Route path="/patient/:id" element={<PatientDetailView />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/settings" element={<SettingsView />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
        <BottomNav activePath={getActivePath()} />
      </main>
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};

const App: React.FC = () => (
  <Router>
    <Layout />
  </Router>
);

export default App;
