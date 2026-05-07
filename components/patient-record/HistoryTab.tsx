import React, { useState } from 'react';
import { PatientRecord as PatientRecordType, ClinicalEvent } from '../../types';
import { cn, getLocalISODate } from '../../lib/utils';
import { InputGroup } from './FormInputs';
import {
    Activity,
    Calendar,
    Plus,
    Zap,
} from 'lucide-react';
import { sileo } from 'sileo';

interface Props {
    patient: PatientRecordType;
    onUpdate: (updatedPatient: PatientRecordType) => void;
}

const HistoryTab: React.FC<Props> = ({ patient, onUpdate }) => {
    const [newEvent, setNewEvent] = useState({ description: '', type: 'treatment' as ClinicalEvent['type'] });

    const handleAddEvent = () => {
        if (!newEvent.description.trim()) {
            sileo.error({ title: 'Falta la descripción', description: 'Describe el procedimiento realizado' });
            return;
        }
        const event: ClinicalEvent = {
            id: crypto.randomUUID(),
            date: getLocalISODate(new Date()),
            ...newEvent
        };
        onUpdate({ ...patient, history: [event, ...patient.history] });
        setNewEvent({ description: '', type: 'treatment' });
        sileo.success({ title: '¡Evento clínico registrado!', description: `${newEvent.type === 'treatment' ? 'Tratamiento' : newEvent.type === 'diagnosis' ? 'Diagnóstico' : 'Consulta'} añadido al historial` });
    };

    return (
        <div className="space-y-8 animate-in-up duration-500">
            <div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Historial Clínico</h3>
                <p className="text-slate-400 text-sm mt-1">Registro de tratamientos realizados</p>
            </div>

            {/* Quick add event */}
            <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center"><Zap size={16} /></div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Registro Rápido</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-5">
                        <InputGroup label="Descripción del procedimiento" placeholder="Ej. Limpieza Dental Profunda" value={newEvent.description} onChange={val => setNewEvent(p => ({ ...p, description: val }))} />
                    </div>
                    <div className="lg:col-span-4 space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 ml-1">Tipo</label>
                        <select
                            className="w-full bg-white px-4 py-3 rounded-xl border border-blue-100 outline-none text-sm font-medium text-slate-800 transition-all focus:border-blue-500 appearance-none"
                            value={newEvent.type}
                            onChange={e => setNewEvent(p => ({ ...p, type: e.target.value as ClinicalEvent['type'] }))}
                        >
                            <option value="treatment">Tratamiento</option>
                            <option value="cleaning">Limpieza</option>
                            <option value="extraction">Extracción</option>
                            <option value="diagnose">Diagnóstico</option>
                        </select>
                    </div>
                    <div className="lg:col-span-3 flex items-end">
                        <button onClick={handleAddEvent} className="w-full py-3 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-600/15 font-semibold text-sm active:scale-[0.98]">
                            <Plus size={18} /> Agregar
                        </button>
                    </div>
                </div>
            </div>

            {/* Events list */}
            <div className="space-y-3">
                {patient.history.length === 0 ? (
                    <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <Activity size={28} className="text-slate-300" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-700 mb-1">Sin procedimientos registrados</h4>
                        <p className="text-slate-400 text-sm max-w-xs mx-auto">Usa el registro rápido de arriba para documentar tratamientos, limpiezas o extracciones.</p>
                    </div>
                ) : (
                    patient.history.map((event, index) => (
                        <div key={event.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md hover:border-blue-100 transition-all group animate-in-up" style={{ animationDelay: `${index * 40}ms` }}>
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-11 h-11 rounded-xl flex items-center justify-center",
                                    event.type === 'treatment' ? "bg-blue-50 text-blue-600" :
                                        event.type === 'extraction' ? "bg-red-50 text-red-600" :
                                            event.type === 'cleaning' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                )}>
                                    <Activity size={18} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900 text-sm">{event.description}</h4>
                                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                                        <Calendar size={10} />
                                        {event.date} &middot; <span className="text-blue-500 font-medium">{event.type === 'treatment' ? 'Tratamiento' : event.type === 'extraction' ? 'Extracción' : event.type === 'cleaning' ? 'Limpieza' : 'Diagnóstico'}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default HistoryTab;
