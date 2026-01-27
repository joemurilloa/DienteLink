
import React, { useState, useEffect } from 'react';
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
import { getDashboardStats } from './services/mockData';
import { persistenceService } from './services/persistenceService';
import WebhookSimulator from './components/WebhookSimulator';
import { Appointment, Stats, ReminderStatus, PatientRecord as PatientRecordType } from './types';
import { formatCurrency, cn } from './lib/utils';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { Plus, Calendar as CalendarIcon, History, Search } from 'lucide-react';
import GlobalSearch from './components/GlobalSearch';

const Dashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setAppointments(persistenceService.getAppointments());
    setStats(getDashboardStats());

    const unsubscribe = whatsappService.subscribe(({ appointmentId, status }) => {
      setAppointments(prev => {
        const updated = prev.map(apt => apt.id === appointmentId ? { ...apt, status } : apt);
        // Persistir cambio
        const apt = updated.find(a => a.id === appointmentId);
        if (apt) persistenceService.saveAppointment(apt);
        return updated;
      });
    });

    return () => unsubscribe();
  }, []);

  const handleReminderStatusUpdate = (id: string, status: ReminderStatus) => {
    setAppointments(prev => {
      const updated = prev.map(apt => apt.id === id ? { ...apt, reminderStatus: status } : apt);
      const apt = updated.find(a => a.id === id);
      if (apt) persistenceService.saveAppointment(apt);
      return updated;
    });
  };

  const chartData = [
    { name: 'Lun', income: 4200 }, { name: 'Mar', income: 3800 }, { name: 'Mie', income: 5100 },
    { name: 'Jue', income: 4800 }, { name: 'Vie', income: 6200 }, { name: 'Sab', income: 5800 }, { name: 'Dom', income: 7500 },
  ];

  if (!stats) return null;

  return (
    <div className="flex-1 h-full overflow-y-auto hide-scrollbar pb-32 lg:pb-12 p-6 lg:p-12">
      <header className="flex items-center justify-between mb-12">
        <div className="animate-in fade-in slide-in-from-left duration-700">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic">DienteLink</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">WhatsApp Sync: Activo (Simulado)</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <img src="https://i.pravatar.cc/150?u=dr-smith" alt="Doctor" className="w-12 h-12 rounded-2xl border-2 border-white shadow-xl" />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Accesos Directos de Alta Utilidad */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => navigate('/patients?new=true')}
              className="depth-card bg-blue-600 p-8 rounded-[40px] text-white flex flex-col gap-4 shadow-[0_25px_50px_-12px_rgba(59,130,246,0.5)] group h-56 justify-center"
            >
              <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center text-3xl backdrop-blur-md group-hover:scale-110 transition-transform">➕</div>
              <div>
                <h4 className="font-black text-lg text-white">Nuevo Registro</h4>
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">Crear expediente</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/patients')}
              className="depth-card bg-white p-8 rounded-[40px] text-slate-900 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col gap-4 group h-56 justify-center"
            >
              <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">👥</div>
              <div>
                <h4 className="font-black text-lg text-slate-900">Ver Pacientes</h4>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Lista completa</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/calendar')}
              className="depth-card bg-white p-8 rounded-[40px] text-slate-900 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col gap-4 group h-56 justify-center"
            >
              <div className="w-16 h-16 bg-purple-50 rounded-3xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">📅</div>
              <div>
                <h4 className="font-black text-lg text-slate-900">Ver Agenda</h4>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Citas de la semana</p>
              </div>
            </button>
          </div>

          {/* Métricas Clínicas Rápidas */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Pacientes</p>
              <h4 className="text-2xl font-black text-slate-900">{persistenceService.getPatients().length}</h4>
            </div>
            <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Citas Hoy</p>
              <h4 className="text-2xl font-black text-slate-900">{appointments.length}</h4>
            </div>
            <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 col-span-2 lg:col-span-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Balance Clínica</p>
              <h4 className="text-2xl font-black text-emerald-600">{formatCurrency(persistenceService.getPatients().reduce((sum, p) => sum + p.balance, 0))}</h4>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-[40px] border-white/60">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-slate-400 text-[11px] font-black uppercase tracking-[2px] mb-1">Rendimiento Mensual</p>
                <h3 className="text-4xl font-extrabold text-slate-900 tracking-tighter">{formatCurrency(stats.monthlyIncome)}</h3>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <Area type="monotone" dataKey="income" stroke="#3b82f6" strokeWidth={5} fill="url(#chartGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <h3 className="text-xl font-black text-slate-900 tracking-tight px-2">Agenda Hoy</h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 hide-scrollbar">
            {appointments.map(apt => (
              <AppointmentCard key={apt.id} appointment={apt} onReminderSent={handleReminderStatusUpdate} />
            ))}
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

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col p-6 lg:p-12 pb-32">
      <header className="flex items-center gap-6 mb-8">
        <button onClick={() => navigate('/patients')} className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400 border border-slate-100 hover:text-blue-600">←</button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tighter">{patient.identification.fullName}</h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Expediente #{patient.id}</p>
          </div>
          <button
            onClick={() => navigate(`/calendar?patient=${encodeURIComponent(patient.identification.fullName)}&id=${patient.id}`)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
          >
            <History size={14} /> Agendar Próxima Cita
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <PatientRecord patient={patient} onUpdate={handleUpdate} />
      </div>
    </div>
  );
};

