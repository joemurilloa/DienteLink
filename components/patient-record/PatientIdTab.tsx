import React from 'react';
import { PatientRecord as PatientRecordType, PatientIdentification } from '../../types';
import { cn } from '../../lib/utils';
import { InputGroup } from './FormInputs';
import DateInput from '../DateInput';
import {
    User,
    Calendar,
    Briefcase,
    Mail,
    Phone,
    MapPin,
    Download,
} from 'lucide-react';
import { sileo } from 'sileo';

interface Props {
    patient: PatientRecordType;
    onUpdate: (updatedPatient: PatientRecordType) => void;
    onExportPDF: () => void;
    isExporting: boolean;
}

const PatientIdTab: React.FC<Props> = ({ patient, onUpdate, onExportPDF, isExporting }) => {
    const id = patient.identification;

    return (
        <div className="space-y-8 animate-in-up duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Ficha del Paciente</h3>
                    <p className="text-slate-400 text-sm mt-1">Información personal y de contacto</p>
                </div>
                <button
                    onClick={onExportPDF}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-blue-600 transition-all shadow-sm active:scale-95 disabled:opacity-70"
                >
                    {isExporting ? (
                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                    ) : (
                        <Download size={16} />
                    )}
                    {isExporting ? 'Generando...' : 'Descargar PDF'}
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <InputGroup label="Nombre Completo" icon={User} value={id.fullName} onChange={(val) => onUpdate({ ...patient, identification: { ...id, fullName: val } })} placeholder="Nombre del paciente" />
                <DateInput label="Fecha de Nacimiento" value={id.birthDate} onChange={(val) => onUpdate({ ...patient, identification: { ...id, birthDate: val } })} />
                <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 ml-1">Género</label>
                    <div className="flex gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-100">
                        {['Masculino', 'Femenino', 'Otro'].map(g => (
                            <button
                                key={g}
                                type="button"
                                onClick={() => onUpdate({ ...patient, identification: { ...id, gender: g as PatientIdentification['gender'] } })}
                                className={cn(
                                    "flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all",
                                    id.gender === g
                                        ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                                        : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>
                <InputGroup label="Ocupación / Oficio" icon={Briefcase} value={id.occupation} onChange={(val) => onUpdate({ ...patient, identification: { ...id, occupation: val } })} placeholder="Ej. Arquitecto" />
                <InputGroup label="Teléfono Móvil" icon={Phone} value={id.phone} onChange={(val) => onUpdate({ ...patient, identification: { ...id, phone: val } })} placeholder="+504 0000-0000" />
                <InputGroup label="Correo Electrónico" icon={Mail} value={id.email} onChange={(val) => onUpdate({ ...patient, identification: { ...id, email: val } })} placeholder="correo@ejemplo.com" />
                <div className="md:col-span-2 lg:col-span-3">
                    <InputGroup label="Dirección de Residencia" icon={MapPin} value={id.address} onChange={(val) => onUpdate({ ...patient, identification: { ...id, address: val } })} placeholder="Colonia, Ciudad, Referencias..." />
                </div>
            </div>
        </div>
    );
};

export default PatientIdTab;
