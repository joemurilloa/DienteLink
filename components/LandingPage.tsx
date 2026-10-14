import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/authService';
import { Check, ArrowRight, CalendarDays, Users } from 'lucide-react';
import DentalLogo from './DentalLogo';
import { BILLING } from '../lib/billing';
import { SUPPORT_WHATSAPP } from '../lib/support';

const INCLUDED = [
  'Agenda del día',
  'Expediente clínico',
  'Odontograma',
  'Presupuestos del tratamiento',
  'Reservas en línea',
  `${BILLING.trialDays} días sin tarjeta`,
];

const TOOTH_SHAPE: Record<'molar' | 'premolar' | 'canine' | 'incisor', string> = {
  molar: 'M15 30C15 15 30 8 50 8C70 8 85 15 85 30C85 50 80 80 75 110C70 125 60 130 50 130C40 130 30 125 25 110C20 80 15 50 15 30Z',
  premolar: 'M22 28C22 16 35 10 50 10C65 10 78 16 78 28C78 48 74 80 68 112C62 126 50 130 50 130C50 130 38 126 32 112C26 80 22 48 22 28Z',
  canine: 'M28 28C28 18 40 12 50 12C60 12 72 18 72 28C72 48 68 82 62 112C58 128 50 132 42 128C32 112 28 48 28 28Z',
  incisor: 'M25 22C25 14 35 10 50 10C65 10 75 14 75 22C75 42 72 82 65 112C60 126 50 130 40 124C30 108 25 42 25 22Z',
};

const toothKind = (id: number): keyof typeof TOOTH_SHAPE => {
  if ([1, 2, 3, 14, 15, 16, 17, 18, 19, 30, 31, 32].includes(id)) return 'molar';
  if ([4, 5, 12, 13, 20, 21, 28, 29].includes(id)) return 'premolar';
  if ([6, 11, 22, 27].includes(id)) return 'canine';
  return 'incisor';
};

const SURFACE = {
  vestibular: 'M 2 2 L 22 2 L 17 8 L 7 8 Z',
  distal: 'M 22 2 L 22 22 L 17 17 L 17 8 Z',
  lingual: 'M 22 22 L 2 22 L 7 17 L 17 17 Z',
  mesial: 'M 2 22 L 2 2 L 7 8 L 7 17 Z',
  center: 'M 7 8 L 17 8 L 17 17 L 7 17 Z',
};

const Block: React.FC<{ n: string; title: string; text: string; children: React.ReactNode }> = ({ n, title, text, children }) => (
  <section className="grid items-start gap-8 border-t border-blue-100 py-16 md:grid-cols-12 md:gap-12">
    <div className="md:col-span-4">
      <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-blue-600">{n}</p>
      <h2 className="mb-3 text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="leading-relaxed text-slate-600">{text}</p>
    </div>
    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-900/5 md:col-span-8 md:p-6">
      {children}
    </div>
  </section>
);

const ChartTooth: React.FC<{ id: number; caries?: boolean }> = ({ id, caries }) => (
  <div className="flex w-full max-w-10 flex-col items-center sm:w-7 sm:max-w-none">
    <svg viewBox="0 0 100 140" className="h-11 w-auto sm:h-9" aria-hidden>
      <path d={TOOTH_SHAPE[toothKind(id)]} fill="#FFFDF8" stroke="#93C5FD" strokeWidth="3" />
    </svg>
    <span className="mt-0.5 text-[11px] font-semibold tabular-nums leading-none text-slate-500 sm:text-[9px]">{id}</span>
    <svg viewBox="0 0 24 24" className="mt-1 h-6 w-6 sm:mt-0.5 sm:h-3.5 sm:w-3.5" aria-hidden>
      {(Object.keys(SURFACE) as (keyof typeof SURFACE)[]).map(key => (
        <path
          key={key}
          d={SURFACE[key]}
          fill={caries && key === 'center' ? '#EF4444' : '#FFFFFF'}
          stroke={caries && key === 'center' ? '#EF4444' : '#D1D5DB'}
          strokeWidth="0.6"
        />
      ))}
    </svg>
  </div>
);

