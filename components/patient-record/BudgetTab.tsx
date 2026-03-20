import React, { useState } from 'react';
import { PatientRecord as PatientRecordType, BudgetItem, Payment } from '../../types';
import { cn, formatCurrency, getLocalISODate } from '../../lib/utils';
import {
    Plus,
    DollarSign,
    CreditCard,
    Check,
    Clock,
    Loader2,
    Trash2,
} from 'lucide-react';
import { sileo } from 'sileo';

interface Props {
    patient: PatientRecordType;
    onUpdate: (updatedPatient: PatientRecordType) => void;
}

const BudgetTab: React.FC<Props> = ({ patient, onUpdate }) => {
    const [newTreatment, setNewTreatment] = useState({ treatment: '', unitCost: '', quantity: '1', toothId: '' });
    const [newPayment, setNewPayment] = useState({ amount: '', method: 'cash' as Payment['method'], note: '' });
    const [budgetError, setBudgetError] = useState('');
    const [paymentError, setPaymentError] = useState('');

    const budgetItems = patient.budget || [];
    const payments = patient.payments || [];
    const totalBudget = budgetItems.reduce((sum, b) => sum + (b.unitCost * b.quantity), 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const pendingBalance = totalBudget - totalPaid;

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
        const amount = parseFloat(newPayment.amount);
        if (isNaN(amount) || amount <= 0) { setPaymentError('Ingresa un monto válido mayor a 0'); return; }
        if (amount > pendingBalance && pendingBalance > 0) { setPaymentError(`El monto excede el saldo pendiente (${formatCurrency(pendingBalance)})`); return; }

        const payment: Payment = {
            id: crypto.randomUUID(),
            amount,
            method: newPayment.method,
            note: newPayment.note.trim(),
            date: getLocalISODate(new Date()),
        };
        onUpdate({ ...patient, payments: [...payments, payment] });
        setNewPayment({ amount: '', method: 'cash', note: '' });
        sileo.success({ title: 'Abono registrado', description: `${formatCurrency(amount)} aplicado al presupuesto` });
    };

    const handleDeletePayment = (id: string) => {
        onUpdate({ ...patient, payments: payments.filter(p => p.id !== id) });
    };

    return (
        <div className="space-y-8 animate-in-up duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Presupuesto</h3>
                    <p className="text-slate-400 text-sm mt-1">Plan de tratamiento y control de pagos</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-500 mb-1">Total</p>
                    <p className="text-lg font-bold text-blue-700">{formatCurrency(totalBudget)}</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500 mb-1">Pagado</p>
                    <p className="text-lg font-bold text-emerald-700">{formatCurrency(totalPaid)}</p>
                </div>
                <div className={cn("p-4 rounded-xl border", pendingBalance > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-100")}>
                    <p className={cn("text-[10px] font-semibold uppercase tracking-wider mb-1", pendingBalance > 0 ? "text-amber-500" : "text-slate-400")}>Saldo</p>
                    <p className={cn("text-lg font-bold", pendingBalance > 0 ? "text-amber-700" : "text-slate-500")}>{formatCurrency(pendingBalance)}</p>
                </div>
            </div>

            {/* Progress Bar */}
            {totalBudget > 0 && (
                <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-2">
                        <span className="font-medium">Progreso de pago</span>
                        <span className="font-semibold">{Math.min(100, Math.round((totalPaid / totalBudget) * 100))}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={cn("h-full rounded-full transition-all duration-500", totalPaid >= totalBudget ? "bg-emerald-500" : "bg-blue-500")}
                            style={{ width: `${Math.min(100, (totalPaid / totalBudget) * 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Add Treatment Form */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center"><Plus size={16} /></div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Agregar Tratamiento</p>
                </div>
                {budgetError && (
                    <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium mb-4">{budgetError}</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-5">
                        <input placeholder="Tratamiento (Ej. Resina, Corona...)" className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-300" value={newTreatment.treatment} onChange={e => { setNewTreatment(p => ({ ...p, treatment: e.target.value })); setBudgetError(''); }} />
                    </div>
                    <div className="md:col-span-2">
                        <input placeholder="Costo" type="number" step="0.01" min="0" className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-300" value={newTreatment.unitCost} onChange={e => { setNewTreatment(p => ({ ...p, unitCost: e.target.value })); setBudgetError(''); }} />
                    </div>
                    <div className="md:col-span-1">
                        <input placeholder="Cant." type="number" min="1" className="w-full bg-white px-3 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium text-slate-900 focus:border-blue-500 transition-all placeholder:text-slate-300 text-center" value={newTreatment.quantity} onChange={e => setNewTreatment(p => ({ ...p, quantity: e.target.value }))} />
                    </div>
                    <div className="md:col-span-2">
                        <input placeholder="Pieza #" type="number" min="1" max="32" className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium text-slate-900 focus:border-blue-500 transition-all placeholder:text-slate-300" value={newTreatment.toothId} onChange={e => setNewTreatment(p => ({ ...p, toothId: e.target.value }))} />
                    </div>
                    <div className="md:col-span-2 flex items-stretch">
                        <button onClick={handleAddTreatment} className="w-full py-3 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-all shadow-md shadow-blue-600/15 font-semibold text-sm active:scale-[0.98]">
                            <Plus size={16} /> Agregar
                        </button>
                    </div>
                </div>
            </div>

            {/* Treatment Items List */}
            {budgetItems.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <DollarSign size={28} className="mx-auto mb-3 text-slate-200" />
                    <p className="text-slate-400 text-sm font-medium">Sin tratamientos en el presupuesto</p>
                    <p className="text-slate-300 text-xs mt-1">Agrega tratamientos arriba para crear el plan</p>
                </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Tratamientos ({budgetItems.length})</p>
                    {budgetItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <button
                                    onClick={() => handleToggleStatus(item.id)}
                                    className={cn(
                                        "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                                        item.status === 'completed' ? "bg-emerald-100 text-emerald-600" :
                                        item.status === 'in_progress' ? "bg-amber-100 text-amber-600" :
                                        "bg-slate-100 text-slate-400 hover:bg-blue-100 hover:text-blue-600"
                                    )}
                                    title={item.status === 'pending' ? 'Pendiente → En progreso' : item.status === 'in_progress' ? 'En progreso → Completado' : 'Completado → Pendiente'}
                                >
                                    {item.status === 'completed' ? <Check size={16} /> :
                                     item.status === 'in_progress' ? <Loader2 size={16} /> :
                                     <Clock size={16} />}
                                </button>
                                <div className="min-w-0">
                                    <h4 className={cn("font-semibold text-sm truncate", item.status === 'completed' ? "text-slate-400 line-through" : "text-slate-900")}>
                                        {item.treatment}
                                    </h4>
                                    <p className="text-xs text-slate-400 flex items-center gap-2">
                                        {item.toothId && <span>Pieza #{item.toothId}</span>}
                                        <span>{item.quantity > 1 ? `${item.quantity} × ${formatCurrency(item.unitCost)}` : formatCurrency(item.unitCost)}</span>
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded text-[10px] font-semibold",
                                            item.status === 'completed' ? "bg-emerald-50 text-emerald-600" :
                                            item.status === 'in_progress' ? "bg-amber-50 text-amber-600" :
                                            "bg-slate-50 text-slate-400"
                                        )}>
                                            {item.status === 'completed' ? 'Hecho' : item.status === 'in_progress' ? 'En curso' : 'Pendiente'}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-sm text-slate-800">{formatCurrency(item.unitCost * item.quantity)}</span>
                                <button onClick={() => handleDeleteTreatment(item.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Payments Section */}
            <div className="border-t border-slate-100 pt-8">
                <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-8 h-8 bg-emerald-600 text-white rounded-xl flex items-center justify-center"><CreditCard size={16} /></div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Registrar Abono / Pago</p>
                </div>

                {paymentError && (
                    <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium mb-4">{paymentError}</div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6">
                    <div className="md:col-span-3">
                        <input placeholder="Monto" type="number" step="0.01" min="0" className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder:text-slate-300" value={newPayment.amount} onChange={e => { setNewPayment(p => ({ ...p, amount: e.target.value })); setPaymentError(''); }} />
                    </div>
                    <div className="md:col-span-3">
                        <select className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium text-slate-800 transition-all focus:border-emerald-500 appearance-none" value={newPayment.method} onChange={e => setNewPayment(p => ({ ...p, method: e.target.value as Payment['method'] }))}>
                            <option value="cash">Efectivo</option>
                            <option value="card">Tarjeta</option>
                            <option value="transfer">Transferencia</option>
                            <option value="other">Otro</option>
                        </select>
                    </div>
                    <div className="md:col-span-4">
                        <input placeholder="Nota (opcional)" className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium text-slate-900 focus:border-emerald-500 transition-all placeholder:text-slate-300" value={newPayment.note} onChange={e => setNewPayment(p => ({ ...p, note: e.target.value }))} />
                    </div>
                    <div className="md:col-span-2 flex items-stretch">
                        <button onClick={handleAddPayment} className="w-full py-3 bg-emerald-600 text-white rounded-xl flex items-center justify-center gap-1.5 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/15 font-semibold text-sm active:scale-[0.98]">
                            <Plus size={16} /> Aplicar
                        </button>
                    </div>
                </div>

                {payments.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Historial de Pagos ({payments.length})</p>
                        {payments.map((pay) => (
                            <div key={pay.id} className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center"><CreditCard size={14} /></div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{formatCurrency(pay.amount)}</p>
                                        <p className="text-xs text-slate-400">
                                            {pay.date} · {pay.method === 'cash' ? 'Efectivo' : pay.method === 'card' ? 'Tarjeta' : pay.method === 'transfer' ? 'Transferencia' : 'Otro'}
                                            {pay.note && ` · ${pay.note}`}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => handleDeletePayment(pay.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BudgetTab;
