import React, { useState } from 'react';
import { PatientRecord as PatientRecordType, LabWork, LabWorkStatus } from '../../types';
import { cn, formatCurrency, getLocalISODate } from '../../lib/utils';
import {
    Plus,
    FlaskConical,
    Check,
    Clock,
    Loader2,
    Trash2,
    Send,
} from 'lucide-react';
import ConfirmModal from '../ConfirmModal';

interface Props {
    patient: PatientRecordType;
    onUpdate: (updatedPatient: PatientRecordType) => void;
}

const LabTab: React.FC<Props> = ({ patient, onUpdate }) => {
    const [newLab, setNewLab] = useState({ description: '', labName: '', cost: '', expectedDate: '' });
    const [error, setError] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    const labWorks = patient.labWorks || [];

    const handleAddLabWork = () => {
        setError('');
        if (!newLab.description.trim()) { setError('Ingresa la descripción del trabajo'); return; }
        if (!newLab.labName.trim()) { setError('Ingresa el nombre del laboratorio'); return; }
        const cost = parseFloat(newLab.cost);
        if (isNaN(cost) || cost < 0) { setError('Ingresa un costo válido'); return; }

        const item: LabWork = {
            id: crypto.randomUUID(),
            description: newLab.description.trim(),
            labName: newLab.labName.trim(),
            cost,
            expectedDate: newLab.expectedDate || undefined,
            sentDate: getLocalISODate(new Date()),
            status: 'pending',
            createdAt: getLocalISODate(new Date()),
        };
        onUpdate({ ...patient, labWorks: [...labWorks, item] });
        setNewLab({ description: '', labName: '', cost: '', expectedDate: '' });
    };

    const handleDeleteLabWork = (id: string) => {
        onUpdate({ ...patient, labWorks: labWorks.filter(l => l.id !== id) });
    };

    const handleToggleStatus = (id: string) => {
        const order = ['pending', 'sent', 'received', 'completed'];
        const updated = labWorks.map(l => {
            if (l.id !== id) return l;
            const currentIndex = order.indexOf(l.status);
            const nextStatus = order[(currentIndex + 1) % order.length] as LabWorkStatus;
            return { ...l, status: nextStatus };
        });
        onUpdate({ ...patient, labWorks: updated });
    };

    const getStatusIcon = (status: LabWorkStatus) => {
        switch(status) {
            case 'pending': return <Clock size={16} />;
            case 'sent': return <Send size={16} />;
            case 'received': return <Loader2 size={16} />;
            case 'completed': return <Check size={16} />;
        }
    };

    const getStatusColor = (status: LabWorkStatus) => {
        switch(status) {
            case 'pending': return "bg-slate-100 text-slate-500 hover:bg-slate-200";
            case 'sent': return "bg-amber-100 text-amber-600 hover:bg-amber-200";
            case 'received': return "bg-blue-100 text-blue-600 hover:bg-blue-200";
            case 'completed': return "bg-emerald-100 text-emerald-600 hover:bg-emerald-200";
        }
    };

    const getStatusText = (status: LabWorkStatus) => {
        switch(status) {
            case 'pending': return 'Pendiente';
            case 'sent': return 'Enviado';
            case 'received': return 'Recibido';
            case 'completed': return 'Instalado';
        }
    };

    return (
        <div className="space-y-8 animate-in-up duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Laboratorio</h3>
                    <p className="text-slate-500 text-sm mt-1">Control de trabajos protésicos</p>
                </div>
            </div>

            {/* Add Lab Work Form */}
            <div className="p-5 bg-slate-50 border border-slate-300 rounded-2xl">
                <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-11 h-11 bg-purple-600 text-white rounded-xl flex items-center justify-center"><Plus size={16} /></div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-purple-600">Nuevo Trabajo</p>
                </div>
                {error && (
                    <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium mb-4">{error}</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-4">
                        <input placeholder="Descripción (Ej. Corona Porcelana)" className="w-full bg-white px-4 py-3 rounded-xl border border-slate-300 outline-none text-sm font-medium text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all placeholder:text-slate-400" value={newLab.description} onChange={e => { setNewLab(p => ({ ...p, description: e.target.value })); setError(''); }} />
                    </div>
                    <div className="md:col-span-3">
                        <input placeholder="Nombre del Laboratorio" className="w-full bg-white px-4 py-3 rounded-xl border border-slate-300 outline-none text-sm font-medium text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all placeholder:text-slate-400" value={newLab.labName} onChange={e => { setNewLab(p => ({ ...p, labName: e.target.value })); setError(''); }} />
                    </div>
                    <div className="md:col-span-2">
                        <input placeholder="Costo Lab" type="number" step="0.01" min="0" className="w-full bg-white px-4 py-3 rounded-xl border border-slate-300 outline-none text-sm font-medium text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all placeholder:text-slate-400" value={newLab.cost} onChange={e => { setNewLab(p => ({ ...p, cost: e.target.value })); setError(''); }} />
                    </div>
                    <div className="md:col-span-2">
                        <input type="date" title="Fecha Esperada" className="w-full bg-white px-4 py-3 rounded-xl border border-slate-300 outline-none text-sm font-medium text-slate-900 focus:border-purple-500 transition-all text-slate-500" value={newLab.expectedDate} onChange={e => setNewLab(p => ({ ...p, expectedDate: e.target.value }))} />
                    </div>
                    <div className="md:col-span-1 flex items-stretch">
                        <button onClick={handleAddLabWork} className="w-full py-3 bg-purple-600 text-white rounded-xl flex items-center justify-center hover:bg-purple-700 transition-all shadow-md shadow-purple-600/15 font-semibold text-sm active:scale-[0.98]" title="Agregar">
                            <Plus size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Lab Works List */}
            {labWorks.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <FlaskConical size={28} className="text-slate-400" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-700 mb-1">Sin trabajos de laboratorio</h4>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto">Registra los trabajos enviados a laboratorio para llevar el control.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Trabajos ({labWorks.length})</p>
                    {labWorks.map((item) => (
                        <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-300 rounded-xl hover:shadow-sm transition-all group gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <button
                                    onClick={() => handleToggleStatus(item.id)}
                                    className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all", getStatusColor(item.status))}
                                    title="Cambiar estado"
                                >
                                    {getStatusIcon(item.status)}
                                </button>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                        <h4 className={cn("font-semibold text-sm truncate", item.status === 'completed' ? "text-slate-500 line-through" : "text-slate-900")}>
                                            {item.description}
                                        </h4>
                                        <span className={cn("px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider", getStatusColor(item.status).split(' ')[0], getStatusColor(item.status).split(' ')[1])}>
                                            {getStatusText(item.status)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 flex flex-wrap items-center gap-2">
                                        <span className="font-medium text-slate-600">{item.labName}</span>
                                        <span className="text-slate-400">•</span>
                                        <span>Enviado: {item.sentDate}</span>
                                        {item.expectedDate && (
                                            <>
                                                <span className="text-slate-400">•</span>
                                                <span className={cn(
                                                    new Date(item.expectedDate) < new Date() && item.status !== 'completed' && item.status !== 'received' ? "text-red-500 font-semibold" : ""
                                                )}>
                                                    Esperado: {item.expectedDate}
                                                </span>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-sm text-slate-800">{formatCurrency(item.cost)}</span>
                                <button onClick={() => setDeleteTarget(item.id)} className="w-11 h-11 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {deleteTarget && (
                <ConfirmModal
                    isOpen={true}
                    title="Eliminar Trabajo de Laboratorio"
                    description="¿Estás seguro de que deseas eliminar este trabajo de laboratorio? Esta acción no se puede deshacer."
                    confirmLabel="Eliminar Trabajo"
                    cancelLabel="Cancelar"
                    onConfirm={() => {
                        handleDeleteLabWork(deleteTarget);
                        setDeleteTarget(null);
                    }}
                    onClose={() => setDeleteTarget(null)}
                    variant="danger"
                />
            )}
        </div>
    );
};

export default LabTab;
