import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/authService';
import {
  getSubscriptionStatus,
  initCheckout,
  SubscriptionStatus,
} from '../../services/pagaditoService';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Calendar,
  Zap,
  RefreshCw,
  Shield,
  ArrowRight,
  Loader2,
  Building,
  Smartphone,
  ExternalLink
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-HN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function daysRemaining(iso: string | null): number {
  if (!iso) return 0;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: SubscriptionStatus['status'] }> = ({ status }) => {
  const map = {
    active:   { label: 'Activa',    icon: CheckCircle2,   color: 'emerald' },
    pending:  { label: 'Pendiente', icon: Clock,          color: 'amber'   },
    inactive: { label: 'Inactiva',  icon: XCircle,        color: 'red'     },
    trial:    { label: 'Prueba',    icon: Zap,            color: 'blue'    },
  };
  const cfg = map[status] ?? map.inactive;
  const Icon = cfg.icon;
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber:   'bg-amber-50   text-amber-700   border-amber-200',
    red:     'bg-red-50     text-red-700     border-red-200',
    blue:    'bg-blue-50    text-blue-700    border-blue-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border ${colorMap[cfg.color]}`}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
};

const FeatureRow: React.FC<{ label: string; included?: boolean }> = ({ label, included = true }) => (
  <div className="flex items-center gap-3 py-2.5 border-b border-slate-300 last:border-0">
    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${included ? 'bg-emerald-100' : 'bg-slate-100'}`}>
      {included
        ? <CheckCircle2 size={12} className="text-emerald-600" />
        : <XCircle size={12} className="text-slate-500" />}
    </div>
    <span className={`text-sm ${included ? 'text-slate-700' : 'text-slate-500'}`}>{label}</span>
  </div>
);

// ─── Main View ────────────────────────────────────────────────────────────────

const BillingView: React.FC = () => {
  const { clinicId } = useAuth();
  const navigate = useNavigate();

  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSubscriptionStatus();
      setSub(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleCheckout = async () => {
    if (!clinicId) return;
    setPaying(true);
    setError(null);
    try {
      const { paymentUrl } = await initCheckout(clinicId, window.location.origin);
      // Redirect to Pagadito-hosted payment page
      window.location.href = paymentUrl;
    } catch (e: any) {
      setError(e.message || 'No se pudo iniciar el pago. Intenta de nuevo.');
      setPaying(false);
    }
  };

  const days = daysRemaining(sub?.current_period_end ?? null);
  const isActive = sub?.is_active ?? false;
  const expiresSoon = sub?.expires_soon ?? false;

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm font-medium">Cargando suscripción...</p>
        </div>
      </div>
    );
  }

  // ─── Layout ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tu Plan DienteLink</h1>
          <p className="text-sm text-slate-500 mt-1">Aquí ves el estado de tu suscripción y cómo renovarla</p>
        </div>

        {/* Expiry warning banner */}
        {expiresSoon && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <AlertTriangle size={20} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-800">Tu suscripción vence en {days} días</p>
              <p className="text-sm text-amber-600 mt-0.5">Renueva ahora para evitar interrupciones en tu clínica.</p>
            </div>
          </div>
        )}

        {/* Inactive / no subscription banner */}
        {!isActive && sub?.status !== 'pending' && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
            <XCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-800">Sin suscripción activa</p>
              <p className="text-sm text-red-600 mt-0.5">Activa tu plan para seguir gestionando tu clínica.</p>
            </div>
          </div>
        )}

        {/* Pending banner */}
        {sub?.status === 'pending' && (
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <Clock size={20} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-blue-800">Ya recibimos tu pago</p>
              <p className="text-sm text-blue-600 mt-0.5">Lo estamos verificando. En unos minutos tu cuenta queda activa. ¡Gracias por confiar en nosotros!</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
            <AlertTriangle size={18} className="text-red-500 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

          {/* ── Current Status Card ── */}
          <div className="md:col-span-3 bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Tu suscripción</h2>
              <button
                onClick={fetchStatus}
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Actualizar"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <p className="text-3xl font-extrabold text-slate-900">$15<span className="text-lg font-semibold text-slate-500">/mes</span></p>
                <p className="text-sm text-slate-500 mt-1">Plan Profesional · Sin contratos</p>
              </div>
              <StatusBadge status={sub?.status ?? 'inactive'} />
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-300">
              {sub?.current_period_end && (
                <div className="flex items-center gap-3">
                  <Calendar size={15} className="text-slate-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Se renueva el</p>
                    <p className="text-sm font-semibold text-slate-700">{formatDate(sub.current_period_end)}</p>
                  </div>
                  {isActive && (
                    <span className="ml-auto text-sm font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      {days}d restantes
                    </span>
                  )}
                </div>
              )}
              {sub?.last_payment_at && (
                <div className="flex items-center gap-3">
                  <CreditCard size={15} className="text-slate-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Tu último pago fue el</p>
                    <p className="text-sm font-semibold text-slate-700">{formatDate(sub.last_payment_at)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="flex flex-col gap-3">
              {sub?.status === 'pending' && (
                <button
                  onClick={async () => {
                    if (!clinicId) return;
                    setPaying(true);
                    setError(null);
                    try {
                      const { verifyPendingPayment } = await import('../../services/pagaditoService');
                      const result = await verifyPendingPayment(clinicId);
                      if (result.success) {
                        await fetchStatus();
                      } else {
                        setError(result.message);
                      }
                    } catch (e: any) {
                      setError(e.message || "Error al verificar el pago.");
                    } finally {
                      setPaying(false);
                    }
                  }}
                  disabled={paying}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm py-3 px-5 rounded-xl transition-all shadow-lg shadow-emerald-500/25"
                >
                  {paying ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  Verificar estado del pago
                </button>
              )}
              
              {/* Botón Pagadito deshabilitado temporalmente
              <button
                onClick={handleCheckout} ...
              </button>
              */}

              <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 mt-2">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Elige cómo pagar</p>

                {/* Option A: PayPal */}
                <div className="mb-3 p-3.5 bg-white border border-slate-300 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🅿️</span>
                    <h3 className="text-sm font-bold text-slate-800">PayPal — Con tarjeta o saldo</h3>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">Paga de inmediato con tu tarjeta de crédito, débito o saldo PayPal. Sin esperas.</p>
                  <a
                    href="https://www.paypal.com/paypalme/dientelink/15"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-[#0070ba] hover:bg-[#005ea6] text-white font-bold text-sm py-2.5 px-4 rounded-xl transition-all"
                  >
                    <ExternalLink size={14} />
                    Pagar $15 con PayPal
                  </a>
                </div>

                {/* Option B: BAC Transfer */}
                <div className="p-3.5 bg-white border border-slate-300 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Building size={16} className="text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-800">Transferencia BAC Honduras</h3>
                  </div>
                  <div className="space-y-1 text-sm text-slate-600 mb-3">
                    <p>Número de cuenta: <strong>747076151</strong></p>
                    <p>Monto: <strong>$15.00</strong> (o equivalente en Lempiras)</p>
                  </div>
                  <a
                    href="https://wa.me/50487943082?text=Hola,%20te%20mando%20el%20comprobante%20de%20mi%20pago%20de%20DienteLink%20%F0%9F%A6%B7"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm py-2.5 px-4 rounded-xl transition-all"
                  >
                    <Smartphone size={14} />
                    Enviar comprobante por WhatsApp
                  </a>
                </div>

                <p className="text-xs text-slate-500 text-center mt-3">Tu cuenta se activa en minutos una vez confirmemos tu pago. ¡Te avisamos!</p>
              </div>

            </div>

            <div className="flex items-center gap-2 justify-center text-sm text-slate-500">
              <Shield size={12} />
              <span>Activación rápida — En minutos estarás listo para trabajar</span>
            </div>
          </div>

          {/* ── Plan Features ── */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-300 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">¿Qué incluye el plan? 🦷</h2>
            <div className="space-y-0.5">
              <FeatureRow label="Pacientes ilimitados" />
              <FeatureRow label="Odontograma clínico" />
              <FeatureRow label="Periodontograma" />
              <FeatureRow label="Recetas digitales" />
              <FeatureRow label="Presupuestos y pagos" />
              <FeatureRow label="Calendario de citas" />
              <FeatureRow label="Recordatorios WhatsApp" />
              <FeatureRow label="Reservas online (link público)" />
              <FeatureRow label="Resumen de actividad" />
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-sm text-center text-slate-500 pb-4">
          DienteLink · Gestión Dental Profesional · Honduras 🇭🇳
        </p>
      </div>
    </div>
  );
};

export default BillingView;
