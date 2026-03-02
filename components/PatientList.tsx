
import React, { useState, useMemo } from 'react';
import { PatientRecord } from '../types';
import { Search, Plus, User, Phone, Calendar, ArrowRight, Filter } from 'lucide-react';
import { cn } from '../lib/utils';
import { PatientCardSkeleton, generateSkeletons } from './LoadingSkeletons';
import { useOptimizedSearch } from '../lib/PerformanceOptimizations';

interface Props {
    patients: PatientRecord[];
    onSelect: (patient: PatientRecord) => void;
    onAdd: () => void;
}

const PatientList: React.FC<Props> = ({ patients, onSelect, onAdd }) => {
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Simulate loading state for better UX
    React.useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 600);
        return () => clearTimeout(timer);
    }, []);

    // Optimized search with debouncing
    const filteredPatients = useOptimizedSearch(
        patients,
        search,
        ['identification.fullName', 'identification.phone']
    );

    return (
        <div className="space-y-12 animate-in fade-in duration-700 pb-20">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="animate-in-up stagger-delay-1">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-semibold uppercase tracking-wider">Administración</div>
                        <div className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-[10px] font-semibold uppercase tracking-wider">{patients.length} Registros</div>
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Expedientes Clínicos</h2>
                    <p className="text-slate-400 text-sm mt-2">
                        Gestión centralizada de la base de datos de pacientes.
                    </p>
                </div>

                <div className="flex items-center gap-4 animate-in-up stagger-delay-2">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o teléfono..."
                            className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-xl w-full md:w-80 shadow-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm font-medium transition-all"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-slate-50 rounded border border-slate-200 text-[9px] font-semibold text-slate-400">ESC</kbd>
                        </div>
                    </div>
                    <button
                        onClick={onAdd}
                        data-new-patient
                        title="Nuevo Paciente (Ctrl+N)"
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-semibold text-sm shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all active:scale-95 group"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                        Nuevo Paciente
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {isLoading ? (
                    generateSkeletons(PatientCardSkeleton, 6)
                ) : (
                    filteredPatients.map((patient, index) => (
                    <div
                        key={patient.id}
                        onClick={() => onSelect(patient)}
                        className={cn(
                            "bg-white p-6 rounded-2xl border border-slate-100 shadow-sm cursor-pointer group hover:border-blue-200 hover:shadow-md transition-all animate-in-up",
                            index === 0 ? "stagger-1" : index === 1 ? "stagger-2" : "stagger-3"
                        )}
                    >
                        <div className="flex items-center gap-5 mb-8">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                <User size={22} strokeWidth={2} />
                            </div>
                            <div className="overflow-hidden">
                                <h4 className="font-bold text-base text-slate-900 truncate leading-tight tracking-tight group-hover:text-blue-600 transition-colors">{patient.identification.fullName}</h4>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">{patient.identification.occupation || 'Sin ocupación'}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50/50 transition-colors">
                                <Phone size={14} className="text-slate-300 group-hover:text-blue-400" />
                                <span className="text-xs font-medium text-slate-600">{patient.identification.phone}</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50/50 transition-colors">
                                <Calendar size={14} className="text-slate-300 group-hover:text-blue-400" />
                                <span className="text-xs font-medium text-slate-400">Expediente: <span className="text-slate-600">#{patient.id}</span></span>
                            </div>
                        </div>

                        <div className="mt-5 pt-5 border-t border-slate-100 flex justify-between items-center group-hover:border-blue-100 transition-colors">
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
                                <span className="text-xs font-semibold text-blue-600">Abrir Expediente</span>
                                <ArrowRight size={14} className="text-blue-600" />
                            </div>
                        </div>
                    </div>
                ))
                )}
            </div>

            {!isLoading && filteredPatients.length === 0 && (
                <div className="text-center py-20 bg-white/50 rounded-2xl border-2 border-dashed border-slate-100 animate-in fade-in duration-500">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Search size={32} className="text-slate-200" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Sin resultados</h3>
                    <p className="text-slate-400 text-sm mb-6">No hemos encontrado ningún paciente con esos criterios.</p>
                    <button onClick={() => setSearch('')} className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all">Limpiar Búsqueda</button>
                </div>
            )}
        </div>
    );
};

export default PatientList;
