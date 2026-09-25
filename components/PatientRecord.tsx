
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { PatientRecord as PatientRecordType } from '../types';
import { cn, ensurePeriodontogramData } from '../lib/utils';
import { useAuth } from '../services/authService';
import { sileo } from 'sileo';
import 'sileo/styles.css';
import {
    User,
    Activity,
    LayoutGrid,
    BarChart3,
    X,
    Maximize2,
    Minimize2,
    Calendar,
    DollarSign,
    Shield
} from 'lucide-react';
import DentalLogo from './DentalLogo';
const Odontogram = lazy(() => import('./Odontogram'));
const Periodontogram = lazy(() => import('./Periodontogram'));
import { useRoleAccess } from './RoleGuard';

// ─── Extracted tab components ───
import PatientIdTab from './patient-record/PatientIdTab';
import AnamnesisTab from './patient-record/AnamnesisTab';
import UnifiedTimelineTab from './patient-record/UnifiedTimelineTab';
import BudgetTab from './patient-record/BudgetTab';

interface Props {
    patient: PatientRecordType;
    onUpdate: (updatedPatient: PatientRecordType) => void;
}

type TabId = 'id' | 'odontogram' | 'periodontogram' | 'history' | 'documents' | 'citas' | 'budget' | 'lab';

// ─── Wow Banner (shows on first open after patient creation) ──────────────────
const WowBanner: React.FC<{ onNavigate: (tab: TabId) => void; onDismiss: () => void; canViewFinancial: boolean }> = ({ onNavigate, onDismiss, canViewFinancial }) => (
    <div className="mb-6 p-4 sm:p-5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-lg shadow-blue-500/20 animate-in slide-in-from-top-4 duration-500">
        <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <DentalLogo size={18} variant="white" />
                </div>
                <div>
                    <h3 className="font-bold text-base tracking-tight">Expediente creado</h3>
                    <p className="text-blue-200 text-xs mt-0.5">Siguientes pasos recomendados para este paciente:</p>
                </div>
            </div>
            <button onClick={onDismiss} className="p-1 rounded-lg hover:bg-white/20 transition-all text-blue-200 hover:text-white" title="Cerrar sugerencia">
                <X size={16} />
            </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
                onClick={() => { onNavigate('odontogram'); onDismiss(); }}
                className="flex items-center gap-2.5 p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-left group"
            >
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                    <LayoutGrid size={16} className="text-blue-100" />
                </div>
                <div>
                    <p className="font-bold text-xs sm:text-sm">Odontograma</p>
                    <p className="text-[11px] text-blue-200 line-clamp-1">Diagnóstico visual de piezas</p>
                </div>
            </button>
            <button
                onClick={() => { onNavigate('history'); onDismiss(); }}
                className="flex items-center gap-2.5 p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-left group"
            >
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                    <Calendar size={16} className="text-blue-100" />
                </div>
                <div>
                    <p className="font-bold text-xs sm:text-sm">Agendar Cita</p>
                    <p className="text-[11px] text-blue-200 line-clamp-1">Cronología y citas</p>
                </div>
            </button>
            {canViewFinancial && (
            <button
                onClick={() => { onNavigate('budget'); onDismiss(); }}
                className="flex items-center gap-2.5 p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-left group"
            >
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                    <DollarSign size={16} className="text-blue-100" />
                </div>
                <div>
                    <p className="font-bold text-xs sm:text-sm">Presupuesto</p>
                    <p className="text-[11px] text-blue-200 line-clamp-1">Plan de tratamiento y costos</p>
                </div>
            </button>
            )}
        </div>
    </div>
);
const PatientRecord: React.FC<Props> = ({ patient, onUpdate }) => {
    const { profile } = useAuth();
    const doctorName = profile?.full_name || 'Doctor';
    const clinicName = profile?.clinic_name || 'DienteLink';
    const [searchParams] = useSearchParams();
    const initialParam = searchParams.get('tab');
    const initialTab = ((initialParam === 'citas' ? 'history' : initialParam) || 'id') as TabId;
    const [activeTab, setActiveTab] = useState<TabId>(initialTab);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const { canViewClinical, canViewFinancial, canEditClinical, role: userRole } = useRoleAccess();

    // Show wow banner only once for newly created patients (< 3 minutes)
    const [showWow, setShowWow] = useState(() => {
        try {
            if (localStorage.getItem(`dientelink_wow_dismissed_${patient.id}`)) return false;
            const created = new Date(patient.createdAt).getTime();
            return Date.now() - created < 3 * 60 * 1000;
        } catch { return false; }
    });

    const handleDismissWow = () => {
        setShowWow(false);
        try {
            localStorage.setItem(`dientelink_wow_dismissed_${patient.id}`, 'true');
        } catch {}
    };
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'citas') {
            setActiveTab('history');
        } else if (tab) {
            setActiveTab(tab as TabId);
        }
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

