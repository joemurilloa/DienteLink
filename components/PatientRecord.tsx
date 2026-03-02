
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { PatientRecord as PatientRecordType, EvolutionNote, ClinicalEvent } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { persistenceService } from '../services/persistenceService';
import {
    User,
    History,
    ClipboardList,
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
    Calendar,
    Briefcase,
    Mail,
    Phone,
    MapPin,
    ChevronRight,
    ArrowRight
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Odontogram from './Odontogram';
import Periodontogram from './Periodontogram';
import BudgetPlanner from './BudgetPlanner';

interface Props {
    patient: PatientRecordType;
    onUpdate: (updatedPatient: PatientRecordType) => void;
}

const PatientRecord: React.FC<Props> = ({ patient, onUpdate }) => {
    const [searchParams] = useSearchParams();
    const initialTab = (searchParams.get('tab') as any) || 'id';
    const [activeTab, setActiveTab] = useState<'id' | 'anamnesis' | 'odontogram' | 'periodontogram' | 'budget' | 'notes' | 'citas' | 'history'>(initialTab);
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
        { id: 'citas', label: 'Agenda', icon: Calendar },
        { id: 'history', label: 'Balance', icon: Activity },
    ];

    const patientAppointments = persistenceService.getAppointments().filter(
        apt => apt.patientId === patient.id || apt.patientName.toLowerCase().trim() === patient.identification.fullName.toLowerCase().trim()
    );

    const handleAddNote = () => {
        if (!newNote.content || !newNote.procedure) return;
        const note: EvolutionNote = {
            id: crypto.randomUUID(),
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
            id: crypto.randomUUID(),
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
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42);
        doc.text("Resumen Clínico - DienteLink", 20, 20);
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        doc.text(`Expediente #${patient.id} | Fecha: ${new Date().toLocaleDateString()}`, 20, 28);
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text("Datos del Paciente", 20, 45);
        doc.setFontSize(10);
        doc.text(`Nombre: ${patient.identification.fullName}`, 20, 55);
        doc.text(`Fecha de Nacimiento: ${patient.identification.birthDate}`, 20, 60);
        doc.text(`Teléfono: ${patient.identification.phone}`, 20, 65);
        doc.text(`Email: ${patient.identification.email}`, 20, 70);
        doc.setFontSize(14);
        doc.text("Historial Clínico", 20, 85);
        doc.setFontSize(10);
        doc.text(`Alergias: ${patient.clinicalHistory.allergies.join(', ') || 'Ninguna'}`, 20, 95);
        doc.text(`Medicamentos: ${patient.clinicalHistory.medications || 'Ninguno'}`, 20, 100);
        doc.text(`Enfermedades: ${patient.clinicalHistory.previousDiseases || 'Ninguna'}`, 20, 105);
        doc.setFontSize(14);
        doc.text("Tratamientos Realizados", 20, 120);
        const historyData = patient.history.map(e => [e.date, e.description, formatCurrency(e.cost)]);
        doc.autoTable({
            startY: 125,
            head: [['Fecha', 'Descripción', 'Costo']],
            body: historyData,
            theme: 'striped',
            headStyles: { fillStyle: [59, 130, 246] }
        });
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
                <h3 className="text-4xl font-black text-slate-900 tracking-tighter mb-12 text-center lg:text-left italic">
                    {activeTab === 'odontogram' ? 'Odontograma' : activeTab === 'periodontogram' ? 'Periodontograma' : 'Plan de Tratamiento'}
                </h3>
                {renderClinicalContent()}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col lg:flex-row gap-10 h-full overflow-hidden animate-in fade-in duration-700 pb-20 lg:pb-0">
            {isFocusMode && createPortal(FocusModeContent, document.body)}

            <div className={cn(
                "lg:w-80 flex flex-row lg:flex-col overflow-x-auto lg:overflow-y-auto gap-3 pb-4 lg:pb-0 hide-scrollbar transition-all duration-700",
                isFocusMode ? "lg:w-0 opacity-0 pointer-events-none -ml-8 overflow-hidden" : "opacity-100"
            )}>
                <div className="mb-8 p-8 bg-slate-900 rounded-[48px] text-white hidden lg:block shadow-2xl shadow-slate-900/40 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-colors"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[3px] mb-3 opacity-50">Saldo Pendiente</p>
                        <h4 className="text-4xl font-black tracking-tighter italic leading-none">{formatCurrency(patient.balance)}</h4>
                        <div className="mt-6 flex items-center gap-2">
                            <div className="px-2 py-1 bg-white/10 rounded-lg text-[9px] font-black uppercase tracking-[1.5px]">Expediente #{patient.id}</div>
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></div>
                        </div>
                    </div>
                </div>

                <nav className="flex flex-row lg:flex-col gap-2.5">
                    {tabs.map((tab, index) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "flex items-center gap-4 px-7 py-4 rounded-[24px] font-black text-xs uppercase tracking-[2px] transition-all whitespace-nowrap min-w-max animate-in-up duration-300",
                                activeTab === tab.id
                                    ? "bg-white text-blue-600 shadow-xl shadow-slate-200/50 translate-x-1"
                                    : "text-slate-400 hover:text-slate-900 hover:bg-white/50"
                            )}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className={cn(
                                "w-2 h-2 rounded-full transition-all duration-500",
                                activeTab === tab.id ? "bg-blue-600 scale-100" : "bg-slate-200 scale-0"
                            )}></div>
                            <tab.icon size={18} strokeWidth={activeTab === tab.id ? 3 : 2} />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex-1 bg-white/60 backdrop-blur-xl rounded-[48px] border border-white shadow-2xl shadow-slate-200/50 overflow-hidden relative flex flex-col transition-all duration-500">
                <div className="flex-1 overflow-y-auto hide-scrollbar p-6 lg:p-12">
                    {isClinicalTab && (
                        <button
                            onClick={() => setIsFocusMode(true)}
                            className="absolute top-10 right-10 z-10 w-16 h-16 bg-blue-600 text-white rounded-[24px] hover:bg-blue-700 shadow-2xl shadow-blue-500/30 flex items-center justify-center transition-all active:scale-95 group overflow-hidden"
                            title="Ver en Pantalla Completa"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                            <Maximize2 size={24} className="relative z-10" />
                        </button>
                    )}

                    {activeTab === 'id' && (
                        <div className="space-y-12 animate-in-up duration-700">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div>
                                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">Ficha Maestra</h3>
                                    <p className="text-slate-400 font-bold text-sm mt-3 uppercase tracking-widest">Información personal y contacto</p>
                                </div>
                                <button
                                    onClick={handleExportPDF}
                                    className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-[2.5px] text-[11px] hover:bg-blue-600 transition-all shadow-2xl shadow-slate-900/20 active:scale-95 group"
                                >
                                    <Download size={18} className="group-hover:-translate-y-1 transition-transform" />
                                    Generar Reporte PDF
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[2px] text-slate-400 ml-2">Género</label>
                                    <div className="flex gap-2 p-1.5 bg-slate-50/50 rounded-[22px] border border-slate-100">
                                        {['Masculino', 'Femenino', 'Otro'].map(g => (
                                            <button
                                                key={g}
                                                type="button"
                                                onClick={() => onUpdate({ ...patient, identification: { ...patient.identification, gender: g as any } })}
                                                className={cn(
                                                    "flex-1 py-3 rounded-[14px] text-[10px] font-black transition-all uppercase tracking-widest",
                                                    patient.identification.gender === g
                                                        ? "bg-white text-blue-600 shadow-sm border border-slate-100"
                                                        : "text-slate-400 hover:text-slate-600"
                                                )}
                                            >
                                                {g.slice(0, 3)}
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

                    {activeTab === 'anamnesis' && (
                        <div className="space-y-12 animate-in-up duration-700">
                            <div>
                                <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">Anamnesis</h3>
                                <p className="text-slate-400 font-bold text-sm mt-3 uppercase tracking-widest">Antecedentes clínicos y médicos</p>
                            </div>
                            <div className="space-y-8">
                                <div className="p-8 bg-red-50 rounded-[32px] border border-red-100 shadow-inner group">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
                                            <Activity size={20} />
                                        </div>
                                        <label className="text-[10px] font-black uppercase tracking-[2px] text-red-600">Alergias Conocidas</label>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {patient.clinicalHistory.allergies.map(a => (
                                            <span key={a} className="px-5 py-2 bg-white text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-red-100">{a}</span>
                                        ))}
                                        {patient.clinicalHistory.allergies.length === 0 && <span className="text-red-300 font-bold text-xs italic">Ninguna alergia registrada</span>}
                                        <button className="px-5 py-2 bg-red-600/10 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">Editar Alergias</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <InputGroup
                                        label="Medicamentos actuales"
                                        icon={Zap}
                                        value={patient.clinicalHistory.medications}
                                        onChange={(val) => onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, medications: val } })}
                                    />
                                    <InputGroup
                                        label="Enfermedades previas"
                                        icon={Activity}
                                        value={patient.clinicalHistory.previousDiseases}
                                        onChange={(val) => onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, previousDiseases: val } })}
                                    />
                                    <div className="md:col-span-2">
                                        <InputGroup
                                            label="Antecedentes familiares"
                                            icon={User}
                                            value={patient.clinicalHistory.familyHistory}
                                            onChange={(val) => onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, familyHistory: val } })}
                                        />
                                    </div>
                                </div>
                                <div className="p-8 bg-blue-50/50 rounded-[40px] border border-blue-100 shadow-inner group">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                                            <ClipboardList size={20} />
                                        </div>
                                        <label className="text-[10px] font-black uppercase tracking-[2px] text-blue-600">Motivo de Consulta Principal</label>
                                    </div>
                                    <textarea
                                        className="w-full bg-white px-8 py-6 rounded-[28px] border border-blue-100 outline-none text-slate-700 font-bold leading-relaxed resize-none h-40 shadow-sm focus:border-blue-500 transition-all placeholder:text-blue-200"
                                        placeholder="Describa el motivo por el cual el paciente asiste a consulta..."
                                        value={patient.clinicalHistory.motiveOfConsult}
                                        onChange={(e) => onUpdate({ ...patient, clinicalHistory: { ...patient.clinicalHistory, motiveOfConsult: e.target.value } })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'odontogram' && (
                        <div className="space-y-12 animate-in-up duration-700 min-h-[600px]">
                            <div>
                                <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">Odontograma</h3>
                                <p className="text-slate-400 font-bold text-sm mt-3 uppercase tracking-widest">Mapa dental interactivo</p>
                            </div>
                            <Odontogram
                                patientId={patient.id}
                                teeth={patient.odontogram || []}
                                onUpdate={(teeth) => onUpdate({ ...patient, odontogram: teeth })}
                            />
                        </div>
                    )}

                    {activeTab === 'periodontogram' && (
                        <div className="space-y-12 animate-in-up duration-700 min-h-[600px]">
                            <div>
                                <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">Periodontograma</h3>
                                <p className="text-slate-400 font-bold text-sm mt-3 uppercase tracking-widest">Estado de salud periodontal</p>
                            </div>
                            <Periodontogram
                                depths={patient.periodontogram || new Array(32).fill(1)}
                                onUpdate={(depths) => onUpdate({ ...patient, periodontogram: depths })}
                            />
                        </div>
                    )}

                    {activeTab === 'budget' && (
                        <div className="space-y-12 animate-in-up duration-700 min-h-[600px]">
                            <div>
                                <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">Presupuesto</h3>
                                <p className="text-slate-400 font-bold text-sm mt-3 uppercase tracking-widest">Plan de tratamiento y costos</p>
                            </div>
                            <BudgetPlanner
                                budget={patient.budget || []}
                                onUpdate={(budget) => onUpdate({ ...patient, budget })}
                            />
                        </div>
                    )}

                    {activeTab === 'notes' && (
                        <div className="space-y-12 animate-in-up duration-700">
                            <div>
                                <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">Evolución</h3>
                                <p className="text-slate-400 font-bold text-sm mt-3 uppercase tracking-widest">Bitácora de seguimiento clínico</p>
                            </div>
                            <div className="p-10 bg-slate-50 border border-slate-100 rounded-[48px] space-y-6 shadow-inner">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        placeholder="Procedimiento (Ej. Resina, Extracción...)"
                                        className="w-full bg-white px-8 py-4 rounded-[22px] border border-slate-200 outline-none text-sm font-black text-slate-900 focus:border-blue-500 transition-all placeholder:text-slate-300 shadow-sm"
                                        value={newNote.procedure}
                                        onChange={e => setNewNote(prev => ({ ...prev, procedure: e.target.value }))}
                                    />
                                    <div className="hidden md:flex items-center gap-2 px-6">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Modo de registro activo</span>
                                    </div>
                                </div>
                                <textarea
                                    placeholder="Describa la evolución del tratamiento en esta sesión..."
                                    className="w-full bg-white px-8 py-6 rounded-[28px] border border-slate-200 outline-none text-sm font-bold text-slate-700 min-h-[160px] resize-none focus:border-blue-500 transition-all placeholder:text-slate-300 shadow-sm"
                                    value={newNote.content}
                                    onChange={e => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                                />
                                <button
                                    onClick={handleAddNote}
                                    className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-[3px] text-[11px] flex items-center justify-center gap-3 hover:bg-blue-600 transition-all shadow-2xl shadow-slate-900/10 active:scale-95 group"
                                >
                                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                                    Guardar Nota Evolutiva
                                </button>
                            </div>
                            <div className="space-y-8 mt-12">
                                {patient.evolutionNotes.map((note, index) => (
                                    <div key={note.id} className="relative pl-12 group animate-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-100 rounded-full" />
                                        <div className="absolute left-[-6px] top-6 w-4 h-4 bg-white border-4 border-slate-100 rounded-full group-hover:border-blue-500 transition-all group-hover:scale-125" />
                                        <div className="bg-white p-8 rounded-[36px] border border-slate-50 group-hover:border-blue-100 transition-all hover:shadow-2xl hover:shadow-slate-200/50">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                                        <Calendar size={16} />
                                                    </div>
                                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">{note.date}</span>
                                                </div>
                                                <div className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/10">
                                                    {note.procedure}
                                                </div>
                                            </div>
                                            <p className="text-slate-600 font-bold leading-relaxed">{note.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'citas' && (
                        <div className="space-y-12 animate-in-up duration-700">
                            <div>
                                <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">Próximas Visitas</h3>
                                <p className="text-slate-400 font-bold text-sm mt-3 uppercase tracking-widest">Seguimiento de citas programadas</p>
                            </div>
                            {patientAppointments.length === 0 ? (
                                <div className="p-20 text-center bg-slate-50/50 rounded-[64px] border-4 border-dashed border-slate-100">
                                    <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-slate-200/50">
                                        <Calendar size={40} className="text-slate-200" />
                                    </div>
                                    <h4 className="text-2xl font-black text-slate-900 mb-2 italic tracking-tighter leading-none">Sin actividad programada</h4>
                                    <p className="text-slate-400 font-bold max-w-sm mx-auto leading-relaxed">No hay citas registradas para este paciente. Agende una nueva visita desde el calendario general.</p>
                                    <button className="mt-10 px-8 py-4 bg-slate-900 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all">Ir al Calendario →</button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {patientAppointments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(apt => (
                                        <div key={apt.id} className="flex items-center justify-between p-8 bg-white border border-slate-50 rounded-[40px] hover:shadow-2xl hover:shadow-slate-200/50 transition-all group hover:border-blue-100">
                                            <div className="flex items-center gap-6">
                                                <div className={cn(
                                                    "w-16 h-16 rounded-[24px] flex items-center justify-center shadow-inner group-hover:rotate-6 transition-all duration-500",
                                                    apt.status === 'Completada' ? "bg-emerald-50 text-emerald-600" :
                                                        apt.status === 'Retrasada' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                                                )}>
                                                    <Calendar size={28} strokeWidth={2.5} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-xl text-slate-900 leading-none mb-2 italic tracking-tight uppercase">{apt.type}</h4>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                        <Zap size={10} className="text-blue-500" />
                                                        {apt.date} • {apt.time}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={cn(
                                                "px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm",
                                                apt.status === 'Completada' ? "bg-emerald-100 text-emerald-700" :
                                                    apt.status === 'Retrasada' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                                            )}>
                                                {apt.status === 'Completada' ? 'Exitosa' : apt.status === 'Retrasada' ? 'Retraso' : 'Activa'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-12 animate-in-up duration-700">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">Balance Clínico</h3>
                                    <p className="text-slate-400 font-bold text-sm mt-3 uppercase tracking-widest">Estado de cuenta y tratamientos</p>
                                </div>
                                <div className="hidden lg:flex flex-col items-end">
                                    <span className="text-[10px] font-black uppercase tracking-[3px] text-slate-300">Total Acumulado</span>
                                    <span className="text-3xl font-black text-slate-900 italic tracking-tighter">{formatCurrency(patient.balance)}</span>
                                </div>
                            </div>

                            <div className="glass-panel p-10 rounded-[48px] bg-blue-600/5 border-blue-100/30 grid grid-cols-1 lg:grid-cols-12 gap-8 shadow-2xl shadow-blue-500/5">
                                <div className="lg:col-span-12">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                                            <Zap size={16} />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-[2px] text-blue-600">Registro Rápido de Servicio</p>
                                    </div>
                                </div>
                                <div className="lg:col-span-5">
                                    <InputGroup
                                        label="Descripción del procedimiento"
                                        icon={Receipt}
                                        placeholder="Ej. Limpieza Dental Profunda"
                                        value={newEvent.description}
                                        onChange={val => setNewEvent(p => ({ ...p, description: val }))}
                                    />
                                </div>
                                <div className="lg:col-span-3">
                                    <InputGroup
                                        label="Costo del Servicio"
                                        icon={DollarSign}
                                        type="number"
                                        placeholder="0.00"
                                        value={newEvent.cost ? newEvent.cost.toString() : ""}
                                        onChange={val => setNewEvent(p => ({ ...p, cost: Number(val) }))}
                                    />
                                </div>
                                <div className="lg:col-span-4 space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[2.5px] text-slate-400 ml-2 italic">Tipo de Cargo</label>
                                    <div className="flex gap-2">
                                        <select
                                            className="flex-1 bg-white px-6 py-4 rounded-[22px] border border-blue-100 outline-none text-sm font-black text-slate-800 transition-all focus:border-blue-500 shadow-sm appearance-none"
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
                                            className="w-16 h-16 bg-blue-600 text-white rounded-[22px] flex items-center justify-center hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95 group"
                                        >
                                            <Plus size={24} className="group-hover:rotate-90 transition-transform duration-500" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {patient.history.length === 0 ? (
                                    <div className="p-20 text-center bg-slate-50/50 rounded-[64px] border-4 border-dashed border-slate-100">
                                        <p className="text-slate-400 font-bold">No hay transacciones registradas</p>
                                    </div>
                                ) : (
                                    patient.history.map((event, index) => (
                                        <div key={event.id} className="flex items-center justify-between p-8 bg-white border border-slate-50 rounded-[40px] hover:shadow-2xl hover:shadow-slate-200/50 transition-all group animate-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                                            <div className="flex items-center gap-6">
                                                <div className={cn(
                                                    "w-16 h-16 rounded-[24px] flex items-center justify-center shadow-inner group-hover:scale-110 transition-all duration-500",
                                                    event.type === 'treatment' ? "bg-blue-50 text-blue-600" :
                                                        event.type === 'extraction' ? "bg-red-50 text-red-600" :
                                                            event.type === 'cleaning' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                                )}>
                                                    <Activity size={24} strokeWidth={2.5} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-xl text-slate-900 leading-none mb-2 italic tracking-tight">{event.description}</h4>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                        <Calendar size={10} />
                                                        {event.date} • <span className="text-blue-500">{event.type.toUpperCase()}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center gap-1.5 text-2xl font-black text-slate-900 tracking-tighter italic">
                                                    <span className="text-slate-400 text-sm">$</span>
                                                    {event.cost}
                                                </div>
                                                <div className="flex items-center gap-1 justify-end mt-1 animate-pulse">
                                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                                    <span className="text-[8px] font-black uppercase tracking-[2px] text-slate-300">Sincronizado</span>
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

const InputGroup: React.FC<{
    label: string;
    value: string;
    onChange: (val: string) => void;
    icon?: any;
    placeholder?: string;
    type?: string;
}> = ({ label, value, onChange, icon: Icon, placeholder, type = "text" }) => (
    <div className="space-y-3 group">
        <label className="text-[10px] font-black uppercase tracking-[2.5px] text-slate-400 ml-2 group-focus-within:text-blue-500 transition-colors uppercase italic">{label}</label>
        <div className="relative">
            {Icon && (
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                    <Icon size={18} strokeWidth={2.5} />
                </div>
            )}
            <input
                type={type}
                className={cn(
                    "w-full py-4 bg-slate-50/50 border border-slate-100 rounded-[22px] text-sm font-black focus:bg-white focus:border-blue-500 focus:ring-8 focus:ring-blue-500/5 outline-none transition-all text-slate-800 placeholder:text-slate-300 shadow-inner",
                    Icon ? "pl-14 pr-6" : "px-6"
                )}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
        </div>
    </div>
);

export default PatientRecord;
