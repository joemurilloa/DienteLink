import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/authService';
import { Check } from 'lucide-react';
import DentalLogo from './DentalLogo';
import { BILLING } from '../lib/billing';
import { SUPPORT_WHATSAPP } from '../lib/support';

const NOW = new Date();
const WEEK = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'] as const;
const TODAY_INDEX = NOW.getDay() === 0 ? 6 : NOW.getDay() - 1;
const TODAY_LABEL = new Intl.DateTimeFormat('es-HN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(NOW).replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase('es-HN'));
const MONTH_LABEL = new Intl.DateTimeFormat('es-HN', { month: 'long' }).format(NOW);
const SUPPORT_URL = `https://wa.me/${SUPPORT_WHATSAPP}`;
const RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';
const BTN = `inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 ${RING}`;
const BTN_QUIET = `inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 ${RING}`;

/** Universal 1–32 → FDI, el mismo orden que el odontograma de la app. */
const FDI = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 38, 37, 36, 35, 34, 33, 32, 31, 41, 42, 43, 44, 45, 46, 47, 48];
const CARIES_TOOTH = 14;
const fdiOf = (id: number) => FDI[id - 1];

const INCLUDED = [
  'Agenda del día',
  'Expedientes y pacientes ilimitados',
  'Odontograma',
  'Presupuestos y pagos',
  'Reservas por enlace',
  'Aviso de citas por WhatsApp (tú envías)',
  'Copia de respaldo',
];

const PAGE_MAP = [
  { href: '#agenda', n: '01', label: 'Agenda' },
  { href: '#odontograma', n: '02', label: 'Odontograma' },
  { href: '#presupuesto', n: '03', label: 'Presupuesto' },
  { href: '#reservas', n: '04', label: 'Reservas' },
  { href: '#datos', n: '05', label: 'Tus datos' },
] as const;

const BOOKING_SLOTS = [
  { time: '08:30', taken: true },
  { time: '09:00', taken: false },
  { time: '10:00', taken: false },
  { time: '11:00', taken: false },
  { time: '14:00', taken: false },
  { time: '14:30', taken: false },
] as const;

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

