
import React, { useState } from 'react';
import { X, User, Phone, MapPin, Mail, Briefcase, Calendar, Plus } from 'lucide-react';
import { PatientRecord, PatientIdentification } from '../types';
import { cn } from '../lib/utils';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (patient: PatientRecord) => void;
}

const NewPatientModal: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState<PatientIdentification>({
        fullName: '',
        birthDate: '',
        gender: 'Otro',
        address: '',
        phone: '',
        email: '',
        occupation: ''
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const newPatient: PatientRecord = {
            id: Math.random().toString(36).substr(2, 9),
            identification: formData,
            clinicalHistory: {
                allergies: [],
                medications: '',
                previousDiseases: '',
                familyHistory: '',
                motiveOfConsult: ''
            },
            evolutionNotes: [],
            history: [],
            consentSigned: false,
            odontogram: Array.from({ length: 32 }, (_, i) => ({ id: i + 1, status: 'healthy' as const })),
            periodontogram: new Array(32).fill(1), // 32 puntos de sondaje, 1mm inicial
            budget: [],
            xrays: [],
            balance: 0
        };

        onSave(newPatient);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-12">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

            <div className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <header className="p-8 border-b border-slate-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Nuevo Registro</h2>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Ficha de Identificación</p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                        <X size={20} />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto hide-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputGroup
                            icon={User}
                            label="Nombre Completo"
                            name="fullName"
                            value={formData.fullName}
                            onChange={val => setFormData(p => ({ ...p, fullName: val }))}
                            placeholder="Ej. Juan Pérez"
                            required
                        />
                        <InputGroup
                            icon={Calendar}
                            label="Fecha de Nacimiento"
                            type="date"
                            name="birthDate"
                            value={formData.birthDate}
                            onChange={val => setFormData(p => ({ ...p, birthDate: val }))}
                            required
                        />
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Género</label>
                            <div className="flex gap-2">
                                {['Masculino', 'Femenino', 'Otro'].map(g => (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, gender: g as any }))}
                                        className={cn(
                                            "flex-1 py-3 rounded-xl text-xs font-bold border transition-all",
                                            formData.gender === g ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-100 text-slate-500 hover:border-blue-200"
                                        )}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <InputGroup
                            icon={Phone}
                            label="Teléfono"
                            name="phone"
                            value={formData.phone}
                            onChange={val => setFormData(p => ({ ...p, phone: val }))}
                            placeholder="+504 0000-0000"
                            required
                        />
                        <InputGroup
                            icon={Mail}
                            label="Email"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={val => setFormData(p => ({ ...p, email: val }))}
                            placeholder="correo@ejemplo.com"
                        />
                        <InputGroup
                            icon={Briefcase}
                            label="Ocupación"
                            name="occupation"
                            value={formData.occupation}
                            onChange={val => setFormData(p => ({ ...p, occupation: val }))}
                            placeholder="Ej. Abogado"
                        />
                        <div className="md:col-span-2">
                            <InputGroup
                                icon={MapPin}
                                label="Dirección"
                                name="address"
                                value={formData.address}
                                onChange={val => setFormData(p => ({ ...p, address: val }))}
                                placeholder="Colonia, Ciudad..."
                            />
                        </div>
                    </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black uppercase tracking-[2px] text-xs shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                        >
                            <Plus size={18} />
                            Crear Expediente Clínico
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const InputGroup: React.FC<{
    icon: any;
    label: string;
    value: string;
    onChange: (val: string) => void;
    type?: string;
    name: string;
    placeholder?: string;
    required?: boolean;
}> = ({ icon: Icon, label, value, onChange, type = "text", name, placeholder, required }) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{label}</label>
        <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                <Icon size={16} />
            </div>
            <input
                type={type}
                name={name}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                className="w-full pl-12 pr-6 py-3 bg-slate-50 border border-slate-50 rounded-2xl text-sm font-bold focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all text-slate-900"
            />
        </div>
    </div>
);

export default NewPatientModal;
