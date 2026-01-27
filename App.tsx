
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import AppointmentCard from './components/AppointmentCard';
import Odontogram from './components/Odontogram';
import Periodontogram from './components/Periodontogram';
import BudgetPlanner from './components/BudgetPlanner';
import XRayViewer from './components/XRayViewer';
import AIAssistant from './components/AIAssistant';
import { getAppointments, getDashboardStats } from './services/mockData';
import { Appointment, Stats, ReminderStatus } from './types';
import { formatCurrency, cn } from './lib/utils';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

const Dashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setAppointments(getAppointments());
    setStats(getDashboardStats());
  }, []);

  const handleReminderStatusUpdate = (id: string, status: ReminderStatus) => {
    setAppointments(prev => prev.map(apt => apt.id === id ? { ...apt, reminderStatus: status } : apt));
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
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tighter">MedPulse Studio</h2>
          <p className="text-slate-500 font-semibold text-sm mt-1">Lunes, 20 de Mayo • 8 Citas hoy</p>
        </div>
        <div className="flex items-center gap-4">
           <button className="hidden md:flex w-12 h-12 bg-white rounded-2xl items-center justify-center text-slate-400 shadow-sm border border-slate-100 hover:text-blue-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
           </button>
           <img src="https://i.pravatar.cc/150?u=dr-smith" alt="Doctor" className="w-12 h-12 rounded-2xl border-2 border-white shadow-xl" />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Acciones Rápidas 3D */}
          <div className="grid grid-cols-2 gap-6">
            <button 
              onClick={() => navigate('/dental')}
              className="depth-card bg-blue-600 p-6 rounded-[32px] text-white flex flex-col gap-4 shadow-[0_20px_40px_rgba(59,130,246,0.3)] group"
            >
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-md group-hover:scale-110 transition-transform">🦷</div>
              <div className="text-left">
                <span className="block font-black text-lg tracking-tight">Odontograma</span>
                <span className="text-blue-100 text-xs font-bold uppercase tracking-widest">Nuevo Registro</span>
              </div>
            </button>
            <button className="depth-card bg-white p-6 rounded-[32px] text-slate-900 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col gap-4 group">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">👤</div>
              <div className="text-left">
                <span className="block font-black text-lg tracking-tight">Paciente</span>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Alta rápida</span>
              </div>
            </button>
          </div>

          {/* Gráfico Financiero de Alta Gama */}
          <div className="glass-panel p-8 rounded-[40px] border-white/60">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-slate-400 text-[11px] font-black uppercase tracking-[2px] mb-1">Rendimiento Mensual</p>
                <h3 className="text-4xl font-extrabold text-slate-900 tracking-tighter">{formatCurrency(stats.monthlyIncome)}</h3>
                <div className="flex items-center gap-2 mt-2">
                   <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded-lg">+ {stats.incomeTrend}%</span>
                   <span className="text-slate-400 text-xs font-semibold">vs Abril 2024</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl text-blue-600 shadow-inner">📈</div>
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25}/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    stroke="#3b82f6" 
                    strokeWidth={5}
                    fillOpacity={1} 
                    fill="url(#chartGradient)" 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Panel Lateral de Citas */}
        <div className="lg:col-span-4 flex flex-col gap-6">
           <div className="flex items-center justify-between px-2">
             <h3 className="text-xl font-black text-slate-900 tracking-tight">Agenda Hoy</h3>
             <span className="text-xs font-black text-blue-600 uppercase tracking-widest cursor-pointer hover:underline">Calendario</span>
           </div>
           
           <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 hide-scrollbar">
              {appointments.map(apt => (
                <AppointmentCard 
                  key={apt.id} 
                  appointment={apt} 
                  onReminderSent={handleReminderStatusUpdate}
                />
              ))}
           </div>
           
           <div 
             onClick={() => navigate('/ai')}
             className="depth-card bg-slate-900 p-8 rounded-[36px] text-white relative overflow-hidden cursor-pointer group mt-4 shadow-2xl shadow-slate-900/20"
           >
             <div className="relative z-10">
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-[0_0_20px_rgba(59,130,246,0.5)]">✨</div>
                 <h4 className="font-extrabold text-lg tracking-tight">Asistente Gemini</h4>
               </div>
               <p className="text-sm text-slate-400 leading-relaxed font-medium">Analice diagnósticos complejos o revise interacciones químicas al instante.</p>
               <div className="mt-6 flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest">
                 Lanzar ahora <span className="group-hover:translate-x-2 transition-transform">→</span>
               </div>
             </div>
             <div className="absolute top-[-30%] right-[-10%] w-64 h-64 bg-blue-600/20 rounded-full blur-[100px] group-hover:bg-blue-600/40 transition-all duration-700"></div>
           </div>
        </div>
      </div>
    </div>
  );
};