const SurfaceMark: React.FC<{ className?: string }> = ({ className = 'h-14 w-14' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
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
);

const Block: React.FC<{ id: string; n: string; title: string; text: string; children: React.ReactNode }> = ({ id, n, title, text, children }) => (
  <section id={id} className="grid scroll-mt-20 items-start gap-8 border-t border-blue-100 py-16 md:grid-cols-12 md:gap-12">
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
    <span className="mt-0.5 text-xs font-bold tabular-nums leading-none text-slate-700 sm:text-[13px]">{fdiOf(id)}</span>
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
    role="img"
    aria-label={`Ejemplo del ${TODAY_LABEL}: siguiente paciente María Fernández a las 08:30. En su ficha, la pieza 26 tiene caries en la cara oclusal.`}
    className="relative overflow-hidden rounded-[24px] border border-blue-200/80 bg-white shadow-2xl shadow-blue-900/15"
  >
    <div aria-hidden>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        </div>
        <span className="text-xs font-semibold text-slate-500">Ejemplo</span>
        <DentalLogo size={18} variant="blue" />
      </div>
      <div className="bg-slate-50 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{TODAY_LABEL}</p>
        <div className="mt-3 rounded-xl border border-blue-100 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Siguiente paciente</p>
              <p className="mt-1 truncate text-base font-semibold text-slate-900">María Fernández</p>
              <p className="text-sm text-slate-600">08:30 · Consulta</p>
            </div>
            <span className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">En agenda</span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/80 p-3">
          <SurfaceMark className="h-16 w-16 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">En su ficha</p>
            <p className="mt-1 text-base font-semibold text-slate-900">Pieza 26</p>
            <p className="text-sm font-medium text-red-600">Caries en la cara oclusal</p>
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
      <div className="flex h-dvh items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 motion-safe:animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm font-medium text-slate-500">
            {user ? 'Entrando a tu clínica...' : 'Iniciando DienteLink...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh w-full overflow-y-auto overflow-x-hidden bg-[linear-gradient(180deg,#e8f1ff_0%,#f7faff_220px,#ffffff_520px)] font-sans text-slate-900" ref={targetRef}>
      <a href="#inicio" className={`sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold ${RING}`}>
        Saltar al contenido
      </a>
      <nav className="sticky top-0 z-50 border-b border-blue-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="#inicio" className={`flex min-w-0 items-center gap-2.5 ${RING}`} aria-label="DienteLink, volver al inicio">
            <DentalLogo size={22} variant="blue" />
            <span className="truncate text-lg font-semibold tracking-tight text-slate-900">DienteLink</span>
          </a>
          <div className="flex shrink-0 items-center gap-3 sm:gap-4 lg:gap-5">
            <a href="#agenda" className={`hidden text-sm text-slate-600 hover:text-slate-900 lg:block ${RING}`}>Agenda</a>
            <a href="#odontograma" className={`hidden text-sm text-slate-600 hover:text-slate-900 lg:block ${RING}`}>Odontograma</a>
            <a href="#precio" className={`hidden text-sm text-slate-600 hover:text-slate-900 md:block ${RING}`}>Precio</a>
            <button type="button" onClick={handleDemo} className={`hidden text-sm text-slate-600 hover:text-slate-900 md:block ${RING}`}>
              Ver ejemplo
            </button>
            <a href="/login" className={`text-sm text-slate-600 hover:text-slate-900 ${RING}`}>
              <span className="sm:hidden">Entrar</span>
              <span className="hidden sm:inline">{user ? 'Ir a mi clínica' : 'Iniciar sesión'}</span>
            </a>
            <button type="button" onClick={handleCTA} className={`${BTN} px-3 py-2 sm:px-4`}>
              {user ? 'Mi clínica' : (
                <>
                  <span className="sm:hidden">Probar</span>
                  <span className="hidden sm:inline">Probar {BILLING.trialDays} días</span>
                </>
              )}
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6">
        <header id="inicio" className="relative grid scroll-mt-20 items-center gap-10 py-12 md:py-20 lg:grid-cols-[1.05fr_.95fr]">
          <div aria-hidden className="pointer-events-none absolute -left-16 -top-10 h-64 w-64 rounded-full bg-blue-400/25 blur-3xl" />
          <div className="relative">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Programa para consultorios dentales</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-6xl sm:leading-[1.05]">
              Agenda, expediente y odontograma en un solo lugar.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Por la mañana ves quién sigue. En la ficha ves la pieza y lo que cuesta el tratamiento.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button type="button" onClick={handleCTA} className={BTN}>
                {user ? 'Entrar a mi clínica' : `Probar ${BILLING.trialDays} días`}
              </button>
              <button type="button" onClick={handleDemo} className={BTN_QUIET}>
                Ver ejemplo
              </button>
            </div>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
              La prueba usa tu cuenta de Google y no pide tarjeta. El ejemplo es un consultorio con pacientes de muestra y no pide cuenta.
            </p>
          </div>
          <ProductPreview />
        </header>

        <nav aria-label="En esta página" className="border-t border-blue-100 py-6">
          <p className="text-sm font-semibold text-slate-900">En esta página</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PAGE_MAP.map(item => (
              <a key={item.href} href={item.href} className={`inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-blue-300 ${RING}`}>
                <span className="font-semibold text-blue-600">{item.n}</span>
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        <div>
          <Block
            id="agenda"
            n="01"
            title="Agenda"
            text="Hoy María Fernández tiene consulta a las 08:30. Ves la hora, el nombre y el motivo. Si ese horario ya está ocupado, no admite otra cita. Desde ahí le envías un aviso por WhatsApp."
          >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tu pantalla · {TODAY_LABEL}</p>
          <div className="mb-4 grid grid-cols-7 gap-1.5">
            {WEEK.map((day, i) => (
              <div
                key={`${day}-${i}`}
                className={`flex h-9 items-center justify-center rounded-lg text-xs font-semibold ${
                  i === TODAY_INDEX ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30' : 'bg-blue-50 text-slate-600'
                }`}
              >
                {day}
              </div>
            ))}
          </div>
          <div className="divide-y divide-blue-100 overflow-hidden rounded-xl border border-blue-100 bg-white">
            {[
              { time: '08:30', name: 'María Fernández', note: 'Consulta', now: true },
              { time: '09:30', name: 'Ana López', note: 'Limpieza', now: false },
              { time: '11:00', name: 'Horario libre', note: 'Disponible', now: false },
            ].map(row => (
              <div key={row.time} className={`flex items-center gap-4 px-4 py-3 ${row.now ? 'bg-blue-50' : ''}`}>
                <span className={`w-12 text-sm tabular-nums ${row.now ? 'font-semibold text-blue-700' : 'text-slate-600'}`}>{row.time}</span>
                <span className={`flex-1 text-sm ${row.name === 'Horario libre' ? 'text-slate-500' : 'font-medium text-slate-900'}`}>{row.name}</span>
                {row.note && (
                  <span className={`text-xs ${row.now ? 'rounded-full bg-blue-600 px-2 py-0.5 font-semibold text-white' : 'text-slate-500'}`}>
                    {row.note}
                  </span>
                )}
              </div>
            ))}
          </div>
          </Block>

          <Block
            id="odontograma"
            n="02"
            title="Odontograma"
            text="Cada pieza queda en el expediente con numeración FDI y sus caras. En la ficha de María, la pieza 26 tiene caries: la cara oclusal se marca en rojo."
          >
          <div>
            <div className="sm:hidden">
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Arcada superior</p>
              {([
                { label: 'Derecho', ids: [1, 2, 3, 4, 5, 6, 7, 8] },
                { label: 'Izquierdo', ids: [9, 10, 11, 12, 13, 14, 15, 16] },
              ] as const).map(row => (
                <div key={row.label} className="mb-3">
                  <p className="mb-1 text-center text-xs font-medium text-slate-600">{row.label}</p>
                  <div className="grid grid-cols-8 justify-items-center gap-x-1">
                    {row.ids.map(id => (
                      <ChartTooth key={id} id={id} caries={id === CARIES_TOOTH} />
                    ))}
                  </div>
                </div>
              ))}
              <div className="my-2 h-px bg-blue-100" />
              <p className="mb-3 mt-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Arcada inferior</p>
              {([
                { label: 'Derecho', ids: [32, 31, 30, 29, 28, 27, 26, 25] },
                { label: 'Izquierdo', ids: [24, 23, 22, 21, 20, 19, 18, 17] },
              ] as const).map(row => (
                <div key={`lower-${row.label}`} className="mb-3">
                  <p className="mb-1 text-center text-xs font-medium text-slate-600">{row.label}</p>
                  <div className="grid grid-cols-8 justify-items-center gap-x-1">
                    {row.ids.map(id => (
                      <ChartTooth key={id} id={id} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden sm:block">
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Arcada superior</p>
              <div className="flex justify-center gap-1">
                {Array.from({ length: 16 }, (_, i) => i + 1).map(id => (
                  <ChartTooth key={id} id={id} caries={id === CARIES_TOOTH} />
                ))}
              </div>
              <div className="my-4 h-px bg-blue-100" />
              <div className="flex justify-center gap-1">
                {[32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17].map(id => (
                  <ChartTooth key={id} id={id} />
                ))}
              </div>
              <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Arcada inferior</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 rounded-xl border border-red-100 bg-red-50/70 px-4 py-3">
            <SurfaceMark className="h-14 w-14 shrink-0" />
            <p className="text-sm leading-snug text-slate-700">
              María Fernández · pieza 26 · <span className="font-semibold text-red-600">caries en la cara oclusal</span>
            </p>
          </div>
          </Block>

          <Block
            id="presupuesto"
            n="03"
            title="Presupuesto"
            text="En la ficha de María anotas la resina de la pieza 26 y que ya pagó el total. Queda en el expediente: no cobra la tarjeta del paciente."
          >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Ficha de María Fernández</p>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-blue-100 bg-white px-4 py-4">
            <div className="min-w-0">
              <p className="text-base font-semibold text-slate-900">Resina</p>
              <p className="mt-0.5 text-sm text-slate-600">Pieza 26</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold tabular-nums text-slate-900">L 2,400</p>
              <p className="text-sm font-semibold text-emerald-700">Pagado</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">Puedes enviar este presupuesto por WhatsApp o bajarlo en PDF.</p>
          </Block>

          <Block
            id="reservas"
            n="04"
            title="Reservas"
            text="Compartes un enlace con las horas que dejaste abiertas. El paciente elige una y la cita entra a tu agenda. La de María, a las 08:30, ya no sale como libre."
          >
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Lo que ve tu paciente</p>
          <p className="text-base font-semibold text-slate-900">Elige un horario</p>
          <p className="mt-1 text-sm text-slate-600">{TODAY_LABEL}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {BOOKING_SLOTS.map(slot => (
              <div
                key={slot.time}
                className={`rounded-xl border px-2 py-3 text-center ${
                  slot.taken ? 'border-slate-200 bg-slate-50 text-slate-400' : 'border-blue-200 bg-white text-blue-700'
                }`}
              >
                <p className={`text-sm font-semibold tabular-nums ${slot.taken ? 'line-through' : ''}`}>{slot.time}</p>
                <p className={`mt-0.5 text-xs font-medium ${slot.taken ? 'text-slate-500 no-underline' : 'text-blue-600'}`}>
                  {slot.taken ? 'Ocupada' : 'Libre'}
                </p>
              </div>
            ))}
          </div>
          </Block>

          <Block
            id="datos"
            n="05"
            title="Tus datos"
            text="Expedientes, citas, odontogramas y presupuestos son del consultorio. Los ves tú en tu cuenta. Cuando quieras, bajas una copia de respaldo a tu computadora."
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Copia de tu consultorio</p>
            <div className="divide-y divide-blue-100 overflow-hidden rounded-xl border border-blue-100 bg-white">
              {[
                { name: 'Expedientes', note: 'Todos los pacientes' },
                { name: 'Citas', note: 'Agenda completa' },
                { name: 'Odontogramas', note: 'En cada ficha' },
                { name: 'Presupuestos', note: 'En cada ficha' },
              ].map(row => (
                <div key={row.name} className="flex items-center gap-4 px-4 py-3">
                  <span className="flex-1 text-sm font-medium text-slate-900">{row.name}</span>
                  <span className="text-sm text-slate-600">{row.note}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="truncate text-sm font-medium text-slate-900">consultorio-{MONTH_LABEL}.zip</p>
              <p className="text-sm text-slate-600">Listo para guardar en tu computadora</p>
            </div>
          </Block>
        </div>

        <section id="antes" className="scroll-mt-20 border-t border-blue-100 py-16" aria-labelledby="decidir-title">
          <h2 id="decidir-title" className="text-2xl font-semibold tracking-tight text-slate-900">Antes de crear la cuenta</h2>
          <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-blue-100 bg-blue-100 sm:grid-cols-2">
            <div className="bg-white px-5 py-5">
              <p className="text-sm font-semibold text-slate-900">Tu cuenta</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Entras con Google. Si es la primera vez, el consultorio se crea con esa cuenta.</p>
            </div>
            <div className="bg-white px-5 py-5">
              <p className="text-sm font-semibold text-slate-900">En el teléfono</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Agenda, ficha y odontograma se abren en el navegador. No hay que instalar una aplicación.</p>
            </div>
            <div className="bg-white px-5 py-5">
              <p className="text-sm font-semibold text-slate-900">Después de {BILLING.trialDays} días</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">La prueba no pide tarjeta. Luego sigues a {BILLING.priceAmount} al mes, o el acceso se detiene.</p>
            </div>
          </div>
          <p className="mt-5 text-sm text-slate-600">
            ¿Una duda antes de entrar?{' '}
            <a href={SUPPORT_URL} target="_blank" rel="noreferrer" className={`font-semibold text-blue-700 hover:text-blue-800 ${RING}`}>
              Escríbele al soporte por WhatsApp
            </a>
          </p>
        </section>

        <section className="flex flex-col gap-5 border-t border-blue-100 py-12 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="caminos-title">
          <div className="max-w-xl">
            <h2 id="caminos-title" className="text-xl font-semibold tracking-tight text-slate-900">Dos formas de verlo</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Probar abre tu consultorio con Google, {BILLING.trialDays} días y sin tarjeta. Ver ejemplo abre una clínica con pacientes de muestra y no pide cuenta.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handleDemo} className={BTN_QUIET}>Ver ejemplo</button>
            <button type="button" onClick={handleCTA} className={BTN}>
              {user ? 'Entrar a mi clínica' : `Probar ${BILLING.trialDays} días`}
            </button>
          </div>
        </section>

        <section id="precio" className="grid scroll-mt-20 items-center gap-10 border-t border-blue-100 py-16 md:grid-cols-12">
          <div className="md:col-span-5">
            <h2 className="text-sm font-medium text-blue-600">{BILLING.planName}</h2>
            <p className="mt-2 text-5xl font-semibold tracking-tight text-slate-900">
              {BILLING.priceAmount}
              <span className="text-lg font-medium text-slate-500"> / mes</span>
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600">
              Un consultorio, con todo lo de la lista.
            </p>
            <button type="button" onClick={handleCTA} className={`${BTN} mt-8`}>
              {user ? 'Entrar a mi clínica' : `Probar ${BILLING.trialDays} días`}
            </button>
            <p className="mt-3 text-sm text-slate-600">Entras con Google. Sin tarjeta.</p>
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
            <a href="#inicio" className={`flex items-center gap-2 text-sm font-semibold text-slate-900 ${RING}`}>
              <DentalLogo size={18} variant="blue" />
              DienteLink
            </a>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600">
              Agenda, expediente y odontograma para consultorios dentales en Honduras. El soporte responde por WhatsApp.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
            <a href="/terminos" className={`text-slate-600 hover:text-slate-900 ${RING}`}>Términos y privacidad</a>
            <a href={SUPPORT_URL} target="_blank" rel="noreferrer" className={`text-slate-600 hover:text-slate-900 ${RING}`}>
              Soporte
            </a>
            <a href="/login" className={`text-slate-600 hover:text-slate-900 ${RING}`}>Iniciar sesión</a>
            <span className="text-slate-500">© {new Date().getFullYear()} DienteLink</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
