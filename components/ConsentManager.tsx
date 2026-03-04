
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ConsentForm, PatientRecord as PatientRecordType } from '../types';
import { cn } from '../lib/utils';
import { sileo } from 'sileo';
import jsPDF from 'jspdf';
import {
    FileCheck,
    Plus,
    Download,
    Trash2,
    PenTool,
    RotateCcw,
    Calendar,
    Eye,
    X,
    CheckCircle2,
    AlertTriangle
} from 'lucide-react';

interface Props {
    patient: PatientRecordType;
    onUpdate: (updated: PatientRecordType) => void;
    doctorName: string;
    clinicName: string;
}

const CONSENT_TEMPLATES: { title: string; content: string }[] = [
    {
        title: 'Consentimiento General de Tratamiento Dental',
        content: `Yo, {PACIENTE}, mayor de edad, con pleno uso de mis facultades mentales y sin que medie coacción alguna, declaro que:

1. He sido informado/a de manera clara y comprensible sobre mi diagnóstico, el tratamiento dental propuesto, sus alternativas, riesgos, beneficios y posibles complicaciones.

2. Entiendo que todo procedimiento dental conlleva riesgos inherentes, incluyendo pero no limitados a: dolor, inflamación, sangrado, infección, daño a estructuras adyacentes, reacciones adversas a medicamentos o anestesia.

3. He tenido la oportunidad de hacer preguntas y estas han sido respondidas satisfactoriamente por el/la Dr(a). {DOCTOR}.

4. Autorizo al profesional dental y a su equipo a realizar los procedimientos diagnósticos y terapéuticos que consideren necesarios para mi tratamiento.

5. Me comprometo a seguir las indicaciones post-operatorias y a asistir a las citas de seguimiento programadas.

6. Entiendo que tengo derecho a revocar este consentimiento en cualquier momento antes de la realización del procedimiento.

Firmo el presente documento en {CLINICA}, en señal de conformidad.`
    },
    {
        title: 'Consentimiento para Extracción Dental',
        content: `Yo, {PACIENTE}, autorizo al Dr(a). {DOCTOR} a realizar la extracción de la(s) pieza(s) dental(es) indicada(s).

He sido informado/a sobre:
• El procedimiento de extracción y la necesidad del mismo
• Los riesgos potenciales: dolor, sangrado, inflamación, infección, daño a nervios o dientes adyacentes, fractura de raíz, comunicación oroantral
• Las alternativas al tratamiento propuesto
• Las instrucciones de cuidado post-operatorio

Declaro que he proporcionado información veraz sobre mi historial médico, alergias y medicamentos actuales.

Firmo en {CLINICA} en constancia de mi consentimiento voluntario.`
    },
    {
        title: 'Consentimiento para Tratamiento de Conducto',
        content: `Yo, {PACIENTE}, autorizo al Dr(a). {DOCTOR} a realizar el tratamiento endodóntico (tratamiento de conducto) en la(s) pieza(s) indicada(s).

He sido informado/a sobre:
• La naturaleza del procedimiento endodóntico
• Los riesgos: fractura del instrumento, perforación, fractura dental, posible necesidad de retratamiento o extracción
• Que el tratamiento puede requerir múltiples sesiones
• La necesidad de restauración posterior (corona) para proteger el diente tratado
• Las alternativas disponibles, incluyendo la extracción

Acepto los riesgos y autorizo el tratamiento de forma voluntaria.

Firma en {CLINICA}.`
    },
    {
        title: 'Consentimiento para Ortodoncia',
        content: `Yo, {PACIENTE}, autorizo al Dr(a). {DOCTOR} a iniciar el tratamiento de ortodoncia.

He sido informado/a sobre:
• El plan de tratamiento ortodóntico, su duración estimada y fases
• Los riesgos: descalcificación dental, reabsorción radicular, recidiva, dolor e incomodidad, problemas en la articulación temporomandibular
• La importancia de una higiene oral rigurosa durante el tratamiento
• La necesidad de retenedores post-tratamiento
• Los costos estimados y el plan de pagos acordado
• La importancia de asistir a las citas programadas

Me comprometo a seguir las instrucciones del profesional y mantener una higiene oral adecuada durante todo el tratamiento.

Firma en {CLINICA}.`
    }
];

