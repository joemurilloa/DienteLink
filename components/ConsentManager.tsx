import React, { useState } from 'react';
import { ConsentForm, PatientRecord as PatientRecordType } from '../types';
import { cn } from '../lib/utils';
import { sileo } from 'sileo';
import jsPDF from 'jspdf';
import {
    Plus,
    Download,
    Trash2,
    Calendar,
    Eye,
    X,
    FileCheck,
    Loader2,
} from 'lucide-react';

interface Props {
    patient: PatientRecordType;
    onUpdate: (updated: PatientRecordType) => void;
    doctorName: string;
    clinicName: string;
}

export type ConsentTemplateType = 'general' | 'extraction' | 'endodontics' | 'orthodontics';

const CONSENT_TYPES: { id: ConsentTemplateType; title: string; icon: string }[] = [
    { id: 'general', title: 'Consentimiento General', icon: 'FileText' },
    { id: 'extraction', title: 'Extracción Dental', icon: 'Scissors' },
    { id: 'endodontics', title: 'Tratamiento de Conducto', icon: 'Zap' },
    { id: 'orthodontics', title: 'Ortodoncia', icon: 'Hash' },
];
import { SignatureCanvas } from './SignatureCanvas';
import ProfessionalConsentForm from './ProfessionalConsentForm';

