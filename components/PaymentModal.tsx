import React, { useState } from 'react';
import { useAuth } from '../services/authService';

// ─────────────────────────────────────────────────────────────
// CONFIGURA AQUÍ TUS DATOS BANCARIOS (mismo que SubscriptionGate)
// ─────────────────────────────────────────────────────────────
export const PAYMENT_INFO = {
  bank:    'Banco Atlántida',
  account: 'XXXX-XXXX-XXXX',
  holder:  'Joe Murray / DienteLink',
  amount:  'L. 500',
  currency: 'Lempiras',
};
// ─────────────────────────────────────────────────────────────

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);
  const userEmail = user?.email ?? '';

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="payment-modal-backdrop" onClick={onClose}>
      <div className="payment-modal-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="payment-modal-header">
          <div>
            <h2 className="payment-modal-title">Instrucciones de pago</h2>
            <p className="payment-modal-subtitle">Activa tu suscripción mensual</p>
          </div>
          <button className="payment-modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {/* Precio */}
        <div className="payment-modal-price">
          <span className="payment-modal-amount">{PAYMENT_INFO.amount}</span>
          <span className="payment-modal-period">/ mes · Acceso completo</span>
        </div>

        {/* Pasos */}
        <div className="payment-modal-steps">
          <p className="payment-modal-steps-title">📲 Realiza la transferencia a:</p>

          <div className="pm-step">
            <span className="pm-step-label">Banco</span>
            <span className="pm-step-value">{PAYMENT_INFO.bank}</span>
          </div>

          <div className="pm-step">
            <span className="pm-step-label">Número de cuenta</span>
            <div className="pm-step-row">
              <span className="pm-step-value pm-mono">{PAYMENT_INFO.account}</span>
              <button className="pm-copy" onClick={() => copyToClipboard(PAYMENT_INFO.account, 'account')}>
                {copied === 'account' ? '✓' : '⎘'}
              </button>
            </div>
          </div>

          <div className="pm-step">
            <span className="pm-step-label">Titular</span>
            <span className="pm-step-value">{PAYMENT_INFO.holder}</span>
          </div>

          <div className="pm-step pm-step--highlight">
            <span className="pm-step-label">⚠️ Concepto / Referencia (obligatorio)</span>
            <div className="pm-step-row">
              <span className="pm-step-value pm-mono pm-email">{userEmail}</span>
              <button className="pm-copy" onClick={() => copyToClipboard(userEmail, 'email')}>
                {copied === 'email' ? '✓' : '⎘'}
              </button>
            </div>
            <span className="pm-step-note">
              Pon tu email exactamente en el campo "concepto" para que podamos identificar tu pago.
            </span>
          </div>

          <div className="pm-step">
            <span className="pm-step-label">Monto</span>
            <span className="pm-step-value pm-green">{PAYMENT_INFO.amount} {PAYMENT_INFO.currency}</span>
          </div>
        </div>

        {/* Después de pagar */}
        <div className="payment-modal-after">
          <p>
            ✅ Después de transferir, ve a <strong>Configuración → Suscripción</strong> y sube
            tu comprobante. Activaremos tu cuenta en menos de <strong>24 horas</strong>.
          </p>
        </div>

        <button className="payment-modal-btn" onClick={onClose}>
          Entendido
        </button>
      </div>
    </div>
  );
};

export default PaymentModal;
