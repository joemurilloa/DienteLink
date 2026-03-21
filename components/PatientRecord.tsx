
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { PatientRecord as PatientRecordType } from '../types';
import { cn, ensurePeriodontogramData } from '../lib/utils';
import { useAuth } from '../services/authService';
import { sileo } from 'sileo';
import 'sileo/styles.css';
import {
    User,
    History,
    ClipboardList,
    Activity,
    LayoutGrid,
    BarChart3,
    X,
    Maximize2,
    Calendar,
    DollarSign,
    FileCheck,
    Pill,
    Image as ImageIcon
} from 'lucide-react';
import Odontogram from './Odontogram';
import Periodontogram from './Periodontogram';
import ConsentManager from './ConsentManager';
import PrescriptionManager from './PrescriptionManager';

// ─── Extracted tab components ───
import PatientIdTab from './patient-record/PatientIdTab';
import AnamnesisTab from './patient-record/AnamnesisTab';
import EvolutionTab from './patient-record/EvolutionTab';
import HistoryTab from './patient-record/HistoryTab';
import AppointmentsTab from './patient-record/AppointmentsTab';
import XraysTab from './patient-record/XraysTab';

interface Props {
    patient: PatientRecordType;
    onUpdate: (updatedPatient: PatientRecordType) => void;
}

type TabId = 'id' | 'anamnesis' | 'odontogram' | 'periodontogram' | 'notes' | 'consent' | 'prescriptions' | 'citas' | 'history' | 'xrays';

const PatientRecord: React.FC<Props> = ({ patient, onUpdate }) => {
    const { profile } = useAuth();
    const doctorName = profile?.full_name || 'Doctor';
    const clinicName = profile?.clinic_name || 'DienteLink';
    const [searchParams] = useSearchParams();
    const initialTab = (searchParams.get('tab') || 'id') as TabId;
    const [activeTab, setActiveTab] = useState<TabId>(initialTab);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const [snapshotRefresh, setSnapshotRefresh] = useState(0);
    const handleSnapshotSaved = () => setSnapshotRefresh(n => n + 1);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab as TabId);
    }, [searchParams]);

    const tabs = [
        { id: 'id', label: 'Ficha', icon: User },
        { id: 'odontogram', label: 'Odontograma', icon: LayoutGrid },
        { id: 'anamnesis', label: 'Anamnesis', icon: History },
        { id: 'periodontogram', label: 'Periodonto', icon: BarChart3 },
        { id: 'notes', label: 'Evolución', icon: ClipboardList },
        { id: 'consent', label: 'Consentimiento', icon: FileCheck },
        { id: 'prescriptions', label: 'Recetas', icon: Pill },
        { id: 'citas', label: 'Agenda', icon: Calendar },
        { id: 'history', label: 'Historial', icon: Activity },
        { id: 'xrays', label: 'Imágenes', icon: ImageIcon },
    ];

    const handleExportPDF = async () => {
        if (isExporting) return;
        setIsExporting(true);
        sileo.info({ title: 'Generando PDF', description: 'Estructurando el expediente clínico...' });
        try {
            const { generatePatientPDF } = await import('../lib/pdfGenerator');
            await generatePatientPDF(patient, clinicName, doctorName);
        } catch (error) {
            sileo.error({ title: 'Error al generar PDF', description: 'Ocurrió un error inesperado al compilar el expediente.' });
        } finally {
            setIsExporting(false);
        }
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

    const renderTabContent = () => {
        switch (activeTab) {
            case 'id':
                return <PatientIdTab patient={patient} onUpdate={onUpdate} onExportPDF={handleExportPDF} isExporting={isExporting} />;
            case 'anamnesis':
                return <AnamnesisTab patient={patient} onUpdate={onUpdate} />;
            case 'odontogram':
                return (
                    <div className="space-y-6 animate-in-up duration-500 min-h-[600px]">

                        <Odontogram patientId={patient.id} teeth={patient.odontogram || []} onUpdate={(teeth) => onUpdate({ ...patient, odontogram: teeth })} snapshots={patient.odontogramHistory || []} onSaveSnapshot={handleSnapshotSaved} />
                    </div>
                );
            case 'periodontogram':
                return (
                    <div className="space-y-6 animate-in-up duration-500 min-h-[600px]">

                        <Periodontogram data={ensurePeriodontogramData(patient.periodontogram)} onUpdate={(periodontogram) => onUpdate({ ...patient, periodontogram })} />
                    </div>
                );
            case 'notes':
                return <EvolutionTab patient={patient} onUpdate={onUpdate} />;
            case 'consent':
                return <ConsentManager patient={patient} onUpdate={onUpdate} doctorName={doctorName} clinicName={clinicName} />;
            case 'prescriptions':
                return <PrescriptionManager patient={patient} onUpdate={onUpdate} doctorName={doctorName} clinicName={clinicName} />;
            case 'citas':
                return <AppointmentsTab patient={patient} />;
            case 'history':
                return <HistoryTab patient={patient} onUpdate={onUpdate} />;
            case 'xrays':
                return <XraysTab patient={patient} onUpdate={onUpdate} />;
            default:
                return null;
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
                            onClick={() => setActiveTab(tab.id as TabId)}
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
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default PatientRecord;
