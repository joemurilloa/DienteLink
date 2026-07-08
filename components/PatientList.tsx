import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientRecord } from '../types';
import { Search, Plus, User, Phone, Calendar, ArrowRight, FileText, AlertCircle } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { PatientCardSkeleton, generateSkeletons } from './LoadingSkeletons';
import { useOptimizedSearch } from '../lib/PerformanceOptimizations';
import { useRoleAccess } from './RoleGuard';

interface Props {
    patients: PatientRecord[];
    onSelect: (patient: PatientRecord) => void;
    onAdd: () => void;
}

const PatientList: React.FC<Props> = ({ patients, onSelect, onAdd }) => {
    const navigate = useNavigate();
    const { canViewFinancial } = useRoleAccess();

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
            <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 animate-in fade-in zoom-in-95 duration-700">
                <div className="w-20 h-20 mb-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-[2rem] flex items-center justify-center rotate-3 shadow-xl shadow-blue-500/30">
                    <span className="text-4xl -rotate-3">🦷</span>
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">Tu clínica digital te espera</h2>
                <p className="text-slate-500 max-w-sm mx-auto mb-8 leading-relaxed text-sm">
                    Agrega tu primer paciente y descubre todo lo que puedes hacer desde aquí.
                </p>

                {/* Feature preview cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto mb-8">
                    <div className="p-4 bg-white border border-slate-300 rounded-2xl shadow-sm text-left">
                        <div className="text-2xl mb-2">🦷</div>
                        <p className="font-bold text-slate-800 text-sm">Odontograma digital</p>
                        <p className="text-sm text-slate-500 mt-1">Pinta las piezas de cada paciente con un toque</p>
                    </div>
                    <div className="p-4 bg-white border border-slate-300 rounded-2xl shadow-sm text-left">
                        <div className="text-2xl mb-2">📅</div>
                        <p className="font-bold text-slate-800 text-sm">Agenda sin papel</p>
                        <p className="text-sm text-slate-500 mt-1">Citas, recordatorios y horarios en un solo lugar</p>
                    </div>
                    <div className="p-4 bg-white border border-slate-300 rounded-2xl shadow-sm text-left">
                        <div className="text-2xl mb-2">💰</div>
                        <p className="font-bold text-slate-800 text-sm">Presupuestos al instante</p>
                        <p className="text-sm text-slate-500 mt-1">Genera y controla cobros de forma profesional</p>
                    </div>
                </div>

                <button
                    onClick={onAdd}
                    className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold text-base shadow-[0_8px_24px_rgba(37,99,235,0.25)] hover:bg-blue-700 hover:-translate-y-0.5 transition-all flex items-center gap-3 active:scale-95"
                >
                    <Plus size={20} /> Agregar mi primer paciente
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-in fade-in duration-700 pb-20 max-w-[1400px] mx-auto">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-4">
                <div className="animate-in-up stagger-delay-1">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="px-3 py-1 bg-slate-100/80 text-slate-500 rounded-lg text-xs font-bold uppercase tracking-wider">{patients.length} Expedientes</div>
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-semibold text-slate-900 tracking-tight">Pacientes</h1>
                </div>

                <div className="flex items-center gap-2 md:gap-4 animate-in-up stagger-delay-2 w-full md:w-auto">
                    <div className="relative group flex-1 md:flex-none">
                        <Search className="absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Buscar paciente..."
                            className="pl-9 md:pl-11 pr-4 md:pr-5 py-3 md:py-3.5 bg-slate-50 border border-slate-300 rounded-[12px] md:rounded-[14px] w-full md:w-80 outline-none text-[14px] md:text-[15px] font-semibold text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:font-medium placeholder:text-slate-500"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    {canViewFinancial && (
                        <button
                            onClick={() => setFilterDebt(!filterDebt)}
                            className={cn(
                                "h-[46px] md:h-12 px-3.5 md:px-5 rounded-[12px] md:rounded-[14px] flex items-center justify-center gap-2 font-bold text-[13px] border-2 transition-all flex-shrink-0",
                                filterDebt 
                                    ? "bg-amber-50 border-amber-500 text-amber-700 shadow-sm" 
                                    : "bg-white border-slate-300 text-slate-500 hover:bg-slate-50 hover:border-slate-300"
                            )}
                            title="Pacientes con saldo pendiente"
                        >
                            <AlertCircle size={16} className={filterDebt ? "text-amber-500" : "text-slate-500"} />
                            <span className="hidden sm:inline">Con Deuda</span>
                        </button>
                    )}
                    <button
                        onClick={onAdd}
                        data-new-patient
                        className="bg-blue-600 text-white h-[46px] md:h-12 px-4 md:px-6 rounded-[12px] md:rounded-[14px] flex items-center justify-center gap-2 font-bold text-[13px] shadow-[0_4px_16px_rgba(37,99,235,0.2)] hover:bg-blue-700 transition-all flex-shrink-0 active:scale-95"
                    >
                        <Plus size={16} strokeWidth={2.5} />
                        <span className="hidden sm:inline">Nuevo Paciente</span>
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
                            "bg-white p-5 rounded-[24px] border border-slate-300 cursor-pointer group hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 animate-in-up",
                            index === 0 ? "stagger-1" : index === 1 ? "stagger-2" : "stagger-3"
                        )}
                    >
                        <div className="flex items-center gap-4 mb-5">
                            <div className="w-12 h-12 bg-slate-50 rounded-[14px] flex items-center justify-center text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 flex-shrink-0">
                                <User size={20} strokeWidth={2.5} />
                            </div>
                            <div className="overflow-hidden">
                                <h4 className="font-bold text-[15px] text-slate-900 truncate leading-tight tracking-tight group-hover:text-blue-600 transition-colors capitalize">{patient.identification.fullName}</h4>
                                <p className="text-[13px] text-slate-500 font-medium mt-0.5 truncate">{patient.identification.occupation || 'Sin ocupación'}</p>
                            </div>
                        </div>

                        {canViewFinancial && (() => {
                            const totalBudget = patient.budget?.reduce((acc, item) => acc + (item.unitCost * item.quantity), 0) || 0;
                            const totalPaid = (patient.payments || []).reduce((acc, pay) => acc + pay.amount, 0);
                            const balance = Math.max(0, totalBudget - totalPaid);
                            
                            if (balance > 0) {
                                return (
                                    <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between">
                                        <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Saldo Pdte.</span>
                                        <span className="text-[13px] font-bold text-amber-700">{formatCurrency(balance)}</span>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        <div className="space-y-2 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 flex items-center justify-center bg-slate-50 rounded-lg text-slate-500"><Phone size={12} /></div>
                                <span className="text-[13px] font-semibold text-slate-600">{patient.identification.phone || 'Sin teléfono'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 flex items-center justify-center bg-slate-50 rounded-lg text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all"><FileText size={12} /></div>
                                <span className="text-[13px] font-semibold text-blue-600 truncate">Ver expediente completo →</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-50 flex justify-between items-center group-hover:border-slate-300 transition-colors">
                            <div className="flex items-center gap-2">
                                <Calendar size={12} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Aper. {new Date(patient.createdAt).toLocaleDateString('es-ES', {month: 'short', year: 'numeric'})}</span>
                            </div>
                            <div className="w-11 h-11 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                <ArrowRight size={14} className="text-slate-500 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                            </div>
                        </div>
                    </div>
                ))
                )}
            </div>

            {!isLoading && filteredPatients.length === 0 && search.trim() !== '' && (
                <div className="text-center py-24 animate-in fade-in duration-500">
                    <div className="w-16 h-16 bg-slate-50 rounded-[18px] flex items-center justify-center mx-auto mb-6">
                        <Search size={24} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">No se encontró al paciente</h3>
                    <p className="text-slate-500 text-[15px] mb-8 font-medium">Revisa si escribiste bien el nombre o el teléfono.</p>
                    <button onClick={() => setSearch('')} className="px-6 py-3 bg-white border border-slate-300 rounded-[14px] text-[13px] font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all">
                        Mostrar Todos
                    </button>
                </div>
            )}
        </div>
    );
};

export default PatientList;
