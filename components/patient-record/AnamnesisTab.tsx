import React, { useState } from 'react';
import { PatientRecord as PatientRecordType, PatientIdentification } from '../../types';
import { cn } from '../../lib/utils';
import { InputGroup, DebouncedTextarea } from './FormInputs';
import {
    User,
    Activity,
    ClipboardList,
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

const AnamnesisTab: React.FC<Props> = ({ patient, onUpdate }) => {
    const [allergyInput, setAllergyInput] = useState('');
    const hist = patient.clinicalHistory;

    const appendToField = (field: keyof typeof hist, value: string) => {
        const current = (hist[field] as string) || '';
        if (current.toLowerCase().includes(value.toLowerCase())) return;
        const val = current ? `${current}, ${value}` : value;
        onUpdate({ ...patient, clinicalHistory: { ...hist, [field]: val } });
    };

    return (
        <div className="space-y-8 animate-in-up duration-500">
            <div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Anamnesis</h3>
                <p className="text-slate-400 text-sm mt-1">Antecedentes clínicos y médicos</p>
            </div>

            {/* Allergies */}
            <div className="p-5 bg-red-50 rounded-2xl border border-red-100">
                <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 bg-red-600 text-white rounded-xl flex items-center justify-center"><Activity size={16} /></div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-red-600">Alergias Conocidas</label>
                </div>
                <div className="flex flex-wrap gap-2 items-center mb-3">
                    {hist.allergies.map(a => (
                        <span key={a} className="px-3 py-1.5 bg-white text-red-600 rounded-lg text-xs font-semibold border border-red-100 flex items-center gap-1.5">
                            {a}
                            <button onClick={() => onUpdate({ ...patient, clinicalHistory: { ...hist, allergies: hist.allergies.filter(al => al !== a) } })} className="text-red-400 hover:text-red-700 transition-colors"><X size={12} /></button>
                        </span>
                    ))}
                    {hist.allergies.length === 0 && <span className="text-red-300 text-sm">Ninguna alergia registrada</span>}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {COMMON_ALLERGIES.map(a => (
                        <button key={a} type="button"
                            onClick={() => { if (!hist.allergies.includes(a)) onUpdate({ ...patient, clinicalHistory: { ...hist, allergies: [...hist.allergies, a] } }); }}
                            disabled={hist.allergies.includes(a)}
                            className={cn("px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border",
                                hist.allergies.includes(a) ? "bg-red-100 text-red-300 border-red-100 cursor-default" : "bg-white text-red-500 border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600 active:scale-95"
                            )}>
                            + {a}
                        </button>
                    ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); const v = allergyInput.trim(); if (v && !hist.allergies.includes(v)) { onUpdate({ ...patient, clinicalHistory: { ...hist, allergies: [...hist.allergies, v] } }); setAllergyInput(''); } }} className="flex items-center gap-1.5">
                    <input value={allergyInput} onChange={e => setAllergyInput(e.target.value)} placeholder="Otra alergia..." className="flex-1 px-3 py-2 rounded-lg text-xs border border-red-200 outline-none focus:border-red-400 bg-white" />
                    <button type="submit" className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-all"><Plus size={12} /></button>
                </form>
            </div>

            {/* Medications */}
            <div className="p-5 bg-purple-50 rounded-2xl border border-purple-100">
                <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 bg-purple-600 text-white rounded-xl flex items-center justify-center"><Zap size={16} /></div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-purple-600">Medicamentos Actuales</label>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {COMMON_MEDICATIONS.map(m => (
                        <button key={m} type="button"
                            onClick={() => appendToField('medications', m)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-purple-500 border border-purple-200 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all active:scale-95">
                            + {m}
                        </button>
                    ))}
                </div>
                <InputGroup label="" icon={Zap} value={hist.medications} onChange={(val) => onUpdate({ ...patient, clinicalHistory: { ...hist, medications: val } })} placeholder="Ej: Losartan 50mg, Metformina 850mg..." />
            </div>

            {/* Diseases */}
            <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100">
                <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-xl flex items-center justify-center"><Activity size={16} /></div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-orange-600">Enfermedades Previas</label>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {COMMON_DISEASES.map(d => (
                        <button key={d} type="button"
                            onClick={() => appendToField('previousDiseases', d)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-orange-500 border border-orange-200 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all active:scale-95">
                            + {d}
                        </button>
                    ))}
                </div>
                <InputGroup label="" icon={Activity} value={hist.previousDiseases} onChange={(val) => onUpdate({ ...patient, clinicalHistory: { ...hist, previousDiseases: val } })} placeholder="Ej: Diabetes tipo 2, Hipertensión..." />
            </div>

            {/* Family history + Habits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-5 bg-white rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-8 h-8 bg-slate-700 text-white rounded-xl flex items-center justify-center"><User size={16} /></div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Antecedentes Familiares</label>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {COMMON_FAMILY.map(f => (
                            <button key={f} type="button"
                                onClick={() => appendToField('familyHistory', f)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-700 hover:text-white hover:border-slate-700 transition-all active:scale-95">
                                + {f}
                            </button>
                        ))}
                    </div>
                    <InputGroup label="" icon={User} value={hist.familyHistory} onChange={(val) => onUpdate({ ...patient, clinicalHistory: { ...hist, familyHistory: val } })} placeholder="Ej: Padre diabético, madre hipertensa..." />
                </div>
                <div className="p-5 bg-white rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-8 h-8 bg-indigo-500 text-white rounded-xl flex items-center justify-center"><Activity size={16} /></div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Hábitos</label>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {COMMON_HABITS.map(h => (
                            <button key={h} type="button"
                                onClick={() => appendToField('habits', h)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-500 border border-indigo-200 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all active:scale-95">
                                + {h}
                            </button>
                        ))}
                    </div>
                    <InputGroup label="" icon={Activity} value={hist.habits || ''} onChange={(val) => onUpdate({ ...patient, clinicalHistory: { ...hist, habits: val } })} placeholder="Ej: Bruxismo nocturno, onicofagia..." />
                </div>
            </div>

            {/* Quick toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-200">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">Tipo de Sangre</label>
                    <select
                        value={hist.bloodType || ''}
                        onChange={(e) => onUpdate({ ...patient, clinicalHistory: { ...hist, bloodType: e.target.value } })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 transition-all bg-white"
                    >
                        <option value="">No registrado</option>
                        {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Fumador</label>
                        <p className="text-sm font-medium text-slate-600 mt-1">{hist.smoker ? 'Sí' : 'No'}</p>
                    </div>
                    <button
                        onClick={() => onUpdate({ ...patient, clinicalHistory: { ...hist, smoker: !hist.smoker } })}
                        className={cn("w-12 h-7 rounded-full transition-all relative", hist.smoker ? 'bg-orange-500' : 'bg-slate-200')}
                    >
                        <div className={cn("w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm", hist.smoker ? 'left-6' : 'left-1')} />
                    </button>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Embarazo</label>
                        <p className="text-sm font-medium text-slate-600 mt-1">{hist.pregnant ? 'Sí' : 'No'}</p>
                    </div>
                    <button
                        onClick={() => onUpdate({ ...patient, clinicalHistory: { ...hist, pregnant: !hist.pregnant } })}
                        className={cn("w-12 h-7 rounded-full transition-all relative", hist.pregnant ? 'bg-pink-500' : 'bg-slate-200')}
                    >
                        <div className={cn("w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm", hist.pregnant ? 'left-6' : 'left-1')} />
                    </button>
                </div>
            </div>

            {/* Observations */}
            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100">
                <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 bg-amber-500 text-white rounded-xl flex items-center justify-center"><ClipboardList size={16} /></div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-amber-600">Observaciones Generales</label>
                </div>
                <DebouncedTextarea
                    className="w-full bg-white px-5 py-4 rounded-xl border border-amber-100 outline-none text-sm text-slate-700 leading-relaxed resize-none h-24 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 transition-all placeholder:text-amber-200"
                    placeholder="Notas adicionales sobre el estado de salud del paciente..."
                    value={hist.observations || ''}
                    onChange={(val) => onUpdate({ ...patient, clinicalHistory: { ...hist, observations: val } })}
                />
            </div>

            {/* Motive */}
            <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center"><ClipboardList size={16} /></div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-blue-600">Motivo de Consulta Principal</label>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {COMMON_MOTIVES.map(m => (
                        <button key={m} type="button"
                            onClick={() => {
                                const current = hist.motiveOfConsult;
                                const val = current ? `${current}. ${m}` : m;
                                onUpdate({ ...patient, clinicalHistory: { ...hist, motiveOfConsult: val } });
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-blue-500 border border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all active:scale-95">
                            + {m}
                        </button>
                    ))}
                </div>
                <DebouncedTextarea
                    className="w-full bg-white px-5 py-4 rounded-xl border border-blue-100 outline-none text-sm text-slate-700 leading-relaxed resize-none h-32 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all placeholder:text-blue-200"
                    placeholder="Describa el motivo por el cual el paciente asiste a consulta..."
                    value={hist.motiveOfConsult}
                    onChange={(val) => onUpdate({ ...patient, clinicalHistory: { ...hist, motiveOfConsult: val } })}
                />
            </div>
        </div>
    );
};

export default AnamnesisTab;
