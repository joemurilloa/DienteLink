import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription, FREE_PATIENT_LIMIT } from '../hooks/useSubscription';
import { usePatients } from '../hooks/usePatients';
import { Zap, ArrowRight, Clock, X, Users } from 'lucide-react';

const UpgradeBanner: React.FC = () => {
  const { isPro, isTrial, hasAccess, isExpired, daysLeft, status, loading } = useSubscription();
  const { data: patients = [] } = usePatients();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = React.useState(false);

  // TODO: Re-enable when ready to launch with pricing
  // Development mode — hide all upgrade/limit banners
  return null;

  // ─── Trial Active ──────────────────────────────────────────────────────────
  if (isTrial && hasAccess) {
    const progressPercent = Math.max(0, Math.min(100, ((14 - daysLeft) / 14) * 100));
    const isUrgent = daysLeft <= 3;

    return (
      <div className={`relative flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
        isUrgent
          ? 'bg-amber-50 border-b border-amber-200 text-amber-800'
          : 'bg-blue-50 border-b border-blue-200 text-blue-800'
      }`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isUrgent ? 'bg-amber-100' : 'bg-blue-100'
        }`}>
          {isUrgent ? <Clock size={14} className="text-amber-600" /> : <Zap size={14} className="text-blue-600" />}
        </div>

        <div className="flex-1 flex items-center gap-3 min-w-0">
          <span className="truncate">
            {isUrgent
              ? `¡Solo te quedan ${daysLeft} día${daysLeft !== 1 ? 's' : ''} de prueba!`
              : `Prueba gratuita · ${daysLeft} día${daysLeft !== 1 ? 's' : ''} restantes`
            }
          </span>

          {/* Mini progress bar */}
          <div className="hidden sm:block w-24 h-1.5 bg-white/60 rounded-full overflow-hidden flex-shrink-0">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isUrgent ? 'bg-amber-500' : 'bg-blue-500'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => navigate('/billing')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex-shrink-0 ${
            isUrgent
              ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-sm'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
          }`}
        >
          Activar Plan Pro
          <ArrowRight size={12} />
        </button>

        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-md hover:bg-black/5 transition-colors flex-shrink-0"
          aria-label="Cerrar"
        >
          <X size={14} className="opacity-50" />
        </button>
      </div>
    );
  }

  // ─── Expired / Inactive (was trial) ───────────────────────────────────────
  if (isExpired) {
    return (
      <div className="relative flex items-center gap-3 px-4 py-2.5 bg-red-50 border-b border-red-200 text-red-800 text-sm font-medium">
        <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
          <Clock size={14} className="text-red-600" />
        </div>

        <span className="flex-1 truncate">
          Tu prueba terminó. Activa el Plan Pro para usar todas las funciones.
        </span>

        <button
          onClick={() => navigate('/billing')}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700 shadow-sm transition-all flex-shrink-0"
        >
          Activar Plan Pro
          <ArrowRight size={12} />
        </button>
      </div>
    );
  }

  // ─── Freemium (Inactive, never had trial) ──────────────────────────────────
  if (!hasAccess && status === 'inactive') {
    const used = patients.length;
    const isAtLimit = used >= FREE_PATIENT_LIMIT;
    const progressPercent = Math.min(100, (used / FREE_PATIENT_LIMIT) * 100);

    return (
      <div className={`relative flex items-center gap-3 px-4 py-2 text-sm font-medium border-b ${
        isAtLimit
          ? 'bg-red-50 border-red-200 text-red-800'
          : 'bg-amber-50 border-amber-200 text-amber-800'
      }`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isAtLimit ? 'bg-red-100' : 'bg-amber-100'}`}>
          <Users size={14} className={isAtLimit ? 'text-red-600' : 'text-amber-600'} />
        </div>

        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
          <span className="truncate text-sm font-semibold">
            {isAtLimit
              ? `🔒 Límite de ${FREE_PATIENT_LIMIT} pacientes alcanzado`
              : `Demo Gratuita · ${used}/${FREE_PATIENT_LIMIT} pacientes usados`
            }
          </span>
          <div className="hidden sm:block w-20 h-1.5 bg-white/60 rounded-full overflow-hidden flex-shrink-0">
            <div
              className={`h-full rounded-full transition-all duration-700 ${isAtLimit ? 'bg-red-500' : 'bg-amber-400'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => navigate('/billing')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex-shrink-0 shadow-sm ${
            isAtLimit
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-amber-600 text-white hover:bg-amber-700'
          }`}
        >
          <Zap size={11} />
          $15/mes — Sin límites
          <ArrowRight size={11} />
        </button>

        {!isAtLimit && (
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-md hover:bg-black/5 transition-colors flex-shrink-0"
            aria-label="Cerrar"
          >
            <X size={14} className="opacity-50" />
          </button>
        )}
      </div>
    );
  }

  return null;
};

export default UpgradeBanner;