const ConsentManager: React.FC<Props> = ({ patient, onUpdate, doctorName, clinicName }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [selectedType, setSelectedType] = useState<ConsentTemplateType | null>(null);
    const [isSelectingType, setIsSelectingType] = useState(false);
    const [viewingConsent, setViewingConsent] = useState<ConsentForm | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    const consents = patient.consents || [];

    const handleStartNew = () => {
        setIsSelectingType(true);
    };

    const handleSelectType = (type: ConsentTemplateType) => {
        setSelectedType(type);
        setIsSelectingType(false);
        setIsCreating(true);
    };

    const handleSign = (signatureData: string, overrideTitle: string, overrideContent: string, overrideWitness?: string) => {
        const consent: ConsentForm = {
            id: crypto.randomUUID(),
            title: overrideTitle,
            content: overrideContent,
            signatureData,
            signedAt: new Date().toISOString(),
            witnessName: overrideWitness?.trim() || undefined,
        };
        onUpdate({ ...patient, consents: [consent, ...consents], consentSigned: true });
        setIsCreating(false);
        setSelectedType(null);
        sileo.success({ title: 'Documento Guardado', description: `Se ha registrado el consentimiento exitosamente.` });
    };

    const handleDelete = (id: string) => {
        onUpdate({ ...patient, consents: consents.filter(c => c.id !== id) });
    };

    const handleExportPDF = async (consent: ConsentForm) => {
        setIsExporting(true);
        try {
            const doc = new jsPDF() as any;
            if (!doc || !doc.internal) throw new Error("jsPDF initialization failed");

            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const marginX = 20;
            const marginY = 25;
            const contentWidth = pageW - (marginX * 2);
            let currentY = 0;

            // Simple Markdown-ish Bold Parser for jspdf
            const drawMarkdownText = (text: string, x: number, y: number, maxWidth: number) => {
                const parts = text.split(/(\*\*.*?\*\*)/g);
                let currentLineX = x;
                const lineHeight = 6;
                const spaceW = 1.2;

                parts.forEach(part => {
                    const isBold = part.startsWith('**') && part.endsWith('**');
                    const cleanText = isBold ? part.slice(2, -2) : part;
                    
                    doc.setFont("helvetica", isBold ? "bold" : "normal");
                    const words = cleanText.split(/(\s+)/);

                    words.forEach(word => {
                        const wordW = doc.getTextWidth(word);
                        if (currentLineX + wordW > x + maxWidth) {
                            currentY += lineHeight;
                            currentLineX = x;
                            if (currentY > pageH - 25) {
                                doc.addPage();
                                drawBranding(false);
                                currentY = 35;
                                currentLineX = x;
                            }
                        }
                        doc.text(word, currentLineX, currentY);
                        currentLineX += wordW;
                    });
                });
                currentY += lineHeight;
            };

            const drawBranding = (isFirstPage: boolean) => {
                if (isFirstPage) {
                    // Modern Header Bar
                    doc.setFillColor(15, 23, 42); // slate-900
                    doc.rect(0, 0, pageW, 40, 'F');

                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(14);
                    doc.setTextColor(255, 255, 255);
                    doc.text(clinicName.toUpperCase(), marginX, 18);
                    
                    doc.setFontSize(9);
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(148, 163, 184); // slate-400
                    doc.text("DOCUMENTACIÓN CLÍNICA OFICIAL", marginX, 24);

                    doc.setFontSize(16);
                    doc.setTextColor(255, 255, 255);
                    const titleShort = consent.title.length > 50 ? consent.title.substring(0, 47) + "..." : consent.title;
                    doc.text(titleShort, pageW - marginX, 22, { align: 'right' });

                    currentY = 55;
                } else {
                    doc.setFont("helvetica", "italic");
                    doc.setFontSize(8);
                    doc.setTextColor(148, 163, 184);
                    doc.text(`${consent.title} - pág. ${doc.internal.getNumberOfPages()}`, marginX, 15);
                    doc.setDrawColor(226, 232, 240);
                    doc.line(marginX, 18, pageW - marginX, 18);
                    currentY = 30;
                }
            };

            drawBranding(true);

            // Metadata Box
            doc.setFillColor(248, 250, 252); // slate-50
            doc.roundedRect(marginX, currentY - 5, contentWidth, 20, 3, 3, 'F');
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(51, 65, 85); // slate-700
            doc.text("PACIENTE:", marginX + 5, currentY + 3);
            doc.text("ID/DOCUMENTO:", marginX + 80, currentY + 3);
            doc.text("FECHA:", marginX + 130, currentY + 3);

            doc.setFont("helvetica", "normal");
            doc.text(patient.identification.fullName, marginX + 5, currentY + 8);
            doc.text(patient.identification.idNumber || "---", marginX + 80, currentY + 8);
            doc.text(new Date(consent.signedAt).toLocaleDateString('es-HN'), marginX + 130, currentY + 8);
            currentY += 30;

            // Content paragraphs
            doc.setFontSize(10.5);
            doc.setTextColor(30, 41, 59); // slate-800
            
            const paragraphs = consent.content.split('\n');
            paragraphs.forEach(para => {
                if (para.trim()) {
                    if (currentY > pageH - 25) {
                        doc.addPage();
                        drawBranding(false);
                    }
                    drawMarkdownText(para, marginX, currentY, contentWidth);
                    currentY += 3; // spacing between paras
                }
            });

            currentY += 15;

            // Signature Section
            if (currentY > pageH - 70) {
                doc.addPage();
                drawBranding(false);
            }

            // Lines for signatures
            const sigWidth = 60;
            doc.setDrawColor(203, 213, 225); // slate-300
            
            // Patient Signature
            if (consent.signatureData) {
                doc.addImage(consent.signatureData, 'PNG', marginX, currentY - 25, 60, 30);
                doc.line(marginX, currentY + 5, marginX + sigWidth, currentY + 5);
                doc.setFontSize(8);
                doc.setFont("helvetica", "bold");
                doc.text("FIRMA DEL PACIENTE", marginX, currentY + 10);
                doc.setFont("helvetica", "normal");
                doc.text(patient.identification.fullName, marginX, currentY + 14);
            }

            // Doctor / Witness
            const col2X = pageW - marginX - sigWidth;
            doc.line(col2X, currentY + 5, pageW - marginX, currentY + 5);
            doc.setFont("helvetica", "bold");
            doc.text("FIRMA DEL ODONTÓLOGO", col2X, currentY + 10);
            doc.setFont("helvetica", "normal");
            doc.text(doctorName, col2X, currentY + 14);

            if (consent.witnessName) {
                currentY += 25;
                if (currentY > pageH - 30) {
                    doc.addPage();
                    drawBranding(false);
                }
                doc.line(marginX, currentY + 5, marginX + sigWidth, currentY + 5);
                doc.setFont("helvetica", "bold");
                doc.text("TESTIGO", marginX, currentY + 10);
                doc.setFont("helvetica", "normal");
                doc.text(consent.witnessName, marginX, currentY + 14);
            }

            // Footer for authenticity
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            const footerText = `Documento generado digitalmente por DienteLink. ID de autenticidad: ${consent.id.substring(0, 8)}`;
            doc.text(footerText, pageW / 2, pageH - 10, { align: 'center' });

            doc.save(`Consentimiento_${patient.identification.fullName.replace(/\s+/g, '_')}_${new Date(consent.signedAt).getTime()}.pdf`);
            sileo.success({ title: 'PDF Profesional Descargado', description: 'El documento ha sido exportado exitosamente.' });
        } catch (error) {
            console.error("Error generating PDF:", error);
            sileo.error({ title: "Error en Exportación", description: "Ocurrió un problema al generar el archivo profesional." });
        } finally {
            setIsExporting(false);
        }
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
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-blue-600 transition-all disabled:opacity-50"
                        >
                            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF
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

    if (isSelectingType) {
        return (
            <div className="space-y-6 animate-in-up duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Tipo de Consentimiento</h3>
                        <p className="text-slate-400 text-sm mt-1">Selecciona el formato clínico a generar</p>
                    </div>
                    <button
                        onClick={() => setIsSelectingType(false)}
                        className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {CONSENT_TYPES.map((type) => (
                        <button
                            key={type.id}
                            onClick={() => handleSelectType(type.id)}
                            className="group p-6 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:shadow-lg transition-all text-left flex items-center gap-4"
                        >
                            <div className="w-12 h-12 bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 rounded-xl flex items-center justify-center transition-colors">
                                <Plus size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900">{type.title}</h4>
                                <p className="text-xs text-slate-400 mt-1">Generar documento legal detallado</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (isCreating) {
        return (
            <ProfessionalConsentForm
                patient={patient}
                doctorName={doctorName}
                clinicName={clinicName}
                templateType={selectedType || 'general'}
                onCancel={() => { setIsCreating(false); setSelectedType(null); }}
                onSave={(data) => {
                    handleSign(data.signatureData, data.title, data.content, data.witnessName);
                }}
            />
        );
    }

    // List view
    return (
        <div className="space-y-8 animate-in-up duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Documentación Clínica</h3>
                    <p className="text-slate-400 text-sm mt-1">Gestión de consentimientos y avisos legales</p>
                </div>
                <button
                    onClick={handleStartNew}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                    <Plus size={18} /> Agregar Nuevo Consentimiento
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
