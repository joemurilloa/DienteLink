import React, { useState } from 'react';
import { useAuth } from '../services/authService';
import { sileo } from 'sileo';
import { Loader2, ArrowRight, Building2, Coins } from 'lucide-react';

const inputClass =
    'w-full px-4 py-3 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-900 placeholder:text-slate-500';

/** Onboarding de un solo paso: datos mínimos. El horario se ajusta después en Ajustes. */
const OnboardingWizard: React.FC = () => {
    const { profile, updateProfile } = useAuth();
    const [isSaving, setIsSaving] = useState(false);

    const [clinicName, setClinicName] = useState(profile?.clinic_name || '');
    const [currency, setCurrency] = useState(profile?.currency || 'HNL');
    const [phone, setPhone] = useState(profile?.phone || '');

    if (!profile || profile.has_completed_onboarding) return null;

    const handleComplete = async () => {
        if (!clinicName.trim()) {
            sileo.error({ title: 'Falta información', description: 'Por favor, ingresa el nombre de tu clínica.' });
            return;
        }

        if (phone.replace(/\D/g, '').length < 8) {
            sileo.error({ title: 'Falta información', description: 'Ingresa tu teléfono (mínimo 8 dígitos).' });
            return;
        }

        setIsSaving(true);
        try {
            await updateProfile({
                clinic_name: clinicName,
                phone: phone.trim(),
                currency,
                locale: currency === 'HNL' ? 'es-HN' : currency === 'MXN' ? 'es-MX' : 'es-US',
                has_completed_onboarding: true
            });
            sileo.success({ title: '¡Todo listo!', description: 'Puedes ajustar tu horario en Ajustes cuando quieras.' });
        } catch (error: any) {
            sileo.error({
                title: 'No pudimos guardar',
                description: 'Algo salió mal. Por favor intenta de nuevo o escríbenos al WhatsApp de soporte.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-slate-100 flex items-start sm:items-center justify-center p-4 overflow-y-auto selection:bg-blue-100 selection:text-blue-900 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-lg p-6 sm:p-10 border border-slate-200 my-6">
                <form
                    className="space-y-6"
                    onSubmit={e => { e.preventDefault(); handleComplete(); }}
                >
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Configura tu clínica</h1>
                        <p className="text-slate-600 text-sm">Solo 3 datos. El horario de atención lo ajustas después en Ajustes.</p>
                    </div>

                    <div className="space-y-5">
                        <div className="space-y-1.5">
                            <label htmlFor="onb-clinic" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <Building2 size={14} /> Nombre de la clínica
                            </label>
                            <input
                                id="onb-clinic"
                                type="text"
                                autoFocus
                                value={clinicName}
                                onChange={e => setClinicName(e.target.value)}
                                placeholder="Ej. Clínica Dental Sonrisas"
                                className={inputClass}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="onb-phone" className="text-sm font-semibold text-slate-700">Tu teléfono (WhatsApp)</label>
                            <input
                                id="onb-phone"
                                type="tel"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="9999-9999"
                                className={inputClass}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <Coins size={14} /> Moneda
                            </span>
                            <div className="grid grid-cols-3 gap-2">
                                {['HNL', 'MXN', 'USD'].map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setCurrency(c)}
                                        className={`py-2.5 rounded-xl font-semibold text-sm border transition-all ${
                                            currency === c
                                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                                        }`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-slate-600">
                        Al continuar aceptas los{' '}
                        <a href="/terminos" target="_blank" rel="noreferrer" className="text-blue-600 font-semibold underline">términos de uso y privacidad</a>.
                    </p>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full bg-blue-600 text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={20} /> : <>Entrar a DienteLink <ArrowRight size={18} /></>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default OnboardingWizard;
