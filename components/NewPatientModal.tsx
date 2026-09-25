
import React, { useState } from 'react';
import { X, User, Phone, MapPin, Mail, Briefcase, Calendar, Plus, ChevronRight } from 'lucide-react';
import { PatientRecord, PatientIdentification } from '../types';
import { cn, createDefaultPeriodontogramData } from '../lib/utils';
import { sileo } from 'sileo';
import 'sileo/styles.css';
import DateInput from './DateInput';

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
    const [errors, setErrors] = useState<Record<string, string>>({});

    if (!isOpen) return null;

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        const name = formData.fullName.trim();
        if (!name) {
            newErrors.fullName = 'El nombre es obligatorio';
        } else if (name.length < 3) {
            newErrors.fullName = 'Mínimo 3 caracteres';
        }
        if (!formData.birthDate) {
            newErrors.birthDate = 'La fecha de nacimiento es obligatoria';
        } else {
            // String comparison is timezone-safe (YYYY-MM-DD sorts lexicographically)
            const todayStr = new Date().toISOString().split('T')[0];
            if (formData.birthDate > todayStr) newErrors.birthDate = 'La fecha no puede ser futura';
        }
        const phone = formData.phone.trim();
        if (!phone) {
            newErrors.phone = 'El teléfono es obligatorio';
        } else if (phone.replace(/[\s\-\+\(\)]/g, '').length < 8) {
            newErrors.phone = 'Teléfono inválido (mínimo 8 dígitos)';
        }
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Correo electrónico inválido';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

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
            odontogram: Array.from({ length: 32 }, (_, i) => ({ id: i + 1, surfaces: [] })),
            periodontogram: createDefaultPeriodontogramData(),
            budget: [],
            payments: [],
            xrays: [],
            balance: 0,
            consents: [],
            prescriptions: []
        };

        onSave(newPatient);
        onClose();
        setFormData({ fullName: '', birthDate: '', gender: 'Otro', address: '', phone: '', email: '', occupation: '' });
        setErrors({});
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 lg:p-12 overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white w-full md:max-w-2xl rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] md:max-h-[90vh]">
                <header className="p-5 md:p-6 lg:p-8 border-b border-slate-300 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Nuevo Paciente</h2>
                        <p className="text-slate-500 text-sm mt-0.5">Datos básicos del expediente</p>
                    </div>
                    <button onClick={onClose} className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all border border-slate-300 active:scale-95">
                        <X size={18} />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="p-5 md:p-6 lg:p-8 space-y-4 md:space-y-6 overflow-y-auto hide-scrollbar flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                        <div className="md:col-span-2">
                            <InputField
                                icon={User}
                                label="Nombre Completo"
                                name="fullName"
                                value={formData.fullName}
                                onChange={val => setFormData(p => ({ ...p, fullName: val }))}
                                placeholder="Ej. Carlos Roberto Rodríguez"
                                error={errors.fullName}
                                required
                            />
                        </div>

                        <DateInput
                            label="Fecha de Nacimiento"
                            value={formData.birthDate}
                            onChange={val => setFormData(p => ({ ...p, birthDate: val }))}
                            error={errors.birthDate}
                            required
                        />

                        <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1 h-4">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Género</label>
                            </div>
                            <div className="flex gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-200 h-11 items-center">
                                {['Masculino', 'Femenino', 'Otro'].map(g => (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, gender: g as PatientIdentification['gender'] }))}
                                        className={cn(
                                            "flex-1 h-full rounded-lg text-xs md:text-sm font-semibold transition-all flex items-center justify-center cursor-pointer",
                                            formData.gender === g
                                                ? "bg-white text-blue-600 shadow-xs border border-slate-200 font-bold"
                                                : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <InputField
                            icon={Phone}
                            label="Teléfono de Contacto"
                            name="phone"
                            value={formData.phone}
                            onChange={val => setFormData(p => ({ ...p, phone: val }))}
                            placeholder="+504 0000-0000"
                            error={errors.phone}
                            required
                        />

                        <InputField
                            icon={Mail}
                            label="Correo Electrónico"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={val => setFormData(p => ({ ...p, email: val }))}
                            placeholder="paciente@ejemplo.com"
                            error={errors.email}
                        />

                        <InputField
                            icon={Briefcase}
                            label="Ocupación / Oficio"
                            name="occupation"
                            value={formData.occupation}
                            onChange={val => setFormData(p => ({ ...p, occupation: val }))}
                            placeholder="Ej. Ingeniero Civil"
                        />

                        <div className="md:col-span-2">
                            <InputField
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

                <footer className="p-4 md:p-6 lg:p-8 pt-0 bg-white">
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-base shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <Plus size={20} />
                        Guardar Paciente
                    </button>
                </footer>
            </div>
        </div>
    );
};

const InputField: React.FC<{
    icon: any;
    label: string;
    value: string;
    onChange: (val: string) => void;
    type?: string;
    name: string;
    placeholder?: string;
    required?: boolean;
    error?: string;
}> = ({ icon: Icon, label, value, onChange, type = "text", name, placeholder, required, error }) => (
    <div className="space-y-2 group">
        <div className="flex items-center justify-between ml-1 h-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-focus-within:text-blue-500 transition-colors">
                {label} {required && <span className="text-red-400">*</span>}
            </label>
        </div>
        <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none">
                <Icon size={16} strokeWidth={2} />
            </div>
            <input
                type={type}
                name={name}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={cn(
                    "w-full h-11 pl-11 pr-4 bg-slate-50 border rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all text-slate-800 placeholder:text-slate-400",
                    error ? "border-red-300 bg-red-50/50" : "border-slate-200"
                )}
            />
        </div>
        {error && <p className="text-xs text-red-500 font-medium ml-1">{error}</p>}
    </div>
);

export default NewPatientModal;
