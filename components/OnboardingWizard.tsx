import React, { useState } from 'react';
import { useAuth } from '../services/authService';
import { sileo } from 'sileo';
import { Loader2, ArrowRight, Building2, Coins } from 'lucide-react';

const OnboardingWizard: React.FC = () => {
    const { profile, updateProfile } = useAuth();
    const [step, setStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [clinicName, setClinicName] = useState(profile?.clinic_name || '');
    const [currency, setCurrency] = useState(profile?.currency || 'HNL');

    if (!profile || profile.has_completed_onboarding) return null;

    const handleComplete = async () => {
        if (!clinicName.trim()) {
            sileo.error({ title: 'Falta información', description: 'Por favor, ingresa el nombre de tu clínica.' });
            return;
        }

        setIsSaving(true);
        try {
            await updateProfile({
                clinic_name: clinicName,
                currency,
                locale: currency === 'HNL' ? 'es-HN' : currency === 'MXN' ? 'es-MX' : 'es-US',
                has_completed_onboarding: true
            });
            sileo.success({ title: '¡Todo listo!', description: 'Bienvenido a DienteLink.' });
        } catch (error: any) {
            sileo.error({
                title: 'No pudimos guardar',
                description: 'Algo salió mal. Por favor intenta de nuevo o escríbenos al WhatsApp de soporte.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const TOTAL_STEPS = 2;
    const progressPercent = (step / TOTAL_STEPS) * 100;

    return (
        <div className="fixed inset-0 z-[200] bg-slate-100 flex items-center justify-center p-4 selection:bg-blue-100 selection:text-blue-900 animate-in fade-in duration-500">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            <div className="relative bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl p-8 md:p-14 border border-slate-300/60 overflow-hidden animate-in zoom-in-95 duration-700">
                {/* Progress bar */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
                    <div
                        className="h-full bg-blue-600 transition-all duration-700 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                {/* ── Step 1: Bienvenida ── */}
                {step === 1 && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                        <div>
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                                <span className="text-3xl">👋</span>
                            </div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">¡Bienvenido a DienteLink!</h1>
                            <p className="text-slate-500 text-base leading-relaxed">
                                Tu nuevo centro de comando dental. Moderno, seguro y profesional.<br />
                                Solo necesitamos dos datos para personalizar tu entorno.
                            </p>
                        </div>

                        <button
                            onClick={() => setStep(2)}
                            className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-2 w-full sm:w-auto"
                        >
                            Comenzar <ArrowRight size={18} />
                        </button>
                    </div>
                )}

                {/* ── Step 2: Datos de la clínica ── */}
                {step === 2 && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-sm font-bold mb-4 uppercase tracking-wider">
                                Último paso
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Tu Clínica</h2>
                            <p className="text-slate-500 text-sm">El nombre y la moneda aparecerán en tus expedientes y cotizaciones.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                    <Building2 size={14} /> Nombre Comercial
                                </label>
                                <input
                                    type="text"
                                    value={clinicName}
                                    onChange={e => setClinicName(e.target.value)}
                                    placeholder="Ej. Clínica Dental Sonrisas"
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-900 placeholder:text-slate-500 text-lg"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                    <Coins size={14} /> Moneda Principal
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['HNL', 'MXN', 'USD'].map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setCurrency(c)}
                                            className={`py-3 px-4 rounded-xl font-bold text-sm border-2 transition-all ${
                                                currency === c
                                                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                    : 'border-slate-300 bg-white text-slate-500 hover:border-slate-300'
                                            }`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-300 flex gap-4">
                            <button
                                onClick={() => setStep(1)}
                                className="px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                            >
                                Volver
                            </button>
                            <button
                                onClick={handleComplete}
                                disabled={isSaving || !clinicName.trim()}
                                className="flex-1 bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-[0_8px_16px_rgba(15,23,42,0.25)] active:scale-95 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={20} /> : 'Entrar al Sistema →'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OnboardingWizard;
