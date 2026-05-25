import React, { useState } from 'react';
import { PatientRecord } from '../types';
import { Search, Plus, User, Phone, Calendar, ArrowRight, Filter, FileText, AlertCircle } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { PatientCardSkeleton, generateSkeletons } from './LoadingSkeletons';
import { useOptimizedSearch } from '../lib/PerformanceOptimizations';

interface Props {
    patients: PatientRecord[];
    onSelect: (patient: PatientRecord) => void;
    onAdd: () => void;
}

const PatientList: React.FC<Props> = ({ patients, onSelect, onAdd }) => {
    const [search, setSearch] = useState('');
    const [filterDebt, setFilterDebt] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Simulate loading state for better UX
    React.useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 600);
        return () => clearTimeout(timer);
    }, []);

    // Optimized search with debouncing
    const baseFiltered = useOptimizedSearch(
        patients,
        search,
        ['identification.fullName', 'identification.phone']
    );

    const filteredPatients = filterDebt 
        ? baseFiltered.filter(p => {
            const totalBudget = p.budget?.reduce((acc, item) => acc + (item.unitCost * item.quantity), 0) || 0;
            const totalPaid = (p.payments || []).reduce((acc, pay) => acc + pay.amount, 0);
            return (totalBudget - totalPaid) > 0;
          })
        : baseFiltered;

    if (!isLoading && patients.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 animate-in fade-in zoom-in-95 duration-700">
                <div className="w-24 h-24 mb-8 bg-blue-50 text-blue-500 rounded-[2rem] flex items-center justify-center rotate-3">
                    <User size={48} strokeWidth={1.5} className="-rotate-3" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">Comienza a gestionar tu clínica</h2>
                <p className="text-slate-500 max-w-md mx-auto mb-10 leading-relaxed text-sm">
                    DienteLink está listo para digitalizar tus expedientes. Añade a tu primer paciente para desbloquear el odontograma, presupuestos y agenda.
                </p>
                <button
                    onClick={onAdd}
                    className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-sm shadow-[0_8px_16px_rgba(37,99,235,0.2)] hover:bg-blue-700 hover:-translate-y-0.5 transition-all flex items-center gap-3 active:scale-95"
                >
                    <Plus size={18} /> Crear mi primer expediente
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-in fade-in duration-700 pb-20 max-w-[1400px] mx-auto">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-4">
                <div className="animate-in-up stagger-delay-1">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="px-3 py-1 bg-slate-100/80 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-wider">{patients.length} Expedientes</div>
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-semibold text-slate-900 tracking-tight">Pacientes</h1>
                </div>

                <div className="flex items-center gap-4 animate-in-up stagger-delay-2 w-full md:w-auto">
                    <div className="relative group flex-1 md:flex-none">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Buscar paciente..."
                            className="pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-100 rounded-[14px] w-full md:w-80 outline-none text-[15px] font-semibold text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:font-medium placeholder:text-slate-400"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setFilterDebt(!filterDebt)}
                        className={cn(
                            "h-12 px-5 rounded-[14px] flex items-center justify-center gap-2 font-bold text-[13px] border-2 transition-all flex-shrink-0",
                            filterDebt 
                                ? "bg-amber-50 border-amber-500 text-amber-700 shadow-sm" 
                                : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200"
                        )}
                        title="Pacientes con saldo pendiente"
                    >
                        <AlertCircle size={16} className={filterDebt ? "text-amber-500" : "text-slate-400"} />
                        <span className="hidden sm:inline">Con Deuda</span>
                    </button>
                    <button
                        onClick={onAdd}
                        data-new-patient
                        title="Nuevo Paciente"
                        className="bg-blue-600 text-white h-12 px-5 rounded-[14px] flex items-center justify-center gap-2 font-bold text-[15px] shadow-[0_4px_12px_rgba(37,99,235,0.2)] hover:bg-blue-700 transition-all active:scale-95 flex-shrink-0"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">Nuevo</span>
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {isLoading ? (
                    generateSkeletons(PatientCardSkeleton, 8)
                ) : (
                    filteredPatients.map((patient, index) => (
                    <div
                        key={patient.id}
                        onClick={() => onSelect(patient)}
                        className={cn(
                            "bg-white p-5 rounded-[24px] border border-slate-100 cursor-pointer group hover:border-slate-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 animate-in-up",
                            index === 0 ? "stagger-1" : index === 1 ? "stagger-2" : "stagger-3"
                        )}
                    >
                        <div className="flex items-center gap-4 mb-5">
                            <div className="w-12 h-12 bg-slate-50 rounded-[14px] flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 flex-shrink-0">
                                <User size={20} strokeWidth={2.5} />
                            </div>
                            <div className="overflow-hidden">
                                <h4 className="font-bold text-[15px] text-slate-900 truncate leading-tight tracking-tight group-hover:text-blue-600 transition-colors">{patient.identification.fullName}</h4>
                                <p className="text-[13px] text-slate-400 font-medium mt-0.5 truncate">{patient.identification.occupation || 'Sin ocupación'}</p>
                            </div>
                        </div>

                        {(() => {
                            const totalBudget = patient.budget?.reduce((acc, item) => acc + (item.unitCost * item.quantity), 0) || 0;
                            const totalPaid = (patient.payments || []).reduce((acc, pay) => acc + pay.amount, 0);
                            const balance = Math.max(0, totalBudget - totalPaid);
                            
                            if (balance > 0) {
                                return (
                                    <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Saldo Pdte.</span>
                                        <span className="text-[13px] font-bold text-amber-700">{formatCurrency(balance)}</span>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        <div className="space-y-2 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400"><Phone size={12} /></div>
                                <span className="text-[13px] font-semibold text-slate-600">{patient.identification.phone || 'Sin teléfono'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400"><FileText size={12} /></div>
                                <span className="text-[13px] font-medium text-slate-400 truncate">Ver expediente completo</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-50 flex justify-between items-center group-hover:border-slate-100 transition-colors">
                            <div className="flex items-center gap-2">
                                <Calendar size={12} className="text-slate-300" />
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Aper. {new Date(patient.createdAt).toLocaleDateString('es-ES', {month: 'short', year: 'numeric'})}</span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                <ArrowRight size={14} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                            </div>
                        </div>
                    </div>
                ))
                )}
            </div>

            {!isLoading && filteredPatients.length === 0 && search.trim() !== '' && (
                <div className="text-center py-24 animate-in fade-in duration-500">
                    <div className="w-16 h-16 bg-slate-50 rounded-[18px] flex items-center justify-center mx-auto mb-6">
                        <Search size={24} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">No se encontró al paciente</h3>
                    <p className="text-slate-400 text-[15px] mb-8 font-medium">Revisa si escribiste bien el nombre o el teléfono.</p>
                    <button onClick={() => setSearch('')} className="px-6 py-3 bg-white border border-slate-200 rounded-[14px] text-[13px] font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all">
                        Mostrar Todos
                    </button>
                </div>
            )}
        </div>
    );
};

export default PatientList;
