import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/authService';
import { Check, ChevronDown } from 'lucide-react';
import DentalLogo from './DentalLogo';
import { BILLING } from '../lib/billing';
import { fdiToId, idToFdi } from '../lib/toothNumber';
import { SUPPORT_WHATSAPP } from '../lib/support';

const NOW = new Date();
const WEEK_LABELS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'] as const;
const TODAY_INDEX = NOW.getDay() === 0 ? 6 : NOW.getDay() - 1;
const TODAY_LABEL = new Intl.DateTimeFormat('es-HN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(NOW).replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase('es-HN'));
const SUPPORT_URL = `https://wa.me/${SUPPORT_WHATSAPP}`;

const MOSS = '#1b3830';
const SAGE = '#e7efe9';
const BONE = '#f7f4ee';
const INK = '#14241c';
const MUTED = '#3c4a43';
const CREAM = '#f4f7f3';
const RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4f7f3]';
const RING_INK = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b3830]';
const BTN = `inline-flex items-center justify-center rounded-xl bg-[#f4f7f3] px-5 text-sm font-semibold text-[#14241c] shadow-[0_10px_24px_-16px_rgba(20,36,28,0.8)] hover:bg-white ${RING}`;
const BTN_QUIET = `inline-flex items-center justify-center rounded-xl bg-[#d7e4dc] px-5 text-sm font-semibold text-[#14241c] hover:bg-white ${RING}`;
const CARD = 'rounded-xl bg-[#f7f4ee] shadow-[0_24px_50px_-28px_rgba(20,36,28,0.55)] ring-1 ring-black/[0.04]';
const PAD = 'px-6 sm:px-10';
const COLS = 'lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-x-16';

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

const CARIES_TOOTH = fdiToId(26)!;
const fdiOf = (id: number) => idToFdi(id)!;
const UPPER = Array.from({ length: 16 }, (_, index) => index + 1);
const LOWER = [32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17];

const AGENDA = [
  { time: '08:30', name: 'María Fernández', note: 'Consulta · avisar por WhatsApp', now: true },
  { time: '09:30', name: 'Ana López', note: 'Limpieza', now: false },
  { time: '14:00', name: 'Luis Romero', note: 'Control', now: false },
  { time: '16:30', name: 'Horario libre', note: 'Sigue abierto', now: false },
] as const;

const SCENES = [
  {
    id: 'odontograma',
    label: 'Odontograma',
    text: 'Cada diente queda en la ficha con numeración FDI y sus caras. En la de María, la pieza 26 tiene caries: la cara oclusal se marca en rojo.',
    mode: 'chart',
  },
  {
    id: 'presupuesto',
    label: 'Presupuesto',
    text: 'En la misma ficha anotas la resina de la pieza 26, el adhesivo y el control, y que ya pagó el total. Desde ahí el presupuesto se envía por WhatsApp o se baja en PDF. Registras el pago; DienteLink no cobra tarjetas.',
    mode: 'budget',
  },
  {
    id: 'reservas',
    label: 'Reservas',
    text: 'Compartes un enlace con las horas abiertas. Alguien pidió las 11:00 y la solicitud queda en Reservas, dentro de la app: tú la apruebas y recién entonces entra a la agenda. Mientras está pendiente, esa hora ya no sale como libre. Hoy no llega un correo; hay que abrir DienteLink para verla.',
    mode: 'booking',
  },
] as const;

type SceneMode = (typeof SCENES)[number]['mode'];

const FAQS = [
  {
    q: '¿Necesito instalar algún programa en mi computadora?',
    a: 'No. DienteLink funciona desde el navegador en cualquier computadora, tablet o teléfono, sin necesidad de descargar nada.',
  },
  {
    q: '¿Funciona en el celular?',
    a: 'Sí. Ábrelo en el navegador del celular e instálalo como app, sin tienda.',
  },
  {
    q: `¿Qué pasa cuando terminan los ${BILLING.trialDays} días de prueba?`,
    a: `Si no continúas, sigues 7 días más para cerrar el día. Después se detiene el trabajo, sin cargos automáticos, y tus datos no se borran. La copia se baja desde Ajustes aunque el plan ya haya vencido. Para continuar pagas ${BILLING.priceAmount} al mes por transferencia y subes el comprobante. Lo revisamos en menos de 24 horas.`,
  },
  {
    q: '¿Cómo se protegen los expedientes de mis pacientes?',
    a: 'Viajan cifrados por HTTPS y se guardan en tu cuenta, separados de los de otros consultorios. Puedes descargar una copia completa desde Ajustes aunque el plan haya vencido. Si dejas el plan, el trabajo se detiene y los expedientes no se borran.',
  },
  {
    q: '¿El recibo en PDF es una factura con CAI?',
    a: 'No. Ese PDF es el recibo del pago del paciente. DienteLink no emite factura fiscal.',
  },
] as const;

