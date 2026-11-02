import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/authService';
import { Check } from 'lucide-react';
import DentalLogo from './DentalLogo';
import { BILLING } from '../lib/billing';
import { SUPPORT_WHATSAPP } from '../lib/support';

const NOW = new Date();
const WEEK_LABELS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'] as const;
const TODAY_INDEX = NOW.getDay() === 0 ? 6 : NOW.getDay() - 1;
const TODAY_LABEL = new Intl.DateTimeFormat('es-HN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(NOW).replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase('es-HN'));
const MONTH_LABEL = new Intl.DateTimeFormat('es-HN', { month: 'long' }).format(NOW);
const SUPPORT_URL = `https://wa.me/${SUPPORT_WHATSAPP}`;
const RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';
const BTN = `inline-flex items-center justify-center rounded-[14px] bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 ${RING}`;
const BTN_QUIET = `inline-flex items-center justify-center rounded-[14px] border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 ${RING}`;

function weekOf(now: Date) {
  const mondayOffset = now.getDay() === 0 ? -6 : 1 - now.getDay();
  const monday = new Date(now);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(now.getDate() + mondayOffset);
  return WEEK_LABELS.map((label, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return { label, date: day.getDate(), today: index === TODAY_INDEX };
  });
}

const WEEK_DAYS = weekOf(NOW);

/** Universal 1–32 → FDI, el mismo orden que el odontograma de la app. */
const FDI = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 38, 37, 36, 35, 34, 33, 32, 31, 41, 42, 43, 44, 45, 46, 47, 48];
const CARIES_TOOTH = 14;
const fdiOf = (id: number) => FDI[id - 1];
const UPPER = Array.from({ length: 16 }, (_, index) => index + 1);
const LOWER = [32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17];

const INCLUDED = [
  'Agenda del día',
  'Expedientes y pacientes ilimitados',
  'Odontograma',
  'Presupuestos y pagos',
  'Reservas por enlace',
  'Aviso de citas por WhatsApp (tú envías)',
  'Copia de respaldo',
];

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

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function useOnceVisible() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(prefersReducedMotion);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const root = el.closest('.landing-scroll');
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setVisible(true);
      io.disconnect();
    }, { root: root instanceof Element ? root : null, threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return { ref, visible };
}

