
import React, { useState } from 'react';
import { PatientRecord } from '../types';
import { Search, Plus, User, Phone, Calendar, ArrowRight, Filter } from 'lucide-react';
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
        <div className="space-y-12 animate-in fade-in duration-700 pb-20">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="animate-in-up stagger-delay-1">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-[2px]">Administración</div>
                        <div className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-[2px]">{patients.length} Registros</div>
                    </div>
                    <h2 className="text-5xl font-black text-slate-900 tracking-tighter italic leading-none">Expedientes Clínicos</h2>
                    <p className="text-slate-400 font-bold text-sm mt-4 flex items-center gap-2">
                        Gestión centralizada de la base de datos de pacientes.
                    </p>
                </div>

                <div className="flex items-center gap-4 animate-in-up stagger-delay-2">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o teléfono..."
                            className="pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-[24px] w-full md:w-96 shadow-sm focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none text-sm font-bold transition-all"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-slate-50 rounded border border-slate-200 text-[9px] font-black text-slate-400">ESC</kbd>
                        </div>
                    </div>
                    <button
                        onClick={onAdd}
                        className="bg-slate-900 text-white px-8 py-4 rounded-[24px] flex items-center gap-3 font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-slate-900/20 hover:bg-blue-600 transition-all hover:scale-105 active:scale-95 group"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                        Nuevo Paciente
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPatients.map((patient, index) => (
                    <div
                        key={patient.id}
                        onClick={() => onSelect(patient)}
                        className={cn(
                            "depth-card bg-white p-8 rounded-[48px] border border-slate-100 shadow-2xl shadow-slate-200/30 cursor-pointer group hover:border-blue-200 transition-all animate-in-up",
                            index === 0 ? "stagger-delay-1" : index === 1 ? "stagger-delay-2" : "stagger-delay-3"
                        )}
                    >
                        <div className="flex items-center gap-5 mb-8">
                            <div className="w-16 h-16 bg-blue-50 rounded-[24px] flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-6 transition-all duration-500 shadow-inner">
                                <User size={28} strokeWidth={2.5} />
                            </div>
                            <div className="overflow-hidden">
                                <h4 className="font-black text-xl text-slate-900 truncate leading-tight tracking-tight group-hover:text-blue-600 transition-colors uppercase italic">{patient.identification.fullName}</h4>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[2px] mt-1">{patient.identification.occupation || 'Sin ocupación'}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl group-hover:bg-blue-50/50 transition-colors">
                                <Phone size={16} className="text-slate-300 group-hover:text-blue-400" />
                                <span className="text-xs font-black text-slate-600 tracking-tight">{patient.identification.phone}</span>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl group-hover:bg-blue-50/50 transition-colors">
                                <Calendar size={16} className="text-slate-300 group-hover:text-blue-400" />
                                <span className="text-xs font-black text-slate-400 tracking-tight">Expediente: <span className="text-slate-600">#{patient.id}</span></span>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-50 flex justify-between items-center group-hover:border-blue-100 transition-colors">
                            <div className="flex -space-x-3">
                                {patient.xrays.slice(0, 3).length > 0 ? (
                                    patient.xrays.slice(0, 3).map((_, i) => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 shadow-sm overflow-hidden" />
                                    ))
                                ) : (
                                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center">
                                        <Filter size={10} className="text-slate-300" />
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-[2px]">Abrir Expediente</span>
                                <ArrowRight size={14} className="text-blue-600" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredPatients.length === 0 && (
                <div className="text-center py-32 bg-white/50 rounded-[64px] border-4 border-dashed border-slate-100 animate-in fade-in duration-500">
                    <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <Search size={40} className="text-slate-200" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2 italic tracking-tighter">Cero resultados</h3>
                    <p className="text-slate-400 font-bold mb-8">No hemos encontrado ningún paciente con esos criterios.</p>
                    <button onClick={() => setSearch('')} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all">Limpiar Búsqueda</button>
                </div>
            )}
        </div>
    );
};

export default PatientList;
