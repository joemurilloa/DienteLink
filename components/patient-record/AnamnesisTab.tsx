import React, { useState } from 'react';
import { PatientRecord as PatientRecordType } from '../../types';
import { cn } from '../../lib/utils';
import { InputGroup, DebouncedTextarea } from './FormInputs';
import {
    Activity,
    ClipboardList,
    ChevronDown,
    Plus,
    Zap,
    X,
} from 'lucide-react';

interface Props {
    patient: PatientRecordType;
    onUpdate: (updatedPatient: PatientRecordType) => void;
}

const COMMON_ALLERGIES = ['Penicilina', 'Lidocaína', 'Látex', 'Aspirina', 'Ibuprofeno', 'Sulfas', 'Yodo', 'AINES', 'Metales', 'Acrílico dental'];
const COMMON_MEDICATIONS = ['Antihipertensivos', 'Anticoagulantes', 'Insulina', 'Metformina', 'Anticonceptivos', 'Antidepresivos', 'Corticoides', 'Bifosfonatos', 'Ansiolíticos', 'Ninguno'];
const COMMON_DISEASES = ['Diabetes', 'Hipertensión', 'Asma', 'Cardiopatía', 'Hepatitis', 'VIH', 'Epilepsia', 'Artritis', 'Anemia', 'Tiroides', 'Ninguna'];
const COMMON_FAMILY = ['Diabetes', 'Hipertensión', 'Cáncer', 'Cardiopatía', 'Hemofilia', 'Ninguno'];
const COMMON_HABITS = ['Bruxismo', 'Onicofagia', 'Respirador bucal', 'Succión digital', 'Morder objetos', 'Tabaquismo', 'Alcoholismo', 'Ninguno'];
const COMMON_MOTIVES = ['Dolor dental', 'Revisión general', 'Limpieza dental', 'Sangrado de encías', 'Diente fracturado', 'Sensibilidad dental', 'Blanqueamiento', 'Ortodoncia', 'Prótesis', 'Extracción', 'Implante dental', 'Caries visible', 'Mal aliento', 'Inflamación'];

const CHIP_CLS = 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-slate-600 border border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all active:scale-95 cursor-pointer';

/** Sección plegable: muestra un resumen cuando está cerrada para no perder contexto. */
const Section: React.FC<{
    title: string;
    summary?: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}> = ({ title, summary, children, defaultOpen = false }) => {
    const [open, setOpen] = useState(defaultOpen);
    const hasSummary = !!summary && summary.trim().length > 0;
    return (
        <div className="bg-white rounded-2xl border border-slate-300 overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors cursor-pointer"
            >
                <div className="min-w-0">
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</p>
                    {!open && (
                        <p className={cn('text-sm mt-0.5 truncate', hasSummary ? 'text-slate-800 font-medium' : 'text-slate-400')}>
                            {hasSummary ? summary : 'Sin registrar'}
                        </p>
                    )}
                </div>
                <ChevronDown size={18} className={cn('text-slate-400 flex-shrink-0 transition-transform', open && 'rotate-180')} />
            </button>
            {open && <div className="px-5 pb-5 pt-1">{children}</div>}
        </div>
    );
};

