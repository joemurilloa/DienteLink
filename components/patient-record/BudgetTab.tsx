import React, { useState, useEffect } from 'react';
import { usePriceCatalog } from '../../lib/priceCatalog';
import { PatientRecord as PatientRecordType, BudgetItem, Payment } from '../../types';
import { cn, formatCurrency, getLocalISODate } from '../../lib/utils';
import { PAYMENT_METHOD_OPTIONS, paymentMethodLabel } from '../../lib/finance';
import {
    Plus,
    DollarSign,
    CreditCard,
    Check,
    Clock,
    Loader2,
    Trash2,
    Download,
} from 'lucide-react';
import { sileo } from 'sileo';
import { generatePaymentReceiptPDF, generateAccountStatementPDF, generateBudgetPDF } from '../../lib/invoiceGenerator';
import { whatsappService } from '../../services/whatsappService';
import { useAuth } from '../../services/authService';
import ConfirmModal from '../ConfirmModal';
import WhatsAppAction from '../WhatsAppAction';

interface Props {
    patient: PatientRecordType;
    onUpdate: (updatedPatient: PatientRecordType) => void;
    /** Tratamiento sugerido desde el odontograma (se precarga en el formulario). */
    prefill?: { treatment: string; cost: string; toothId: number } | null;
    onPrefillConsumed?: () => void;
}

