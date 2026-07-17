import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../services/authService';
import type { SubscriptionState } from '../hooks/useSubscription';

// ─────────────────────────────────────────────────────────────
// CONFIGURA AQUÍ TUS DATOS BANCARIOS
// ─────────────────────────────────────────────────────────────
const PAYMENT_INFO = {
  bank:    'Banco Atlántida',          // ← cambia tu banco
  account: 'XXXX-XXXX-XXXX',          // ← cambia tu número de cuenta
  holder:  'Joe Murray / DienteLink', // ← cambia el titular
  amount:  'L. 500',                  // ← cambia el precio mensual
  currency: 'Lempiras',
};
// ─────────────────────────────────────────────────────────────

interface Props {
  subscription: SubscriptionState;
  children: React.ReactNode;
}

type UploadStep = 'idle' | 'uploading' | 'success' | 'error';

export const SubscriptionGate: React.FC<Props> = ({ subscription, children }) => {
  // Team members (invited staff) no necesitan suscripción propia
  const { profile, user } = useAuth();
  const isTeamMember = !!profile?.clinic_id && profile.clinic_id !== profile?.id;

  // Si está cargando, no bloquear
  if (subscription.loading) return <>{children}</>;

  // Si es miembro de equipo, nunca bloquear (la suscripción es del owner)
  if (isTeamMember) return <>{children}</>;

  // Si está activo (trial o active) → acceso normal
  if (subscription.isActive) return <>{children}</>;

  // Si no está expirado todavía pero hay datos raros → acceso normal (fail safe)
  if (!subscription.isExpired && subscription.status !== 'inactive') return <>{children}</>;

  // ═══════════════════════════════════════════════════
  // Pantalla de suscripción expirada
  // ═══════════════════════════════════════════════════
  return <ExpiredScreen subscription={subscription} userEmail={user?.email ?? ''} />;
};