const INCLUDED = [
  { title: 'Agenda del día' },
  { title: 'Expedientes y pacientes ilimitados' },
  { title: 'Odontograma' },
  { title: 'Presupuestos y pagos' },
  { title: 'Reservas por enlace' },
  { title: 'Aviso de la cita por WhatsApp', note: 'El mensaje lo envías tú.' },
  { title: 'Copia de tu cuenta', note: 'Desde Ajustes, también si el plan ya venció.' },
] as const;

const ALSO = [
  'Recetas',
  'Notas de evolución',
  'Historial del odontograma',
] as const;

const GUARANTEES = [
  { title: 'Separado por consultorio', note: 'Cada consultorio ve solo sus pacientes.' },
  { title: 'consultorio.zip', note: 'Descárgala desde Ajustes, también si el plan ya venció.' },
  { title: 'Si dejas el plan, no se borra', note: 'El acceso se detiene. Los expedientes siguen.' },
] as const;

const BUDGET_LINES = [
  { name: 'Resina, pieza 26', amount: 'L. 1,800' },
  { name: 'Adhesivo', amount: 'L. 300' },
  { name: 'Control', amount: 'L. 300' },
] as const;

const TOOTH_SHAPE: Record<'molar' | 'premolar' | 'canine' | 'central' | 'lateral', string> = {
  molar: 'M8 70C10 48 22 34 32 42C38 16 44 4 50 18C56 4 62 16 68 42C78 34 90 48 92 70C96 98 88 120 78 132C66 144 34 144 22 132C12 120 4 98 8 70Z',
  premolar: 'M14 66C16 44 30 30 42 38C48 12 52 12 58 38C70 30 84 44 86 66C90 98 82 120 70 132C58 144 42 144 30 132C18 120 10 98 14 66Z',
  canine: 'M50 8C66 32 78 52 72 74C78 104 68 128 54 136C42 144 28 128 28 112C20 96 24 74 28 74C22 52 34 32 50 8Z',
  central: 'M16 32C16 16 84 16 84 32C88 74 84 108 76 122C66 138 34 138 24 122C16 108 12 74 16 32Z',
  lateral: 'M22 36C22 18 78 18 78 36C82 76 78 110 68 124C58 138 42 138 32 124C22 110 18 76 22 36Z',
};

const TOOTH_FLEX: Record<keyof typeof TOOTH_SHAPE, string> = {
  molar: 'flex-[1.45_1_0%]',
  premolar: 'flex-[1_1_0%]',
  canine: 'flex-[0.78_1_0%]',
  central: 'flex-[0.7_1_0%]',
  lateral: 'flex-[0.55_1_0%]',
};

const toothKind = (id: number): keyof typeof TOOTH_SHAPE => {
  if ([1, 2, 3, 14, 15, 16, 17, 18, 19, 30, 31, 32].includes(id)) return 'molar';
  if ([4, 5, 12, 13, 20, 21, 28, 29].includes(id)) return 'premolar';
  if ([6, 11, 22, 27].includes(id)) return 'canine';
  if ([8, 9, 24, 25].includes(id)) return 'central';
  return 'lateral';
};

const SURFACE = {
  vestibular: 'M 2 2 L 22 2 L 17 8 L 7 8 Z',
  distal: 'M 22 2 L 22 22 L 17 17 L 17 8 Z',
  lingual: 'M 22 22 L 2 22 L 7 17 L 17 17 Z',
  mesial: 'M 2 22 L 2 2 L 7 8 L 7 17 Z',
  center: 'M 7 8 L 17 8 L 17 17 L 7 17 Z',
};

const AGENDA_LABEL = `Muestra, no es un paciente real. Agenda del ${TODAY_LABEL}. Siguiente: María Fernández a las 08:30, consulta, avisar por WhatsApp. Ana López, limpieza, a las 09:30. Luis Romero, control, a las 14:00. A las 16:30 el horario sigue abierto. El teléfono muestra el aviso de WhatsApp listo para enviar a María.`;