const BudgetTab: React.FC<Props> = ({ patient, onUpdate, prefill, onPrefillConsumed }) => {
    const { profile } = useAuth();
    const { catalog: DEFAULT_CATALOG } = usePriceCatalog();
    const doctorName = profile?.full_name || 'Doctor';
    const clinicName = profile?.clinic_name || 'Clínica Dental';

    const [newTreatment, setNewTreatment] = useState({ treatment: '', unitCost: '', quantity: '1', toothId: '' });
    const [newPayment, setNewPayment] = useState({ method: 'cash' as Payment['method'] });
    useEffect(() => {
        if (!prefill) return;
        setNewTreatment(p => ({
            ...p,
            treatment: prefill.treatment,
            unitCost: prefill.cost,
            quantity: '1',
            toothId: String(prefill.toothId),
        }));
        onPrefillConsumed?.();
    }, [prefill]);
    const [budgetError, setBudgetError] = useState('');
    const [paymentError, setPaymentError] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'treatment' | 'payment', id: string } | null>(null);

    const budgetItems = patient.budget || [];
    const payments = patient.payments || [];
    const totalBudget = budgetItems.reduce((sum, b) => sum + (b.unitCost * b.quantity), 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const amountDue = Math.max(0, totalBudget - totalPaid);

    const handleAddTreatment = () => {
        setBudgetError('');
        if (!newTreatment.treatment.trim()) { setBudgetError('Ingresa el nombre del tratamiento'); return; }
        const cost = parseFloat(newTreatment.unitCost);
        if (isNaN(cost) || cost <= 0) { setBudgetError('Ingresa un costo válido mayor a 0'); return; }
        const qty = parseInt(newTreatment.quantity) || 1;
        if (qty < 1) { setBudgetError('La cantidad debe ser al menos 1'); return; }

        const item: BudgetItem = {
            id: crypto.randomUUID(),
            treatment: newTreatment.treatment.trim(),
            toothId: newTreatment.toothId ? parseInt(newTreatment.toothId) : undefined,
            unitCost: cost,
            quantity: qty,
            status: 'pending',
            createdAt: getLocalISODate(new Date()),
        };
        onUpdate({ ...patient, budget: [...budgetItems, item] });
        setNewTreatment({ treatment: '', unitCost: '', quantity: '1', toothId: '' });
    };

    const handleDeleteTreatment = (id: string) => {
        onUpdate({ ...patient, budget: budgetItems.filter(b => b.id !== id) });
    };

    const handleToggleStatus = (id: string) => {
        const updated = budgetItems.map(b => {
            if (b.id !== id) return b;
            const next = b.status === 'pending' ? 'in_progress' : b.status === 'in_progress' ? 'completed' : 'pending';
            return { ...b, status: next as BudgetItem['status'] };
        });
        onUpdate({ ...patient, budget: updated });
    };

    const handleAddPayment = () => {
        setPaymentError('');
        if (amountDue <= 0) { setPaymentError('El presupuesto ya está pagado'); return; }

        const payment: Payment = {
            id: crypto.randomUUID(),
            amount: amountDue,
            method: newPayment.method,
            note: '',
            date: getLocalISODate(new Date()),
        };
        onUpdate({ ...patient, payments: [...payments, payment] });
        setNewPayment({ method: 'cash' });
        sileo.success({ title: 'Pago registrado', description: `${formatCurrency(amountDue)} · ${paymentMethodLabel(payment.method)}` });
    };

    const handleDeletePayment = (id: string) => {
        onUpdate({ ...patient, payments: payments.filter(p => p.id !== id) });
    };

    return (
        <div className="space-y-8 animate-in-up duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Pagos y presupuestos</h3>
                    <p className="text-slate-500 text-sm mt-1">Presupuesto, pagos y recibos del paciente</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {budgetItems.length > 0 && (
                        <>
                            <WhatsAppAction
                                storageKey={`presupuesto_${patient.id}`}
                                label="Compartir por WhatsApp"
                                sentLabel="Presupuesto enviado"
                                title="Abrir WhatsApp con el presupuesto listo"
                                send={() => {
                                    if (!patient.identification.phone) {
                                        return { success: false, error: 'El paciente no tiene teléfono en su ficha.' };
                                    }
                                    if (budgetItems.length === 0) {
                                        return { success: false, error: 'Agrega al menos un tratamiento al presupuesto.' };
                                    }
                                    return whatsappService.sendBudgetQuote(
                                        patient.identification.phone,
                                        patient.identification.fullName,
                                        budgetItems,
                                        totalBudget,
                                        clinicName,
                                        doctorName
                                    );
                                }}
                            />
                            <button
                                onClick={() => generateBudgetPDF(patient, clinicName, doctorName)}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-sm cursor-pointer"
                                title="Descargar presupuesto formal en PDF"
                            >
                                <Download size={14} /> Presupuesto PDF
                            </button>
                        </>
                    )}
                    {payments.length > 0 && (
                        <button
                            onClick={() => generateAccountStatementPDF(patient, clinicName, doctorName)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-xl text-sm font-semibold transition-all active:scale-95 cursor-pointer"
                            title="Descargar estado de cuenta con tratamientos y pagos"
                        >
                            <Download size={14} /> Estado de Cuenta
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-500 mb-1">Presupuesto</p>
                    <p className="text-lg font-bold text-blue-700">{formatCurrency(totalBudget)}</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-1">Pagado</p>
                    <p className="text-lg font-bold text-emerald-700">{formatCurrency(totalPaid)}</p>
                </div>
            </div>

            {/* Add Treatment Form */}
            <div className="p-5 bg-slate-50 border border-slate-300 rounded-2xl">
                <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-11 h-11 bg-blue-600 text-white rounded-xl flex items-center justify-center"><Plus size={16} /></div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Agregar Tratamiento</p>
                </div>
                {budgetError && (
                    <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium mb-4">{budgetError}</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-5">
                        <input placeholder="Tratamiento (Ej. Resina, Corona...)" className="w-full bg-white px-4 py-3 rounded-xl border border-slate-300 outline-none text-sm font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-400" value={newTreatment.treatment} onChange={e => { setNewTreatment(p => ({ ...p, treatment: e.target.value })); setBudgetError(''); }} />
                    </div>
                    <div className="md:col-span-2">
                        <input placeholder="Costo" type="number" step="0.01" min="0" className="w-full bg-white px-4 py-3 rounded-xl border border-slate-300 outline-none text-sm font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-400" value={newTreatment.unitCost} onChange={e => { setNewTreatment(p => ({ ...p, unitCost: e.target.value })); setBudgetError(''); }} />
                    </div>
                    <div className="md:col-span-1">
                        <input placeholder="Cant." type="number" min="1" className="w-full bg-white px-3 py-3 rounded-xl border border-slate-300 outline-none text-sm font-medium text-slate-900 focus:border-blue-500 transition-all placeholder:text-slate-400 text-center" value={newTreatment.quantity} onChange={e => setNewTreatment(p => ({ ...p, quantity: e.target.value }))} />
                    </div>
                    <div className="md:col-span-2">
                        <input placeholder="Pieza #" type="number" min="1" max="32" className="w-full bg-white px-4 py-3 rounded-xl border border-slate-300 outline-none text-sm font-medium text-slate-900 focus:border-blue-500 transition-all placeholder:text-slate-400" value={newTreatment.toothId} onChange={e => setNewTreatment(p => ({ ...p, toothId: e.target.value }))} />
                    </div>
                    <div className="md:col-span-2 flex items-stretch">
                        <button onClick={handleAddTreatment} className="w-full py-3 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-all shadow-md shadow-blue-600/15 font-semibold text-sm active:scale-[0.98]">
                            <Plus size={16} /> Agregar
                        </button>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-300">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2.5">Catálogo Rápido (Toca para autocompletar)</p>
                    <div className="flex flex-wrap gap-2">
                        {DEFAULT_CATALOG.map(item => (
                            <button
                                key={item.name}
                                onClick={() => {
                                    setNewTreatment(p => ({ ...p, treatment: item.name, unitCost: item.cost.toString() }));
                                    setBudgetError('');
                                }}
                                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all hover:shadow-sm"
                            >
                                {item.name} <span className="text-slate-500 opacity-60 ml-1">({item.cost})</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Treatment Items List */}
            {budgetItems.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <DollarSign size={28} className="text-slate-400" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-700 mb-1">Sin tratamientos en el presupuesto</h4>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto">Agrega tratamientos arriba para crear el plan financiero del paciente.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Tratamientos ({budgetItems.length})</p>
                    {budgetItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-slate-300 rounded-xl hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <button
                                    onClick={() => handleToggleStatus(item.id)}
                                    className={cn(
                                        "w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                                        item.status === 'completed' ? "bg-emerald-100 text-emerald-600" :
                                        item.status === 'in_progress' ? "bg-amber-100 text-amber-600" :
                                        "bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600"
                                    )}
                                    aria-label={item.status === 'pending' ? 'Marcar en progreso' : item.status === 'in_progress' ? 'Marcar completado' : 'Marcar pendiente'}
                                >
                                    {item.status === 'completed' ? <Check size={16} /> :
                                     item.status === 'in_progress' ? <Loader2 size={16} /> :
                                     <Clock size={16} />}
                                </button>
                                <div className="min-w-0">
                                    <h4 className={cn("font-semibold text-sm truncate", item.status === 'completed' ? "text-slate-500 line-through" : "text-slate-900")}>
                                        {item.treatment}
                                    </h4>
                                    <p className="text-sm text-slate-500 flex items-center gap-2">
                                        {item.toothId && <span>Pieza #{item.toothId}</span>}
                                        <span>{item.quantity > 1 ? `${item.quantity} × ${formatCurrency(item.unitCost)}` : formatCurrency(item.unitCost)}</span>
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded text-xs font-semibold",
                                            item.status === 'completed' ? "bg-emerald-50 text-emerald-600" :
                                            item.status === 'in_progress' ? "bg-amber-50 text-amber-600" :
                                            "bg-slate-50 text-slate-500"
                                        )}>
                                            {item.status === 'completed' ? 'Hecho' : item.status === 'in_progress' ? 'En curso' : 'Pendiente'}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-sm text-slate-800">{formatCurrency(item.unitCost * item.quantity)}</span>
                                <button type="button" onClick={() => setDeleteTarget({ type: 'treatment', id: item.id })} aria-label={`Eliminar ${item.treatment}`} className="w-11 h-11 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all">
                                    <Trash2 size={14} aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Payments Section */}
            <div className="border-t border-slate-300 pt-8">
                {amountDue > 0 ? (
                    <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm mb-6">
                        <div className="mb-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Cobro del presupuesto</p>
                            <p className="text-3xl font-black text-slate-900 tabular-nums leading-none">{formatCurrency(amountDue)}</p>
                            <p className="text-sm text-slate-500 mt-1.5">Se registra el pago completo.</p>
                        </div>

                        {paymentError && (
                            <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium mb-4">{paymentError}</div>
                        )}

                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {PAYMENT_METHOD_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setNewPayment({ method: opt.value })}
                                    className={cn(
                                        'py-3 rounded-xl text-sm font-bold border transition-all',
                                        newPayment.method === opt.value
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={handleAddPayment}
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 font-bold text-base active:scale-[0.98]"
                        >
                            <Check size={18} /> Registrar pago
                        </button>
                    </div>
                ) : budgetItems.length > 0 ? (
                    <div className="p-4 mb-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                            <Check size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-emerald-800">Presupuesto pagado</p>
                            <p className="text-xs text-emerald-700/80">El cobro completo ya está registrado.</p>
                        </div>
                    </div>
                ) : null}

                {payments.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Historial de Pagos ({payments.length})</p>
                            <button 
                                onClick={() => generateAccountStatementPDF(patient, clinicName, doctorName)}
                                className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                <Download size={12} /> Estado de Cuenta
                            </button>
                        </div>
                        {payments.map((pay) => (
                            <div key={pay.id} className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl group">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center"><CreditCard size={14} /></div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{formatCurrency(pay.amount)}</p>
                                        <p className="text-sm text-slate-500">
                                            {pay.date} · {paymentMethodLabel(pay.method)}
                                            {pay.note && ` · ${pay.note}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button 
                                        type="button"
                                        onClick={() => generatePaymentReceiptPDF(patient, pay, clinicName, doctorName)}
                                        className="w-11 h-11 rounded-lg flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                        aria-label="Generar recibo"
                                    >
                                        <Download size={14} aria-hidden="true" />
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setDeleteTarget({ type: 'payment', id: pay.id })} 
                                        className="w-11 h-11 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all"
                                        aria-label="Eliminar pago"
                                    >
                                        <Trash2 size={14} aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {deleteTarget && (
                <ConfirmModal
                    isOpen={true}
                    title={deleteTarget.type === 'treatment' ? "Eliminar Tratamiento" : "Eliminar Pago"}
                    description={`¿Estás seguro de que deseas eliminar este ${deleteTarget.type === 'treatment' ? 'tratamiento del presupuesto' : 'registro de pago'}? Esta acción no se puede deshacer.`}
                    confirmLabel="Eliminar"
                    cancelLabel="Cancelar"
                    onConfirm={() => {
                        if (deleteTarget.type === 'treatment') {
                            handleDeleteTreatment(deleteTarget.id);
                        } else {
                            handleDeletePayment(deleteTarget.id);
                        }
                        setDeleteTarget(null);
                    }}
                    onClose={() => setDeleteTarget(null)}
                    variant="danger"
                />
            )}
        </div>
    );
};

export default BudgetTab;
