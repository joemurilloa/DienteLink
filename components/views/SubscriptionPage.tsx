import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/authService';
import { supabase } from '../../lib/supabase';
import { useSubscription } from '../../hooks/useSubscription';

// ─── DATOS BANCARIOS — edita aquí ────────────────────────────
const BANK_INFO = {
  bank:     'BAC Credomatic',
  account:  '747076151',
  holder:   'Joe Antonio Murillo Argueta',
  amount:   'L. 250',
  currency: 'Lempiras',
};
const ADMIN_EMAIL = 'joemurillo95@gmail.com';
// ─────────────────────────────────────────────────────────────

type Step = 'info' | 'upload' | 'done';

const SubscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, clinicId } = useAuth();
  const subscription = useSubscription(clinicId);
  const userEmail = user?.email ?? '';

  const [step, setStep] = useState<Step>('info');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
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
      const ext = file.name.split('.').pop();
      const storagePath = `${clinicId}/${Date.now()}.${ext}`;
      const { error: storeErr } = await supabase.storage
        .from('payment-receipts')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false });
      if (storeErr) throw new Error(storeErr.message);

      const { data: urlData } = supabase.storage.from('payment-receipts').getPublicUrl(storagePath);
      const imageUrl = urlData?.publicUrl ?? null;

      const { error: dbErr } = await supabase.from('payment_receipts').insert({
        clinic_id: clinicId,
        email_referencia: userEmail,
        image_url: imageUrl,
        storage_path: storagePath,
        notes: notes.trim() || null,
        status: 'pending',
      });
      if (dbErr) throw new Error(dbErr.message);

      // Notify admin
      await supabase.functions.invoke('notify-admin-receipt', {
        body: { clinicId, doctorEmail: userEmail, doctorName: profile.full_name, imageUrl, notes: notes.trim() },
      }).catch(() => {}); // non-fatal

      setStep('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado. Intenta de nuevo.');
    } finally { setUploading(false); }
  };

  // ─── STATUS BADGE ───────────────────────────────────────────
  const statusLabel = subscription.isTrial
    ? `🎁 Trial — ${subscription.daysLeft} días restantes`
    : subscription.isActive
    ? `✅ Activa — vence ${subscription.expiresAt?.toLocaleDateString('es-HN')}`
    : '⛔ Expirada';

  const statusColor = subscription.isActive
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
              Hemos recibido tu comprobante de pago. Lo revisaremos y
              <strong> activaremos tu cuenta en menos de 24 horas.</strong>
            </p>
            <div className="sub-success-email">
              📧 Notificación enviada a: <strong>{userEmail}</strong>
            </div>
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

        <div className="sub-grid-modern">
          {/* Left Column: Plan summary */}
          <div className="sub-col-left">
            <div className="sub-plan-card">
              <div className="sub-plan-header">
                <span className="sub-plan-name">Plan Mensual Pro</span>
                <span className="sub-plan-price">{BANK_INFO.amount}</span>
                <span className="sub-plan-currency">{BANK_INFO.currency} / mes</span>
              </div>
              <ul className="sub-features-list">
                <li><span className="feat-check">✓</span> Expedientes y pacientes ilimitados</li>
                <li><span className="feat-check">✓</span> Odontograma profesional digital</li>
                <li><span className="feat-check">✓</span> Agenda inteligente y citas</li>
                <li><span className="feat-check">✓</span> Recordatorios por WhatsApp</li>
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
              <p className="sub-action-desc">Adjunta la foto o captura de tu pago para activarte.</p>
              
              <div
                className={`sub-upload-modern ${file ? 'has-file' : ''}`}
                onClick={() => fileRef.current?.click()}
              >
                {preview ? (
                  <img src={preview} alt="Comprobante" className="sub-upload-img" />
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

              {errorMsg && <div className="sub-error-modern">⚠️ {errorMsg}</div>}

              <button
                className="sub-btn-submit"
                disabled={!file || uploading}
                onClick={handleSubmit}
              >
                {uploading ? (
                  <span className="sub-loading"><span className="sub-spinner" /> Procesando...</span>
                ) : 'Enviar comprobante'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;