function Surfaces({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {(Object.keys(SURFACE) as (keyof typeof SURFACE)[]).map(key => {
        const marked = key === 'center';
        return (
          <path
            key={key}
            d={SURFACE[key]}
            fill={marked ? '#c5363a' : '#f7f4ee'}
            stroke={marked ? '#c5363a' : '#8d8680'}
            strokeWidth="0.7"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}

function MiniTooth({ id, crownDown = false }: { id: number; crownDown?: boolean }) {
  const marked = id === CARIES_TOOTH;
  const number = (
    <span className={`text-[10px] font-semibold tabular-nums leading-none sm:text-[11px] ${marked ? 'text-[#9f1239]' : 'text-[#3c4a43]'}`}>
      {fdiOf(id)}
    </span>
  );
  return (
    <div className={`flex min-w-0 flex-col items-center gap-1 ${TOOTH_FLEX[toothKind(id)]}`}>
      {crownDown ? number : null}
      <svg viewBox="0 0 100 144" className="block h-auto w-full" style={crownDown ? { transform: 'scaleY(-1)' } : undefined} aria-hidden>
        <path
          d={TOOTH_SHAPE[toothKind(id)]}
          fill={marked ? '#fde8e6' : '#fffdf8'}
          stroke={marked ? '#c5363a' : '#b7aa9c'}
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </svg>
      {crownDown ? null : number}
    </div>
  );
}

function Arch({ caption, ids, crownDown = false }: { caption: string; ids: number[]; crownDown?: boolean }) {
  const [left, right] = [ids.slice(0, 8), ids.slice(8)];
  return (
    <div>
      <p className="mb-2 text-xs font-medium tracking-wide text-[#3c4a43] uppercase">{caption}</p>
      <div className={`flex gap-2 sm:gap-3 ${crownDown ? 'items-end' : 'items-start'}`}>
        <div className={`flex min-w-0 flex-1 ${crownDown ? 'items-end' : 'items-start'}`}>
          {left.map(id => (
            <MiniTooth key={`${caption}-${id}`} id={id} crownDown={crownDown} />
          ))}
        </div>
        <div className="mb-4 h-12 w-px shrink-0 bg-[#14241c]/15 sm:h-14" aria-hidden />
        <div className={`flex min-w-0 flex-1 ${crownDown ? 'items-end' : 'items-start'}`}>
          {right.map(id => (
            <MiniTooth key={`${caption}-${id}`} id={id} crownDown={crownDown} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AgendaRows({ rows }: { rows: readonly (typeof AGENDA)[number][] }) {
  return (
    <ul>
      {rows.map(row => (
        <li key={row.time} className={`grid grid-cols-[3.2rem_1fr] gap-2 rounded-lg px-2 py-2.5 ${row.now ? 'bg-[#e7efe9]' : ''}`}>
          <span className={`pt-0.5 text-sm font-semibold tabular-nums ${row.now ? 'text-[#1b3830]' : 'text-[#3c4a43]'}`}>{row.time}</span>
          <span className="min-w-0">
            <span className="flex items-baseline justify-between gap-2">
              <span className={`truncate text-sm ${row.name === 'Horario libre' ? 'text-[#3c4a43]' : 'font-semibold text-[#14241c]'}`}>{row.name}</span>
              {row.now && <span className="shrink-0 text-[10px] font-semibold tracking-wide text-[#1b3830] uppercase">Siguiente</span>}
            </span>
            <span className="mt-0.5 block truncate text-[12px] text-[#3c4a43]">{row.note}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function PhoneFrame() {
  return (
    <div className="w-[214px] rounded-[28px] border border-white/20 bg-[#14241c] p-1 shadow-[0_28px_44px_-12px_rgba(0,0,0,0.55)]">
      <div className="rounded-[24px] bg-[#f7f4ee] px-3.5 pt-3 pb-3.5 text-[#14241c]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#d9d0c4]" aria-hidden />
        <p className="text-[10px] font-semibold tracking-wide text-[#3c4a43] uppercase">WhatsApp</p>
        <div className="mt-2 rounded-2xl rounded-tl-md bg-[#e7efe9] px-3 py-2.5 text-[13px] leading-snug text-pretty">
          Hola María, le recordamos su cita hoy a las 8:30. Responda para confirmar.
        </div>
        <p className="mt-2 text-[11px] text-[#3c4a43]">Listo para enviar</p>
      </div>
    </div>
  );
}

function AgendaWindow() {
  return (
    <div className={`${CARD} w-full border border-white/10 p-3 text-[#14241c] sm:p-4`}>
      <div className="flex items-center gap-1.5 px-2 pb-3" aria-hidden>
        <span className="h-2.5 w-2.5 rounded-full bg-[#e1d8cc]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#e1d8cc]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#e1d8cc]" />
        <span className="ml-2 text-xs text-[#3c4a43]">Hoy · muestra</span>
      </div>
      <div className="rounded-lg bg-white px-3 pt-4 pb-36 shadow-[0_10px_24px_-18px_rgba(20,36,28,0.45)] sm:px-4 sm:pb-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="landing-serif text-3xl leading-none font-medium text-[#14241c]">Hoy</h2>
          <p className="text-right text-xs text-[#3c4a43] sm:text-sm">{TODAY_LABEL}</p>
        </div>
        <div className="mt-4 flex justify-between gap-1">
          {WEEK_DAYS.map(day => (
            <div key={day.label} className="flex w-8 flex-col items-center">
              <span className="text-[10px] font-semibold text-[#3c4a43]">{day.label}</span>
              <span
                className={`mt-1 flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold tabular-nums ${
                  day.today ? 'bg-[#1b3830] text-[#f4f7f3]' : 'text-[#14241c]'
                }`}
              >
                {day.date}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <AgendaRows rows={AGENDA} />
        </div>
      </div>
    </div>
  );
}

function SceneFace({ mode }: { mode: SceneMode }) {
  if (mode === 'chart') {
    return (
      <div>
        <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-[0_10px_24px_-18px_rgba(20,36,28,0.35)] sm:flex-row sm:items-center">
          <div className="flex w-fit items-center gap-3 rounded-xl bg-[#fde8e6] px-4 py-3">
            <div className="flex flex-col items-center">
              <svg viewBox="0 0 100 144" className="block h-16 w-12" style={{ transform: 'scaleY(-1)' }} aria-hidden>
                <path d={TOOTH_SHAPE.molar} fill="#f7f4ee" stroke="#c5363a" strokeWidth="3" />
              </svg>
              <span className="mt-1 text-sm font-semibold tabular-nums">26</span>
            </div>
            <Surfaces className="h-14 w-14" />
          </div>
          <div>
            <p className="landing-serif text-2xl leading-tight font-medium">Caries en la cara oclusal</p>
            <p className="mt-1 text-sm text-[#3c4a43]">Pieza 26 · numeración FDI · María Fernández</p>
          </div>
        </div>
        <div className="mt-6 space-y-5">
          <Arch caption="Arcada superior · 18 a 28" ids={UPPER} crownDown />
          <Arch caption="Arcada inferior · 48 a 38" ids={LOWER} />
        </div>
      </div>
    );
  }

  if (mode === 'budget') {
    return (
      <div className="rounded-xl bg-white p-5 shadow-[0_10px_24px_-18px_rgba(20,36,28,0.35)] sm:p-6">
        <p className="text-sm text-[#3c4a43]">María Fernández · pieza 26</p>
        <p className="landing-serif mt-2 text-3xl leading-none font-medium">Presupuesto</p>
        <ul className="mt-5 divide-y divide-[#14241c]/10">
          {BUDGET_LINES.map(line => (
            <li key={line.name} className="flex items-baseline justify-between gap-4 py-3 text-sm">
              <span>{line.name}</span>
              <span className="font-medium tabular-nums whitespace-nowrap">{line.amount}</span>
            </li>
          ))}
        </ul>
        <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-[#14241c]/15 pt-4">
          <p className="text-sm font-semibold text-[#1b3830]">Total · pagado</p>
          <p className="landing-serif text-4xl leading-none font-medium tabular-nums whitespace-nowrap">L. 2,400</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-xl bg-white p-5 shadow-[0_10px_24px_-18px_rgba(20,36,28,0.35)]">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#3c4a43] uppercase">Enlace para pacientes</p>
        <p className="mt-3 font-mono text-sm font-medium break-all text-[#14241c] sm:text-base">/p/tu-consultorio</p>
        <p className="mt-4 text-sm text-[#3c4a43]">Lo que el enlace muestra hoy</p>
        <p className="mt-2 flex items-baseline justify-between gap-3 rounded-lg bg-[#f7f4ee] px-3 py-2.5 text-sm">
          <span className="font-semibold tabular-nums">16:30</span>
          <span className="text-[#3c4a43]">Libre</span>
        </p>
      </div>
      <div className="rounded-xl border-l-4 border-[#1b3830] bg-[#e7efe9] px-5 py-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#3c4a43] uppercase">Solicitud pendiente</p>
        <p className="mt-2 text-lg font-semibold">Carlos Méndez · 11:00</p>
        <p className="mt-1 text-sm leading-relaxed text-[#3c4a43]">Aún no está en la agenda. Mientras la apruebas, esa hora no sale en el enlace.</p>
      </div>
    </div>
  );
}

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [scene, setScene] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pageReady = !loading && !user;
  const active = SCENES[scene];

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!pageReady) return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const index = SCENES.findIndex(item => item.id === hash);
    if (index >= 0) setScene(index);
    document.getElementById(hash)?.scrollIntoView();
  }, [pageReady]);

  const handleCTA = () => navigate('/login?elegir=1');
  const handleDemo = () => navigate('/demo');

  const chooseScene = (index: number) => {
    setScene(index);
    const id = SCENES[index].id;
    if (window.location.hash !== `#${id}`) window.history.replaceState(null, '', `#${id}`);
  };

  if (loading || user) {
    return (
      <div className="flex h-dvh items-center justify-center font-sans" style={{ background: SAGE, color: INK }}>
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 motion-safe:animate-spin rounded-full border-b-2" style={{ borderColor: MOSS }} />
          <p className="text-sm font-medium" style={{ color: MUTED }}>
            {user ? 'Entrando a tu clínica...' : 'Iniciando DienteLink...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-scroll h-dvh w-full scroll-pt-20 overflow-y-auto overflow-x-hidden font-sans" style={{ background: SAGE, color: INK }}>
      <a href="#inicio" className={`sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-[#f4f7f3] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold ${RING_INK}`}>
        Saltar al contenido
      </a>

      <div style={{ background: MOSS, color: CREAM }}>
        <nav className="sticky top-0 z-50" style={{ background: MOSS }}>
          <div className={`mx-auto flex max-w-6xl items-center justify-between gap-3 py-3.5 ${PAD}`}>
            <a href="#inicio" className={`flex min-w-0 items-center gap-2.5 text-[#f4f7f3] ${RING}`} aria-label="DienteLink, volver al inicio">
              <DentalLogo size={22} variant="white" />
              <span className="truncate text-[17px] font-semibold tracking-tight">DienteLink</span>
            </a>
            <div className="flex shrink-0 items-center gap-1 sm:gap-5">
              <a href="#como" className={`hidden h-10 items-center text-sm text-[#d7e4dc] hover:text-white sm:inline-flex ${RING}`}>
                Cómo funciona
              </a>
              <a href="#precio" className={`inline-flex h-10 items-center px-2 text-sm text-[#d7e4dc] hover:text-white ${RING}`}>
                Precio
              </a>
              <a href="/login" className={`inline-flex h-10 items-center px-2 text-sm text-[#d7e4dc] hover:text-white ${RING}`}>
                <span className="sm:hidden">Entrar</span>
                <span className="hidden sm:inline">Iniciar sesión</span>
              </a>
              <button type="button" onClick={handleCTA} className={`${BTN} h-10 px-3.5 whitespace-nowrap`}>
                <span className="sm:hidden">14 días</span>
                <span className="hidden sm:inline">Probar {BILLING.trialDays} días</span>
              </button>
            </div>
          </div>
        </nav>

        <header id="inicio" className="scroll-mt-20">
          <div className={`mx-auto grid max-w-6xl items-start gap-10 pt-[4.5rem] pb-20 lg:pt-24 lg:pb-28 ${COLS} ${PAD}`}>
            <div>
              <h1 className="landing-serif text-[clamp(2.5rem,4.8vw,4.4rem)] leading-[1.02] font-medium tracking-[-0.03em] text-balance">
                Agenda, expediente y odontograma.
              </h1>
              <p className="mt-5 text-xl leading-snug text-pretty text-[#f4f7f3] sm:text-2xl">Para consultorios dentales en Honduras.</p>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-pretty text-[#d7e4dc] sm:text-lg">
                El día, la ficha y el presupuesto quedan en un solo lugar. Dejas el cuaderno y el Excel.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={handleCTA} className={`${BTN} h-12 px-6`}>
                  Probar {BILLING.trialDays} días
                </button>
                <button type="button" onClick={handleDemo} className={`${BTN_QUIET} h-12 px-6`}>
                  Ver ejemplo
                </button>
              </div>
              <p className="mt-4 text-sm text-[#d7e4dc]">14 días con Google, sin tarjeta. El ejemplo no pide cuenta.</p>
            </div>
            <div role="img" aria-label={AGENDA_LABEL} id="agenda" className="relative scroll-mt-20 w-full">
              <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e7efe9]/10 blur-3xl" />
              <AgendaWindow />
              <div className="absolute -right-1 bottom-0 z-10 translate-y-10 sm:right-3">
                <PhoneFrame />
              </div>
            </div>
          </div>
        </header>
      </div>

      <section id="como" className="scroll-mt-24">
        <div className={`mx-auto grid max-w-6xl items-start gap-10 py-16 lg:py-24 ${COLS} ${PAD}`}>
          <div>
            <h2 className="landing-serif text-4xl leading-none font-medium tracking-[-0.03em] sm:text-5xl">La ficha</h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-pretty text-[#3c4a43]">
              María Fernández tiene consulta a las 08:30. Desde esa cita se abre su ficha: el diente, lo que ya pagó y las reservas que todavía no entran a la agenda.
            </p>
            <div
              role="tablist"
              aria-label="Partes de la ficha"
              className="mt-8 flex flex-col items-start gap-1"
              onKeyDown={event => {
                if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
                event.preventDefault();
                const next = event.key === 'ArrowDown' ? (scene + 1) % SCENES.length : (scene - 1 + SCENES.length) % SCENES.length;
                chooseScene(next);
                tabRefs.current[next]?.focus();
              }}
            >
              {SCENES.map((item, index) => {
                const on = index === scene;
                return (
                  <button
                    key={item.id}
                    ref={node => {
                      tabRefs.current[index] = node;
                    }}
                    id={item.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    aria-controls="ficha-panel"
                    tabIndex={on ? 0 : -1}
                    onClick={() => chooseScene(index)}
                    className={`landing-serif rounded-full px-4 py-2 text-left text-2xl leading-none font-medium tracking-[-0.03em] ${RING_INK} ${
                      on ? 'bg-[#1b3830] text-[#f4f7f3]' : 'text-[#3c4a43] hover:bg-[#d7e4dc] hover:text-[#14241c]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-6 grid max-w-md">
              {SCENES.map((item, index) => (
                <p
                  key={item.id}
                  className={`col-start-1 row-start-1 text-base leading-relaxed text-pretty text-[#3c4a43] ${index === scene ? '' : 'invisible'}`}
                  aria-hidden={index !== scene}
                >
                  {item.text}
                </p>
              ))}
            </div>
          </div>
          <div role="tabpanel" id="ficha-panel" aria-labelledby={active.id} className={`${CARD} p-5 sm:p-8`}>
            <div className="grid">
              {SCENES.map((item, index) => (
                <div key={item.id} className={`col-start-1 row-start-1 ${index === scene ? '' : 'invisible'}`} aria-hidden={index !== scene}>
                  <SceneFace mode={item.mode} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="precio" className="scroll-mt-24" style={{ background: MOSS, color: CREAM }}>
        <div className={`mx-auto max-w-6xl py-16 lg:py-24 ${PAD}`}>
          <div className={`grid items-start gap-10 ${COLS}`}>
            <div>
              <h2 className="text-sm font-medium text-[#d7e4dc]">Al mes, un consultorio dental</h2>
              <p className="landing-serif mt-3 text-6xl leading-none font-medium tracking-[-0.04em] sm:text-7xl">
                {BILLING.priceAmount}
                <span className="ml-2 font-sans text-xl font-medium tracking-normal text-[#d7e4dc]">/ mes</span>
              </p>
              <p className="mt-5 max-w-sm text-base leading-relaxed text-pretty text-[#d7e4dc]">
                Hay un solo precio. Recepción u otro doctor entran con invitación, en la misma cuenta.
              </p>
              <p className="mt-3 text-base font-medium text-[#f4f7f3]">Una resina cobrada paga más de siete meses.</p>
              <button type="button" onClick={handleCTA} className={`${BTN} mt-8 h-12 px-6`}>
                Probar {BILLING.trialDays} días
              </button>
              <p className="mt-3 text-sm text-[#d7e4dc]">Entras con Google. Sin tarjeta.</p>
            </div>
            <ul className="flex flex-col gap-4 rounded-xl border border-white/25 bg-white/[0.04] p-5">
              {INCLUDED.map(item => (
                <li key={item.title} className="flex items-start gap-3 text-[15px] leading-snug">
                  <Check size={16} className="mt-0.5 shrink-0 text-[#d7e4dc]" aria-hidden />
                  <span>
                    {item.title}
                    {'note' in item && item.note ? <span className="mt-0.5 block text-sm text-[#d7e4dc]">{item.note}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-10 rounded-xl border border-white/25 px-5 py-4">
            <p className="text-sm font-semibold">También incluye</p>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#d7e4dc]">
              {ALSO.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <ul className="mt-8 grid gap-3 sm:grid-cols-3">
            {GUARANTEES.map(item => (
              <li key={item.title} className="rounded-xl bg-white/10 px-4 py-4">
                <p className={`text-sm font-semibold ${item.title.endsWith('.zip') ? 'font-mono' : ''}`}>{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-[#d7e4dc]">{item.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="preguntas" className="scroll-mt-24" style={{ background: BONE }}>
        <div className={`mx-auto grid max-w-6xl items-start gap-8 py-16 ${COLS} ${PAD}`}>
          <h2 className="landing-serif text-4xl font-medium tracking-[-0.03em] text-balance">Preguntas</h2>
          <div>
            {FAQS.map(faq => (
              <details key={faq.q} className="group border-b border-[#14241c]/15">
                <summary className={`flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-semibold [&::-webkit-details-marker]:hidden ${RING_INK}`}>
                  {faq.q}
                  <ChevronDown size={16} className="shrink-0 text-[#3c4a43] transition-transform duration-200 group-open:rotate-180" aria-hidden />
                </summary>
                <p className="max-w-2xl pb-4 text-sm leading-relaxed text-[#3c4a43]">{faq.a}</p>
              </details>
            ))}
            <p className="mt-8 text-sm text-[#3c4a43]">
              ¿Una duda?{' '}
              <a href={SUPPORT_URL} target="_blank" rel="noreferrer" className={`font-semibold text-[#1b3830] underline decoration-[#1b3830]/30 underline-offset-4 hover:decoration-[#1b3830] ${RING_INK}`}>
                Escríbele al soporte por WhatsApp
              </a>
            </p>
          </div>
        </div>
      </section>

      <footer style={{ background: MOSS, color: CREAM }}>
        <div className={`mx-auto grid max-w-6xl gap-10 py-16 sm:py-20 lg:grid-cols-2 lg:items-end ${PAD}`}>
          <div>
            <h2 className="landing-serif max-w-xl text-4xl leading-[1.05] font-medium tracking-[-0.03em] text-balance sm:text-5xl">Mañana, abre el día por aquí.</h2>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={handleCTA} className={`${BTN} h-12 px-6`}>
                Probar {BILLING.trialDays} días
              </button>
              <button type="button" onClick={handleDemo} className={`${BTN_QUIET} h-12 px-6`}>
                Ver ejemplo
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-6 lg:items-end">
            <p className="max-w-sm text-sm leading-relaxed text-pretty text-[#d7e4dc] lg:text-right">
              Agenda, expediente y odontograma para consultorios dentales en Honduras. El soporte responde por WhatsApp.
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm lg:justify-end">
              <a href="/terminos" className={`text-[#d7e4dc] hover:text-white ${RING}`}>
                Términos y privacidad
              </a>
              <a href={SUPPORT_URL} target="_blank" rel="noreferrer" className={`text-[#d7e4dc] hover:text-white ${RING}`}>
                Soporte
              </a>
              <a href="/login" className={`text-[#d7e4dc] hover:text-white ${RING}`}>
                Iniciar sesión
              </a>
              <span className="text-[#d7e4dc]">© {new Date().getFullYear()} DienteLink</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
