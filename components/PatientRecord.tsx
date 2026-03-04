
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { PatientRecord as PatientRecordType, EvolutionNote, ClinicalEvent, BudgetItem, Payment } from '../types';
import { cn, formatCurrency, ensurePeriodontogramData } from '../lib/utils';
import { persistenceService } from '../services/persistenceService';
import { useAuth } from '../services/authService';
import { sileo } from 'sileo';
import 'sileo/styles.css';
import {
    User,
    History,
    ClipboardList,
    Plus,
    Activity,
    Zap,
    LayoutGrid,
    BarChart3,
    X,
    Maximize2,
    Download,
    Calendar,
    Briefcase,
    Mail,
    Phone,
    MapPin,
    ChevronRight,
    ArrowRight,
    DollarSign,
    CreditCard,
    Check,
    Clock,
    Loader2,
    Trash2,
    FileCheck,
    Pill
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Odontogram from './Odontogram';
import Periodontogram from './Periodontogram';
import ConsentManager from './ConsentManager';
import PrescriptionManager from './PrescriptionManager';

interface Props {
    patient: PatientRecordType;
    onUpdate: (updatedPatient: PatientRecordType) => void;
}

const PatientRecord: React.FC<Props> = ({ patient, onUpdate }) => {
    const { profile } = useAuth();
    const doctorName = profile?.full_name || 'Doctor';
    const clinicName = profile?.clinic_name || 'DienteLink';
    const [searchParams] = useSearchParams();
    const initialTab = (searchParams.get('tab') as any) || 'id';
    const [activeTab, setActiveTab] = useState<'id' | 'anamnesis' | 'odontogram' | 'periodontogram' | 'notes' | 'budget' | 'consent' | 'prescriptions' | 'citas' | 'history'>(initialTab);
    const [newNote, setNewNote] = useState({ content: '', procedure: '' });
    const [newEvent, setNewEvent] = useState({ description: '', type: 'treatment' as ClinicalEvent['type'] });
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [snapshotRefresh, setSnapshotRefresh] = useState(0);
    const handleSnapshotSaved = () => setSnapshotRefresh(n => n + 1);

    // Budget state
    const [newTreatment, setNewTreatment] = useState({ treatment: '', unitCost: '', quantity: '1', toothId: '' });
    const [newPayment, setNewPayment] = useState({ amount: '', method: 'cash' as Payment['method'], note: '' });
    const [budgetError, setBudgetError] = useState('');
    const [paymentError, setPaymentError] = useState('');

    // Allergies editing state
    const [allergyInput, setAllergyInput] = useState('');

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab as any);
    }, [searchParams]);

    const tabs = [
        { id: 'id', label: 'Ficha', icon: User },
        { id: 'odontogram', label: 'Odontograma', icon: LayoutGrid },
        { id: 'anamnesis', label: 'Anamnesis', icon: History },
        { id: 'periodontogram', label: 'Periodonto', icon: BarChart3 },
        { id: 'notes', label: 'Evolución', icon: ClipboardList },
        { id: 'budget', label: 'Presupuesto', icon: DollarSign },
        { id: 'consent', label: 'Consentimiento', icon: FileCheck },
        { id: 'prescriptions', label: 'Recetas', icon: Pill },
        { id: 'citas', label: 'Agenda', icon: Calendar },
        { id: 'history', label: 'Historial', icon: Activity },
    ];

    const patientAppointments = persistenceService.getAppointments().filter(
        apt => apt.patientId === patient.id || apt.patientName.toLowerCase().trim() === patient.identification.fullName.toLowerCase().trim()
    );

    const handleAddNote = () => {
        if (!newNote.procedure.trim()) {
            sileo.error({ title: 'Falta el procedimiento', description: 'Ingresa el nombre del procedimiento realizado' });
            return;
        }
        if (!newNote.content.trim()) {
            sileo.error({ title: 'Falta la descripción', description: 'Describe la evolución del tratamiento' });
            return;
        }
        const note: EvolutionNote = {
            id: crypto.randomUUID(),
            date: new Date().toISOString().split('T')[0],
            content: newNote.content,
            procedure: newNote.procedure
        };
        onUpdate({ ...patient, evolutionNotes: [note, ...patient.evolutionNotes] });
        setNewNote({ content: '', procedure: '' });
        sileo.success({ title: '¡Nota guardada correctamente! 📝', description: 'Se añadió a la historia clínica del paciente' });
    };

    const handleAddEvent = () => {
        if (!newEvent.description.trim()) {
            sileo.error({ title: 'Falta la descripción', description: 'Describe el procedimiento realizado' });
            return;
        }
        const event: ClinicalEvent = {
            id: crypto.randomUUID(),
            date: new Date().toISOString().split('T')[0],
            ...newEvent
        };
        onUpdate({
            ...patient,
            history: [event, ...patient.history]
        });
        setNewEvent({ description: '', type: 'treatment' });
        sileo.success({ title: '¡Evento clínico registrado!', description: `${newEvent.type === 'treatment' ? 'Tratamiento' : newEvent.type === 'diagnosis' ? 'Diagnóstico' : 'Consulta'} añadido al historial` });
    };

    // Budget helpers
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
            createdAt: new Date().toISOString().split('T')[0],
        };
        onUpdate({ ...patient, budget: [...budgetItems, item] });
        setNewTreatment({ treatment: '', unitCost: '', quantity: '1', toothId: '' });
    };

    const handleDeleteTreatment = (id: string) => {
        onUpdate({ ...patient, budget: budgetItems.filter(b => b.id !== id) });
    };

    const handleToggleTreatmentStatus = (id: string) => {
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
            date: new Date().toISOString().split('T')[0],
        };
        onUpdate({ ...patient, payments: [...payments, payment] });
        setNewPayment({ amount: '', method: 'cash', note: '' });
        sileo.success({ title: 'Abono registrado', description: `${formatCurrency(amount)} aplicado al presupuesto` });
    };

    const handleDeletePayment = (id: string) => {
        onUpdate({ ...patient, payments: payments.filter(p => p.id !== id) });
    };

    const handleExportPDF = () => {
        sileo.info({ title: 'Generando expediente...', description: 'Esto puede tomar unos segundos' });
        
        const doc = new jsPDF() as any;
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        let y = 15;

        const checkPage = (needed: number) => {
            if (y + needed > pageH - 20) { doc.addPage(); y = 20; }
        };

        const sectionTitle = (title: string) => {
            checkPage(20);
            y += 6;
            doc.setFillColor(241, 245, 249);
            doc.roundedRect(15, y - 5, pageW - 30, 12, 2, 2, 'F');
            doc.setFontSize(12);
            doc.setTextColor(15, 23, 42);
            doc.text(title, 20, y + 3);
            y += 14;
        };

        const addField = (label: string, value: string) => {
            if (!value) return;
            checkPage(8);
            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139);
            doc.text(label + ':', 20, y);
            doc.setTextColor(15, 23, 42);
            doc.text(value, 65, y);
            y += 6;
        };

        // ── Header ──
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, pageW, 35, 'F');
        doc.setFontSize(20);
        doc.setTextColor(255, 255, 255);
        doc.text('Expediente Clínico', pageW / 2, 16, { align: 'center' });
        doc.setFontSize(10);
        doc.text(clinicName || 'DienteLink', pageW / 2, 24, { align: 'center' });
        doc.setFontSize(8);
        doc.text(`Generado: ${new Date().toLocaleString('es-HN')} | Dr(a). ${doctorName}`, pageW / 2, 31, { align: 'center' });
        y = 45;

        // ── 1. Datos del Paciente ──
        sectionTitle('1. Datos del Paciente');
        addField('Nombre', patient.identification.fullName);
        addField('Nacimiento', patient.identification.birthDate);
        addField('Género', patient.identification.gender);
        addField('Teléfono', patient.identification.phone);
        addField('Email', patient.identification.email);
        addField('Dirección', patient.identification.address);
        addField('Ocupación', patient.identification.occupation);
        addField('Expediente #', patient.id.slice(0, 8));

        // ── 2. Antecedentes Clínicos ──
        sectionTitle('2. Antecedentes Clínicos');
        addField('Alergias', patient.clinicalHistory.allergies.join(', ') || 'Ninguna');
        addField('Medicamentos', patient.clinicalHistory.medications || 'Ninguno');
        addField('Enfermedades', patient.clinicalHistory.previousDiseases || 'Ninguna');
        addField('Ant. Familiares', patient.clinicalHistory.familyHistory || 'Sin datos');
        if (patient.clinicalHistory.motiveOfConsult) {
            checkPage(20);
            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139);
            doc.text('Motivo de consulta:', 20, y);
            y += 5;
            doc.setTextColor(15, 23, 42);
            const motive = doc.splitTextToSize(patient.clinicalHistory.motiveOfConsult, pageW - 45);
            doc.text(motive, 25, y);
            y += motive.length * 4 + 2;
        }

        // ── 3. Odontograma ──
        const teethWithConditions = (patient.odontogram || []).filter(t => t.surfaces && t.surfaces.length > 0);
        if (teethWithConditions.length > 0) {
            sectionTitle('3. Odontograma – Hallazgos');
            const odontoData = teethWithConditions.map(t => [
                `#${t.id}`,
                t.surfaces.map(s => `${s.surface}: ${s.condition}`).join(', ')
            ]);
            doc.autoTable({
                startY: y,
                head: [['Pieza', 'Condiciones']],
                body: odontoData,
                theme: 'striped',
                headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
                styles: { fontSize: 8 },
                margin: { left: 20, right: 20 }
            });
            y = doc.lastAutoTable.finalY + 8;
        }

        // ── 4. Notas de Evolución ──
        if (patient.evolutionNotes.length > 0) {
            sectionTitle('4. Notas de Evolución');
            const notesData = patient.evolutionNotes.map(n => [n.date, n.procedure, n.content]);
            doc.autoTable({
                startY: y,
                head: [['Fecha', 'Procedimiento', 'Descripción']],
                body: notesData,
                theme: 'striped',
                headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
                styles: { fontSize: 8, cellPadding: 3 },
                columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 35 } },
                margin: { left: 20, right: 20 }
            });
            y = doc.lastAutoTable.finalY + 8;
        }

        // ── 5. Historial Clínico ──
        if (patient.history.length > 0) {
            sectionTitle('5. Historial de Procedimientos');
            const historyData = patient.history.map(e => [
                e.date,
                e.type === 'treatment' ? 'Tratamiento' : e.type === 'extraction' ? 'Extracción' : e.type === 'cleaning' ? 'Limpieza' : 'Diagnóstico',
                e.description,
                e.toothId ? `#${e.toothId}` : ''
            ]);
            doc.autoTable({
                startY: y,
                head: [['Fecha', 'Tipo', 'Descripción', 'Pieza']],
                body: historyData,
                theme: 'striped',
                headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
                styles: { fontSize: 8 },
                margin: { left: 20, right: 20 }
            });
            y = doc.lastAutoTable.finalY + 8;
        }

        // ── 6. Presupuesto ──
        if (budgetItems.length > 0) {
            sectionTitle('6. Plan de Tratamiento y Presupuesto');
            const budgetData = budgetItems.map(b => [
                b.treatment,
                b.toothId ? `#${b.toothId}` : '',
                b.quantity.toString(),
                formatCurrency(b.unitCost),
                formatCurrency(b.unitCost * b.quantity),
                b.status === 'completed' ? 'Completado' : b.status === 'in_progress' ? 'En curso' : 'Pendiente'
            ]);
            doc.autoTable({
                startY: y,
                head: [['Tratamiento', 'Pieza', 'Cant.', 'P. Unitario', 'Total', 'Estado']],
                body: budgetData,
                theme: 'striped',
                headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
                styles: { fontSize: 8 },
                margin: { left: 20, right: 20 }
            });
            y = doc.lastAutoTable.finalY + 4;
            checkPage(20);
            doc.setFontSize(10);
            doc.setTextColor(15, 23, 42);
            doc.text(`Total: ${formatCurrency(totalBudget)}  |  Pagado: ${formatCurrency(totalPaid)}  |  Saldo: ${formatCurrency(pendingBalance)}`, 20, y + 4);
            y += 12;
        }

        // ── 7. Recetas ──
        const rxList = patient.prescriptions || [];
        if (rxList.length > 0) {
            sectionTitle('7. Recetas Emitidas');
            rxList.forEach((rx, i) => {
                checkPage(15);
                doc.setFontSize(10);
                doc.setTextColor(15, 23, 42);
                doc.text(`${rx.date} — ${rx.diagnosis}`, 20, y);
                y += 5;
                rx.medications.forEach(med => {
                    checkPage(10);
                    doc.setFontSize(9);
                    doc.setTextColor(51, 65, 85);
                    doc.text(`  • ${med.name} — ${med.dosage} — ${med.frequency} — ${med.duration}`, 25, y);
                    y += 4.5;
                });
                y += 3;
            });
        }

        // ── 8. Consentimientos ──
        const consentList = patient.consents || [];
        if (consentList.length > 0) {
            sectionTitle('8. Consentimientos Firmados');
            consentList.forEach(c => {
                checkPage(10);
                doc.setFontSize(9);
                doc.setTextColor(51, 65, 85);
                doc.text(`• ${c.title} — Firmado: ${new Date(c.signedAt).toLocaleDateString('es-HN')}${c.witnessName ? ` — Testigo: ${c.witnessName}` : ''}`, 20, y);
                y += 5;
            });
        }

        // ── Footer ──
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text(`DienteLink — Expediente de ${patient.identification.fullName} — Pág. ${i}/${pageCount}`, pageW / 2, pageH - 8, { align: 'center' });
        }

        doc.save(`Expediente_${patient.identification.fullName.replace(/\\s+/g, '_')}.pdf`);
        sileo.success({ title: 'Expediente descargado', description: `PDF completo de ${patient.identification.fullName}` });
    };

    const isClinicalTab = ['odontogram', 'periodontogram'].includes(activeTab);

    const renderClinicalContent = () => {
        switch (activeTab) {
            case 'odontogram': return (
                <Odontogram
                    patientId={patient.id}
                    teeth={patient.odontogram || []}
                    onUpdate={(teeth) => onUpdate({ ...patient, odontogram: teeth })}
                    snapshots={patient.odontogramHistory || []}
                    onSaveSnapshot={handleSnapshotSaved}
                />
            );
            case 'periodontogram': return (
                <Periodontogram
                    data={ensurePeriodontogramData(patient.periodontogram)}
                    onUpdate={(periodontogram) => onUpdate({ ...patient, periodontogram })}
                />
            );
            default: return null;
        }
    };

    const FocusModeContent = (
        <div className="fixed inset-0 z-[10000] bg-white flex flex-col p-6 lg:p-12 animate-in fade-in duration-300 overflow-y-auto overflow-x-hidden">
            <button
                onClick={() => setIsFocusMode(false)}
                className="fixed top-8 left-8 right-8 lg:left-auto lg:w-64 h-16 bg-red-600 text-white rounded-3xl font-black uppercase tracking-[2px] text-xs shadow-2xl flex items-center justify-center gap-3 active:scale-95 z-[11000] border-4 border-white"
            >
                <X size={20} />
                CERRAR PANTALLA COMPLETA
            </button>
            <div className="flex-1 mt-20 lg:mt-0">
                <h3 className="text-4xl font-black text-slate-900 tracking-tighter mb-12 text-center lg:text-left italic">
                    {activeTab === 'odontogram' ? 'Odontograma' : activeTab === 'periodontogram' ? 'Periodontograma' : 'Plan de Tratamiento'}
                </h3>
                {renderClinicalContent()}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden animate-in fade-in duration-500 pb-20 lg:pb-0">
            {isFocusMode && createPortal(FocusModeContent, document.body)}

            {/* Sidebar Tabs */}
            <div className={cn(
                "lg:w-56 flex flex-row lg:flex-col overflow-x-auto lg:overflow-y-auto gap-1.5 pb-3 lg:pb-0 hide-scrollbar transition-all duration-500",
                isFocusMode ? "lg:w-0 opacity-0 pointer-events-none -ml-8 overflow-hidden" : "opacity-100"
            )}>
                <nav className="flex flex-row lg:flex-col gap-1 w-full">
                    {tabs.map((tab, index) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all whitespace-nowrap min-w-max animate-in-up duration-200",
                                activeTab === tab.id
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                            )}
                            style={{ animationDelay: `${index * 40}ms` }}
                        >
                            <tab.icon size={16} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 overflow-hidden relative flex flex-col transition-all duration-500 shadow-sm">
                <div className="flex-1 overflow-y-auto hide-scrollbar p-5 lg:p-8">
                    {isClinicalTab && (
                        <button
                            onClick={() => setIsFocusMode(true)}
                            className="absolute top-5 right-5 z-10 w-10 h-10 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 flex items-center justify-center transition-all active:scale-95"
                            title="Ver en Pantalla Completa"
                        >
                            <Maximize2 size={18} />
                        </button>
                    )}

                    {/* ══════ Ficha ══════ */}
                    {activeTab === 'id' && (
                        <div className="space-y-8 animate-in-up duration-500">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Ficha del Paciente</h3>
                                    <p className="text-slate-400 text-sm mt-1">Información personal y de contacto</p>
                                </div>
                                <button
                                    onClick={handleExportPDF}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-blue-600 transition-all shadow-sm active:scale-95"
                                >
                                    <Download size={16} />
                                    Exportar PDF
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                <InputGroup
                                    label="Nombre Completo"
                                    icon={User}
                                    value={patient.identification.fullName}
                                    onChange={(val) => onUpdate({ ...patient, identification: { ...patient.identification, fullName: val } })}
                                    placeholder="Nombre del paciente"
                                />
                                <InputGroup
                                    label="Fecha de Nacimiento"
                                    icon={Calendar}
                                    type="date"
                                    value={patient.identification.birthDate}
                                    onChange={(val) => onUpdate({ ...patient, identification: { ...patient.identification, birthDate: val } })}
                                />
                                <div className="space-y-2">
                                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 ml-1">Género</label>
                                    <div className="flex gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-100">
                                        {['Masculino', 'Femenino', 'Otro'].map(g => (
                                            <button
                                                key={g}
                                                type="button"
                                                onClick={() => onUpdate({ ...patient, identification: { ...patient.identification, gender: g as any } })}
                                                className={cn(
                                                    "flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all",
                                                    patient.identification.gender === g
                                                        ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                                                        : "text-slate-400 hover:text-slate-600"
                                                )}
                                            >
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <InputGroup
                                    label="Ocupación / Oficio"
                                    icon={Briefcase}
                                    value={patient.identification.occupation}
                                    onChange={(val) => onUpdate({ ...patient, identification: { ...patient.identification, occupation: val } })}
                                    placeholder="Ej. Arquitecto"
                                />
                                <InputGroup
                                    label="Teléfono Móvil"
                                    icon={Phone}
                                    value={patient.identification.phone}
                                    onChange={(val) => onUpdate({ ...patient, identification: { ...patient.identification, phone: val } })}
                                    placeholder="+504 0000-0000"
                                />
                                <InputGroup
                                    label="Correo Electrónico"
                                    icon={Mail}
                                    value={patient.identification.email}
                                    onChange={(val) => onUpdate({ ...patient, identification: { ...patient.identification, email: val } })}
                                    placeholder="correo@ejemplo.com"
                                />
                                <div className="md:col-span-2 lg:col-span-3">
                                    <InputGroup
                                        label="Dirección de Residencia"
                                        icon={MapPin}
                                        value={patient.identification.address}
                                        onChange={(val) => onUpdate({ ...patient, identification: { ...patient.identification, address: val } })}
                                        placeholder="Colonia, Ciudad, Referencias..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══════ Anamnesis ══════ */}
                    {activeTab === 'anamnesis' && (
                        <div className="space-y-8 animate-in-up duration-500">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Anamnesis</h3>
                                <p className="text-slate-400 text-sm mt-1">Antecedentes clínicos y médicos</p>
                            </div>

                            {/* Allergies card with quick-select */}
                            <div className="p-5 bg-red-50 rounded-2xl border border-red-100">
                                <div className="flex items-center gap-2.5 mb-4">
                                    <div className="w-8 h-8 bg-red-600 text-white rounded-xl flex items-center justify-center">
                                        <Activity size={16} />
                                    </div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-red-600">Alergias Conocidas</label>
                                </div>
                                {/* Selected allergies */}
                                <div className="flex flex-wrap gap-2 items-center mb-3">
                                    {patient.clinicalHistory.allergies.map(a => (
                                        <span key={a} className="px-3 py-1.5 bg-white text-red-600 rounded-lg text-xs font-semibold border border-red-100 flex items-center gap-1.5">
                                            {a}
                                            <button onClick={() => onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, allergies: patient.clinicalHistory.allergies.filter(al => al !== a) } })} className="text-red-400 hover:text-red-700 transition-colors"><X size={12} /></button>
                                        </span>
                                    ))}
                                    {patient.clinicalHistory.allergies.length === 0 && <span className="text-red-300 text-sm">Ninguna alergia registrada</span>}
                                </div>
                                {/* Quick-select common allergies */}
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {['Penicilina', 'Lidocaína', 'Látex', 'Aspirina', 'Ibuprofeno', 'Sulfas', 'Yodo', 'AINES', 'Metales', 'Acrílico dental'].map(a => (
                                        <button key={a} type="button"
                                            onClick={() => { if (!patient.clinicalHistory.allergies.includes(a)) onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, allergies: [...patient.clinicalHistory.allergies, a] } }); }}
                                            disabled={patient.clinicalHistory.allergies.includes(a)}
                                            className={cn("px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border",
                                                patient.clinicalHistory.allergies.includes(a) ? "bg-red-100 text-red-300 border-red-100 cursor-default" : "bg-white text-red-500 border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600 active:scale-95"
                                            )}>
                                            + {a}
                                        </button>
                                    ))}
                                </div>
                                {/* Custom allergy input */}
                                <form onSubmit={(e) => { e.preventDefault(); const v = allergyInput.trim(); if (v && !patient.clinicalHistory.allergies.includes(v)) { onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, allergies: [...patient.clinicalHistory.allergies, v] } }); setAllergyInput(''); } }} className="flex items-center gap-1.5">
                                    <input value={allergyInput} onChange={e => setAllergyInput(e.target.value)} placeholder="Otra alergia..." className="flex-1 px-3 py-2 rounded-lg text-xs border border-red-200 outline-none focus:border-red-400 bg-white" />
                                    <button type="submit" className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-all"><Plus size={12} /></button>
                                </form>
                            </div>

                            {/* Medications with quick-select */}
                            <div className="p-5 bg-purple-50 rounded-2xl border border-purple-100">
                                <div className="flex items-center gap-2.5 mb-3">
                                    <div className="w-8 h-8 bg-purple-600 text-white rounded-xl flex items-center justify-center">
                                        <Zap size={16} />
                                    </div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-purple-600">Medicamentos Actuales</label>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {['Antihipertensivos', 'Anticoagulantes', 'Insulina', 'Metformina', 'Anticonceptivos', 'Antidepresivos', 'Corticoides', 'Bifosfonatos', 'Ansiolíticos', 'Ninguno'].map(m => (
                                        <button key={m} type="button"
                                            onClick={() => {
                                                const current = patient.clinicalHistory.medications;
                                                const val = current ? (current.toLowerCase().includes(m.toLowerCase()) ? current : `${current}, ${m}`) : m;
                                                onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, medications: val } });
                                            }}
                                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-purple-500 border border-purple-200 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all active:scale-95">
                                            + {m}
                                        </button>
                                    ))}
                                </div>
                                <InputGroup
                                    label=""
                                    icon={Zap}
                                    value={patient.clinicalHistory.medications}
                                    onChange={(val) => onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, medications: val } })}
                                    placeholder="Ej: Losartan 50mg, Metformina 850mg..."
                                />
                            </div>

                            {/* Diseases with quick-select */}
                            <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100">
                                <div className="flex items-center gap-2.5 mb-3">
                                    <div className="w-8 h-8 bg-orange-500 text-white rounded-xl flex items-center justify-center">
                                        <Activity size={16} />
                                    </div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-orange-600">Enfermedades Previas</label>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {['Diabetes', 'Hipertensión', 'Asma', 'Cardiopatía', 'Hepatitis', 'VIH', 'Epilepsia', 'Artritis', 'Anemia', 'Tiroides', 'Ninguna'].map(d => (
                                        <button key={d} type="button"
                                            onClick={() => {
                                                const current = patient.clinicalHistory.previousDiseases;
                                                const val = current ? (current.toLowerCase().includes(d.toLowerCase()) ? current : `${current}, ${d}`) : d;
                                                onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, previousDiseases: val } });
                                            }}
                                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-orange-500 border border-orange-200 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all active:scale-95">
                                            + {d}
                                        </button>
                                    ))}
                                </div>
                                <InputGroup
                                    label=""
                                    icon={Activity}
                                    value={patient.clinicalHistory.previousDiseases}
                                    onChange={(val) => onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, previousDiseases: val } })}
                                    placeholder="Ej: Diabetes tipo 2, Hipertensión..."
                                />
                            </div>

                            {/* Family history + Habits side by side */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="p-5 bg-white rounded-2xl border border-slate-200">
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <div className="w-8 h-8 bg-slate-700 text-white rounded-xl flex items-center justify-center">
                                            <User size={16} />
                                        </div>
                                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Antecedentes Familiares</label>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {['Diabetes', 'Hipertensión', 'Cáncer', 'Cardiopatía', 'Hemofilia', 'Ninguno'].map(f => (
                                            <button key={f} type="button"
                                                onClick={() => {
                                                    const current = patient.clinicalHistory.familyHistory;
                                                    const val = current ? (current.toLowerCase().includes(f.toLowerCase()) ? current : `${current}, ${f}`) : f;
                                                    onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, familyHistory: val } });
                                                }}
                                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-700 hover:text-white hover:border-slate-700 transition-all active:scale-95">
                                                + {f}
                                            </button>
                                        ))}
                                    </div>
                                    <InputGroup
                                        label=""
                                        icon={User}
                                        value={patient.clinicalHistory.familyHistory}
                                        onChange={(val) => onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, familyHistory: val } })}
                                        placeholder="Ej: Padre diabético, madre hipertensa..."
                                    />
                                </div>
                                <div className="p-5 bg-white rounded-2xl border border-slate-200">
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <div className="w-8 h-8 bg-indigo-500 text-white rounded-xl flex items-center justify-center">
                                            <Activity size={16} />
                                        </div>
                                        <label className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Hábitos</label>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {['Bruxismo', 'Onicofagia', 'Respirador bucal', 'Succión digital', 'Morder objetos', 'Tabaquismo', 'Alcoholismo', 'Ninguno'].map(h => (
                                            <button key={h} type="button"
                                                onClick={() => {
                                                    const current = patient.clinicalHistory.habits || '';
                                                    const val = current ? (current.toLowerCase().includes(h.toLowerCase()) ? current : `${current}, ${h}`) : h;
                                                    onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, habits: val } });
                                                }}
                                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-500 border border-indigo-200 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all active:scale-95">
                                                + {h}
                                            </button>
                                        ))}
                                    </div>
                                    <InputGroup
                                        label=""
                                        icon={Activity}
                                        value={patient.clinicalHistory.habits || ''}
                                        onChange={(val) => onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, habits: val } })}
                                        placeholder="Ej: Bruxismo nocturno, onicofagia..."
                                    />
                                </div>
                            </div>

                            {/* Quick toggles & selects */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 bg-white rounded-2xl border border-slate-200">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">Tipo de Sangre</label>
                                    <select
                                        value={patient.clinicalHistory.bloodType || ''}
                                        onChange={(e) => onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, bloodType: e.target.value } })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 transition-all bg-white"
                                    >
                                        <option value="">No registrado</option>
                                        {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
                                    <div>
                                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Fumador</label>
                                        <p className="text-sm font-medium text-slate-600 mt-1">{patient.clinicalHistory.smoker ? 'Sí' : 'No'}</p>
                                    </div>
                                    <button
                                        onClick={() => onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, smoker: !patient.clinicalHistory.smoker } })}
                                        className={cn("w-12 h-7 rounded-full transition-all relative", patient.clinicalHistory.smoker ? 'bg-orange-500' : 'bg-slate-200')}
                                    >
                                        <div className={cn("w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm", patient.clinicalHistory.smoker ? 'left-6' : 'left-1')} />
                                    </button>
                                </div>
                                <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
                                    <div>
                                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Embarazo</label>
                                        <p className="text-sm font-medium text-slate-600 mt-1">{patient.clinicalHistory.pregnant ? 'Sí' : 'No'}</p>
                                    </div>
                                    <button
                                        onClick={() => onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, pregnant: !patient.clinicalHistory.pregnant } })}
                                        className={cn("w-12 h-7 rounded-full transition-all relative", patient.clinicalHistory.pregnant ? 'bg-pink-500' : 'bg-slate-200')}
                                    >
                                        <div className={cn("w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm", patient.clinicalHistory.pregnant ? 'left-6' : 'left-1')} />
                                    </button>
                                </div>
                            </div>

                            {/* Observations */}
                            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100">
                                <div className="flex items-center gap-2.5 mb-3">
                                    <div className="w-8 h-8 bg-amber-500 text-white rounded-xl flex items-center justify-center">
                                        <ClipboardList size={16} />
                                    </div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-amber-600">Observaciones Generales</label>
                                </div>
                                <DebouncedTextarea
                                    className="w-full bg-white px-5 py-4 rounded-xl border border-amber-100 outline-none text-sm text-slate-700 leading-relaxed resize-none h-24 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 transition-all placeholder:text-amber-200"
                                    placeholder="Notas adicionales sobre el estado de salud del paciente..."
                                    value={patient.clinicalHistory.observations || ''}
                                    onChange={(val) => onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, observations: val } })}
                                />
                            </div>

                            {/* Motive */}
                            <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                                <div className="flex items-center gap-2.5 mb-4">
                                    <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                                        <ClipboardList size={16} />
                                    </div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-blue-600">Motivo de Consulta Principal</label>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {['Dolor dental', 'Revisión general', 'Limpieza dental', 'Sangrado de encías', 'Diente fracturado', 'Sensibilidad dental', 'Blanqueamiento', 'Ortodoncia', 'Prótesis', 'Extracción', 'Implante dental', 'Caries visible', 'Mal aliento', 'Inflamación'].map(m => (
                                        <button key={m} type="button"
                                            onClick={() => {
                                                const current = patient.clinicalHistory.motiveOfConsult;
                                                const val = current ? `${current}. ${m}` : m;
                                                onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, motiveOfConsult: val } });
                                            }}
                                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-blue-500 border border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all active:scale-95">
                                            + {m}
                                        </button>
                                    ))}
                                </div>
                                <DebouncedTextarea
                                    className="w-full bg-white px-5 py-4 rounded-xl border border-blue-100 outline-none text-sm text-slate-700 leading-relaxed resize-none h-32 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all placeholder:text-blue-200"
                                    placeholder="Describa el motivo por el cual el paciente asiste a consulta..."
                                    value={patient.clinicalHistory.motiveOfConsult}
                                    onChange={(val) => onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, motiveOfConsult: val } })}
                                />
                            </div>
                        </div>
                    )}

                    {/* ══════ Odontograma ══════ */}
                    {activeTab === 'odontogram' && (
                        <div className="space-y-6 animate-in-up duration-500 min-h-[600px]">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Odontograma</h3>
                                <p className="text-slate-400 text-sm mt-1">Mapa dental interactivo</p>
                            </div>
                            <Odontogram
                                patientId={patient.id}
                                teeth={patient.odontogram || []}
                                onUpdate={(teeth) => onUpdate({ ...patient, odontogram: teeth })}
                                snapshots={patient.odontogramHistory || []}
                                onSaveSnapshot={handleSnapshotSaved}
                            />
                        </div>
                    )}

                    {/* ══════ Periodontograma ══════ */}
                    {activeTab === 'periodontogram' && (
                        <div className="space-y-6 animate-in-up duration-500 min-h-[600px]">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Periodontograma</h3>
                                <p className="text-slate-400 text-sm mt-1">Estado de salud periodontal</p>
                            </div>
                            <Periodontogram
                                data={ensurePeriodontogramData(patient.periodontogram)}
                                onUpdate={(periodontogram) => onUpdate({ ...patient, periodontogram })}
                            />
                        </div>
                    )}

                    {/* ══════ Evolución ══════ */}
                    {activeTab === 'notes' && (
                        <div className="space-y-8 animate-in-up duration-500">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Evolución</h3>
                                <p className="text-slate-400 text-sm mt-1">Bitácora de seguimiento clínico</p>
                            </div>

                            {/* Add note form */}
                            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        placeholder="Procedimiento (Ej. Resina, Extracción...)"
                                        className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                                        value={newNote.procedure}
                                        onChange={e => setNewNote(prev => ({ ...prev, procedure: e.target.value }))}
                                    />
                                    <div className="hidden md:flex items-center gap-2 px-4">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                        <span className="text-[11px] font-medium text-slate-400">Nuevo registro</span>
                                    </div>
                                </div>
                                <textarea
                                    placeholder="Describa la evolución del tratamiento en esta sesión..."
                                    className="w-full bg-white px-4 py-4 rounded-xl border border-slate-200 outline-none text-sm text-slate-700 min-h-[120px] resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                                    value={newNote.content}
                                    onChange={e => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                                />
                                <button
                                    onClick={handleAddNote}
                                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-600/15 active:scale-[0.98]"
                                >
                                    <Plus size={18} />
                                    Guardar Nota Evolutiva
                                </button>
                            </div>

                            {/* Notes timeline */}
                            <div className="space-y-4">
                                {patient.evolutionNotes.map((note, index) => (
                                    <div key={note.id} className="relative pl-8 group animate-in-up" style={{ animationDelay: `${index * 60}ms` }}>
                                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-slate-200 rounded-full" />
                                        <div className="absolute left-[-3px] top-5 w-2.5 h-2.5 bg-white border-[3px] border-slate-200 rounded-full group-hover:border-blue-500 transition-all" />
                                        <div className="bg-white p-5 rounded-xl border border-slate-100 group-hover:border-blue-100 transition-all hover:shadow-md">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    <span className="text-xs font-medium text-slate-500">{note.date}</span>
                                                </div>
                                                <span className="inline-flex px-3 py-1 bg-slate-900 text-white rounded-lg text-[11px] font-semibold w-fit">
                                                    {note.procedure}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed">{note.content}</p>
                                        </div>
                                    </div>
                                ))}
                                {patient.evolutionNotes.length === 0 && (
                                    <div className="text-center py-12 text-slate-400">
                                        <ClipboardList size={32} className="mx-auto mb-3 text-slate-200" />
                                        <p className="text-sm font-medium">Aún no hay notas de evolución</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ══════ Presupuesto y Pagos ══════ */}
                    {activeTab === 'budget' && (
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
                                    <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                                        <Plus size={16} />
                                    </div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Agregar Tratamiento</p>
                                </div>
                                {budgetError && (
                                    <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium mb-4">{budgetError}</div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                    <div className="md:col-span-5">
                                        <input
                                            placeholder="Tratamiento (Ej. Resina, Corona...)"
                                            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                                            value={newTreatment.treatment}
                                            onChange={e => { setNewTreatment(p => ({ ...p, treatment: e.target.value })); setBudgetError(''); }}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <input
                                            placeholder="Costo"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                                            value={newTreatment.unitCost}
                                            onChange={e => { setNewTreatment(p => ({ ...p, unitCost: e.target.value })); setBudgetError(''); }}
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <input
                                            placeholder="Cant."
                                            type="number"
                                            min="1"
                                            className="w-full bg-white px-3 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium text-slate-900 focus:border-blue-500 transition-all placeholder:text-slate-300 text-center"
                                            value={newTreatment.quantity}
                                            onChange={e => setNewTreatment(p => ({ ...p, quantity: e.target.value }))}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <input
                                            placeholder="Pieza #"
                                            type="number"
                                            min="1"
                                            max="32"
                                            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium text-slate-900 focus:border-blue-500 transition-all placeholder:text-slate-300"
                                            value={newTreatment.toothId}
                                            onChange={e => setNewTreatment(p => ({ ...p, toothId: e.target.value }))}
                                        />
                                    </div>
                                    <div className="md:col-span-2 flex items-stretch">
                                        <button
                                            onClick={handleAddTreatment}
                                            className="w-full py-3 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-all shadow-md shadow-blue-600/15 font-semibold text-sm active:scale-[0.98]"
                                        >
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
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                                        Tratamientos ({budgetItems.length})
                                    </p>
                                    {budgetItems.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-all group">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <button
                                                    onClick={() => handleToggleTreatmentStatus(item.id)}
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
                                                <button
                                                    onClick={() => handleDeleteTreatment(item.id)}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                                >
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
                                    <div className="w-8 h-8 bg-emerald-600 text-white rounded-xl flex items-center justify-center">
                                        <CreditCard size={16} />
                                    </div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Registrar Abono / Pago</p>
                                </div>

                                {paymentError && (
                                    <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium mb-4">{paymentError}</div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6">
                                    <div className="md:col-span-3">
                                        <input
                                            placeholder="Monto"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder:text-slate-300"
                                            value={newPayment.amount}
                                            onChange={e => { setNewPayment(p => ({ ...p, amount: e.target.value })); setPaymentError(''); }}
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <select
                                            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium text-slate-800 transition-all focus:border-emerald-500 appearance-none"
                                            value={newPayment.method}
                                            onChange={e => setNewPayment(p => ({ ...p, method: e.target.value as Payment['method'] }))}
                                        >
                                            <option value="cash">Efectivo</option>
                                            <option value="card">Tarjeta</option>
                                            <option value="transfer">Transferencia</option>
                                            <option value="other">Otro</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-4">
                                        <input
                                            placeholder="Nota (opcional)"
                                            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium text-slate-900 focus:border-emerald-500 transition-all placeholder:text-slate-300"
                                            value={newPayment.note}
                                            onChange={e => setNewPayment(p => ({ ...p, note: e.target.value }))}
                                        />
                                    </div>
                                    <div className="md:col-span-2 flex items-stretch">
                                        <button
                                            onClick={handleAddPayment}
                                            className="w-full py-3 bg-emerald-600 text-white rounded-xl flex items-center justify-center gap-1.5 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/15 font-semibold text-sm active:scale-[0.98]"
                                        >
                                            <Plus size={16} /> Aplicar
                                        </button>
                                    </div>
                                </div>

                                {/* Payments History */}
                                {payments.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                                            Historial de Pagos ({payments.length})
                                        </p>
                                        {payments.map((pay) => (
                                            <div key={pay.id} className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                                                        <CreditCard size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-800">{formatCurrency(pay.amount)}</p>
                                                        <p className="text-xs text-slate-400">
                                                            {pay.date} · {pay.method === 'cash' ? 'Efectivo' : pay.method === 'card' ? 'Tarjeta' : pay.method === 'transfer' ? 'Transferencia' : 'Otro'}
                                                            {pay.note && ` · ${pay.note}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeletePayment(pay.id)}
                                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ══════ Consentimiento ══════ */}
                    {activeTab === 'consent' && (
                        <ConsentManager
                            patient={patient}
                            onUpdate={onUpdate}
                            doctorName={doctorName}
                            clinicName={clinicName}
                        />
                    )}

                    {/* ══════ Recetas ══════ */}
                    {activeTab === 'prescriptions' && (
                        <PrescriptionManager
                            patient={patient}
                            onUpdate={onUpdate}
                            doctorName={doctorName}
                            clinicName={clinicName}
                        />
                    )}

                    {/* ══════ Agenda ══════ */}
                    {activeTab === 'citas' && (
                        <div className="space-y-8 animate-in-up duration-500">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Próximas Visitas</h3>
                                <p className="text-slate-400 text-sm mt-1">Seguimiento de citas programadas</p>
                            </div>
                            {patientAppointments.length === 0 ? (
                                <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                        <Calendar size={28} className="text-slate-300" />
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-700 mb-1">Sin citas programadas</h4>
                                    <p className="text-slate-400 text-sm max-w-xs mx-auto mb-6">No hay citas registradas para este paciente.</p>
                                    <button className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20">
                                        Ir al Calendario
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {patientAppointments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(apt => (
                                        <div key={apt.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md hover:border-blue-100 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-11 h-11 rounded-xl flex items-center justify-center",
                                                    apt.status === 'Completada' ? "bg-emerald-50 text-emerald-600" :
                                                        apt.status === 'Retrasada' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                                                )}>
                                                    <Calendar size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-slate-900 text-sm">{apt.type}</h4>
                                                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                                                        {apt.date} &middot; {apt.time}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={cn(
                                                "px-3 py-1 rounded-lg text-[11px] font-semibold",
                                                apt.status === 'Completada' ? "bg-emerald-50 text-emerald-700" :
                                                    apt.status === 'Retrasada' ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
                                            )}>
                                                {apt.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ══════ Historial Clínico ══════ */}
                    {activeTab === 'history' && (
                        <div className="space-y-8 animate-in-up duration-500">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Historial Clínico</h3>
                                <p className="text-slate-400 text-sm mt-1">Registro de tratamientos realizados</p>
                            </div>

                            {/* Quick add event */}
                            <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                                <div className="flex items-center gap-2.5 mb-4">
                                    <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                                        <Zap size={16} />
                                    </div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Registro Rápido</p>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                                    <div className="lg:col-span-5">
                                        <InputGroup
                                            label="Descripción del procedimiento"
                                            placeholder="Ej. Limpieza Dental Profunda"
                                            value={newEvent.description}
                                            onChange={val => setNewEvent(p => ({ ...p, description: val }))}
                                        />
                                    </div>
                                    <div className="lg:col-span-4 space-y-2">
                                        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 ml-1">Tipo</label>
                                        <select
                                            className="w-full bg-white px-4 py-3 rounded-xl border border-blue-100 outline-none text-sm font-medium text-slate-800 transition-all focus:border-blue-500 appearance-none"
                                            value={newEvent.type}
                                            onChange={e => setNewEvent(p => ({ ...p, type: e.target.value as any }))}
                                        >
                                            <option value="treatment">Tratamiento</option>
                                            <option value="cleaning">Limpieza</option>
                                            <option value="extraction">Extracción</option>
                                            <option value="diagnose">Diagnóstico</option>
                                        </select>
                                    </div>
                                    <div className="lg:col-span-3 flex items-end">
                                        <button
                                            onClick={handleAddEvent}
                                            className="w-full py-3 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-600/15 font-semibold text-sm active:scale-[0.98]"
                                        >
                                            <Plus size={18} />
                                            Agregar
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Events list */}
                            <div className="space-y-3">
                                {patient.history.length === 0 ? (
                                    <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                        <Activity size={28} className="mx-auto mb-3 text-slate-200" />
                                        <p className="text-slate-400 text-sm font-medium">No hay procedimientos registrados</p>
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
                    )}
                </div>
            </div>
        </div>
    );
};

const DebouncedTextarea: React.FC<{
    value: string;
    onChange: (val: string) => void;
    className?: string;
    placeholder?: string;
}> = ({ value, onChange, className, placeholder }) => {
    const [localValue, setLocalValue] = React.useState(value);
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    React.useEffect(() => { setLocalValue(value); }, [value]);
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const v = e.target.value;
        setLocalValue(v);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => onChange(v), 400);
    };
    const handleBlur = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (localValue !== value) onChange(localValue);
    };
    return <textarea className={className} placeholder={placeholder} value={localValue} onChange={handleChange} onBlur={handleBlur} />;
};

const InputGroup: React.FC<{
    label: string;
    value: string;
    onChange: (val: string) => void;
    icon?: any;
    placeholder?: string;
    type?: string;
}> = ({ label, value, onChange, icon: Icon, placeholder, type = "text" }) => {
    // Debounce: keep local state for fast typing, flush to parent after 400ms idle
    const [localValue, setLocalValue] = React.useState(value);
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync external changes (e.g. when patient switches)
    React.useEffect(() => { setLocalValue(value); }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setLocalValue(v);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => onChange(v), 400);
    };

    // Flush on blur so data is never lost
    const handleBlur = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (localValue !== value) onChange(localValue);
    };

    return (
        <div className="space-y-2 group">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 ml-1 group-focus-within:text-blue-500 transition-colors">{label}</label>
            <div className="relative">
                {Icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                        <Icon size={16} />
                    </div>
                )}
                <input
                    type={type}
                    className={cn(
                        "w-full py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all text-slate-800 placeholder:text-slate-300",
                        Icon ? "pl-11 pr-4" : "px-4"
                    )}
                    value={localValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
};

export default PatientRecord;
