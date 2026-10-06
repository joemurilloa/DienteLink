import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/authService';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Calendar, Activity, CreditCard, Shield,
  CheckCircle2, ArrowRight, Star
} from 'lucide-react';
import DentalLogo from './DentalLogo';
import { BILLING } from '../lib/billing';

const WEEK = [
  { d: 'L', n: '29' },
  { d: 'M', n: '30' },
  { d: 'M', n: '1' },
  { d: 'J', n: '2', on: true },
  { d: 'V', n: '3' },
  { d: 'S', n: '4' },
  { d: 'D', n: '5' },
];

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  const { scrollYProgress } = useScroll({
    container: targetRef
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const handleCTA = () => {
    if (user) {
      navigate('/', { replace: true });
    } else {
      navigate('/login');
    }
  };

  const handleDemo = () => navigate('/demo');

  if (loading || user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-sm text-slate-400 font-medium">
            {user ? 'Entrando a tu clínica...' : 'Iniciando DienteLink...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#FAFCFF] text-slate-900 overflow-y-auto overflow-x-hidden font-sans relative scroll-smooth" ref={targetRef}>
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-400/10 blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute top-[10%] right-[-10%] w-[50%] h-[60%] rounded-full bg-emerald-400/10 blur-[120px] animate-pulse" style={{ animationDuration: '14s' }} />
        <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[50%] rounded-full bg-indigo-400/10 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.04] mix-blend-overlay"></div>
      </div>

      <nav className="relative z-50 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center overflow-hidden bg-white shadow-lg shadow-blue-500/10 border border-slate-200">
            <DentalLogo size={24} variant="blue" />
          </div>
          <span className="text-2xl font-extrabold tracking-tighter text-slate-800">DienteLink</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={handleDemo} className="hidden md:block text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
            Ver demo
          </button>
          <button onClick={handleCTA} className="hidden md:block text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors">
            {user ? 'Ir a mi Clínica' : 'Iniciar Sesión'}
          </button>
          <button
            onClick={handleCTA}
            className="relative overflow-hidden px-7 py-3 bg-slate-900 text-white rounded-full font-bold text-sm shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:shadow-slate-900/30 hover:-translate-y-0.5 transition-all active:scale-95 group"
          >
            <span className="relative z-10 flex items-center gap-2">
              {user ? 'Abrir App' : 'Comenzar Gratis'}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-32">
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="text-center max-w-4xl mx-auto mb-16"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white border border-slate-200/70 mb-10 shadow-sm"
          >
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-bold text-slate-600 tracking-widest uppercase">Hecho para consultorios dentales</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-[5.5rem] font-black tracking-tighter mb-8 text-slate-900 leading-[1.05]"
          >
            Una clínica impecable. <br className="hidden md:block"/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Pacientes felices.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-2xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed font-medium"
          >
            Agenda, odontograma y finanzas en un solo lugar. Minimalista, limpio y listo para el consultorio.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-5"
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleCTA}
                className="w-full sm:w-auto px-10 py-5 bg-blue-600 text-white rounded-full font-bold text-lg transition-all shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-600/40 hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 group"
              >
                <span>{user ? 'Entrar a mi clínica' : 'Comenzar Prueba Gratis'}</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={handleDemo}
                className="w-full sm:w-auto px-8 py-5 bg-white border border-slate-200 text-slate-700 rounded-full font-semibold text-base transition-all hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 group"
              >
                <span>Ver demo sin registrarse</span>
                <ArrowRight size={16} className="opacity-50 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 bg-white/70 px-4 py-2 rounded-full border border-slate-200/70">
              <Star className="text-amber-400 fill-amber-400" size={16} />
              <span>{BILLING.trialDays} días de prueba · sin tarjeta</span>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.35, type: "spring", bounce: 0.32 }}
          className="relative max-w-6xl mx-auto mb-36"
        >
          <div className="absolute -inset-6 bg-gradient-to-b from-blue-200/40 via-indigo-100/20 to-transparent rounded-[3rem] blur-2xl" />
          <div className="relative rounded-[2.5rem] bg-white/80 p-3 md:p-4 backdrop-blur-xl border border-white shadow-[0_30px_80px_-20px_rgba(15,23,42,0.18)] overflow-hidden">
            <div className="flex items-center gap-2 px-4 pb-3 pt-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
            </div>

            <div className="relative rounded-[1.6rem] overflow-hidden aspect-[16/10] md:aspect-[21/9] bg-slate-200">
              <img
                src="https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=2000&q=80"
                alt=""
                width={2000}
                height={857}
                fetchPriority="high"
                className="w-full h-full object-cover opacity-90 mix-blend-luminosity scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-700/15 via-transparent to-emerald-400/15 mix-blend-overlay" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-white/10" />

              <div className="absolute top-4 left-4 md:top-8 md:left-8 bg-white/92 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/70 w-[15.5rem] animate-float">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Cita confirmada</p>
                    <p className="text-xs text-slate-500">María Fernández · 10:30</p>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-emerald-500 rounded-full" />
                </div>
              </div>

              <div className="hidden sm:block absolute top-6 right-5 md:top-10 md:right-10 bg-white/92 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl border border-white/70 animate-float" style={{ animationDelay: '1.4s' }}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Diente 16</p>
                <p className="text-sm font-bold text-slate-900">Caries · oclusal</p>
                <p className="text-xs text-emerald-600 font-semibold mt-1">En plan de tratamiento</p>
              </div>

              <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8 bg-white/92 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-white/70 animate-float w-[12.5rem]" style={{ animationDelay: '2s' }}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cobrado hoy</p>
                <p className="text-2xl font-black text-slate-900 tracking-tight mb-3">L. 3,800</p>
                <div className="flex items-end gap-1 h-10">
                  <div className="w-3.5 bg-blue-100 rounded-t-sm h-1/2" />
                  <div className="w-3.5 bg-blue-200 rounded-t-sm h-3/4" />
                  <div className="w-3.5 bg-blue-300 rounded-t-sm h-2/3" />
                  <div className="w-3.5 bg-blue-400 rounded-t-sm h-[85%]" />
                  <div className="w-3.5 bg-blue-600 rounded-t-sm h-full" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mb-16 text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 mb-4">Poderoso. <br className="hidden md:block"/><span className="text-slate-400">Extraordinariamente simple.</span></h2>
        </div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { type: 'spring' } } }}
            className="md:col-span-2 relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-200/70 p-10 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all group"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-[80px] group-hover:bg-blue-100/50 transition-colors" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-end gap-10 min-h-[260px]">
              <div className="flex-1">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-8">
                  <Calendar size={28} />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Agenda Inteligente</h3>
                <p className="text-lg text-slate-500 max-w-md font-medium leading-relaxed">
                  Dile adiós al papel. Visualiza tu semana, gestiona conflictos de horario al instante y permite que tus pacientes reserven directamente en línea.
                </p>
              </div>
              <div className="flex gap-2 self-start md:self-end overflow-x-auto pb-1">
                {WEEK.map((day) => (
                  <div
                    key={`${day.d}-${day.n}`}
                    className={`w-11 h-[4.5rem] rounded-2xl flex flex-col items-center justify-center gap-1 shrink-0 ${
                      day.on
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                        : 'bg-slate-50 text-slate-400 border border-slate-100'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider">{day.d}</span>
                    <span className="text-lg font-black leading-none">{day.n}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { type: 'spring' } } }}
            className="relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-200/70 p-10 hover:shadow-2xl hover:shadow-emerald-500/5 hover:-translate-y-1 transition-all group"
          >
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-emerald-50 rounded-full blur-[60px] group-hover:bg-emerald-100/50 transition-colors" />
            <div className="relative z-10 flex flex-col h-full min-h-[260px]">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-8">
                <Activity size={28} />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Odontograma</h3>
              <p className="text-lg text-slate-500 font-medium leading-relaxed mb-8">
                Visual, interactivo y ligado directamente al plan de tratamiento y presupuestos.
              </p>
              <div className="mt-auto flex items-end justify-center gap-1.5 h-16">
                {[
                  { h: 22, tone: 'ok' },
                  { h: 28, tone: 'ok' },
                  { h: 34, tone: 'ok' },
                  { h: 40, tone: 'caries' },
                  { h: 40, tone: 'ok' },
                  { h: 34, tone: 'fill' },
                  { h: 28, tone: 'ok' },
                  { h: 22, tone: 'ok' },
                ].map((tooth, i) => (
                  <div
                    key={i}
                    className={`w-3.5 rounded-[40%_40%_30%_30%] border ${
                      tooth.tone === 'caries'
                        ? 'bg-rose-300 border-rose-200'
                        : tooth.tone === 'fill'
                          ? 'bg-amber-200 border-amber-100'
                          : 'bg-slate-100 border-slate-200'
                    }`}
                    style={{ height: tooth.h }}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { type: 'spring' } } }}
            className="relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-200/70 p-10 hover:shadow-2xl hover:shadow-amber-500/5 hover:-translate-y-1 transition-all group"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-50 rounded-full blur-[60px] group-hover:bg-amber-100/50 transition-colors" />
            <div className="relative z-10 flex flex-col h-full min-h-[260px]">
              <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-8">
                <CreditCard size={28} />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Finanzas</h3>
              <p className="text-lg text-slate-500 font-medium leading-relaxed mb-8">
                Control preciso de ingresos, saldos pendientes y recibos profesionales en PDF.
              </p>
              <div className="mt-auto">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Este mes</p>
                <p className="text-3xl font-black text-slate-900 tracking-tight">L. 18,400</p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { type: 'spring' } } }}
            className="md:col-span-2 relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-200/70 p-10 hover:shadow-2xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all group"
          >
            <div className="absolute -left-20 bottom-0 w-64 h-64 bg-indigo-50 rounded-full blur-[80px] group-hover:bg-indigo-100/50 transition-colors" />
            <div className="relative z-10 max-w-xl">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-8">
                <Shield size={28} />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Expediente Clínico</h3>
              <p className="text-lg text-slate-500 mb-8 font-medium leading-relaxed">
                Historial médico siempre disponible, odontograma por superficie, notas de evolución y recetas en cada consulta.
              </p>
              <ul className="space-y-4">
                {['Odontograma y notas de evolución', 'Historial en la nube', 'Exporta tus pacientes cuando quieras'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-base text-slate-700 font-bold">
                    <CheckCircle2 size={22} className="text-indigo-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-40 max-w-md mx-auto"
        >
          <div className="bg-white border border-slate-200 rounded-[3rem] p-12 text-center relative overflow-hidden hover:border-blue-200 hover:shadow-[0_20px_60px_rgba(59,130,246,0.1)] transition-all">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500"></div>
            <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">{BILLING.planName}</h3>
            <p className="text-slate-500 text-base mb-10 font-medium">Todo lo que tu clínica necesita para operar al máximo nivel, sin complicaciones.</p>

            <div className="flex items-baseline justify-center gap-2 mb-10">
              <span className="text-6xl font-extrabold text-slate-900 tracking-tighter">{BILLING.priceAmount}</span>
              <span className="text-slate-500 font-bold text-lg">/ mes</span>
            </div>

            <button
              onClick={handleCTA}
              className="w-full py-5 bg-blue-600 text-white font-bold rounded-full transition-all shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-600/40 hover:-translate-y-1 active:scale-95 text-lg"
            >
              {user ? 'Entrar a mi clínica' : 'Comenzar Prueba Gratis'}
            </button>
          </div>
        </motion.div>
      </main>

      <footer className="border-t border-slate-200 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <DentalLogo size={22} variant="blue" />
            <span className="font-extrabold tracking-tight text-slate-800">DienteLink</span>
          </div>
          <p className="text-slate-400 text-sm font-bold">
            © {new Date().getFullYear()} DienteLink. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
