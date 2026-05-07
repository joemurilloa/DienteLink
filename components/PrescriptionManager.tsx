
import React, { useState } from 'react';
import { Prescription, PrescriptionMedication, PatientRecord as PatientRecordType } from '../types';
import { cn, getLocalISODate } from '../lib/utils';
import { sileo } from 'sileo';
import jsPDF from 'jspdf';
import {
    Pill,
    Plus,
    Download,
    Trash2,
    Calendar,
    Eye,
    X,
    ClipboardList,
    Stethoscope,
    FileText,
    Loader2
} from 'lucide-react';

interface Props {
    patient: PatientRecordType;
    onUpdate: (updated: PatientRecordType) => void;
    doctorName: string;
    clinicName: string;
}

const EMPTY_MED: PrescriptionMedication = {
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: ''
};

const COMMON_MEDS: { name: string; dosage: string; frequency: string; duration: string }[] = [
    { name: 'Ibuprofeno 400mg', dosage: '1 tableta', frequency: 'Cada 8 horas', duration: '5 días' },
    { name: 'Amoxicilina 500mg', dosage: '1 cápsula', frequency: 'Cada 8 horas', duration: '7 días' },
    { name: 'Clindamicina 300mg', dosage: '1 cápsula', frequency: 'Cada 6 horas', duration: '7 días' },
    { name: 'Ketorolaco 10mg', dosage: '1 tableta', frequency: 'Cada 8 horas', duration: '3 días' },
    { name: 'Acetaminofén 500mg', dosage: '1-2 tabletas', frequency: 'Cada 6 horas', duration: '5 días' },
    { name: 'Clorhexidina 0.12%', dosage: 'Enjuague 15ml', frequency: '2 veces al día', duration: '7 días' },
    { name: 'Metronidazol 500mg', dosage: '1 tableta', frequency: 'Cada 8 horas', duration: '7 días' },
];

