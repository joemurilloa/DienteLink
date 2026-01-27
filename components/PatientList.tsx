
import React, { useState } from 'react';
import { PatientRecord } from '../types';
import { Search, Plus, User, Phone, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
    patients: PatientRecord[];
    onSelect: (patient: PatientRecord) => void;
    onAdd: () => void;
}

const PatientList: React.FC<Props> = ({ patients, onSelect, onAdd }) => {
    const [search, setSearch] = useState('');

    const filteredPatients = patients.filter(p =>
        p.identification.fullName.toLowerCase().includes(search.toLowerCase()) ||
        p.identification.phone.includes(search)
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tighter">Expedientes Clínicos</h2>
                    <p className="text-slate-500 font-semibold text-sm mt-1">{patients.length} pacientes registrados</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o teléfono..."
                            className="pl-12 pr-6 py-3 bg-white border border-slate-100 rounded-2xl w-full md:w-80 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={onAdd}
                        className="bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus size={18} />
                        Nuevo Paciente
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPatients.map(patient => (
                    <div
                        key={patient.id}
                        onClick={() => onSelect(patient)}
                        className="depth-card bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 cursor-pointer group hover:border-blue-200 transition-all"
                    >
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <User size={24} />
                            </div>
                            <div className="overflow-hidden">
                                <h4 className="font-extrabold text-slate-900 truncate leading-tight">{patient.identification.fullName}</h4>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{patient.identification.occupation}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-slate-500">
                                <Phone size={14} className="text-slate-300" />
                                <span className="text-xs font-bold">{patient.identification.phone}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-500">
                                <Calendar size={14} className="text-slate-300" />
                                <span className="text-xs font-bold text-slate-400">Nacido: {patient.identification.birthDate}</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between items-center">
                            <div className="flex -space-x-2">
                                {patient.xrays.slice(0, 3).map((_, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-100" />
                                ))}
                            </div>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest group-hover:translate-x-1 transition-transform">Ver Expediente →</span>
                        </div>
                    </div>
                ))}
            </div>

            {filteredPatients.length === 0 && (
                <div className="text-center py-24 bg-white/50 rounded-[40px] border-2 border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Search size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No se encontraron pacientes</h3>
                    <p className="text-slate-400">Prueba con otro nombre o agrega un nuevo registro.</p>
                </div>
            )}
        </div>
    );
};

export default PatientList;