const CalendarView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [appointments, setAppointments] = useState(persistenceService.getAppointments());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [newApt, setNewApt] = useState({
    patientName: searchParams.get('patient') || '',
    time: '09:00',
    date: new Date().toISOString().split('T')[0],
    type: 'Consultation' as Appointment['type']
  });

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleAddAppointment = () => {
    if (!newApt.patientName) return;
    const appointment: Appointment = {
      id: Math.random().toString(36).substr(2, 9),
      patientName: newApt.patientName,
      phoneNumber: '555-0123',
      time: newApt.time,
      date: newApt.date,
      type: newApt.type,
      status: 'Scheduled',
      reminderStatus: 'not_sent'
    };
    persistenceService.saveAppointment(appointment);
    setAppointments(persistenceService.getAppointments());
    setIsAdding(false);
  };

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = daysInMonth(year, month);
  const skip = firstDayOfMonth(year, month);

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 lg:p-12 pb-32">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/')} className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400 border border-slate-100 hover:text-blue-600 transition-all active:scale-95">←</button>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tighter">Agenda Quirúrgica</h2>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <Plus size={16} /> Nueva Cita
        </button>
      </header>

      <div className="glass-panel p-8 rounded-[48px] border-white/60 mb-8">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-black text-slate-900">{monthNames[month]} {year}</h3>
          <div className="flex gap-2">
            <button onClick={handlePrevMonth} className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">←</button>
            <button onClick={handleNextMonth} className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">→</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(d => (
            <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 py-4">{d}</div>
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
                  "min-h-[120px] p-4 rounded-3xl border transition-all cursor-pointer group hover:border-blue-300 hover:shadow-xl hover:shadow-blue-50/50",
                  isToday ? "bg-blue-50 border-blue-200" : "bg-white border-slate-100"
                )}
              >
                <span className={cn(
                  "text-sm font-black mb-2 block",
                  isToday ? "text-blue-600" : "text-slate-400 group-hover:text-blue-500"
                )}>{d}</span>
                <div className="space-y-1">
                  {dayApts.map(a => (
                    <div key={a.id} className="px-2 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-bold truncate">
                      {a.time} - {a.patientName}
                    </div>
                  ))}
                  {dayApts.length === 0 && (
                    <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus size={12} className="text-blue-300" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">Agendar Cita</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Paciente</label>
                <input
                  className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none text-sm font-bold focus:border-blue-500"
                  value={newApt.patientName}
                  onChange={e => setNewApt(p => ({ ...p, patientName: e.target.value }))}
                  placeholder="Nombre del paciente..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha</label>
                  <input
                    type="date"
                    className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none text-sm font-bold"
                    value={newApt.date}
                    onChange={e => setNewApt(p => ({ ...p, date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hora</label>
                  <input
                    type="time"
                    className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none text-sm font-bold"
                    value={newApt.time}
                    onChange={e => setNewApt(p => ({ ...p, time: e.target.value }))}
                  />
                </div>
              </div>
              <button
                onClick={handleAddAppointment}
                className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black uppercase tracking-widest text-[11px] shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all mt-4"
              >
                Confirmar y Agendar
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="w-full py-4 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-red-500 transition-colors"
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
    return 'dashboard';
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activePath={getActivePath()} />
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Global Search Button */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="fixed top-6 right-6 z-50 hidden lg:flex items-center gap-3 px-5 py-3 bg-white/80 backdrop-blur-lg rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-all group"
        >
          <Search size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
          <span className="text-sm font-medium text-slate-400 group-hover:text-slate-600 transition-colors">Buscar...</span>
          <kbd className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-400">Ctrl+K</kbd>
        </button>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/patients" element={<PatientsView />} />
          <Route path="/patient/:id" element={<PatientDetailView />} />
          <Route path="/calendar" element={<CalendarView />} />
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
