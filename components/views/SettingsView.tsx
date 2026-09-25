import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/authService';
import { sileo } from 'sileo';
import { useSettingsTip } from '../ContextualTips';
import { useSubscription } from '../../hooks/useSubscription';

const CURRENCY_OPTIONS = [
  { code: 'HNL', locale: 'es-HN', label: 'Lempira', flag: '🇭🇳' },
  { code: 'USD', locale: 'en-US', label: 'Dólar US', flag: '🇺🇸' },
  { code: 'MXN', locale: 'es-MX', label: 'Peso Mexicano', flag: '🇲🇽' },
  { code: 'GTQ', locale: 'es-GT', label: 'Quetzal', flag: '🇬🇹' },
  { code: 'CRC', locale: 'es-CR', label: 'Colón', flag: '🇨🇷' },
  { code: 'NIO', locale: 'es-NI', label: 'Córdoba', flag: '🇳🇮' },
  { code: 'PAB', locale: 'es-PA', label: 'Balboa', flag: '🇵🇦' },
  { code: 'COP', locale: 'es-CO', label: 'Peso Colombiano', flag: '🇨🇴' },
  { code: 'PEN', locale: 'es-PE', label: 'Sol Peruano', flag: '🇵🇪' },
  { code: 'CLP', locale: 'es-CL', label: 'Peso Chileno', flag: '🇨🇱' },
  { code: 'ARS', locale: 'es-AR', label: 'Peso Argentino', flag: '🇦🇷' },
  { code: 'DOP', locale: 'es-DO', label: 'Peso Dominicano', flag: '🇩🇴' },
  { code: 'BRL', locale: 'pt-BR', label: 'Real Brasileño', flag: '🇧🇷' },
  { code: 'EUR', locale: 'es-ES', label: 'Euro', flag: '🇪🇺' },
  { code: 'BOB', locale: 'es-BO', label: 'Boliviano', flag: '🇧🇴' },
  { code: 'PYG', locale: 'es-PY', label: 'Guaraní', flag: '🇵🇾' },
  { code: 'UYU', locale: 'es-UY', label: 'Peso Uruguayo', flag: '🇺🇾' },
  { code: 'VES', locale: 'es-VE', label: 'Bolívar', flag: '🇻🇪' },
];

const SettingsView: React.FC = () => {
  const { profile, updateProfile, clinicId } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const subscription = useSubscription(clinicId);

  // Contextual tip (show once)
  useSettingsTip();



  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    clinic_name: profile?.clinic_name || '',
    phone: profile?.phone || '',
    currency: profile?.currency || 'HNL',
    locale: profile?.locale || 'es-HN',
  });

  // Sync form when profile loads
  React.useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name, clinic_name: profile.clinic_name || '', phone: profile.phone || '', currency: profile.currency || 'HNL', locale: profile.locale || 'es-HN' });
  }, [profile]);

  const doctorName = profile?.full_name || 'Doctor';
  const doctorInitials = doctorName.split(' ').filter(w => w.length > 0).map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'DR';

  const handleSaveProfile = async () => {
    if (!form.full_name.trim()) return;
    setSaving(true);
    try {
      await updateProfile(form);
      setIsEditing(false);
      sileo.success({ title: 'Perfil actualizado' });
    } catch { sileo.error({ title: 'Error al guardar' }); }
    setSaving(false);
  };



  const SettingsInput = ({ label, value, field }: { label: string; value: string; field: keyof typeof form }) => (
    <div>
      <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">{label}</label>
      {isEditing ? (
        <input
          value={value}
          onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white"
        />
      ) : (
        <p className="text-sm font-medium text-slate-900 py-2.5">{value || <span className="text-slate-400">Sin definir</span>}</p>
      )}
    </div>
  );

  return (
    <div className="flex-1 h-full overflow-y-auto p-5 lg:p-8 pb-32 page-transition">
      <header className="flex items-center gap-4 mb-8">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Ajustes</h2>
      </header>

      <div className="max-w-2xl space-y-5">
        {/* Profile Card - Editable */}


        <div className="card-premium p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-slate-900">Perfil del Doctor</h3>
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-all border border-blue-100">Editar</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => { setIsEditing(false); if (profile) setForm({ full_name: profile.full_name, clinic_name: profile.clinic_name || '', phone: profile.phone || '', currency: profile.currency || 'HNL', locale: profile.locale || 'es-HN' }); }} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all">Cancelar</button>
                <button onClick={handleSaveProfile} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-1.5">
                  {saving && <span className="animate-spin">⏳</span>}
                  Guardar
                </button>
              </div>
            )}
          </div>
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center ring-2 ring-blue-500/20 shrink-0">
              <span className="text-white font-bold text-xl">{doctorInitials}</span>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <SettingsInput label="Nombre completo" value={form.full_name} field="full_name" />
              <div>
                <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Rol en el sistema</label>
                <p className="text-sm font-bold text-slate-900 py-2.5 capitalize">{profile?.role || 'Propietario'}</p>
              </div>
              <SettingsInput label="Nombre de la clínica" value={form.clinic_name} field="clinic_name" />
              <SettingsInput label="Teléfono" value={form.phone} field="phone" />
            </div>
          </div>
        </div>

        {/* Currency Settings */}
        <div className="card-premium p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4">Moneda y Región</h3>
          <p className="text-sm text-slate-500 mb-4">Configura la moneda que se usará en presupuestos, pagos y reportes.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Moneda</label>
              <select
                value={form.currency}
                onChange={e => {
                  const selected = CURRENCY_OPTIONS.find(c => c.code === e.target.value);
                  if (selected) setForm(f => ({ ...f, currency: selected.code, locale: selected.locale }));
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white"
              >
                {CURRENCY_OPTIONS.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.label} ({c.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Vista previa</label>
              <div className="px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-medium text-slate-700">
                {(() => {
                  try {
                    return new Intl.NumberFormat(form.locale, { style: 'currency', currency: form.currency }).format(1500);
                  } catch { return form.currency + ' 1,500.00'; }
                })()}
              </div>
            </div>
          </div>
          {(form.currency !== (profile?.currency || 'HNL')) && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={async () => {
                  setSaving(true);
                  try {
                    await updateProfile({ currency: form.currency, locale: form.locale });
                    sileo.success({ title: 'Moneda actualizada' });
                  } catch { sileo.error({ title: 'Error al guardar moneda' }); }
                  setSaving(false);
                }}
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar moneda'}
              </button>
            </div>
          )}
        </div>

        {/* Team Settings (Oculto en la Beta Pública para simplificar la UX) */}
        {/* <TeamSettings /> */}

        {/* Subscription Section — only for owners */}
        {(!profile?.clinic_id || profile.clinic_id === profile?.id) && (
          <div className="card-premium p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Suscripción</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {subscription.isTrial
                    ? `Período de prueba — ${subscription.daysLeft} día${subscription.daysLeft === 1 ? '' : 's'} restantes`
                    : subscription.isActive
                    ? `Plan activo — vence ${subscription.expiresAt?.toLocaleDateString('es-HN') ?? ''}`
                    : 'Suscripción requerida para continuar'}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                subscription.isActive
                  ? subscription.isTrial
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {subscription.isTrial ? '🎁 Trial' : subscription.isActive ? '✅ Activa' : '⛔ Expirada'}
              </span>
            </div>
            <button
              onClick={() => navigate('/subscription')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all"
            >
              💳 Activar / Ver instrucciones de pago →
            </button>
            <p className="text-xs text-slate-400 text-center mt-3">
              🔒 Tus datos se conservan siempre, sin importar el estado de tu suscripción.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default SettingsView;
