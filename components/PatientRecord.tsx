
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
    Pill
} from 'lucide-react';
import Odontogram from './Odontogram';
import Periodontogram from './Periodontogram';
import ConsentManager from './ConsentManager';
import PrescriptionManager from './PrescriptionManager';
import { useRoleAccess } from './RoleGuard';

// ─── Extracted tab components ───
import PatientIdTab from './patient-record/PatientIdTab';
import AnamnesisTab from './patient-record/AnamnesisTab';
import EvolutionTab from './patient-record/EvolutionTab';
import HistoryTab from './patient-record/HistoryTab';
import AppointmentsTab from './patient-record/AppointmentsTab';
import BudgetTab from './patient-record/BudgetTab';

interface Props {
    patient: PatientRecordType;
    onUpdate: (updatedPatient: PatientRecordType) => void;
}

type TabId = 'id' | 'odontogram' | 'periodontogram' | 'history' | 'documents' | 'citas' | 'budget';

const PatientRecord: React.FC<Props> = ({ patient, onUpdate }) => {
    const { profile } = useAuth();
    const doctorName = profile?.full_name || 'Doctor';
    const clinicName = profile?.clinic_name || 'DienteLink';
    const [searchParams] = useSearchParams();
    const initialTab = (searchParams.get('tab') || 'id') as TabId;
    const [activeTab, setActiveTab] = useState<TabId>(initialTab);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const { canViewClinical, canViewFinancial } = useRoleAccess();

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab as TabId);
    }, [searchParams]);

    // Tecla ESC para cerrar Focus Mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFocusMode) {
                setIsFocusMode(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFocusMode]);

    const tabs = [
        { id: 'id', label: 'Ficha y Anamnesis', icon: User, allowed: true },
        { id: 'odontogram', label: 'Odontograma', icon: LayoutGrid, allowed: canViewClinical },
        { id: 'periodontogram', label: 'Periodonto', icon: BarChart3, allowed: canViewClinical },
        { id: 'history', label: 'Historial y Evolución', icon: Activity, allowed: canViewClinical },
        { id: 'citas', label: 'Agenda', icon: Calendar, allowed: true },
        { id: 'documents', label: 'Documentos', icon: FileCheck, allowed: true },
        { id: 'budget', label: 'Finanzas', icon: DollarSign, allowed: canViewFinancial },
    ].filter(t => t.allowed);

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
                return (
                    <div className="space-y-8">
                        <PatientIdTab patient={patient} onUpdate={onUpdate} onExportPDF={handleExportPDF} isExporting={isExporting} />
                        <hr className="border-slate-100" />
                        <AnamnesisTab patient={patient} onUpdate={onUpdate} />
                    </div>
                );
            case 'odontogram':
                return (
                    <div className="space-y-0 animate-in-up duration-500 min-h-[600px] h-full flex flex-col">
                    <Odontogram patientId={patient.id} teeth={patient.odontogram || []} onUpdate={(teeth) => onUpdate({ ...patient, odontogram: teeth })} snapshots={patient.odontogramHistory || []} />
                    </div>
                );
            case 'periodontogram':
                return (
                    <div className="space-y-0 animate-in-up duration-500 min-h-[600px] h-full flex flex-col">
                        <Periodontogram data={ensurePeriodontogramData(patient.periodontogram)} onUpdate={(periodontogram) => onUpdate({ ...patient, periodontogram })} />
                    </div>
                );
            case 'history':
                return (
                    <div className="space-y-12 animate-in-up duration-500">
                        <HistoryTab patient={patient} onUpdate={onUpdate} />
                        <hr className="border-slate-100" />
                        <EvolutionTab patient={patient} onUpdate={onUpdate} />
                    </div>
                );
            case 'documents':
                return (
                    <div className="space-y-12 animate-in-up duration-500">
                        <ConsentManager patient={patient} onUpdate={onUpdate} doctorName={doctorName} clinicName={clinicName} />
                        <hr className="border-slate-100" />
                        <PrescriptionManager patient={patient} onUpdate={onUpdate} doctorName={doctorName} clinicName={clinicName} />
                    </div>
                );
            case 'citas':
                return <AppointmentsTab patient={patient} />;
            case 'budget':
                return <BudgetTab patient={patient} onUpdate={onUpdate} />;
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
        <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-500 pb-20 lg:pb-0 relative">
            {isFocusMode && createPortal(FocusModeContent, document.body)}

            {/* Top Horizontal Tabs */}
            <div className={cn(
                "w-full shrink-0 mb-6 transition-all duration-500 z-10",
                isFocusMode ? "h-0 opacity-0 pointer-events-none mb-0 overflow-hidden" : "opacity-100"
            )}>
                <div className="relative group/tabs">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <span className="text-[11px] font-black uppercase tracking-[2px] text-slate-400">Expediente Clínico</span>
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200 animate-pulse"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200 animate-pulse delay-75"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200 animate-pulse delay-150"></div>
                        </div>
                    </div>
                    <nav className="flex flex-row gap-2 overflow-x-auto pb-4 pt-1 hide-scrollbar -mx-1 px-1">
                        {tabs.map((tab, index) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabId)}
                                className={cn(
                                    "flex items-center gap-2.5 px-5 py-3 rounded-2xl text-[13px] font-bold transition-all min-w-max border-2",
                                    activeTab === tab.id
                                        ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/20 scale-105 z-10"
                                        : "bg-white border-slate-100 text-slate-500 hover:border-slate-200 hover:text-slate-800 hover:bg-slate-50/50 shadow-sm"
                                )}
                                style={{ animationDelay: `${index * 40}ms` }}
                            >
                                <tab.icon size={18} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                    {/* Subtle Gradient to indicate scroll */}
                    <div className="absolute right-0 top-[40px] bottom-4 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none opacity-0 group-hover/tabs:opacity-100 transition-opacity"></div>
                </div>
            </div>

            {/* Main Content */}
            <div className={cn(
                "flex-1 bg-white rounded-2xl border border-slate-200 overflow-hidden relative flex flex-col transition-all duration-500 shadow-sm",
                isClinicalTab ? "border-transparent shadow-none" : ""
            )}>
                <div className={cn(
                    "flex-1 overflow-y-auto hide-scrollbar transition-all duration-300",
                    isClinicalTab ? "p-0" : "p-5 lg:p-8"
                )}>
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