const ProductPreview: React.FC = () => (
  <div
    id="producto"
    className="relative overflow-hidden rounded-[24px] border border-blue-200/80 bg-white shadow-2xl shadow-blue-900/15"
    aria-label="Vista previa del panel de DienteLink"
  >
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
      <div className="flex items-center gap-1.5" aria-hidden>
        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
      </div>
      <span className="text-[10px] font-semibold tracking-wide text-slate-400">TU CONSULTORIO HOY</span>
      <span className="h-2 w-2 rounded-full bg-emerald-400" title="En línea" />
    </div>
    <div className="grid grid-cols-[60px_1fr] sm:grid-cols-[78px_1fr]">
      <div className="flex flex-col items-center gap-5 border-r border-slate-100 bg-slate-950 px-2 py-5 text-blue-200">
        <DentalLogo size={22} variant="white" />
        <CalendarDays size={17} />
        <Users size={17} className="opacity-60" />
        <span className="mt-auto h-7 w-7 rounded-full bg-blue-500/30" />
      </div>
      <div className="min-w-0 bg-slate-50 p-4 sm:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Viernes, 9 de octubre</p>
        <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">Buenos días, Alejandro.</p>
        <div className="mt-4 rounded-xl border border-blue-100 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wide text-blue-600">Próximo paciente</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900">María Fernández</p>
              <p className="text-xs text-slate-500">08:30 · Consulta</p>
            </div>
            <span className="rounded-full bg-blue-600 px-3 py-1.5 text-[10px] font-bold text-white">Iniciar</span>
          </div>
        </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-slate-100 bg-white p-3">
            <p className="text-[9px] font-semibold uppercase text-slate-400">Citas de hoy</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">6</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-white p-3">
            <p className="text-[9px] font-semibold uppercase text-slate-400">Reservas en línea</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">2</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleCTA = () => {
    if (user) {
      navigate('/', { replace: true });
    } else {
      navigate('/login?elegir=1');
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
    <div className="h-screen w-full overflow-y-auto overflow-x-hidden bg-[linear-gradient(180deg,#e8f1ff_0%,#f7faff_220px,#ffffff_520px)] font-sans text-slate-900" ref={targetRef}>
      <nav className="sticky top-0 z-50 border-b border-blue-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#inicio" className="flex items-center gap-2.5" aria-label="DienteLink, volver al inicio">
            <DentalLogo size={22} variant="blue" />
            <span className="text-lg font-semibold tracking-tight text-slate-900">DienteLink</span>
          </a>
          <div className="flex items-center gap-6">
            <a href="#funciones" className="hidden text-sm text-slate-600 hover:text-slate-900 lg:block">
              Funciones
            </a>
            <a href="#seguridad" className="hidden text-sm text-slate-600 hover:text-slate-900 lg:block">
              Seguridad
            </a>
            <a href="#precio" className="hidden text-sm text-slate-600 hover:text-slate-900 lg:block">
              Precio
            </a>
            <button onClick={handleDemo} className="hidden text-sm text-slate-600 hover:text-slate-900 md:block">
              Ver demo
            </button>
            <a href="/login" className="hidden text-sm text-slate-600 hover:text-slate-900 md:block">
              {user ? 'Ir a mi clínica' : 'Iniciar sesión'}
            </a>
            <button
              onClick={handleCTA}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-600/30 hover:bg-blue-700"
            >
              {user ? 'Abrir app' : 'Comenzar'}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6">
        <header id="inicio" className="relative grid items-center gap-10 py-14 md:py-24 lg:grid-cols-[1.05fr_.95fr]">
          <div aria-hidden className="pointer-events-none absolute -left-16 -top-10 h-64 w-64 rounded-full bg-blue-400/25 blur-3xl" />
          <div className="relative">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Programa para consultorios dentales</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-6xl sm:leading-[1.05]">
              Agenda, expediente y odontograma en un solo lugar.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              DienteLink organiza las citas del día, la historia clínica de cada paciente y el estado de cada pieza. También puedes preparar el presupuesto de un tratamiento y compartir un enlace para que reserven hora.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <button
                onClick={handleCTA}
                className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700"
              >
                {user ? 'Entrar a mi clínica' : 'Comenzar prueba gratis'}
              </button>
              <p className="text-sm text-slate-600">{BILLING.trialDays} días · sin tarjeta</p>
              <button onClick={handleDemo} className="text-sm font-semibold text-blue-700 md:hidden">
                Ver demo
              </button>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Continúa con Google. Si es tu primera vez, tu cuenta se crea automáticamente.
            </p>
          </div>
          <ProductPreview />
        </header>

        <div id="funciones">
          <Block
            n="01"
            title="Agenda"
            text="Las citas del día aparecen con su hora, el nombre del paciente y el motivo. Si un horario ya está ocupado, no admite otra cita. Desde ahí puedes enviar un aviso por WhatsApp."
          >
          <div className="mb-4 grid grid-cols-7 gap-1.5">
            {[
              { d: 'L', on: false },
              { d: 'M', on: false },
              { d: 'M', on: true },
              { d: 'J', on: false },
              { d: 'V', on: false },
              { d: 'S', on: false },
              { d: 'D', on: false },
            ].map((day, i) => (
              <div
                key={`${day.d}-${i}`}
                className={`flex h-9 items-center justify-center rounded-lg text-xs font-semibold ${
                  day.on ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30' : 'bg-blue-50 text-slate-500'
                }`}
              >
                {day.d}
              </div>
            ))}
          </div>
          <div className="divide-y divide-blue-100 overflow-hidden rounded-xl border border-blue-100 bg-white">
            {[
              { time: '09:00', name: 'Ana López', note: 'Consulta', now: false },
              { time: '10:30', name: 'Carlos Méndez', note: 'Ahora', now: true },
              { time: '14:00', name: 'Libre', note: '', now: false },
            ].map(row => (
              <div key={row.time} className={`flex items-center gap-4 px-4 py-3 ${row.now ? 'bg-blue-50' : ''}`}>
                <span className={`w-12 text-sm tabular-nums ${row.now ? 'font-semibold text-blue-700' : 'text-slate-400'}`}>{row.time}</span>
                <span className={`flex-1 text-sm ${row.name === 'Libre' ? 'text-slate-400' : 'font-medium text-slate-900'}`}>{row.name}</span>
                {row.note && (
                  <span className={`text-xs ${row.now ? 'rounded-full bg-blue-600 px-2 py-0.5 font-semibold text-white' : 'text-slate-400'}`}>
                    {row.note}
                  </span>
                )}
              </div>
            ))}
          </div>
          </Block>

          <Block
            n="02"
            title="Odontograma"
            text="Cada pieza queda en el expediente, con sus caras. Al anotar una caries, la superficie correspondiente se marca en rojo."
          >
          <div>
            <div className="sm:hidden">
              <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-500">Arcada superior</p>
              {([
                { label: 'Derecho', ids: [1, 2, 3, 4, 5, 6, 7, 8] },
                { label: 'Izquierdo', ids: [9, 10, 11, 12, 13, 14, 15, 16] },
              ] as const).map(row => (
                <div key={row.label} className="mb-3">
                  <p className="mb-1 text-center text-[10px] font-medium text-slate-400">{row.label}</p>
                  <div className="grid grid-cols-8 justify-items-center gap-x-1">
                    {row.ids.map(id => (
                      <ChartTooth key={id} id={id} caries={id === 14} />
                    ))}
                  </div>
                </div>
              ))}
              <div className="my-2 h-px bg-blue-100" />
              <p className="mb-3 mt-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-500">Arcada inferior</p>
              {([
                { label: 'Derecho', ids: [32, 31, 30, 29, 28, 27, 26, 25] },
                { label: 'Izquierdo', ids: [24, 23, 22, 21, 20, 19, 18, 17] },
              ] as const).map(row => (
                <div key={`lower-${row.label}`} className="mb-3">
                  <p className="mb-1 text-center text-[10px] font-medium text-slate-400">{row.label}</p>
                  <div className="grid grid-cols-8 justify-items-center gap-x-1">
                    {row.ids.map(id => (
                      <ChartTooth key={id} id={id} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden sm:block">
              <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-500">Arcada superior</p>
              <div className="flex justify-center gap-1">
                {Array.from({ length: 16 }, (_, i) => i + 1).map(id => (
                  <ChartTooth key={id} id={id} caries={id === 14} />
                ))}
              </div>
              <div className="my-4 h-px bg-blue-100" />
              <div className="flex justify-center gap-1">
                {[32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17].map(id => (
                  <ChartTooth key={id} id={id} />
                ))}
              </div>
              <p className="mt-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-500">Arcada inferior</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 rounded-xl border border-red-100 bg-red-50/70 px-4 py-3">
            <svg viewBox="0 0 24 24" className="h-14 w-14 shrink-0" aria-hidden>
              {(Object.keys(SURFACE) as (keyof typeof SURFACE)[]).map(key => (
                <path
                  key={key}
                  d={SURFACE[key]}
                  fill={key === 'center' ? '#EF4444' : '#FFFFFF'}
                  stroke={key === 'center' ? '#EF4444' : '#CBD5E1'}
                  strokeWidth="0.6"
                />
              ))}
            </svg>
            <p className="text-sm leading-snug text-slate-700">
              Pieza 14 · <span className="font-semibold text-red-600">caries en la cara oclusal</span>
            </p>
          </div>
          </Block>

          <Block
            n="03"
            title="Presupuesto y reservas"
            text="En la ficha preparas el presupuesto del tratamiento y anotas los pagos que el paciente ya realizó. Quien lo desee puede pedir cita en los horarios que definiste para tu enlace."
          >
          <div className="grid gap-px overflow-hidden rounded-xl border border-blue-100 bg-blue-100 sm:grid-cols-2">
            <div className="bg-white px-5 py-4">
              <p className="text-xs font-medium text-blue-600">Presupuesto del tratamiento</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">L 2,400</p>
              <p className="mt-1 text-sm text-slate-500">Resina · pieza 14</p>
            </div>
            <div className="bg-white px-5 py-4">
              <p className="text-xs font-medium text-blue-600">Horarios del enlace</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['09:00', '09:30', '10:00', '14:00', '14:30'].map(hour => (
                  <span key={hour} className="rounded-full bg-blue-50 px-2.5 py-1 text-sm font-medium tabular-nums text-blue-700">{hour}</span>
                ))}
              </div>
            </div>
          </div>
          </Block>
        </div>

        <div id="seguridad">
          <Block
            n="04"
            title="Respaldo"
            text="Cuando quieras, descargas una copia de la clínica: expedientes, citas, odontogramas y presupuestos. Esa información es tuya. DienteLink no la vende ni la usa para publicidad."
          >
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Copia de tu consultorio</p>
            <div className="divide-y divide-blue-100 overflow-hidden rounded-xl border border-blue-100 bg-white">
              {[
                { name: 'Expedientes', note: '48 pacientes' },
                { name: 'Citas', note: 'Agenda completa' },
                { name: 'Odontogramas', note: 'En cada ficha' },
                { name: 'Presupuestos', note: 'Tratamientos y pagos' },
              ].map(row => (
                <div key={row.name} className="flex items-center gap-4 px-4 py-3">
                  <span className="flex-1 text-sm font-medium text-slate-900">{row.name}</span>
                  <span className="text-xs text-slate-400">{row.note}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">consultorio-octubre.zip</p>
                <p className="text-xs text-slate-500">Listo para guardar en tu equipo</p>
              </div>
              <span className="shrink-0 rounded-full bg-blue-600 px-3 py-1.5 text-[10px] font-bold text-white">Descargar</span>
            </div>
          </Block>
        </div>

        <section id="precio" className="grid items-center gap-10 border-t border-blue-100 py-16 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="text-sm font-medium text-blue-600">{BILLING.planName}</p>
            <p className="mt-2 text-5xl font-semibold tracking-tight text-slate-900">
              {BILLING.priceAmount}
              <span className="text-lg font-medium text-slate-400"> / mes</span>
            </p>
            <button
              onClick={handleCTA}
              className="mt-8 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700"
            >
              {user ? 'Entrar a mi clínica' : 'Comenzar prueba gratis'}
            </button>
          </div>
          <ul className="grid content-center gap-3 sm:grid-cols-2 md:col-span-7">
            {INCLUDED.map(item => (
              <li key={item} className="flex items-center gap-3 text-sm text-slate-700">
                <Check size={16} className="flex-shrink-0 text-blue-600" />
                {item}
              </li>
            ))}
          </ul>
        </section>

      </main>

      <footer className="border-t border-blue-100">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <a href="#inicio" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <DentalLogo size={18} variant="blue" />
              DienteLink
            </a>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
              Agenda, expediente y odontograma para consultorios dentales.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
            <a href="/terminos" className="text-slate-500 hover:text-slate-900">Términos y privacidad</a>
            <a href={`https://wa.me/${SUPPORT_WHATSAPP}`} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-900">
              Soporte
            </a>
            <a href="/login" className="text-slate-500 hover:text-slate-900">Iniciar sesión</a>
            <span className="text-slate-400">© {new Date().getFullYear()} DienteLink</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