const SignatureCanvas: React.FC<{
    onSave: (dataUrl: string) => void;
    onCancel: () => void;
}> = ({ onSave, onCancel }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasContent, setHasContent] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        // Set canvas size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);
        // Signature line
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, rect.height - 40);
        ctx.lineTo(rect.width - 20, rect.height - 40);
        ctx.stroke();
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.fillText('Firma del paciente', 20, rect.height - 22);
        // Reset for drawing
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
    }, []);

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        setIsDrawing(true);
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        if (!isDrawing) return;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        setHasContent(true);
    };

    const endDraw = () => setIsDrawing(false);

    const clear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, rect.height - 40);
        ctx.lineTo(rect.width - 20, rect.height - 40);
        ctx.stroke();
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.fillText('Firma del paciente', 20, rect.height - 22);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        setHasContent(false);
    };

    const handleSave = () => {
        if (!hasContent) {
            sileo.error({ title: 'Firma requerida', description: 'Dibuja tu firma antes de guardar' });
            return;
        }
        const dataUrl = canvasRef.current?.toDataURL('image/png') || '';
        onSave(dataUrl);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <PenTool size={16} className="text-blue-600" />
                    Dibuja tu firma
                </div>
                <button onClick={clear} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-red-500 bg-slate-50 rounded-lg hover:bg-red-50 transition-all">
                    <RotateCcw size={12} /> Limpiar
                </button>
            </div>
            <canvas
                ref={canvasRef}
                className="w-full h-48 border-2 border-dashed border-slate-200 rounded-xl cursor-crosshair touch-none bg-white"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
            />
            <div className="flex gap-3">
                <button
                    onClick={handleSave}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-600/15 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    <CheckCircle2 size={16} /> Firmar y Guardar
                </button>
                <button
                    onClick={onCancel}
                    className="px-5 py-3 text-slate-400 text-sm font-semibold hover:text-red-500 transition-colors"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
};

