import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { PatientRecord as PatientRecordType, EvolutionNote, ClinicalEvent, Appointment } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { persistenceService } from '../services/persistenceService';
import {
    User,
    History,
    ClipboardList,
    ShieldCheck,
    Image as ImageIcon,
    Plus,
    Activity,
    DollarSign,
    Zap,
    LayoutGrid,
    BarChart3,
    Receipt,
    X,
    Maximize2,
    Download,
    Calendar
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Odontogram from './Odontogram';
import Periodontogram from './Periodontogram';
import BudgetPlanner from './BudgetPlanner';
import XRayViewer from './XRayViewer';

interface Props {
    patient: PatientRecordType;
    onUpdate: (updatedPatient: PatientRecordType) => void;
}

const PatientRecord: React.FC<Props> = ({ patient, onUpdate }) => {
    const [searchParams] = useSearchParams();
    const initialTab = (searchParams.get('tab') as any) || 'id';
    const [activeTab, setActiveTab] = useState<'id' | 'anamnesis' | 'odontogram' | 'periodontogram' | 'budget' | 'notes' | 'history' | 'consent' | 'docs'>(initialTab);
    const [newNote, setNewNote] = useState({ content: '', procedure: '' });
    const [newEvent, setNewEvent] = useState({ description: '', cost: 0, type: 'treatment' as ClinicalEvent['type'] });
    const [isFocusMode, setIsFocusMode] = useState(false);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab as any);
    }, [searchParams]);

    const tabs = [
        { id: 'id', label: 'Ficha', icon: User },
        { id: 'anamnesis', label: 'Anamnesis', icon: History },
        { id: 'odontogram', label: 'Odontograma', icon: LayoutGrid },
        { id: 'periodontogram', label: 'Periodonto', icon: BarChart3 },
        { id: 'budget', label: 'Presupuesto', icon: Receipt },
        { id: 'notes', label: 'Evolución', icon: ClipboardList },
        { id: 'citas', label: 'Citas', icon: Calendar },
        { id: 'history', label: 'Historial', icon: Activity },
    ];

    const patientAppointments = persistenceService.getAppointments().filter(
        apt => apt.patientName.toLowerCase() === patient.identification.fullName.toLowerCase()
    );

    const handleAddNote = () => {
        if (!newNote.content || !newNote.procedure) return;
        const note: EvolutionNote = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString().split('T')[0],
            content: newNote.content,
            procedure: newNote.procedure
        };
        onUpdate({ ...patient, evolutionNotes: [note, ...patient.evolutionNotes] });
        setNewNote({ content: '', procedure: '' });
    };

    const handleAddEvent = () => {
        if (!newEvent.description) return;
        const event: ClinicalEvent = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString().split('T')[0],
            ...newEvent
        };
        onUpdate({
            ...patient,
            history: [event, ...patient.history],
            balance: patient.balance + event.cost
        });
        setNewEvent({ description: '', cost: 0, type: 'treatment' });
    };

    const handleExportPDF = () => {
        const doc = new jsPDF() as any;

        // Header
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text("Resumen Clínico - DienteLink", 20, 20);

        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(`Expediente #${patient.id} | Fecha: ${new Date().toLocaleDateString()}`, 20, 28);

        // Patient Info
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text("Datos del Paciente", 20, 45);

        doc.setFontSize(10);
        doc.text(`Nombre: ${patient.identification.fullName}`, 20, 55);
        doc.text(`Fecha de Nacimiento: ${patient.identification.birthDate}`, 20, 60);
        doc.text(`Teléfono: ${patient.identification.phone}`, 20, 65);
        doc.text(`Email: ${patient.identification.email}`, 20, 70);

        // Clinical History
        doc.setFontSize(14);
        doc.text("Historial Clínico", 20, 85);
        doc.setFontSize(10);
        doc.text(`Alergias: ${patient.clinicalHistory.allergies.join(', ') || 'Ninguna'}`, 20, 95);
        doc.text(`Medicamentos: ${patient.clinicalHistory.medications || 'Ninguno'}`, 20, 100);
        doc.text(`Enfermedades: ${patient.clinicalHistory.previousDiseases || 'Ninguna'}`, 20, 105);

        // History Table
        doc.setFontSize(14);
        doc.text("Tratamientos Realizados", 20, 120);

        const historyData = patient.history.map(e => [e.date, e.description, formatCurrency(e.cost)]);
        doc.autoTable({
            startY: 125,
            head: [['Fecha', 'Descripción', 'Costo']],
            body: historyData,
            theme: 'striped',
            headStyles: { fillStyle: [59, 130, 246] } // blue-600
        });

        // Summary
        const finalY = (doc as any).lastAutoTable.cursor.y + 10;
        doc.setFontSize(16);
        doc.text(`Balance Total: ${formatCurrency(patient.balance)}`, 140, finalY);

        doc.save(`Expediente_${patient.identification.fullName.replace(/\s+/g, '_')}.pdf`);
    };

    const isClinicalTab = ['odontogram', 'periodontogram', 'budget'].includes(activeTab);

    const renderClinicalContent = () => {
        switch (activeTab) {
            case 'odontogram': return (
                <Odontogram
                    patientId={patient.id}
                    teeth={patient.odontogram || []}
                    onUpdate={(teeth) => onUpdate({ ...patient, odontogram: teeth })}
                />
            );
            case 'periodontogram': return (
                <Periodontogram
                    depths={patient.periodontogram || new Array(32).fill(1)}
                    onUpdate={(depths) => onUpdate({ ...patient, periodontogram: depths })}
                />
            );
            case 'budget': return (
                <BudgetPlanner
                    budget={patient.budget || []}
                    onUpdate={(budget) => onUpdate({ ...patient, budget })}
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
                <h3 className="text-4xl font-black text-slate-900 tracking-tighter mb-12 text-center lg:text-left">
                    {activeTab === 'odontogram' ? 'Odontograma' : activeTab === 'periodontogram' ? 'Periodontograma' : 'Plan de Tratamiento'}
                </h3>
                {renderClinicalContent()}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-full overflow-hidden">
            {/* Si estamos en modo enfoque, usamos el Portal para salir de todos los contenedores */}
            {isFocusMode && createPortal(FocusModeContent, document.body)}

            {/* Sidebar de Secciones */}
            <div className={cn(
                "lg:w-72 flex flex-row lg:flex-col overflow-x-auto lg:overflow-y-auto gap-2 pb-4 lg:pb-0 scrollbar-none transition-all duration-500",
                isFocusMode ? "lg:w-0 opacity-0 pointer-events-none -ml-8 overflow-hidden" : "opacity-100"
            )}>
                <div className="mb-6 p-6 bg-slate-900 rounded-[32px] text-white hidden lg:block">
                    <p className="text-[10px] font-black uppercase tracking-[2px] mb-2 opacity-60">Balance Total</p>
                    <h4 className="text-2xl font-black tracking-tighter">{formatCurrency(patient.balance)}</h4>
                </div>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all whitespace-nowrap min-w-max",
                            activeTab === tab.id
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                                : "bg-white text-slate-400 hover:text-slate-900 border border-slate-100"
                        )}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Área de Contenido */}
            <div className="flex-1 bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-y-auto p-4 lg:p-8 relative scrollbar-none flex flex-col">
                {/* Botón de Modo Enfoque (Full Screen) */}
                {isClinicalTab && (
                    <button
                        onClick={() => setIsFocusMode(true)}
                        className="absolute top-6 right-6 lg:top-8 lg:right-8 z-10 w-12 h-12 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 flex items-center justify-center transition-all active:scale-95"
                        title="Ver en Pantalla Completa"
                    >
                        <Maximize2 size={24} />
                    </button>
                )}
                {activeTab === 'id' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Ficha de Identificación</h3>
                            <button
                                onClick={handleExportPDF}
                                className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all shadow-xl shadow-slate-200"
                            >
                                <Download size={14} /> Exportar PDF
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputGroup
                                label="Nombre Completo"
                                value={patient.identification.fullName}
                                onChange={(val) => onUpdate({ ...patient, identification: { ...patient.identification, fullName: val } })}
                            />
                            <InputGroup
                                label="Fecha de Nacimiento"
                                value={patient.identification.birthDate}
                                onChange={(val) => onUpdate({ ...patient, identification: { ...patient.identification, birthDate: val } })}
                            />
                            <InputGroup
                                label="Género"
                                value={patient.identification.gender}
                                onChange={(val) => onUpdate({ ...patient, identification: { ...patient.identification, gender: val } })}
                            />
                            <InputGroup
                                label="Ocupación"
                                value={patient.identification.occupation}
                                onChange={(val) => onUpdate({ ...patient, identification: { ...patient.identification, occupation: val } })}
                            />
                            <InputGroup
                                label="Teléfono"
                                value={patient.identification.phone}
                                onChange={(val) => onUpdate({ ...patient, identification: { ...patient.identification, phone: val } })}
                            />
                            <InputGroup
                                label="Email"
                                value={patient.identification.email}
                                onChange={(val) => onUpdate({ ...patient, identification: { ...patient.identification, email: val } })}
                            />
                            <div className="md:col-span-2">
                                <InputGroup
                                    label="Dirección"
                                    value={patient.identification.address}
                                    onChange={(val) => onUpdate({ ...patient, identification: { ...patient.identification, address: val } })}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'anamnesis' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Anamnesis & Antecedentes</h3>
                        <div className="space-y-6">
                            <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                                <label className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-2 block">Alergias</label>
                                <div className="flex flex-wrap gap-2">
                                    {patient.clinicalHistory.allergies.map(a => (
                                        <span key={a} className="px-3 py-1 bg-white text-red-600 rounded-full text-xs font-bold shadow-sm">{a}</span>
                                    ))}
                                </div>
                            </div>
                            <InputGroup
                                label="Medicamentos actuales"
                                value={patient.clinicalHistory.medications}
                                onChange={(val) => onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, medications: val } })}
                            />
                            <InputGroup
                                label="Enfermedades previas"
                                value={patient.clinicalHistory.previousDiseases}
                                onChange={(val) => onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, previousDiseases: val } })}
                            />
                            <InputGroup
                                label="Antecedentes familiares"
                                value={patient.clinicalHistory.familyHistory}
                                onChange={(val) => onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, familyHistory: val } })}
                            />
                            <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                                <label className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2 block">Motivo de Consulta</label>
                                <textarea
                                    className="w-full bg-transparent outline-none text-slate-700 font-medium leading-relaxed resize-none h-24"
                                    value={patient.clinicalHistory.motiveOfConsult}
                                    onChange={(e) => onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, motiveOfConsult: e.target.value } })}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'odontogram' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 min-h-[600px]">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Odontograma</h3>
                        <Odontogram
                            patientId={patient.id}
                            teeth={patient.odontogram || []}
                            onUpdate={(teeth) => onUpdate({ ...patient, odontogram: teeth })}
                        />
                    </div>
                )}

                {activeTab === 'periodontogram' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 min-h-[600px]">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Periodontograma</h3>
                        <Periodontogram
                            depths={patient.periodontogram || new Array(32).fill(1)}
                            onUpdate={(depths) => onUpdate({ ...patient, periodontogram: depths })}
                        />
                    </div>
                )}

                {activeTab === 'budget' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 min-h-[600px]">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Plan de Tratamiento</h3>
                        <BudgetPlanner
                            budget={patient.budget || []}
                            onUpdate={(budget) => onUpdate({ ...patient, budget })}
                        />
                    </div>
                )}

                {activeTab === 'notes' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Notas de Evolución</h3>
                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-[32px] space-y-4">
                            <input
                                placeholder="Procedimiento..."
                                className="w-full bg-white px-6 py-3 rounded-2xl border border-slate-200 outline-none text-sm font-bold"
                                value={newNote.procedure}
                                onChange={e => setNewNote(prev => ({ ...prev, procedure: e.target.value }))}
                            />
                            <textarea
                                placeholder="Evolución clínica..."
                                className="w-full bg-white px-6 py-4 rounded-2xl border border-slate-200 outline-none text-sm font-medium h-32"
                                value={newNote.content}
                                onChange={e => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                            />
                            <button onClick={handleAddNote} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-blue-700">
                                <Plus size={16} /> Guardar Nota
                            </button>
                        </div>
                        <div className="space-y-6">
                            {patient.evolutionNotes.map(note => (
                                <div key={note.id} className="relative pl-8 border-l-2 border-slate-100 py-2">
                                    <div className="absolute left-[-5px] top-6 w-2 h-2 bg-blue-600 rounded-full" />
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{note.date}</span>
                                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">{note.procedure}</span>
                                    </div>
                                    <p className="text-slate-600 font-medium leading-relaxed">{note.content}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'citas' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Historial de Citas</h3>
                        {patientAppointments.length === 0 ? (
                            <div className="p-12 text-center bg-slate-50 rounded-[32px] border border-slate-100">
                                <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                                <p className="text-slate-400 font-medium">No hay citas registradas</p>
                                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">
                                    Agenda una cita desde el Calendario
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {patientAppointments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(apt => (
                                    <div key={apt.id} className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-3xl hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center",
                                                apt.status === 'Completed' ? "bg-emerald-50 text-emerald-600" :
                                                    apt.status === 'Delayed' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                                            )}>
                                                <Calendar size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900">{apt.type}</h4>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    {apt.date} - {apt.time}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                            apt.status === 'Completed' ? "bg-emerald-100 text-emerald-700" :
                                                apt.status === 'Delayed' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                                        )}>
                                            {apt.status === 'Completed' ? 'Completada' : apt.status === 'Delayed' ? 'Retrasada' : 'Agendada'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Historial de Tratamientos</h3>
                            <div className="lg:hidden p-4 bg-slate-900 rounded-2xl text-white">
                                <span className="text-xs font-black uppercase tracking-widest opacity-60">Balance: </span>
                                <span className="font-black">{formatCurrency(patient.balance)}</span>
                            </div>
                        </div>

                        {/* Agregar Evento Rápido */}
                        <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-[32px] grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <input
                                    placeholder="Descripción del procedimiento..."
                                    className="w-full bg-white px-6 py-3 rounded-xl border border-blue-100 outline-none text-sm font-bold"
                                    value={newEvent.description}
                                    onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
                                />
                            </div>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input
                                    type="number"
                                    placeholder="Costo"
                                    className="w-full bg-white pl-10 pr-6 py-3 rounded-xl border border-blue-100 outline-none text-sm font-bold"
                                    value={newEvent.cost || ''}
                                    onChange={e => setNewEvent(p => ({ ...p, cost: Number(e.target.value) }))}
                                />
                            </div>
                            <select
                                className="w-full bg-white px-6 py-3 rounded-xl border border-blue-100 outline-none text-sm font-bold"
                                value={newEvent.type}
                                onChange={e => setNewEvent(p => ({ ...p, type: e.target.value as any }))}
                            >
                                <option value="treatment">Tratamiento</option>
                                <option value="cleaning">Limpieza</option>
                                <option value="extraction">Extracción</option>
                                <option value="diagnose">Diagnóstico</option>
                            </select>
                            <button
                                onClick={handleAddEvent}
                                className="md:col-span-2 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-blue-700"
                            >
                                <Zap size={14} /> Registrar en Historial y Actualizar Balance
                            </button>
                        </div>

                        <div className="space-y-4">
                            {patient.history.map(event => (
                                <div key={event.id} className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-3xl hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center",
                                            event.type === 'treatment' ? "bg-blue-50 text-blue-600" :
                                                event.type === 'extraction' ? "bg-red-50 text-red-600" :
                                                    event.type === 'cleaning' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                        )}>
                                            <Activity size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900">{event.description}</h4>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{event.date}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 text-slate-900 font-black">
                                            <DollarSign size={14} className="text-slate-400" />
                                            {event.cost}
                                        </div>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">Costo Ref</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const InputGroup: React.FC<{ label: string; value: string; onChange: (val: string) => void }> = ({ label, value, onChange }) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{label}</label>
        <input
            className={cn(
                "w-full px-6 py-4 rounded-2xl border text-sm font-bold transition-all bg-white border-slate-200 text-slate-900 outline-none focus:border-blue-500 focus:shadow-lg focus:shadow-blue-50"
            )}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    </div>
);

export default PatientRecord;