const Surfaces: React.FC<{ caries?: boolean; animate?: boolean; className: string }> = ({ caries, animate, className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    {(Object.keys(SURFACE) as (keyof typeof SURFACE)[]).map(key => {
      const marked = !!caries && key === 'center';
      return (
        <path
          key={key}
          d={SURFACE[key]}
          className={marked && animate ? 'landing-occlusal' : undefined}
          fill={marked ? '#EF4444' : '#FFFFFF'}
          stroke={marked ? '#EF4444' : '#D1D5DB'}
          strokeWidth="0.6"
        />
      );
    })}
  </svg>
);

const Block: React.FC<{ id: string; n: string; title: string; text: string; chart?: boolean; children: React.ReactNode }> = ({ id, n, title, text, chart, children }) => (
  <section id={id} data-rise className={`grid scroll-mt-20 items-start gap-8 border-t border-slate-200 py-16 md:grid-cols-12 md:gap-12 ${chart ? 'landing-chart' : ''}`}>
    <div className="landing-rise md:col-span-4">
      <p className="mb-3 text-sm font-medium text-slate-500">{n}</p>
      <h2 className="mb-3 text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="leading-relaxed text-slate-600">{text}</p>
    </div>
    <div className="landing-rise landing-delay rounded-[14px] border border-slate-200 bg-white p-5 md:col-span-8 md:p-6">
      {children}
    </div>
  </section>
);

const ChartTooth: React.FC<{ id: number; caries?: boolean }> = ({ id, caries }) => (
  <div className="flex min-w-0 flex-col items-center">
    <svg viewBox="0 0 100 140" className="h-8 w-auto" aria-hidden>
      <path d={TOOTH_SHAPE[toothKind(id)]} fill="#FFFDF8" stroke="#CBD5E1" strokeWidth="3" />
    </svg>
    <span className="mt-0.5 text-[11px] font-semibold tabular-nums leading-none text-slate-700">{fdiOf(id)}</span>
    <Surfaces caries={caries} animate={caries} className="mt-0.5 h-4 w-4" />
  </div>
);

const Arch: React.FC<{ caption: string; ids: number[] }> = ({ caption, ids }) => (
  <div>
    <p className="mb-2 text-center text-sm text-slate-500">{caption}</p>
    <div className="mb-1 grid grid-cols-2 text-center text-xs text-slate-500">
      <span>Derecho</span>
      <span>Izquierdo</span>
    </div>
    <div className="grid grid-cols-8 gap-x-0.5 gap-y-2">
      {ids.map(id => (
        <ChartTooth key={`${caption}-${id}`} id={id} caries={id === CARIES_TOOTH} />
      ))}
    </div>
  </div>
);

const Tooth26: React.FC = () => (
  <div className="flex items-center gap-4 rounded-[14px] border border-red-100 bg-red-50/70 p-4 lg:w-72 lg:shrink-0">
    <div className="flex shrink-0 flex-col items-center">
      <svg viewBox="0 0 100 140" className="h-14 w-auto" aria-hidden>
        <path d={TOOTH_SHAPE.molar} fill="#FFFDF8" stroke="#CBD5E1" strokeWidth="3" />
      </svg>
      <span className="mt-1 text-sm font-semibold tabular-nums text-slate-800">26</span>
      <Surfaces caries animate className="mt-1 h-16 w-16" />
    </div>
    <p className="text-sm leading-snug text-slate-700">
      María Fernández · pieza 26 · <span className="font-semibold text-red-600">caries en la cara oclusal</span>
    </p>
  </div>
);

const ProductPreview: React.FC = () => (
  <div
    id="producto"
    role="img"
    aria-label={`Ejemplo del ${TODAY_LABEL}: siguiente paciente María Fernández a las 08:30. En su ficha, la pieza 26 tiene caries en la cara oclusal.`}
    className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_12px_32px_-12px_rgba(15,23,42,0.12)]"
  >
    <div aria-hidden>
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <span className="text-sm text-slate-500">Ejemplo</span>
        <DentalLogo size={18} variant="blue" />
      </div>
      <div className="p-4 sm:p-5">
        <p className="text-sm text-slate-500">{TODAY_LABEL}</p>
        <div className="mt-3 rounded-[14px] border border-slate-200 px-3 py-3">
          <p className="text-sm font-medium text-blue-700">Siguiente paciente</p>
          <p className="mt-1 text-base font-semibold text-slate-900">María Fernández</p>
          <p className="text-sm text-slate-600">08:30 · Consulta</p>
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-[14px] border border-red-100 bg-red-50/80 px-3 py-3">
          <Surfaces caries className="h-14 w-14 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-slate-500">En su ficha</p>
            <p className="text-base font-semibold text-slate-900">Pieza 26</p>
            <p className="text-sm font-medium text-red-600">Caries en la cara oclusal</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const BookingPreview: React.FC = () => {
  const { ref, visible } = useOnceVisible();

  return (
    <div ref={ref}>
      <p className="text-sm text-slate-500">Lo que ve tu paciente</p>
      <p className="mt-1 text-base font-semibold text-slate-900">Elige un horario</p>
      <p className="mt-1 text-sm text-slate-600">{TODAY_LABEL}</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {BOOKING_SLOTS.map(slot => {
          const taken = slot.taken && visible;
          return (
            <div
              key={slot.time}
              className={`rounded-[14px] border px-2 py-3 text-center transition-colors duration-300 ${
                taken ? 'border-slate-200 bg-slate-50 text-slate-400' : 'border-slate-300 bg-white text-slate-800'
              }`}
            >
              <p className={`text-sm font-semibold tabular-nums ${taken ? 'line-through' : ''}`}>{slot.time}</p>
              <p className={`mt-0.5 text-xs font-medium ${taken ? 'text-slate-500' : 'text-slate-600'}`}>
                {taken ? 'Ocupada' : 'Libre'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TrialActions: React.FC<{ signedIn: boolean; onTry: () => void; onDemo: () => void }> = ({ signedIn, onTry, onDemo }) => (
  <>
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <button type="button" onClick={onTry} className={BTN}>
        {signedIn ? 'Entrar a mi clínica' : `Probar ${BILLING.trialDays} días`}
      </button>
      <button type="button" onClick={onDemo} className={BTN_QUIET}>
        Ver ejemplo
      </button>
    </div>
    <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
      La prueba usa tu cuenta de Google y no pide tarjeta. El ejemplo es un consultorio con pacientes de muestra y no pide cuenta.
    </p>
  </>
);

const AGENDA = [
  { time: '08:30', name: 'María Fernández', note: 'Consulta', now: true },
  { time: '09:30', name: 'Ana López', note: 'Limpieza', now: false },
  { time: '11:00', name: 'Horario libre', note: 'Disponible', now: false },
] as const;

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const targetRef = useRef<HTMLDivElement>(null);
  const pageReady = !loading && !user;

  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!pageReady) return;
    const root = targetRef.current;
    if (!root) return;
    const nodes = root.querySelectorAll<HTMLElement>('[data-rise]');
    const reveal = () => nodes.forEach(node => node.classList.add('is-in'));
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      reveal();
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { root, threshold: 0.18 });
    nodes.forEach(node => io.observe(node));
    return () => io.disconnect();
  }, [pageReady]);

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
      <div className="flex h-dvh items-center justify-center bg-white">
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
    <div className="landing-scroll h-dvh w-full overflow-y-auto overflow-x-hidden bg-white font-sans text-slate-900" ref={targetRef}>
      <a href="#inicio" className={`sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-[14px] focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold ${RING}`}>
        Saltar al contenido
      </a>
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6">
          <a href="#inicio" className={`flex min-w-0 items-center gap-2.5 ${RING}`} aria-label="DienteLink, volver al inicio">
            <DentalLogo size={22} variant="blue" />
            <span className="truncate text-lg font-semibold tracking-tight text-slate-900">DienteLink</span>
          </a>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4 lg:gap-5">
            <a href="#agenda" className={`hidden text-sm text-slate-600 hover:text-slate-900 lg:block ${RING}`}>Agenda</a>
            <a href="#odontograma" className={`hidden text-sm text-slate-600 hover:text-slate-900 lg:block ${RING}`}>Odontograma</a>
            <a href="#precio" className={`text-sm text-slate-600 hover:text-slate-900 ${RING}`}>Precio</a>
            <button type="button" onClick={handleDemo} className={`hidden text-sm text-slate-600 hover:text-slate-900 md:inline ${RING}`}>
              Ver ejemplo
            </button>
            <a href="/login" className={`text-sm text-slate-600 hover:text-slate-900 ${RING}`}>
              <span className="sm:hidden">Entrar</span>
              <span className="hidden sm:inline">{user ? 'Ir a mi clínica' : 'Iniciar sesión'}</span>
            </a>
            <button type="button" onClick={handleCTA} className={`${BTN} whitespace-nowrap px-3 sm:px-4`}>
              {user ? 'Mi clínica' : (
                <>
                  <span className="sm:hidden">14 días</span>
                  <span className="hidden sm:inline">Probar {BILLING.trialDays} días</span>
                </>
              )}
            </button>
          </div>
        </div>
      </nav>

      <header id="inicio" className="scroll-mt-20 bg-blue-50">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
          <div>
            <p className="mb-4 text-sm font-medium text-blue-700">Programa para consultorios dentales</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-6xl sm:leading-[1.05]">
              Agenda, expediente y odontograma en un solo lugar.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Por la mañana ves quién sigue. En la ficha ves la pieza y lo que cuesta el tratamiento.
            </p>
            <div className="mt-8 hidden lg:block">
              <TrialActions signedIn={!!user} onTry={handleCTA} onDemo={handleDemo} />
            </div>
          </div>
          <div className="landing-rise-now">
            <ProductPreview />
          </div>
          <div className="lg:hidden">
            <TrialActions signedIn={!!user} onTry={handleCTA} onDemo={handleDemo} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <Block
          id="agenda"
          n="01"
          title="Agenda"
          text="Hoy María Fernández tiene consulta a las 08:30. Ves la hora, el nombre y el motivo. Si ese horario ya está ocupado, no admite otra cita. Desde ahí le envías un aviso por WhatsApp."
        >
          <p className="mb-3 text-sm text-slate-500">Tu pantalla · {TODAY_LABEL}</p>
          <div className="mb-4 grid grid-cols-7 gap-1.5">
            {WEEK_DAYS.map(day => (
              <div
                key={day.label}
                className={`flex h-12 flex-col items-center justify-center rounded-[10px] ${
                  day.today ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600'
                }`}
              >
                <span className={`text-[10px] font-medium leading-none ${day.today ? 'text-white/85' : 'text-slate-500'}`}>{day.label}</span>
                <span className="mt-1 text-sm font-semibold tabular-nums leading-none">{day.date}</span>
              </div>
            ))}
          </div>
          <div className="divide-y divide-slate-200 overflow-hidden rounded-[14px] border border-slate-200">
            {AGENDA.map(row => (
              <div key={row.time} className={`px-4 py-3 ${row.now ? 'bg-blue-50' : ''}`}>
                <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-x-3 gap-y-1">
                  <span className={`text-sm tabular-nums ${row.now ? 'row-span-2 font-semibold text-blue-700' : 'text-slate-600'}`}>{row.time}</span>
                  <span className={`min-w-0 truncate text-sm ${row.name === 'Horario libre' ? 'text-slate-500' : 'font-medium text-slate-900'}`}>{row.name}</span>
                  <span className={`text-xs ${row.now ? 'font-medium text-blue-700' : 'text-slate-500'}`}>{row.note}</span>
                  {row.now && <p className="col-start-2 col-span-2 text-sm text-slate-600">Avisar por WhatsApp</p>}
                </div>
              </div>
            ))}
          </div>
        </Block>

        <Block
          id="odontograma"
          n="02"
          title="Odontograma"
          chart
          text="Cada pieza queda en el expediente con numeración FDI y sus caras. En la ficha de María, la pieza 26 tiene caries: la cara oclusal se marca en rojo."
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="lg:order-2">
              <Tooth26 />
            </div>
            <div className="min-w-0 flex-1 space-y-4 lg:order-1">
              <Arch caption="Arcada superior" ids={UPPER} />
              <div className="h-px bg-slate-200" />
              <Arch caption="Arcada inferior" ids={LOWER} />
            </div>
          </div>
        </Block>

        <Block
          id="presupuesto"
          n="03"
          title="Presupuesto"
          text="En la ficha de María anotas la resina de la pieza 26 y que ya pagó el total. Queda en el expediente: no cobra la tarjeta del paciente."
        >
          <p className="mb-3 text-sm text-slate-500">Ficha de María Fernández</p>
          <div className="flex items-center justify-between gap-4 rounded-[14px] border border-slate-200 px-4 py-4">
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
          text="Compartes un enlace con las horas que dejaste abiertas. El paciente pide una hora y te llega como solicitud: tú la apruebas y recién entonces entra a la agenda. Mientras está pendiente, ese horario ya no sale como libre."
        >
          <BookingPreview />
        </Block>

        <Block
          id="datos"
          n="05"
          title="Tus datos"
          text="Expedientes, citas, odontogramas y presupuestos son del consultorio. Los ves tú en tu cuenta. Cuando quieras, bajas una copia de respaldo a tu computadora."
        >
          <p className="mb-3 text-sm text-slate-500">Copia de tu consultorio</p>
          <div className="divide-y divide-slate-200 overflow-hidden rounded-[14px] border border-slate-200">
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
          <div className="mt-4 rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="truncate text-sm font-medium text-slate-900">consultorio-{MONTH_LABEL}.zip</p>
            <p className="text-sm text-slate-600">Listo para guardar en tu computadora</p>
          </div>
        </Block>

        <section id="antes" data-rise className="scroll-mt-20 border-t border-slate-200 py-16" aria-labelledby="decidir-title">
          <h2 id="decidir-title" className="landing-rise text-2xl font-semibold tracking-tight text-slate-900">Antes de crear la cuenta</h2>
          <div className="landing-rise landing-delay mt-8 grid gap-3 md:grid-cols-3">
            <div className="rounded-[14px] border border-slate-200 bg-white px-5 py-5">
              <p className="text-sm font-semibold text-slate-900">Tu cuenta</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Entras con Google. Si es la primera vez, el consultorio se crea con esa cuenta.</p>
            </div>
            <div className="rounded-[14px] border border-slate-200 bg-white px-5 py-5">
              <p className="text-sm font-semibold text-slate-900">En el teléfono</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Agenda, ficha y odontograma se abren en el navegador. No hay que instalar una aplicación.</p>
            </div>
            <div className="rounded-[14px] border border-slate-200 bg-white px-5 py-5">
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

        <section id="precio" data-rise className="grid scroll-mt-20 items-center gap-10 border-t border-slate-200 py-16 md:grid-cols-12">
          <div className="landing-rise md:col-span-5">
            <h2 className="text-sm font-medium text-slate-500">{BILLING.planName}</h2>
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
          <ul className="landing-rise landing-delay flex flex-col gap-3 md:col-span-7 md:justify-center">
            {INCLUDED.map(item => (
              <li key={item} className="flex items-center gap-3 text-sm text-slate-700">
                <Check size={16} className="shrink-0 text-slate-400" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between sm:px-6">
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