const AnamnesisTab: React.FC<Props> = ({ patient, onUpdate }) => {
    const [allergyInput, setAllergyInput] = useState('');
    const hist = patient.clinicalHistory;

    const appendToField = (field: keyof typeof hist, value: string) => {
        const current = (hist[field] as string) || '';
        if (current.toLowerCase().includes(value.toLowerCase())) return;
        const val = current ? `${current}, ${value}` : value;
        onUpdate({ ...patient, clinicalHistory: { ...hist, [field]: val } });
    };

    const setHist = (patch: Partial<typeof hist>) =>
        onUpdate({ ...patient, clinicalHistory: { ...hist, ...patch } });

    const hasAllergies = hist.allergies.length > 0;

    const Chips: React.FC<{ items: string[]; field: keyof typeof hist }> = ({ items, field }) => (
        <div className="flex flex-wrap gap-1.5 mb-3">
            {items.map(i => (
                <button key={i} type="button" onClick={() => appendToField(field, i)} className={CHIP_CLS}>+ {i}</button>
            ))}
        </div>
    );

    return (
        <div className="space-y-4 animate-in-up duration-500">
            <div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Anamnesis</h3>
                <p className="text-slate-500 text-sm mt-1">Lo esencial primero. El resto se abre al tocarlo.</p>
            </div>

            {/* 1) Alergias — siempre visibles: es lo que más importa antes de anestesiar */}
            <div className={cn(
                'p-5 rounded-2xl border transition-all',
                hasAllergies ? 'bg-red-50 border-red-200 ring-1 ring-red-200' : 'bg-white border-slate-300'
            )}>
                <div className="flex items-center gap-2.5 mb-4">
                    <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', hasAllergies ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500')}>
                        <Activity size={16} />
                    </div>
                    <div>
                        <p className={cn('text-sm font-semibold uppercase tracking-wider', hasAllergies ? 'text-red-600' : 'text-slate-500')}>Alergias conocidas</p>
                        {hasAllergies && <p className="text-xs text-red-500 font-medium mt-0.5">⚠ Verificar antes de administrar anestesia o medicamentos</p>}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center mb-3">
                    {hist.allergies.map(a => (
                        <span key={a} className="px-3 py-1.5 bg-white text-red-700 rounded-lg text-sm font-semibold border border-red-200 flex items-center gap-1.5 shadow-sm">
                            {a}
                            <button onClick={() => setHist({ allergies: hist.allergies.filter(al => al !== a) })} className="text-red-400 hover:text-red-700 transition-colors cursor-pointer" aria-label={`Quitar ${a}`}><X size={12} /></button>
                        </span>
                    ))}
                    {!hasAllergies && <span className="text-slate-400 text-sm">Ninguna alergia registrada</span>}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {COMMON_ALLERGIES.map(a => (
                        <button key={a} type="button"
                            onClick={() => { if (!hist.allergies.includes(a)) setHist({ allergies: [...hist.allergies, a] }); }}
                            disabled={hist.allergies.includes(a)}
                            className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border',
                                hist.allergies.includes(a)
                                    ? 'bg-red-100 text-red-300 border-red-100 cursor-default'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-red-600 hover:text-white hover:border-red-600 active:scale-95 cursor-pointer'
                            )}>
                            + {a}
                        </button>
                    ))}
                </div>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const v = allergyInput.trim();
                        if (v && !hist.allergies.includes(v)) { setHist({ allergies: [...hist.allergies, v] }); setAllergyInput(''); }
                    }}
                    className="flex items-center gap-1.5"
                >
                    <input value={allergyInput} onChange={e => setAllergyInput(e.target.value)} placeholder="Agregar otra alergia..." className="flex-1 px-3 py-2 rounded-lg text-sm border border-slate-200 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 bg-white transition-all" />
                    <button type="submit" className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-all cursor-pointer" aria-label="Agregar alergia"><Plus size={12} /></button>
                </form>
            </div>

            {/* 2) Motivo de consulta — siempre visible */}
            <div className="p-5 bg-white rounded-2xl border border-slate-300">
                <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-11 h-11 bg-blue-600 text-white rounded-xl flex items-center justify-center"><ClipboardList size={16} /></div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Motivo de consulta</p>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {COMMON_MOTIVES.map(m => (
                        <button key={m} type="button"
                            onClick={() => setHist({ motiveOfConsult: hist.motiveOfConsult ? `${hist.motiveOfConsult}. ${m}` : m })}
                            className={CHIP_CLS}>
                            + {m}
                        </button>
                    ))}
                </div>
                <DebouncedTextarea
                    className="w-full bg-white px-5 py-4 rounded-xl border border-slate-200 outline-none text-sm text-slate-700 leading-relaxed resize-none h-28 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all placeholder:text-slate-300"
                    placeholder="Describa el motivo por el cual el paciente asiste a consulta..."
                    value={hist.motiveOfConsult}
                    onChange={(val) => setHist({ motiveOfConsult: val })}
                />
            </div>

            {/* 3) Datos rápidos (compactos) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-white rounded-2xl border border-slate-300">
                    <label className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2 block">Tipo de sangre</label>
                    <select
                        value={hist.bloodType || ''}
                        onChange={(e) => setHist({ bloodType: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 transition-all bg-white"
                    >
                        <option value="">No registrado</option>
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                {([
                    { key: 'smoker' as const, label: 'Fumador', on: 'bg-orange-500' },
                    { key: 'pregnant' as const, label: 'Embarazo', on: 'bg-pink-500' },
                ]).map(t => (
                    <div key={t.key} className="p-4 bg-white rounded-2xl border border-slate-300 flex items-center justify-between">
                        <div>
                            <label className="text-sm font-semibold uppercase tracking-wider text-slate-500 block">{t.label}</label>
                            <p className="text-sm font-medium text-slate-600 mt-1">{hist[t.key] ? 'Sí' : 'No'}</p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={!!hist[t.key]}
                            aria-label={t.label}
                            onClick={() => setHist({ [t.key]: !hist[t.key] })}
                            className={cn('w-12 h-7 rounded-full transition-all relative cursor-pointer', hist[t.key] ? t.on : 'bg-slate-200')}
                        >
                            <div className={cn('w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm', hist[t.key] ? 'left-6' : 'left-1')} />
                        </button>
                    </div>
                ))}
            </div>

            {/* 4) Historial médico — plegable, con resumen */}
            <p className="pt-2 text-[11px] font-bold uppercase tracking-[1.5px] text-slate-400">Historial médico</p>

            <Section title="Medicamentos actuales" summary={hist.medications}>
                <Chips items={COMMON_MEDICATIONS} field="medications" />
                <InputGroup label="" icon={Zap} value={hist.medications} onChange={(val) => setHist({ medications: val })} placeholder="Ej: Losartan 50mg, Metformina 850mg..." />
            </Section>

            <Section title="Enfermedades previas" summary={hist.previousDiseases}>
                <Chips items={COMMON_DISEASES} field="previousDiseases" />
                <InputGroup label="" icon={Activity} value={hist.previousDiseases} onChange={(val) => setHist({ previousDiseases: val })} placeholder="Ej: Diabetes tipo 2, Hipertensión..." />
            </Section>

            <Section title="Antecedentes familiares" summary={hist.familyHistory}>
                <Chips items={COMMON_FAMILY} field="familyHistory" />
                <InputGroup label="" icon={Activity} value={hist.familyHistory} onChange={(val) => setHist({ familyHistory: val })} placeholder="Ej: Padre diabético, madre hipertensa..." />
            </Section>

            <Section title="Hábitos" summary={hist.habits}>
                <Chips items={COMMON_HABITS} field="habits" />
                <InputGroup label="" icon={Activity} value={hist.habits || ''} onChange={(val) => setHist({ habits: val })} placeholder="Ej: Bruxismo nocturno, onicofagia..." />
            </Section>

            <Section title="Observaciones generales" summary={hist.observations}>
                <DebouncedTextarea
                    className="w-full bg-white px-5 py-4 rounded-xl border border-slate-200 outline-none text-sm text-slate-700 leading-relaxed resize-none h-24 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all placeholder:text-slate-300"
                    placeholder="Notas adicionales sobre el estado de salud del paciente..."
                    value={hist.observations || ''}
                    onChange={(val) => setHist({ observations: val })}
                />
            </Section>
        </div>
    );
};

export default AnamnesisTab;
