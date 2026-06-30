import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../services/authService';
import { verifyPayment } from '../../services/pagaditoService';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';

/**
 * PaymentSuccessView
 *
 * Pagadito redirects here after a payment attempt:
 * /#/payment-success?token=XXXXX
 *
 * This component verifies the token with the backend and
 * shows a success or error state.
 */
const PaymentSuccessView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { clinicId } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'cancelled'>('verifying');
  const [message, setMessage] = useState('');
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token || !clinicId) {
      setStatus('error');
      setMessage('No se encontró un token de pago válido.');
      return;
    }

    verifyPayment(token, clinicId)
      .then((result) => {
        if (result.success) {
          setStatus('success');
          setMessage(result.message);
          setPeriodEnd(result.periodEnd ?? null);
        } else if (result.status === 'pending') {
          setStatus('verifying'); // keep spinner
          setMessage(result.message);
        } else {
          setStatus('cancelled');
          setMessage(result.message);
        }
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Error al verificar el pago.');
      });
  }, [searchParams, clinicId]);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-HN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-300 shadow-xl p-8 text-center space-y-6">

        {/* Icon */}
        <div className="flex items-center justify-center">
          {status === 'verifying' && (
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
              <Loader2 size={36} className="text-blue-500 animate-spin" />
            </div>
          )}
          {status === 'success' && (
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
          )}
          {(status === 'error' || status === 'cancelled') && (
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
              <XCircle size={40} className="text-red-500" />
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {status === 'verifying'  && 'Verificando pago...'}
            {status === 'success'    && '¡Pago exitoso! 🎉'}
            {status === 'cancelled'  && 'Pago cancelado'}
            {status === 'error'      && 'Error en el pago'}
          </h1>
          <p className="text-sm text-slate-500 mt-2">{message}</p>
        </div>

        {/* Success detail */}
        {status === 'success' && periodEnd && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-left">
            <p className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-1">Suscripción activa hasta</p>
            <p className="text-base font-bold text-emerald-800">{fmtDate(periodEnd)}</p>
          </div>
        )}

        {/* CTA buttons */}
        {status !== 'verifying' && (
          <div className="space-y-3 pt-2">
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3 px-5 rounded-xl transition-all shadow-lg shadow-blue-500/25"
            >
              Ir al dashboard
              <ArrowRight size={14} />
            </button>
            {(status === 'error' || status === 'cancelled') && (
              <button
                onClick={() => navigate('/billing')}
                className="w-full text-sm font-semibold text-slate-600 hover:text-slate-900 py-2 transition-colors"
              >
                Volver a Facturación
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccessView;