// ─────────────────────────────────────────────────────────────────────────────
// Pantalla principal de expiración
// ─────────────────────────────────────────────────────────────────────────────
const ExpiredScreen: React.FC<{ subscription: SubscriptionState; userEmail: string }> = ({
  subscription,
  userEmail,
}) => {
  const [step, setStep] = useState<'info' | 'upload'>('info');
  const { signOut } = useAuth();

  return (
    <div className="subscription-gate-overlay">
      <div className="subscription-gate-card">
        {/* Header */}
        <div className="sg-header">
          <div className="sg-logo">
            <span className="sg-logo-icon">🦷</span>
            <span className="sg-logo-text">DienteLink</span>
          </div>
        </div>

        {step === 'info' ? (
          <PaymentInfoStep
            subscription={subscription}
            userEmail={userEmail}
            onContinue={() => setStep('upload')}
          />
        ) : (
          <UploadStep
            userEmail={userEmail}
            onBack={() => setStep('info')}
          />
        )}

        {/* Footer seguro */}
        <div className="sg-footer">
          <p className="sg-data-note">
            🔒 <strong>Tu información está segura.</strong> Todos tus pacientes y registros
            se conservan completos independientemente del estado de tu suscripción.
          </p>
          <button
            className="sg-signout-btn"
            onClick={signOut}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Información de pago
// ─────────────────────────────────────────────────────────────────────────────
const PaymentInfoStep: React.FC<{
  subscription: SubscriptionState;
  userEmail: string;
  onContinue: () => void;
}> = ({ subscription, userEmail, onContinue }) => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <>
      {/* Estado */}
      <div className="sg-status-badge sg-status-expired">
        ⏰ Tu período de prueba ha finalizado
      </div>

      <h1 className="sg-title">Activa tu suscripción</h1>
      <p className="sg-subtitle">
        Realiza una transferencia bancaria y sube tu comprobante.
        <br />
        En menos de <strong>24 horas</strong> activaremos tu cuenta.
      </p>

      {/* Precio destacado */}
      <div className="sg-price-card">
        <div className="sg-price-amount">{PAYMENT_INFO.amount}</div>
        <div className="sg-price-label">/ mes · Acceso completo a DienteLink</div>
      </div>

      {/* Instrucciones de transferencia */}
      <div className="sg-transfer-box">
        <h3 className="sg-transfer-title">📲 Datos de transferencia</h3>

        <div className="sg-transfer-steps">
          <div className="sg-step-item">
            <span className="sg-step-num">1</span>
            <div className="sg-step-content">
              <span className="sg-step-label">Banco</span>
              <span className="sg-step-value">{PAYMENT_INFO.bank}</span>
            </div>
          </div>

          <div className="sg-step-item">
            <span className="sg-step-num">2</span>
            <div className="sg-step-content">
              <span className="sg-step-label">Número de cuenta</span>
              <div className="sg-step-value-row">
                <span className="sg-step-value sg-monospace">{PAYMENT_INFO.account}</span>
                <button
                  className="sg-copy-btn"
                  onClick={() => copyToClipboard(PAYMENT_INFO.account, 'account')}
                >
                  {copied === 'account' ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          </div>

          <div className="sg-step-item">
            <span className="sg-step-num">3</span>
            <div className="sg-step-content">
              <span className="sg-step-label">Titular</span>
              <span className="sg-step-value">{PAYMENT_INFO.holder}</span>
            </div>
          </div>

          <div className="sg-step-item sg-step-important">
            <span className="sg-step-num">4</span>
            <div className="sg-step-content">
              <span className="sg-step-label">⚠️ Concepto / Referencia (obligatorio)</span>
              <div className="sg-step-value-row">
                <span className="sg-step-value sg-monospace sg-highlight">{userEmail}</span>
                <button
                  className="sg-copy-btn"
                  onClick={() => copyToClipboard(userEmail, 'email')}
                >
                  {copied === 'email' ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
              <span className="sg-step-note">
                Pon tu email en el campo "concepto" o "referencia" de la transferencia para que podamos identificar tu pago.
              </span>
            </div>
          </div>

          <div className="sg-step-item">
            <span className="sg-step-num">5</span>
            <div className="sg-step-content">
              <span className="sg-step-label">Monto</span>
              <span className="sg-step-value sg-price-inline">{PAYMENT_INFO.amount} {PAYMENT_INFO.currency}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <button className="sg-primary-btn" onClick={onContinue}>
        Ya realicé la transferencia — Subir comprobante →
      </button>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Upload del comprobante
// ─────────────────────────────────────────────────────────────────────────────
const UploadStepComponent: React.FC<{ userEmail: string; onBack: () => void }> = ({
  userEmail,
  onBack,
}) => {
  const { profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [uploadStep, setUploadStep] = useState<UploadStep>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    // Validar tipo y tamaño (max 10MB)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(f.type)) {
      setErrorMsg('Solo se permiten imágenes (JPG, PNG, WebP) o PDF.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setErrorMsg('El archivo no puede superar 10MB.');
      return;
    }

    setFile(f);
    setErrorMsg('');

    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null); // PDF — no preview
    }
  };

  const handleSubmit = async () => {
    if (!file || !profile) return;

    setUploadStep('uploading');
    setErrorMsg('');

    try {
      // 1. Subir imagen a Supabase Storage
      const clinicId = profile.clinic_id || profile.id;
      const ext = file.name.split('.').pop();
      const filename = `${Date.now()}.${ext}`;
      const storagePath = `${clinicId}/${filename}`;

      const { error: storageError } = await supabase.storage
        .from('payment-receipts')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageError) throw new Error(`Error subiendo archivo: ${storageError.message}`);

      // 2. Obtener URL pública del archivo
      const { data: urlData } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(storagePath);

      const imageUrl = urlData?.publicUrl ?? null;

      // 3. Insertar registro en payment_receipts
      const { error: dbError } = await supabase
        .from('payment_receipts')
        .insert({
          clinic_id: clinicId,
          email_referencia: userEmail,
          amount_paid: null, // el admin verifica el monto real
          image_url: imageUrl,
          storage_path: storagePath,
          notes: notes.trim() || null,
          status: 'pending',
        });

      if (dbError) throw new Error(`Error guardando comprobante: ${dbError.message}`);

      // 4. Notificar al admin via Edge Function
      try {
        await supabase.functions.invoke('notify-admin-receipt', {
          body: {
            clinicId,
            doctorEmail: userEmail,
            doctorName: profile.full_name,
            imageUrl,
            notes: notes.trim(),
          },
        });
      } catch (notifyErr) {
        // No fatal — el comprobante ya está guardado
        console.warn('[SubscriptionGate] Notify admin failed (non-fatal):', notifyErr);
      }

      setUploadStep('success');
    } catch (err) {
      console.error('[SubscriptionGate] Upload error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Error desconocido. Intenta de nuevo.');
      setUploadStep('error');
    }
  };

  if (uploadStep === 'success') {
    return (
      <div className="sg-success-state">
        <div className="sg-success-icon">✅</div>
        <h2 className="sg-success-title">¡Comprobante recibido!</h2>
        <p className="sg-success-text">
          Hemos recibido tu comprobante de pago. Revisaremos tu transferencia y
          <strong> activaremos tu cuenta en menos de 24 horas.</strong>
        </p>
        <p className="sg-success-email">
          Te notificaremos a <strong>{userEmail}</strong> cuando tu cuenta esté activa.
        </p>
        <div className="sg-success-note">
          🔒 Todos tus datos de pacientes están seguros y se conservarán completos.
        </div>
      </div>
    );
  }

  return (
    <>
      <button className="sg-back-btn" onClick={onBack}>
        ← Volver a los datos de transferencia
      </button>

      <h2 className="sg-title">Subir comprobante de pago</h2>
      <p className="sg-subtitle">
        Sube la foto o captura de pantalla de tu transferencia bancaria.
      </p>

      {/* Upload area */}
      <div
        className={`sg-upload-area ${file ? 'sg-upload-has-file' : ''}`}
        onClick={() => fileInputRef.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="Comprobante" className="sg-upload-preview" />
        ) : file ? (
          <div className="sg-upload-file-name">
            📄 {file.name}
          </div>
        ) : (
          <div className="sg-upload-placeholder">
            <span className="sg-upload-icon">📸</span>
            <span className="sg-upload-text">Toca para subir imagen o PDF</span>
            <span className="sg-upload-hint">JPG, PNG, WebP o PDF · Máx. 10MB</span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {/* Nota opcional */}
      <textarea
        className="sg-notes-input"
        placeholder="Nota opcional (ej: 'Transferí desde cuenta de mi empresa')"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={2}
        maxLength={300}
      />

      {/* Error */}
      {errorMsg && (
        <div className="sg-error-msg">⚠️ {errorMsg}</div>
      )}

      {/* CTA */}
      <button
        className="sg-primary-btn"
        disabled={!file || uploadStep === 'uploading'}
        onClick={handleSubmit}
      >
        {uploadStep === 'uploading' ? (
          <span className="sg-loading">
            <span className="sg-spinner" /> Enviando comprobante...
          </span>
        ) : (
          'Enviar comprobante ✓'
        )}
      </button>
    </>
  );
};

// Alias para evitar conflicto de nombres con el tipo
const UploadStep = UploadStepComponent;

export default SubscriptionGate;