const ConsentManager: React.FC<Props> = ({ patient, onUpdate, doctorName, clinicName }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(0);
    const [customTitle, setCustomTitle] = useState('');
    const [customContent, setCustomContent] = useState('');
    const [witnessName, setWitnessName] = useState('');
    const [showSigning, setShowSigning] = useState(false);
    const [viewingConsent, setViewingConsent] = useState<ConsentForm | null>(null);

    const consents = patient.consents || [];

    const getProcessedContent = useCallback((content: string) => {
        return content
            .replace(/\{PACIENTE\}/g, patient.identification.fullName)
            .replace(/\{DOCTOR\}/g, doctorName)
            .replace(/\{CLINICA\}/g, clinicName || 'la clínica');
    }, [patient.identification.fullName, doctorName, clinicName]);

    const handleSelectTemplate = (idx: number) => {
        setSelectedTemplate(idx);
        const t = CONSENT_TEMPLATES[idx];
        setCustomTitle(t.title);
        setCustomContent(getProcessedContent(t.content));
    };

    const handleStartNew = () => {
        setIsCreating(true);
        handleSelectTemplate(0);
    };

    const handleSign = (signatureData: string) => {
        const consent: ConsentForm = {
            id: crypto.randomUUID(),
            title: customTitle,
            content: customContent,
            signatureData,
            signedAt: new Date().toISOString(),
            witnessName: witnessName.trim() || undefined,
        };
        onUpdate({ ...patient, consents: [consent, ...consents], consentSigned: true });
        setIsCreating(false);
        setShowSigning(false);
        setWitnessName('');
        sileo.success({ title: 'Consentimiento firmado', description: `"${customTitle}" guardado exitosamente` });
    };

    const handleDelete = (id: string) => {
        onUpdate({ ...patient, consents: consents.filter(c => c.id !== id) });
    };

    const handleExportPDF = (consent: ConsentForm) => {
        const doc = new jsPDF() as any;
        const pageW = doc.internal.pageSize.getWidth();

        // Header
        doc.setFontSize(18);
        doc.setTextColor(15, 23, 42);
        doc.text(consent.title, pageW / 2, 25, { align: 'center' });

        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text(`Fecha: ${new Date(consent.signedAt).toLocaleDateString('es-HN')} | Paciente: ${patient.identification.fullName}`, pageW / 2, 33, { align: 'center' });

        // Divider
        doc.setDrawColor(226, 232, 240);
        doc.line(20, 38, pageW - 20, 38);

        // Content
        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85);
        const splitText = doc.splitTextToSize(consent.content, pageW - 40);
        doc.text(splitText, 20, 48);

        const contentEndY = 48 + splitText.length * 5;

        // Witness
        if (consent.witnessName) {
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(`Testigo: ${consent.witnessName}`, 20, contentEndY + 15);
        }

        // Signature
        if (consent.signatureData) {
            const sigY = contentEndY + (consent.witnessName ? 25 : 15);
            // Check if we need a new page
            if (sigY + 50 > doc.internal.pageSize.getHeight() - 20) {
                doc.addPage();
                doc.addImage(consent.signatureData, 'PNG', 20, 20, 80, 40);
                doc.setFontSize(9);
                doc.setTextColor(148, 163, 184);
                doc.text(`Firmado digitalmente el ${new Date(consent.signedAt).toLocaleString('es-HN')}`, 20, 65);
            } else {
                doc.addImage(consent.signatureData, 'PNG', 20, sigY, 80, 40);
                doc.setFontSize(9);
                doc.setTextColor(148, 163, 184);
                doc.text(`Firmado digitalmente el ${new Date(consent.signedAt).toLocaleString('es-HN')}`, 20, sigY + 45);
            }
        }

        doc.save(`Consentimiento_${patient.identification.fullName.replace(/\s+/g, '_')}_${consent.title.slice(0, 30).replace(/\s+/g, '_')}.pdf`);
        sileo.success({ title: 'PDF descargado', description: 'Consentimiento exportado correctamente' });
    };

    // View consent modal
    if (viewingConsent) {
        return (
            <div className="space-y-6 animate-in-up duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{viewingConsent.title}</h3>
                        <p className="text-slate-400 text-sm mt-1">
                            Firmado el {new Date(viewingConsent.signedAt).toLocaleDateString('es-HN')}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleExportPDF(viewingConsent)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-blue-600 transition-all"
                        >
                            <Download size={14} /> PDF
                        </button>
                        <button
                            onClick={() => setViewingConsent(null)}
                            className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{viewingConsent.content}</p>
                </div>

                {viewingConsent.witnessName && (
                    <p className="text-sm text-slate-500">
                        <span className="font-semibold">Testigo:</span> {viewingConsent.witnessName}
                    </p>
                )}

                {viewingConsent.signatureData && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 inline-block">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Firma del paciente</p>
                        <img src={viewingConsent.signatureData} alt="Firma" className="h-24 object-contain" />
                    </div>
                )}
            </div>
        );
    }

    // Creating new consent
    if (isCreating) {
        return (
            <div className="space-y-6 animate-in-up duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Nuevo Consentimiento</h3>
                        <p className="text-slate-400 text-sm mt-1">Selecciona una plantilla o personaliza</p>
                    </div>
                    <button
                        onClick={() => { setIsCreating(false); setShowSigning(false); }}
                        className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Template selector */}
                <div className="flex gap-2 flex-wrap">
                    {CONSENT_TEMPLATES.map((t, i) => (
                        <button
                            key={i}
                            onClick={() => handleSelectTemplate(i)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-xs font-semibold transition-all",
                                selectedTemplate === i
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-blue-50 hover:text-blue-600"
                            )}
                        >
                            {t.title.length > 25 ? t.title.slice(0, 25) + '...' : t.title}
                        </button>
                    ))}
                </div>

                {/* Title */}
                <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Título del consentimiento</label>
                    <input
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                        value={customTitle}
                        onChange={e => setCustomTitle(e.target.value)}
                    />
                </div>

                {/* Content */}
                <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Contenido</label>
                    <textarea
                        className="w-full px-4 py-4 rounded-xl border border-slate-200 bg-slate-50 outline-none text-sm text-slate-700 leading-relaxed resize-none min-h-[250px] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                        value={customContent}
                        onChange={e => setCustomContent(e.target.value)}
                    />
                </div>

                {/* Witness */}
                <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Nombre del testigo (opcional)</label>
                    <input
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none text-sm font-medium focus:border-blue-500 transition-all"
                        value={witnessName}
                        onChange={e => setWitnessName(e.target.value)}
                        placeholder="Nombre completo del testigo..."
                    />
                </div>

                {/* Signature area */}
                {showSigning ? (
                    <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                        <SignatureCanvas
                            onSave={handleSign}
                            onCancel={() => setShowSigning(false)}
                        />
                    </div>
                ) : (
                    <button
                        onClick={() => {
                            if (!customTitle.trim() || !customContent.trim()) {
                                sileo.error({ title: 'Faltan datos', description: 'Completa el título y contenido antes de firmar' });
                                return;
                            }
                            setShowSigning(true);
                        }}
                        className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-600/15 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <PenTool size={16} /> Proceder a Firmar
                    </button>
                )}
            </div>
        );
    }

    // List view
    return (
        <div className="space-y-8 animate-in-up duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Consentimiento Informado</h3>
                    <p className="text-slate-400 text-sm mt-1">Formularios de autorización y firma digital</p>
                </div>
                <button
                    onClick={handleStartNew}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-600/15 active:scale-95"
                >
                    <Plus size={16} /> Nuevo Consentimiento
                </button>
            </div>

            {consents.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <FileCheck size={32} className="mx-auto mb-3 text-slate-200" />
                    <h4 className="text-lg font-bold text-slate-700 mb-1">Sin consentimientos</h4>
                    <p className="text-slate-400 text-sm max-w-xs mx-auto">
                        Crea un consentimiento informado con firma digital para este paciente.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {consents.map((consent, index) => (
                        <div key={consent.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md hover:border-blue-100 transition-all group animate-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                                    <FileCheck size={20} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900 text-sm">{consent.title}</h4>
                                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                                        <Calendar size={10} />
                                        Firmado el {new Date(consent.signedAt).toLocaleDateString('es-HN')}
                                        {consent.witnessName && <span>· Testigo: {consent.witnessName}</span>}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setViewingConsent(consent)}
                                    className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                    title="Ver"
                                >
                                    <Eye size={16} />
                                </button>
                                <button
                                    onClick={() => handleExportPDF(consent)}
                                    className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                                    title="Descargar PDF"
                                >
                                    <Download size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(consent.id)}
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

export default ConsentManager;
