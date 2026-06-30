import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription, ProFeature } from '../hooks/useSubscription';
import { Lock, ArrowRight, Zap } from 'lucide-react';

interface FeatureGateProps {
  feature: ProFeature;
  children: React.ReactNode;
  /** Optional inline fallback instead of the default overlay */
  fallback?: React.ReactNode;
  /** If true, renders a small inline badge instead of overlay (for buttons) */
  inline?: boolean;
}

/**
 * Wraps a feature that requires an active subscription.
 * - If the user has access → renders children normally.
 * - If not → shows a lock overlay or inline badge with upgrade CTA.
 */
const FeatureGate: React.FC<FeatureGateProps> = ({ feature, children, fallback, inline = false }) => {
  const { canUseFeature, loading } = useSubscription();
  const navigate = useNavigate();

  // While loading subscription, render children to avoid flash
  if (loading) return <>{children}</>;

  const hasAccess = canUseFeature(feature);

  if (hasAccess) return <>{children}</>;

  // Custom fallback
  if (fallback) return <>{fallback}</>;

  // ─── Inline Mode (for buttons) ──────────────────────────────────────────
  if (inline) {
    return (
      <button
        onClick={() => navigate('/billing')}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-500 text-sm font-semibold hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all group"
      >
        <Lock size={14} className="text-slate-500 group-hover:text-blue-500" />
        <span>Plan Pro</span>
        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-xs font-bold rounded-md uppercase">Pro</span>
      </button>
    );
  }

  // ─── Overlay Mode (for sections) ─────────────────────────────────────────
  return (
    <div className="relative">
      {/* Blurred children */}
      <div className="pointer-events-none select-none blur-[2px] opacity-50">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-2xl">
        <div className="text-center p-6 max-w-xs">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap size={24} className="text-blue-600" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-2">Disponible en el Plan Pro</h3>
          <p className="text-sm text-slate-500 mb-5 leading-relaxed">
            Activa DienteLink por <strong className="text-slate-700">$15 al mes</strong> y desbloquea todo. Sin contratos. Sin complicaciones.
          </p>
          <button
            onClick={() => navigate('/billing')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 active:scale-95"
          >
            Ver cómo activar
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeatureGate;