// ─── Feature Flags ─────────────────────────────────────────────────────────────
// Cambiar a true cuando desees volver a activar el módulo de Periodontograma
const ENABLE_PERIODONTOGRAM = false;

    const tabs = [
        { id: 'id',             label: 'Ficha y Anamnesis',    labelShort: 'Ficha',       icon: User,        allowed: true },
        { id: 'odontogram',     label: 'Odontograma',          labelShort: 'Odonto',      icon: LayoutGrid,  allowed: canViewClinical },
        ...(ENABLE_PERIODONTOGRAM ? [
            { id: 'periodontogram', label: 'Periodonto',       labelShort: 'Perio',       icon: BarChart3,   allowed: canViewClinical },
        ] : []),
        { id: 'history',        label: 'Historial y Citas',     labelShort: 'Historial',   icon: Activity,    allowed: canViewClinical },
        { id: 'budget',         label: 'Finanzas',              labelShort: 'Finanzas',    icon: DollarSign,  allowed: canViewFinancial },
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

    const isClinicalTab = (ENABLE_PERIODONTOGRAM ? ['odontogram', 'periodontogram'] : ['odontogram']).includes(activeTab);

    // Access denied screen for role-restricted content
    const AccessDenied: React.FC<{ message?: string }> = ({ message }) => (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Shield className="text-slate-400" size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">Acceso Restringido</h3>
            <p className="text-sm text-slate-500 max-w-xs">
                {message || 'Tu rol no tiene permisos para ver esta sección. Contacta al administrador de la clínica.'}
            </p>
        </div>
    );

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
                        
                        {/* Section Divider with Badge */}
                        <div className="relative py-4 my-2">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-slate-200" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-slate-500 border border-slate-200 shadow-xs flex items-center gap-2">
                                    <Activity size={14} className="text-blue-600" />
                                    Historia Clínica & Anamnesis
                                </span>
                            </div>
                        </div>

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
            case 'citas':
                return <UnifiedTimelineTab patient={patient} onUpdate={onUpdate} />;
            case 'budget':
                return <BudgetTab patient={patient} onUpdate={onUpdate} />;
            default:
                return null;
        }
    };

    const FocusModeContent = (
        <div className="fixed inset-0 z-[10000] bg-slate-50 flex flex-col animate-in fade-in duration-200 overflow-y-auto overflow-x-hidden">
            {/* Minimal top bar */}
            <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                    <DentalLogo size={20} variant="blue" />
                    <span className="font-bold text-sm text-slate-700">
                        {activeTab === 'odontogram' ? 'Odontograma' : activeTab === 'periodontogram' ? 'Periodontograma' : 'Plan de Tratamiento'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium hidden sm:inline">— Pantalla Completa</span>
                </div>
                <button
                    onClick={() => setIsFocusMode(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-semibold transition-all"
                    title="Salir de Pantalla Completa (Esc)"
                >
                    <Minimize2 size={14} />
                    <span className="hidden sm:inline">Salir</span>
                </button>
            </div>
            <div className="flex-1 p-4 lg:p-8">
                {renderClinicalContent()}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-500 pb-20 lg:pb-0 relative">
            {isFocusMode && createPortal(FocusModeContent, document.body)}

            {/* Top Horizontal Tabs */}
            <div className={cn(
                "w-full shrink-0 mb-5 transition-all duration-300 z-10",
                isFocusMode ? "h-0 opacity-0 pointer-events-none mb-0 overflow-hidden" : "opacity-100"
            )}>
                <div className="relative">
                    <div className="flex items-center justify-between mb-2.5 px-0.5">
                        <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-slate-500">Expediente Clínico</span>
                    </div>
                    <nav className="flex flex-row gap-2 overflow-x-auto pb-1 pt-0.5 hide-scrollbar">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabId)}
                                className={cn(
                                    "flex items-center gap-2 px-3.5 md:px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all min-w-max shrink-0 whitespace-nowrap border cursor-pointer",
                                    activeTab === tab.id
                                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-50/80 shadow-xs"
                                )}
                            >
                                <tab.icon size={15} strokeWidth={activeTab === tab.id ? 2.2 : 1.8} />
                                <span className="md:hidden">{tab.labelShort}</span>
                                <span className="hidden md:inline">{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <div className={cn(
                "flex-1 bg-white rounded-2xl border border-slate-300 overflow-hidden relative flex flex-col transition-all duration-500 shadow-sm",
                isClinicalTab ? "border-slate-300 shadow-none" : ""
            )}>
                <div className={cn(
                    "flex-1 overflow-y-auto hide-scrollbar transition-all duration-300",
                    isClinicalTab ? "p-0" : "p-5 lg:p-8"
                )}>
                    {isClinicalTab && (
                        <button
                            onClick={() => setIsFocusMode(true)}
                            className="absolute top-5 right-5 z-10 w-11 h-11 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 flex items-center justify-center transition-all active:scale-95"
                            title="Ver en Pantalla Completa"
                        >
                            <Maximize2 size={18} />
                        </button>
                    )}
                    {showWow && !isClinicalTab && (
                        <WowBanner
                            onNavigate={(tab) => setActiveTab(tab)}
                            onDismiss={handleDismissWow}
                            canViewFinancial={canViewFinancial}
                        />
                    )}
                    <Suspense fallback={
                        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-400">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-sm font-medium">Cargando módulo...</p>
                        </div>
                    }>
                        {renderTabContent()}
                    </Suspense>
                </div>
            </div>
        </div>
    );
};

export default PatientRecord;