// Vistas simplificadas para el resto de rutas (comparten el layout)
const DentalView: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'odontogram' | 'periodontogram' | 'budget' | 'xray'>('odontogram');

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 lg:p-12 animate-in fade-in zoom-in-95 duration-500 pb-32">
      <header className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/')} className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400 border border-slate-100 hover:text-blue-600 transition-all active:scale-90">←</button>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tighter">Historial Odontológico</h2>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-[24px] border border-slate-200 overflow-x-auto hide-scrollbar max-w-full">
          <button 
            onClick={() => setView('odontogram')}
            className={cn(
              "px-6 py-2.5 rounded-[18px] text-[11px] font-black transition-all uppercase tracking-wider whitespace-nowrap",
              view === 'odontogram' ? "bg-white text-slate-900 shadow-md" : "text-slate-400"
            )}
          >
            Odontograma
          </button>
          <button 
            onClick={() => setView('periodontogram')}
            className={cn(
              "px-6 py-2.5 rounded-[18px] text-[11px] font-black transition-all uppercase tracking-wider whitespace-nowrap",
              view === 'periodontogram' ? "bg-white text-slate-900 shadow-md" : "text-slate-400"
            )}
          >
            Periodontograma
          </button>
          <button 
            onClick={() => setView('budget')}
            className={cn(
              "px-6 py-2.5 rounded-[18px] text-[11px] font-black transition-all uppercase tracking-wider whitespace-nowrap",
              view === 'budget' ? "bg-white text-slate-900 shadow-md" : "text-slate-400"
            )}
          >
            Presupuesto
          </button>
          <button 
            onClick={() => setView('xray')}
            className={cn(
              "px-6 py-2.5 rounded-[18px] text-[11px] font-black transition-all uppercase tracking-wider whitespace-nowrap",
              view === 'xray' ? "bg-white text-slate-900 shadow-md" : "text-slate-400"
            )}
          >
            Radiografías
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto space-y-12">
        {view === 'odontogram' && <Odontogram patientId="1" />}
        {view === 'periodontogram' && <Periodontogram />}
        {view === 'budget' && <BudgetPlanner />}
        {view === 'xray' && <XRayViewer />}
      </div>
    </div>
  );
};

const AIView: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col p-6 lg:p-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <header className="flex items-center gap-6 mb-12">
        <button onClick={() => navigate('/')} className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400 border border-slate-100 hover:text-blue-600 transition-all active:scale-90">←</button>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tighter">Centro de Inteligencia</h2>
      </header>
      <div className="flex-1 overflow-hidden max-w-3xl mx-auto w-full"><AIAssistant /></div>
    </div>
  );
};

const Layout: React.FC = () => {
  const location = useLocation();
  const getActivePath = () => {
    if (location.pathname === '/dental') return 'patients';
    if (location.pathname === '/ai') return 'ai';
    return 'dashboard';
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activePath={getActivePath()} />
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dental" element={<DentalView />} />
          <Route path="/ai" element={<AIView />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
        <BottomNav activePath={getActivePath()} />
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <Layout />
    </Router>
  );
};

export default App;
