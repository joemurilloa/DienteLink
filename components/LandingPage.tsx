import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/authService';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  Calendar, Activity, CreditCard, Shield, 
  CheckCircle2, ArrowRight, Star
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const targetRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"]
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

  return (
    <div className="h-screen w-full bg-[#FAFCFF] text-slate-900 overflow-y-auto overflow-x-hidden font-sans relative scroll-smooth" ref={targetRef}>
      {/* Absolute Soft Light Mesh Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-400/10 blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute top-[10%] right-[-10%] w-[50%] h-[60%] rounded-full bg-emerald-400/10 blur-[120px] animate-pulse" style={{ animationDuration: '14s' }} />
        <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[50%] rounded-full bg-indigo-400/10 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.04] mix-blend-overlay"></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-50 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden bg-white shadow-lg shadow-blue-500/10 border border-slate-100">
            <span className="relative z-10 text-2xl">🦷</span>
          </div>
          <span className="text-2xl font-extrabold tracking-tighter text-slate-800">DienteLink</span>
        </div>
        <div className="flex items-center gap-6">
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

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <motion.div 
          style={{ y: heroY, opacity: heroOpacity }}
          className="text-center max-w-4xl mx-auto mb-24"
        >
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white border border-slate-200/60 mb-10 shadow-sm"
          >
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-slate-600 tracking-widest uppercase">El estándar en gestión dental</span>
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
            DienteLink simplifica tu agenda, controla tus finanzas y moderniza la experiencia de tus pacientes con una interfaz minimalista, limpia y profesional.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <button 
              onClick={handleCTA}
              className="w-full sm:w-auto px-10 py-5 bg-blue-600 text-white rounded-full font-bold text-lg transition-all shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-600/40 hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 group"
            >
              <span>Comenzar Prueba Gratis</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 bg-white/50 px-4 py-2 rounded-full border border-slate-200/50">
              <Star className="text-amber-400 fill-amber-400" size={16} />
              <span>Sin tarjeta de crédito</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Hero Mockup Graphic (Clean CSS + Image) */}
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, type: "spring", bounce: 0.4 }}
          className="relative max-w-6xl mx-auto mb-40"
        >
          <div className="absolute -inset-4 bg-gradient-to-b from-blue-100/50 to-transparent rounded-[3rem] blur-xl opacity-50" />
          <div className="relative rounded-[2.5rem] bg-white p-4 backdrop-blur-3xl border border-slate-200/60 shadow-2xl shadow-slate-200/50 overflow-hidden">
            {/* Minimalist Browser Bar */}
            <div className="flex items-center gap-2 px-4 pb-4 pt-2 border-b border-slate-100 mb-4">
              <div className="w-3 h-3 rounded-full bg-slate-200"></div>
              <div className="w-3 h-3 rounded-full bg-slate-200"></div>
              <div className="w-3 h-3 rounded-full bg-slate-200"></div>
            </div>
            {/* The Image inside the mockup */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-50 aspect-[16/9] md:aspect-[21/9]">
                <img 
                  src="https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=2000&q=80" 
                  alt="Clínica Premium" 
                  className="w-full h-full object-cover opacity-90 mix-blend-luminosity"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 to-emerald-400/10 mix-blend-overlay"></div>
                {/* Floating UI Elements Over Image */}
                <div className="absolute top-8 left-8 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 w-64 animate-float">
                   <div className="flex items-center gap-3 mb-3">
                     <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><CheckCircle2 size={20}/></div>
                     <div>
                       <p className="text-sm font-bold text-slate-900">Cita Confirmada</p>
                       <p className="text-xs text-slate-500">Hoy, 10:30 AM</p>
                     </div>
                   </div>
                   <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full w-3/4 bg-emerald-500 rounded-full"></div></div>
                </div>

                <div className="absolute bottom-8 right-8 bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-white/50 animate-float" style={{ animationDelay: '2s' }}>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ingresos Semanales</p>
                   <p className="text-2xl font-black text-slate-900 mb-3">$4,250.00</p>
                   <div className="flex items-end gap-1 h-12">
                     <div className="w-4 bg-blue-100 rounded-t-sm h-1/2"></div>
                     <div className="w-4 bg-blue-200 rounded-t-sm h-3/4"></div>
                     <div className="w-4 bg-blue-300 rounded-t-sm h-2/3"></div>
                     <div className="w-4 bg-blue-400 rounded-t-sm h-4/5"></div>
                     <div className="w-4 bg-blue-600 rounded-t-sm h-full"></div>
                   </div>
                </div>
            </div>
          </div>
        </motion.div>

        {/* Bento Grid Light Mode */}
        <div className="mb-20 text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 mb-6">Poderoso. <br className="hidden md:block"/><span className="text-slate-400">Extraordinariamente simple.</span></h2>
        </div>

        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
        >
          {/* Card 1: Agenda */}
          <motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { type: 'spring' } } }} 
            className="md:col-span-2 relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-200/60 p-10 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all group"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-[80px] group-hover:bg-blue-100/50 transition-colors" />
            <div className="relative z-10 flex flex-col h-full min-h-[280px]">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-8">
                <Calendar size={28} />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Agenda Inteligente</h3>
              <p className="text-lg text-slate-500 max-w-md font-medium leading-relaxed">
                Dile adiós al papel. Visualiza tu semana, gestiona conflictos de horario al instante y permite que tus pacientes reserven directamente en línea.
              </p>
            </div>
          </motion.div>

          {/* Card 2: Odontograma */}
          <motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { type: 'spring' } } }} 
            className="relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-200/60 p-10 hover:shadow-2xl hover:shadow-emerald-500/5 hover:-translate-y-1 transition-all group"
          >
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-emerald-50 rounded-full blur-[60px] group-hover:bg-emerald-100/50 transition-colors" />
            <div className="relative z-10 flex flex-col h-full min-h-[280px]">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-8">
                <Activity size={28} />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Odontograma</h3>
              <p className="text-lg text-slate-500 font-medium leading-relaxed">
                Visual, interactivo y ligado directamente al plan de tratamiento y presupuestos.
              </p>
            </div>
          </motion.div>

          {/* Card 3: Finanzas */}
          <motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { type: 'spring' } } }} 
            className="relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-200/60 p-10 hover:shadow-2xl hover:shadow-amber-500/5 hover:-translate-y-1 transition-all group"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-50 rounded-full blur-[60px] group-hover:bg-amber-100/50 transition-colors" />
            <div className="relative z-10 flex flex-col h-full min-h-[280px]">
              <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-8">
                <CreditCard size={28} />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Finanzas</h3>
              <p className="text-lg text-slate-500 font-medium leading-relaxed">
                Control preciso de ingresos, saldos pendientes y recibos profesionales en PDF.
              </p>
            </div>
          </motion.div>

          {/* Card 4: Expediente */}
          <motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { type: 'spring' } } }} 
            className="md:col-span-2 relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-200/60 p-10 hover:shadow-2xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all group flex flex-col md:flex-row gap-10 items-center"
          >
            <div className="absolute -left-20 bottom-0 w-64 h-64 bg-indigo-50 rounded-full blur-[80px] group-hover:bg-indigo-100/50 transition-colors" />
            <div className="flex-1 relative z-10">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-8">
                <Shield size={28} />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Expediente Clínico</h3>
              <p className="text-lg text-slate-500 mb-8 max-w-md font-medium leading-relaxed">
                Historial médico siempre disponible, consentimientos informados listos para firmar y recetas personalizadas al instante.
              </p>
              <ul className="space-y-4">
                {['Firmas digitales seguras', 'Historial 100% en la nube', 'Respaldo automático'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-base text-slate-700 font-bold">
                    <CheckCircle2 size={22} className="text-indigo-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>

        {/* Pricing Simple Light */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-40 max-w-md mx-auto"
        >
          <div className="bg-white border border-slate-200 rounded-[3rem] p-12 text-center relative overflow-hidden hover:border-blue-200 hover:shadow-[0_20px_60px_rgba(59,130,246,0.1)] transition-all">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500"></div>
            <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Plan Profesional</h3>
            <p className="text-slate-500 text-base mb-10 font-medium">Todo lo que tu clínica necesita para operar al máximo nivel, sin complicaciones.</p>
            
            <div className="flex items-baseline justify-center gap-2 mb-10">
              <span className="text-6xl font-extrabold text-slate-900 tracking-tighter">$15</span>
              <span className="text-slate-500 font-bold text-lg">/ mes</span>
            </div>

            <button 
              onClick={handleCTA}
              className="w-full py-5 bg-blue-600 text-white font-bold rounded-full transition-all shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-600/40 hover:-translate-y-1 active:scale-95 text-lg"
            >
              Comenzar Prueba Gratis
            </button>
          </div>
        </motion.div>
      </main>

      {/* Footer Light */}
      <footer className="border-t border-slate-200 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🦷</span>
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
