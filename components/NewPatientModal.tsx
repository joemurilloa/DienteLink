
import React, { useState } from 'react';
import { X, User, Phone, MapPin, Mail, Briefcase, Calendar, Plus, ChevronRight } from 'lucide-react';
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

        if (!formData.fullName.trim() || !formData.birthDate || !formData.phone.trim()) {
            return;
        }

        const newPatient: PatientRecord = {
            id: crypto.randomUUID(),
            identification: { ...formData, fullName: formData.fullName.trim() },
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
            periodontogram: new Array(32).fill(1),
            budget: [],
            xrays: [],
            balance: 0
        };

        onSave(newPatient);
        onClose();
        setFormData({
            fullName: '',
            birthDate: '',
            gender: 'Otro',
            address: '',
            phone: '',
            email: '',
            occupation: ''
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-12 overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500" onClick={onClose} />

            <div className="relative bg-white w-full max-w-2xl rounded-[48px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden animate-in zoom-in-95 backdrop-saturate-150 duration-500 flex flex-col max-h-[90vh]">
                <header className="p-10 border-b border-slate-50 flex justify-between items-start bg-slate-50/50">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-[2px]">Ficha Maestra</div>
                            <div className="px-3 py-1 bg-white text-slate-400 rounded-full text-[9px] font-black uppercase tracking-[2px] border border-slate-100">Paso 1 de 1</div>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic leading-none">Nuevo Expediente</h2>
                        <p className="text-slate-400 font-bold text-sm mt-3">Complete los datos básicos para iniciar el historial clínico.</p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm border border-slate-100 active:scale-90">
                        <X size={20} />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto hide-scrollbar flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="md:col-span-2">
                            <InputGroup
                                icon={User}
                                label="Nombre Completo del Paciente"
                                name="fullName"
                                value={formData.fullName}
                                onChange={val => setFormData(p => ({ ...p, fullName: val }))}
                                placeholder="Ej. Carlos Roberto Rodríguez"
                                required
                            />
                        </div>

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
                            <label className="text-[10px] font-black uppercase tracking-[2px] text-slate-400 ml-2">Género</label>
                            <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
                                {['Masculino', 'Femenino', 'Otro'].map(g => (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, gender: g as any }))}
                                        className={cn(
                                            "flex-1 py-3 rounded-xl text-xs font-black transition-all",
                                            formData.gender === g
                                                ? "bg-white text-blue-600 shadow-md ring-1 ring-slate-100"
                                                : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <InputGroup
                            icon={Phone}
                            label="Teléfono de Contacto"
                            name="phone"
                            value={formData.phone}
                            onChange={val => setFormData(p => ({ ...p, phone: val }))}
                            placeholder="+504 0000-0000"
                            required
                        />

                        <InputGroup
                            icon={Mail}
                            label="Correo Electrónico"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={val => setFormData(p => ({ ...p, email: val }))}
                            placeholder="paciente@ejemplo.com"
                        />

                        <InputGroup
                            icon={Briefcase}
                            label="Ocupación / Oficio"
                            name="occupation"
                            value={formData.occupation}
                            onChange={val => setFormData(p => ({ ...p, occupation: val }))}
                            placeholder="Ej. Ingeniero Civil"
                        />

                        <div className="md:col-span-2">
                            <InputGroup
                                icon={MapPin}
                                label="Dirección Domiciliaria"
                                name="address"
                                value={formData.address}
                                onChange={val => setFormData(p => ({ ...p, address: val }))}
                                placeholder="Ej. Barrio los Andes, 5ta Calle..."
                            />
                        </div>
                    </div>
                </form>

                <footer className="p-10 pt-0 bg-white">
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-[28px] font-black uppercase tracking-[3px] text-xs shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-3 group"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                        Crear Expediente Clínico
                        <ChevronRight size={16} className="opacity-40 group-hover:translate-x-1 transition-transform" />
                    </button>
                </footer>
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
    <div className="space-y-2.5 group">
        <label className="text-[10px] font-black uppercase tracking-[2px] text-slate-400 ml-2 group-focus-within:text-blue-500 transition-colors">{label}</label>
        <div className="relative">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                <Icon size={18} strokeWidth={2.5} />
            </div>
            <input
                type={type}
                name={name}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[22px] text-sm font-black focus:bg-white focus:border-blue-500 focus:ring-8 focus:ring-blue-500/5 outline-none transition-all text-slate-800 placeholder:text-slate-300 shadow-inner"
            />
        </div>
    </div>
);

export default NewPatientModal;
