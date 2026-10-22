import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/authService';
import { supabase } from '../../lib/supabase';
import { useSubscription } from '../../hooks/useSubscription';

import { BILLING } from '../../lib/billing';
import { prepareReceiptFile } from '../../lib/receiptFile';
import BackupSettings from './Settings/BackupSettings';

const BANK_INFO = {
  bank:     BILLING.bank.name,
  account:  BILLING.bank.account,
  holder:   BILLING.bank.holder,
  amount:   BILLING.priceAmount,
  currency: BILLING.priceCurrency,
};

type Step = 'info' | 'upload' | 'done';

const SubscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, clinicId } = useAuth();
  const subscription = useSubscription(clinicId, user?.created_at);
  const userEmail = user?.email ?? '';

  const [step, setStep] = useState<Step>('info');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [provisionalGranted, setProvisionalGranted] = useState(false);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setErrorMsg('Máximo 10MB.'); return; }
    const valid = ['image/jpeg','image/jpg','image/png','image/webp','application/pdf'];
    if (!valid.includes(f.type)) { setErrorMsg('Solo JPG, PNG, WebP o PDF.'); return; }
    setFile(f);
    setErrorMsg('');
    if (f.type.startsWith('image/')) {
      const r = new FileReader();
      r.onload = ev => setPreview(ev.target?.result as string);
      r.readAsDataURL(f);
    } else { setPreview(null); }
  };

  const handleSubmit = async () => {
    if (!file || !clinicId || !profile) return;
    setUploading(true);
    setErrorMsg('');
    try {
      // El comprobante se comprime y viaja por correo al administrador; no se guarda en la app.
      const { mimeType, contentBase64 } = await prepareReceiptFile(file);
      const { data, error } = await supabase.functions.invoke('submit-receipt', {
        body: { mimeType, contentBase64, notes: notes.trim() },
      });
      if (error) {
        let message = 'No se pudo enviar el comprobante. Intenta de nuevo.';
        try {
          const body = await (error as { context?: Response }).context?.json();
          if (body?.error) message = body.error;
        } catch { /* se queda el mensaje genérico */ }
        throw new Error(message);
      }

      const provisionalUntil = data?.provisional_access_until;
      setEmailSent(data?.email_sent !== false);
      if (provisionalUntil) {
        setProvisionalGranted(true);
        window.dispatchEvent(new Event('dientelink:subscription-changed'));
        await subscription.refresh();
      }
      setStep('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado. Intenta de nuevo.');
    } finally { setUploading(false); }
  };

  // ─── STATUS BADGE ───────────────────────────────────────────
  const statusLabel = subscription.isProvisional
    ? `⏳ En revisión — acceso hasta ${subscription.provisionalUntil?.toLocaleDateString('es-HN')}`
    : subscription.isTrial
    ? `🎁 Trial — ${subscription.daysLeft} días restantes`
    : subscription.isActive
    ? `✅ Activa — vence ${subscription.expiresAt?.toLocaleDateString('es-HN')}`
    : '⛔ Expirada';

  const statusColor = subscription.isProvisional
    ? 'sub-badge--trial'
    : subscription.isActive
    ? subscription.isTrial ? 'sub-badge--trial' : 'sub-badge--active'
    : 'sub-badge--expired';

  if (step === 'done') {
    return (
      <div className="sub-page">
        <button className="sub-back" onClick={() => navigate(-1)}>← Volver</button>
        <div className="sub-body sub-body--centered">
          <div className="sub-card sub-success fade-in-up">
            <div className="sub-success-icon">🎉</div>
            <h2 className="sub-success-title">¡Comprobante recibido!</h2>
            <p className="sub-success-text">
              {provisionalGranted ? (
                <>
                  Mientras lo revisamos, <strong>tienes acceso provisional durante 3 días.</strong> El mes se sumará
                  a tu suscripción cuando confirmemos el pago.
                </>
              ) : (
                <>
                  Hemos recibido tu comprobante y <strong>lo revisaremos en menos de 24 horas.</strong>
                </>
              )}
            </p>
            <div className="sub-success-email">
              📧 Cuenta asociada al comprobante: <strong>{userEmail}</strong>
            </div>
            {emailSent === false && (
              <div className="sub-success-data-note" style={{ marginTop: 12 }}>
                El aviso por correo no se pudo enviar ahora. El comprobante sí quedó registrado: revísalo en el panel de cobros (/admin).
              </div>
            )}
            <div className="sub-success-data-note">
              🔒 Todos tus registros y datos de pacientes están completamente seguros e intactos.
            </div>
            <button className="sub-btn-primary mt-4" onClick={() => navigate('/')}>
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sub-page">
      <div className="sub-header-glass">
        <button className="sub-back" onClick={() => navigate(-1)}>← Volver</button>
        <span className={`sub-badge ${statusColor}`}>{statusLabel}</span>
      </div>

      <div className="sub-body fade-in-up">
        <div className="sub-hero-minimal">
          <h1 className="sub-hero-title">Suscripción DienteLink</h1>
          <p className="sub-hero-subtitle">Completa tu pago para mantener acceso ininterrumpido a todas las herramientas.</p>
        </div>

        {!subscription.isActive && (
          <div className="mb-6">
            <BackupSettings />
          </div>
        )}

        <div className="sub-grid-modern">
          {/* Left Column: Plan summary */}
          <div className="sub-col-left">
            <div className="sub-plan-card">
              <div className="sub-plan-header">
                <span className="sub-plan-name">{BILLING.planName}</span>
                <span className="sub-plan-price">{BANK_INFO.amount}</span>
                <span className="sub-plan-currency">{BANK_INFO.currency} / mes</span>
              </div>
              <ul className="sub-features-list">
                <li><span className="feat-check">✓</span> Expedientes y pacientes ilimitados</li>
                <li><span className="feat-check">✓</span> Odontograma profesional digital</li>
                <li><span className="feat-check">✓</span> Agenda inteligente y citas</li>
                <li><span className="feat-check">✓</span> Recordatorio a pacientes por WhatsApp en un toque</li>
                <li><span className="feat-check">✓</span> Portal de reserva para pacientes</li>
                <li><span className="feat-check">✓</span> Control de pagos y presupuestos</li>
              </ul>
              <div className="sub-guarantee">
                <span>🔒</span> Tus datos clínicos están seguros y respaldados, independientemente de tu suscripción.
              </div>
            </div>
          </div>

          {/* Right Column: Steps (Transfer & Upload) */}
          <div className="sub-col-right">
            {/* Step 1 */}
            <div className="sub-action-card">
              <h2 className="sub-action-title">1. Realiza la transferencia</h2>
              
              <div className="sub-bank-details">
                <div className="sub-b-row">
                  <span className="sub-b-label">Banco</span>
                  <span className="sub-b-val">{BANK_INFO.bank}</span>
                </div>
                <div className="sub-b-row">
                  <span className="sub-b-label">Titular</span>
                  <span className="sub-b-val">{BANK_INFO.holder}</span>
                </div>
                <div className="sub-b-row sub-b-row--copy">
                  <div>
                    <span className="sub-b-label">Número de cuenta</span>
                    <span className="sub-b-val sub-mono">{BANK_INFO.account}</span>
                  </div>
                  <button className="sub-btn-copy" onClick={() => copy(BANK_INFO.account, 'acct')} title="Copiar">
                    {copied === 'acct' ? '✓' : '⎘'}
                  </button>
                </div>
                <div className="sub-b-row sub-b-row--copy sub-b-row--highlight">
                  <div>
                    <span className="sub-b-label">Referencia / Concepto sugerido</span>
                    <span className="sub-b-val sub-mono text-amber-700">{userEmail}</span>
                  </div>
                  <button className="sub-btn-copy sub-btn-copy--amber" onClick={() => copy(userEmail, 'email')} title="Copiar">
                    {copied === 'email' ? '✓' : '⎘'}
                  </button>
                </div>
              </div>
            </div>

            <div className="sub-connector"></div>

            {/* Step 2 */}
            <div className="sub-action-card">
              <h2 className="sub-action-title">2. Sube tu comprobante</h2>
              <p className="sub-action-desc">
                Adjunta la foto o captura de tu pago. Se envía a revisión por correo y no se guarda en Storage.
                Si ya enviaste uno y quieres corregirlo, sube otro: reemplaza el pendiente.
              </p>
              
              <div
                className={`sub-upload-modern ${file ? 'has-file' : ''}`}
                onClick={() => fileRef.current?.click()}
              >
                {preview ? (
                  <img src={preview} alt="Comprobante" className="sub-upload-img" draggable={false} />
                ) : file ? (
                  <div className="sub-upload-filename">📄 {file.name}</div>
                ) : (
                  <div className="sub-upload-empty">
                    <span className="sub-upl-icon">📸</span>
                    <span className="sub-upl-text">Toca para adjuntar comprobante</span>
                    <span className="sub-upl-hint">JPG, PNG, WebP o PDF (Máx. 10MB)</span>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                  style={{ display: 'none' }}
                  onChange={handleFile}
                />
              </div>

              {file && (
                <div className="sub-upload-actions">
                  <button className="sub-btn-text" onClick={() => { setFile(null); setPreview(null); }}>
                    Cambiar imagen
                  </button>
                </div>
              )}

              <input
                type="text"
                className="sub-input-modern"
                placeholder='Nota opcional (ej: "Pagué desde cuenta de clínica")'
                value={notes}
                onChange={e => setNotes(e.target.value)}
                maxLength={200}
              />

              <button
                className="sub-btn-submit"
                disabled={!file || uploading}
                onClick={handleSubmit}
              >
                {uploading ? (
                  <span className="sub-loading"><span className="sub-spinner" /> Procesando...</span>
                ) : 'Enviar comprobante'}
              </button>

              {errorMsg && <div className="sub-error-modern" style={{ marginTop: 16, marginBottom: 0 }}>⚠️ {errorMsg}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;

