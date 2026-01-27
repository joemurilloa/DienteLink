
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import AppointmentCard from './components/AppointmentCard';
import { getAppointments, getDashboardStats } from './services/mockData';
import { Appointment, Stats } from './types';
import { formatCurrency, cn } from './lib/utils';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

const Dashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    setAppointments(getAppointments());
    setStats(getDashboardStats());
  }, []);

  const chartData = [
    { name: 'Mon', income: 400 },
    { name: 'Tue', income: 1300 },
    { name: 'Wed', income: 900 },
    { name: 'Thu', income: 1500 },
    { name: 'Fri', income: 1200 },
    { name: 'Sat', income: 1800 },
    { name: 'Sun', income: 2400 },
  ];

  if (!stats) return null;

  return (
    <div className="flex-1 h-full overflow-y-auto hide-scrollbar pb-24 lg:pb-8 p-4 lg:p-8 bg-slate-50">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 pt-2 lg:pt-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Health Pulse</h2>
          <p className="text-slate-500 text-sm">Welcome back, Dr. Smith</p>
        </div>
        <button className="lg:hidden w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
          <img src="https://i.pravatar.cc/150?u=dr-smith" alt="Doctor" />
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Action Buttons */}
          <div className="flex gap-4">
            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 group">
              <span className="text-xl group-active:scale-90 transition-transform">📅</span>
              <span className="font-semibold text-sm">New Appointment</span>
            </button>
            <button className="flex-1 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 p-4 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 group">
              <span className="text-xl group-active:scale-90 transition-transform">👤</span>
              <span className="font-semibold text-sm">New Patient</span>
            </button>
          </div>

          {/* Monthly Income Card */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-500 text-sm font-medium">Monthly Earnings</p>
                <h3 className="text-3xl font-bold text-slate-900">{formatCurrency(stats.monthlyIncome)}</h3>
                <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
                  ▲ {stats.incomeTrend}% from last month
                </span>
              </div>
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl">
                💰
              </div>
            </div>
            
            <div className="h-48 w-full -mx-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorIncome)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Stats Grid Desktop Only */}
          <div className="hidden lg:grid grid-cols-2 gap-4">
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
              <p className="text-emerald-700 text-sm font-semibold mb-1">Total Patients</p>
              <h4 className="text-2xl font-bold text-emerald-900">{stats.totalPatients}</h4>
            </div>
            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
              <p className="text-amber-700 text-sm font-semibold mb-1">Today's Slots</p>
              <h4 className="text-2xl font-bold text-amber-900">{stats.todayAppointments}</h4>
            </div>
          </div>
        </div>

        {/* Sidebar Column: Appointments */}
        <div className="lg:col-span-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Upcoming Appointments</h3>
            <button className="text-blue-600 text-xs font-bold">View all</button>
          </div>
          <div className="space-y-1">
            {appointments.map(apt => (
              <AppointmentCard key={apt.id} appointment={apt} />
            ))}
          </div>
          
          <div className="mt-8 p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="font-bold mb-1">Telemedicine Pro</h4>
              <p className="text-xs text-slate-400 mb-4">Upgrade your plan to unlock AI diagnosis assistant.</p>
              <button className="bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform">
                Upgrade Now
              </button>
            </div>
            <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-blue-600/20 rounded-full blur-2xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar activePath="dashboard" />
        
        <main className="flex-1 flex flex-col relative overflow-hidden">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            {/* Other routes placeholder */}
            <Route path="*" element={<Dashboard />} />
          </Routes>
          
          <BottomNav activePath="dashboard" />
        </main>
      </div>
    </Router>
  );
};

export default App;
