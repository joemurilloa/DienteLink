import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PatientRecord } from '../types';
import { sileo } from 'sileo';
import { formatCurrency } from './utils';

export const generatePatientPDF = async (patient: PatientRecord, clinicName: string, doctorName: string) => {
    try {
        const doc = new jsPDF() as any;
        if (!doc || !doc.internal) throw new Error("No se pudo iniciar jsPDF");

        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        let y = 15;

        // Custom Colors & Styles
        const PRIMARY: [number, number, number] = [15, 23, 42]; // Slate 900
        const SECONDARY: [number, number, number] = [100, 116, 139]; // Slate 500
        const ACCENT: [number, number, number] = [37, 99, 235]; // Blue 600
        const LIGHT_BG: [number, number, number] = [248, 250, 252]; // Slate 50

        const checkPage = (needed: number) => {
            if (y + needed > pageH - 20) { doc.addPage(); y = 20; }
        };

        const sectionTitle = (title: string) => {
            checkPage(20);
            y += 8;
            doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
            doc.rect(15, y - 6, pageW - 30, 10, 'F');
            doc.setDrawColor(226, 232, 240); // border
            doc.line(15, y + 4, pageW - 15, y + 4);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
            doc.text(title.toUpperCase(), 18, y);
            doc.setFont('helvetica', 'normal');
            y += 10;
        };

        const addField = (label: string, value: string | undefined | null) => {
            if (!value || value.trim() === '') return;
            checkPage(8);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
            doc.text(label + ':', 20, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
            
            // Text wrap if needed
            const textLines = doc.splitTextToSize(value, pageW - 75);
            doc.text(textLines, 65, y);
            y += textLines.length * 4.5 + 2;
        };

        // ── Header (Clean & Minimalist) ──
        doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
        doc.rect(0, 0, pageW, 40, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text('EXPEDIENTE CLÍNICO', pageW / 2, 18, { align: 'center' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(clinicName || 'Clínica Dental', pageW / 2, 26, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setTextColor(200, 215, 255);
        doc.text(`Generado: ${new Date().toLocaleString('es-ES')} | Odontólogo Titular: Dr(a). ${doctorName}`, pageW / 2, 33, { align: 'center' });
        
        y = 50;

        // ── 1. Datos del Paciente ──
        sectionTitle('1. Datos Demográficos');
        addField('Nombre Completo', patient.identification.fullName);
        addField('Fecha de Nacimiento', patient.identification.birthDate);
        addField('Género', patient.identification.gender);
        addField('Teléfono', patient.identification.phone);
        addField('Correo Electrónico', patient.identification.email);
        addField('Dirección Local', patient.identification.address);
        addField('Ocupación', patient.identification.occupation);
        addField('ID Expediente', patient.id.slice(0, 8).toUpperCase());

        // ── 2. Antecedentes Clínicos ──
        sectionTitle('2. Historia Clínica y Antecedentes');
        addField('Alergias Conocidas', patient.clinicalHistory.allergies?.join(', ') || 'Niega o No Registra');
        addField('Medicamentos Actuales', patient.clinicalHistory.medications || 'Niega o No Registra');
        addField('Enfermedades Base', patient.clinicalHistory.previousDiseases || 'Niega o No Registra');
        addField('Antecedentes Familiares', patient.clinicalHistory.familyHistory || 'Sin datos de relevancia');
        
        if (patient.clinicalHistory.motiveOfConsult) {
            checkPage(20);
            y += 2;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
            doc.text('Motivo de consulta.', 20, y);
            y += 6;
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
            const motive = doc.splitTextToSize(`"${patient.clinicalHistory.motiveOfConsult}"`, pageW - 40);
            doc.text(motive, 20, y);
            doc.setFont('helvetica', 'normal');
            y += motive.length * 4.5 + 4;
        }

        // Helper for tables
        const drawTable = (head: string[][], body: (string|number)[][], colWidths?: any) => {
            autoTable(doc, {
                startY: y,
                head: head,
                body: body,
                theme: 'plain',
                headStyles: { fillColor: ACCENT, textColor: 255, fontSize: 8, fontStyle: 'bold' },
                bodyStyles: { fontSize: 8, textColor: PRIMARY },
                alternateRowStyles: { fillColor: LIGHT_BG },
                margin: { left: 20, right: 20 },
                columnStyles: colWidths,
            });
            y = (doc as any).lastAutoTable.finalY + 8;
        };

        // ── 3. Odontograma ──
        const teethWithConditions = (patient.odontogram || []).filter(t => t.surfaces && t.surfaces.length > 0);
        if (teethWithConditions.length > 0) {
            sectionTitle('3. Odontograma Inicial – Hallazgos');
            const odontoData = teethWithConditions.map(t => [
                `Pieza #${t.id}`,
                t.surfaces.map(s => `${s.surface}: ${s.condition}`).join(', ')
            ]);
            drawTable([['Pieza Analizada', 'Condiciones Detectadas']], odontoData, { 0: { cellWidth: 35 } });
        }

        // ── 3b. Periodontograma ──
        const perioTeeth = (patient.periodontogram?.teeth || []).filter(t => {
            const hasMeasurements = [...t.buccal, ...t.lingual].some(s => s.depth > 0 || s.recession > 0 || s.bleeding);
            return hasMeasurements || t.mobility > 0 || t.furcation > 0;
        });
        if (perioTeeth.length > 0) {
            sectionTitle('4. Evaluación Periodontal');
            const perioData = perioTeeth.map(t => {
                const buccalDepths = t.buccal.map(s => s.depth).join('/');
                const lingualDepths = t.lingual.map(s => s.depth).join('/');
                const buccalRec = t.buccal.map(s => s.recession).join('/');
                const lingualRec = t.lingual.map(s => s.recession).join('/');
                const bleeding = [...t.buccal, ...t.lingual].filter(s => s.bleeding).length;
                return [
                    `#${t.toothId}`,
                    `${buccalDepths}`,
                    `${lingualDepths}`,
                    `${buccalRec}`,
                    `${lingualRec}`,
                    bleeding > 0 ? `${bleeding}/6` : '-',
                    t.mobility > 0 ? String(t.mobility) : '-',
                    t.furcation > 0 ? String(t.furcation) : '-',
                ];
            });
            drawTable(
                [['Pieza', 'Prof. Vest.', 'Prof. Ling.', 'Rec. Vest.', 'Rec. Ling.', 'Sangrado', 'Mov.', 'Furc.']], 
                perioData
            );
        }

        // ── 4. Notas de Evolución ──
        if (patient.evolutionNotes?.length > 0) {
            sectionTitle('5. Evolución del Tratamiento');
            const notesData = patient.evolutionNotes.map(n => [n.date, n.procedure || 'Consulta', n.content]);
            drawTable([['Fecha', 'Motivo / Proc.', 'Observaciones Clínicas']], notesData, { 0: { cellWidth: 25 }, 1: { cellWidth: 40 } });
        }

        // ── 5. Historial Clínico ──
        if (patient.history?.length > 0) {
            sectionTitle('6. Registro de Intervenciones');
            const historyData = patient.history.map(e => [
                e.date,
                e.type === 'treatment' ? 'Tratamiento' : e.type === 'extraction' ? 'Extracción' : e.type === 'cleaning' ? 'Limpieza' : 'Diagnóstico',
                e.description,
                e.toothId ? `#${e.toothId}` : 'General'
            ]);
            drawTable([['Fecha', 'Categoría', 'Descripción Detallada', 'Pieza']], historyData, { 0: { cellWidth: 25 }, 1: { cellWidth: 30 }, 3: { cellWidth: 20 } });
        }

        // ── 6. Plan de Tratamiento (Presupuesto) ──
        const budgetItems = patient.budget || [];
        if (budgetItems.length > 0) {
            sectionTitle('7. Plan de Tratamiento Integral');
            let totalB = 0;
            const budgetData = budgetItems.map(b => {
                const rowTotal = b.unitCost * b.quantity;
                totalB += rowTotal;
                return [
                    b.treatment,
                    b.toothId ? `#${b.toothId}` : 'General',
                    b.quantity.toString(),
                    formatCurrency(b.unitCost),
                    formatCurrency(rowTotal),
                    b.status === 'completed' ? 'Completado' : b.status === 'in_progress' ? 'En curso' : 'Pendiente'
                ];
            });
            drawTable([['Procedimiento', 'Pieza', 'Cant.', 'Precio Unit.', 'Subtotal', 'Estado']], budgetData);
            
            checkPage(15);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
            doc.text(`Valor Total del Plan de Tratamiento: ${formatCurrency(totalB)}`, pageW - 20, y, { align: 'right' });
            y += 12;
        }

        // ── 7. Recetas ──
        const rxList = patient.prescriptions || [];
        if (rxList.length > 0) {
            sectionTitle('8. Recetario Médico');
            rxList.forEach((rx) => {
                checkPage(20);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
                doc.text(`Fecha: ${rx.date} — Diagnóstico: ${rx.diagnosis}`, 20, y);
                y += 5;
                doc.setFont('helvetica', 'normal');
                rx.medications.forEach(med => {
                    checkPage(10);
                    doc.setFontSize(8);
                    doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
                    doc.text(`• ${med.name} — ${med.dosage} — ${med.frequency} — ${med.duration}`, 25, y);
                    y += 4.5;
                });
                y += 3;
            });
        }

        // ── Footer (All Pages) ──
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setDrawColor(226, 232, 240);
            doc.line(20, pageH - 15, pageW - 20, pageH - 15);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            const footerText = `Expediente Clínico Confidencial — Ingresado por Dr(a). ${doctorName}`;
            doc.text(footerText, 20, pageH - 8);
            doc.text(`Página ${i} de ${pageCount}`, pageW - 20, pageH - 8, { align: 'right' });
        }

        // ── Export ──
        const safeName = patient.identification.fullName.trim() || 'Paciente';
        const sName = safeName.replace(/\s+/g, '-').toLowerCase();
        const sDate = new Date().toISOString().split('T')[0];
        const filename = `expediente-odontologico-${sName}-${sDate}.pdf`;
        
        doc.save(filename);
        sileo.success({ title: 'PDF Generado', description: 'El expediente médico ha sido guardado.' });
    } catch (error) {
        console.error('Error al generar PDF de expediente:', error);
        throw error;
    }
};
