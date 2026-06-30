import React, { useState } from 'react';
import { useAuth } from '../services/authService';
import { sileo } from 'sileo';
import { Loader2, ArrowRight, Building2, Coins, Globe, MessageCircleWarning, Shield, CalendarHeart } from 'lucide-react';

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

    const TOTAL_STEPS = 4;
    const progressPercent = (step / TOTAL_STEPS) * 100;

    return (
        <div className="fixed inset-0 z-[200] bg-slate-100 flex items-center justify-center p-4 selection:bg-blue-100 selection:text-blue-900 animate-in fade-in duration-500">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            <div className="relative bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl p-8 md:p-14 border border-slate-300/60 overflow-hidden animate-in zoom-in-95 duration-700">
                {/* Visual Step Indicator */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
                    <div 
                        className="h-full bg-blue-600 transition-all duration-700 ease-out" 
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                {step === 1 && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                        <div>
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                                <span className="text-3xl">👋</span>
                            </div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">¡Bienvenido a DienteLink!</h1>
                            <p className="text-slate-500 text-base leading-relaxed">
                                DienteLink es tu nuevo centro de comando. Un software moderno, seguro y profesional que transformará la imagen de tu clínica frente a tus pacientes.
                                Sigue este rápido asistente de 4 pasos para personalizar tu entorno.
                            </p>
                        </div>

                        <button 
                            onClick={() => setStep(2)}
                            className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-2 w-full sm:w-auto"
                        >
                            Comenzar Configuración <ArrowRight size={18} />
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-sm font-bold mb-4 uppercase tracking-wider">
                                Paso 2 de 4
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Personaliza tu Clínica</h2>
                            <p className="text-slate-500 text-sm">El nombre comercial y la moneda aparecerán en tus expedientes clínicos (PDF) y cotizaciones.</p>
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
                            <button onClick={() => setStep(1)} className="px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all">Volver</button>
                            <button 
                                onClick={() => {
                                    if(!clinicName.trim()) {
                                        sileo.error({title: 'Falta nombre', description: 'Por favor escribe el nombre de la clínica.'});
                                        return;
                                    }
                                    setStep(3)
                                }}
                                className="flex-1 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
                            >
                                Siguiente <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-sm font-bold mb-4 uppercase tracking-wider">
                                Paso 3 de 4
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Reservas Inteligentes</h2>
                            <p className="text-slate-500 text-sm">DienteLink te proporciona un perfil público (ej. dientelink.com/reserva/{profile.id.substring(0,6)}) que puedes colocar en tu Instagram o Facebook.</p>
                        </div>

                        <div className="bg-slate-50 border border-slate-300 rounded-2xl p-6">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                                    <Globe size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-1">Agenda abierta 24/7</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed mb-4">Tus pacientes podrán solicitar citas a cualquier hora y tú tendrás el poder de aprobarlas o rechazarlas directamente desde tu panel principal en Dashboard.</p>
                                    <div className="text-sm font-semibold text-indigo-600 px-3 py-2 bg-indigo-50 inline-block rounded-lg">
                                        Explora la sección "Ajustes / Perfil Público" luego de terminar.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-300 flex gap-4">
                            <button onClick={() => setStep(2)} className="px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all">Volver</button>
                            <button 
                                onClick={() => setStep(4)}
                                className="flex-1 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
                            >
                                Entendido, Siguiente <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-sm font-bold mb-4 uppercase tracking-wider">
                                Paso Final
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Privacidad y Seguridad</h2>
                            <p className="text-slate-500 text-sm">Tu cuenta de DienteLink protege los expedientes bajo estrictos estándares clínicos.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                                <Shield className="text-emerald-500" size={24} />
                                <div>
                                    <h4 className="font-bold text-emerald-900 text-sm">Aislamiento de Datos</h4>
                                    <p className="text-emerald-700/70 text-sm">Tus datos están encriptados. Ningún otro doctor tiene acceso a tu cartera de pacientes.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-sky-50 border border-sky-100 p-4 rounded-2xl">
                                <CalendarHeart className="text-sky-500" size={24} />
                                <div>
                                    <h4 className="font-bold text-sky-900 text-sm">Todo es tuyo</h4>
                                    <p className="text-sky-700/70 text-sm">Tienes acceso a exportar toda tu base de datos y expedientes a PDF y Excel en cualquier momento.</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-300 flex gap-4">
                            <button disabled={isSaving} onClick={() => setStep(3)} className="px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all">Volver</button>
                            <button 
                                onClick={handleComplete}
                                disabled={isSaving || !clinicName.trim()}
                                className="flex-1 bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-[0_8px_16px_rgba(15,23,42,0.25)] active:scale-95 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={20} /> : 'Finalizar y Entrar al Sistema'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OnboardingWizard;