const PrescriptionManager: React.FC<Props> = ({ patient, onUpdate, doctorName, clinicName }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [viewingRx, setViewingRx] = useState<Prescription | null>(null);
    const [diagnosis, setDiagnosis] = useState('');
    const [notes, setNotes] = useState('');
    const [medications, setMedications] = useState<PrescriptionMedication[]>([{ ...EMPTY_MED }]);
    const [formError, setFormError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const prescriptions = patient.prescriptions || [];

    const handleAddMed = () => {
        setMedications(prev => [...prev, { ...EMPTY_MED }]);
    };

    const handleRemoveMed = (idx: number) => {
        if (medications.length <= 1) return;
        setMedications(prev => prev.filter((_, i) => i !== idx));
    };

    const handleUpdateMed = (idx: number, field: keyof PrescriptionMedication, value: string) => {
        setMedications(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
        setFormError('');
    };

    const handleQuickAdd = (med: typeof COMMON_MEDS[0]) => {
        setMedications(prev => {
            // If first slot is empty, fill it
            if (prev.length === 1 && !prev[0].name) {
                return [{ ...med, instructions: '' }];
            }
            return [...prev, { ...med, instructions: '' }];
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        setFormError('');
        if (!diagnosis.trim()) {
            setFormError('Ingresa el diagnóstico');
            return;
        }
        const validMeds = medications.filter(m => m.name.trim());
        if (validMeds.length === 0) {
            setFormError('Agrega al menos un medicamento');
            return;
        }

        const rx: Prescription = {
            id: crypto.randomUUID(),
            date: getLocalISODate(new Date()),
            diagnosis: diagnosis.trim(),
            medications: validMeds,
            notes: notes.trim(),
        };

        onUpdate({ ...patient, prescriptions: [rx, ...prescriptions] });
        setIsCreating(false);
        setDiagnosis('');
        setNotes('');
        setMedications([{ ...EMPTY_MED }]);
        sileo.success({ title: 'Receta guardada', description: `Receta con ${validMeds.length} medicamento(s) registrada` });
        setIsSaving(false);
    };

    const handleDelete = (id: string) => {
        onUpdate({ ...patient, prescriptions: prescriptions.filter(r => r.id !== id) });
    };

    const handleExportPDF = async (rx: Prescription) => {
        setIsExporting(true);
        try {
            const doc = new jsPDF() as any;
            if (!doc || !doc.internal) throw new Error("jsPDF initialization failed");

            const pageW = doc.internal.pageSize.getWidth();

            // Header banner
            doc.setFillColor(37, 99, 235);
            doc.rect(0, 0, pageW, 40, 'F');
            doc.setFontSize(20);
            doc.setTextColor(255, 255, 255);
            doc.text('RECETA MÉDICA', pageW / 2, 18, { align: 'center' });
            doc.setFontSize(10);
            doc.text(clinicName || 'DienteLink', pageW / 2, 28, { align: 'center' });
            doc.setFontSize(8);
            doc.text(`Dr(a). ${doctorName}`, pageW / 2, 35, { align: 'center' });

            // Patient info
            let y = 52;
            doc.setFontSize(10);
            doc.setTextColor(51, 65, 85);
            doc.text(`Paciente: ${patient.identification.fullName}`, 20, y);
            doc.text(`Fecha: ${rx.date}`, pageW - 20, y, { align: 'right' });
            y += 8;
            doc.text(`Diagnóstico: ${rx.diagnosis}`, 20, y);
            y += 4;
            doc.setDrawColor(226, 232, 240);
            doc.line(20, y, pageW - 20, y);
            y += 10;

            // Rx symbol
            doc.setFontSize(24);
            doc.setTextColor(37, 99, 235);
            doc.text('Rx', 20, y);
            y += 10;

            // Medications
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            rx.medications.forEach((med, i) => {
                if (y > 260) {
                    doc.addPage();
                    y = 20;
                }
                doc.setFontSize(12);
                doc.setTextColor(15, 23, 42);
                doc.text(`${i + 1}. ${med.name}`, 25, y);
                y += 6;
                doc.setFontSize(10);
                doc.setTextColor(100, 116, 139);
                if (med.dosage) { doc.text(`   Dosis: ${med.dosage}`, 30, y); y += 5; }
                if (med.frequency) { doc.text(`   Frecuencia: ${med.frequency}`, 30, y); y += 5; }
                if (med.duration) { doc.text(`   Duración: ${med.duration}`, 30, y); y += 5; }
                if (med.instructions) { doc.text(`   Indicaciones: ${med.instructions}`, 30, y); y += 5; }
                y += 4;
            });

            // Notes
            if (rx.notes) {
                y += 4;
                doc.setDrawColor(226, 232, 240);
                doc.line(20, y, pageW - 20, y);
                y += 8;
                doc.setFontSize(10);
                doc.setTextColor(100, 116, 139);
                doc.text('Notas adicionales:', 20, y);
                y += 6;
                doc.setTextColor(51, 65, 85);
                const splitNotes = doc.splitTextToSize(rx.notes, pageW - 40);
                doc.text(splitNotes, 20, y);
                y += splitNotes.length * 5;
            }

            // Footer
            y += 20;
            if (y > 250) { doc.addPage(); y = 30; }
            doc.setDrawColor(15, 23, 42);
            doc.line(pageW / 2 - 40, y, pageW / 2 + 40, y);
            y += 6;
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(`Dr(a). ${doctorName}`, pageW / 2, y, { align: 'center' });
            y += 5;
            doc.text('Firma y Sello', pageW / 2, y, { align: 'center' });

            doc.save(`Receta_${patient.identification.fullName.replace(/\s+/g, '_')}_${rx.date}.pdf`);
            sileo.success({ title: 'Receta descargada', description: 'PDF generado correctamente' });
        } catch (error) {
            console.error("Error generating PDF:", error);
            sileo.error({ title: "Error al generar PDF", description: "Ocurrió un problema, intenta de nuevo." });
        } finally {
            setIsExporting(false);
        }
    };

    // View prescription detail
    if (viewingRx) {
        return (
            <div className="space-y-6 animate-in-up duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Receta Médica</h3>
                        <p className="text-slate-400 text-sm mt-1">{viewingRx.date} · {viewingRx.diagnosis}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleExportPDF(viewingRx)}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-blue-600 transition-all disabled:opacity-50"
                        >
                            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF
                        </button>
                        <button
                            onClick={() => setViewingRx(null)}
                            className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                    <div className="flex items-center gap-2.5 mb-3">
                        <Stethoscope size={16} className="text-blue-600" />
                        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Diagnóstico</p>
                    </div>
                    <p className="text-sm text-slate-700 font-medium">{viewingRx.diagnosis}</p>
                </div>

                <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Medicamentos ({viewingRx.medications.length})
                    </p>
                    {viewingRx.medications.map((med, i) => (
                        <div key={i} className="p-4 bg-white border border-slate-100 rounded-xl">
                            <h4 className="font-semibold text-slate-900 text-sm mb-2">{i + 1}. {med.name}</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-500">
                                {med.dosage && <span><span className="font-semibold text-slate-600">Dosis:</span> {med.dosage}</span>}
                                {med.frequency && <span><span className="font-semibold text-slate-600">Frecuencia:</span> {med.frequency}</span>}
                                {med.duration && <span><span className="font-semibold text-slate-600">Duración:</span> {med.duration}</span>}
                                {med.instructions && <span className="col-span-2 md:col-span-4"><span className="font-semibold text-slate-600">Indicaciones:</span> {med.instructions}</span>}
                            </div>
                        </div>
                    ))}
                </div>

                {viewingRx.notes && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Notas</p>
                        <p className="text-sm text-slate-600">{viewingRx.notes}</p>
                    </div>
                )}
            </div>
        );
    }

    // Creating new prescription
    if (isCreating) {
        return (
            <div className="space-y-6 animate-in-up duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Nueva Receta</h3>
                        <p className="text-slate-400 text-sm mt-1">Para {patient.identification.fullName}</p>
                    </div>
                    <button
                        onClick={() => { setIsCreating(false); setFormError(''); }}
                        className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {formError && (
                    <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
                        {formError}
                    </div>
                )}

                {/* Diagnosis */}
                <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Diagnóstico <span className="text-red-400">*</span>
                    </label>
                    <input
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                        value={diagnosis}
                        onChange={e => { setDiagnosis(e.target.value); setFormError(''); }}
                        placeholder="Ej. Caries profunda en pieza 36..."
                    />
                </div>

                {/* Quick-add medications */}
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Medicamentos frecuentes</p>
                    <div className="flex gap-2 flex-wrap">
                        {COMMON_MEDS.map((med, i) => (
                            <button
                                key={i}
                                onClick={() => handleQuickAdd(med)}
                                className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[11px] font-semibold hover:bg-blue-100 transition-all border border-blue-100"
                            >
                                + {med.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Medications list */}
                <div className="space-y-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Medicamentos <span className="text-red-400">*</span>
                    </p>
                    {medications.map((med, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-blue-600">Medicamento {idx + 1}</span>
                                {medications.length > 1 && (
                                    <button
                                        onClick={() => handleRemoveMed(idx)}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                            <input
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none text-sm font-medium focus:border-blue-500 transition-all placeholder:text-slate-300"
                                value={med.name}
                                onChange={e => handleUpdateMed(idx, 'name', e.target.value)}
                                placeholder="Nombre del medicamento..."
                            />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <input
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white outline-none text-sm focus:border-blue-500 transition-all placeholder:text-slate-300"
                                    value={med.dosage}
                                    onChange={e => handleUpdateMed(idx, 'dosage', e.target.value)}
                                    placeholder="Dosis (ej. 1 tableta)"
                                />
                                <input
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white outline-none text-sm focus:border-blue-500 transition-all placeholder:text-slate-300"
                                    value={med.frequency}
                                    onChange={e => handleUpdateMed(idx, 'frequency', e.target.value)}
                                    placeholder="Frecuencia (ej. c/8 hrs)"
                                />
                                <input
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white outline-none text-sm focus:border-blue-500 transition-all placeholder:text-slate-300"
                                    value={med.duration}
                                    onChange={e => handleUpdateMed(idx, 'duration', e.target.value)}
                                    placeholder="Duración (ej. 7 días)"
                                />
                            </div>
                            <input
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white outline-none text-sm focus:border-blue-500 transition-all placeholder:text-slate-300"
                                value={med.instructions}
                                onChange={e => handleUpdateMed(idx, 'instructions', e.target.value)}
                                placeholder="Indicaciones especiales (ej. Tomar después de comer)..."
                            />
                        </div>
                    ))}

                    <button
                        onClick={handleAddMed}
                        className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-semibold hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={14} /> Agregar otro medicamento
                    </button>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Notas adicionales</label>
                    <textarea
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none text-sm text-slate-700 resize-none min-h-[80px] focus:border-blue-500 transition-all"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Indicaciones generales, dieta, cuidados post..."
                    />
                </div>

                {/* Save */}
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-600/15 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} 
                    {isSaving ? 'Guardando...' : 'Guardar Receta'}
                </button>
            </div>
        );
    }

    // List view
    return (
        <div className="space-y-8 animate-in-up duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Recetas Médicas</h3>
                    <p className="text-slate-400 text-sm mt-1">Prescripciones dentales del paciente</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-600/15 active:scale-95"
                >
                    <Plus size={16} /> Nueva Receta
                </button>
            </div>

            {prescriptions.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <Pill size={32} className="mx-auto mb-3 text-slate-200" />
                    <h4 className="text-lg font-bold text-slate-700 mb-1">Sin recetas emitidas</h4>
                    <p className="text-slate-400 text-sm max-w-xs mx-auto">
                        Crea una receta médica con plantilla profesional para este paciente.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {prescriptions.map((rx, index) => (
                        <div key={rx.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md hover:border-blue-100 transition-all group animate-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                    <Pill size={20} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900 text-sm">{rx.diagnosis}</h4>
                                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                                        <Calendar size={10} />
                                        {rx.date} · {rx.medications.length} medicamento{rx.medications.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setViewingRx(rx)}
                                    className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                    title="Ver"
                                >
                                    <Eye size={16} />
                                </button>
                                <button
                                    onClick={() => handleExportPDF(rx)}
                                    className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                                    title="Descargar PDF"
                                >
                                    <Download size={14} />
                                </button>
                                <button
                                    onClick={() => handleDelete(rx.id)}
                                    className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                    title="Eliminar"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PrescriptionManager;
