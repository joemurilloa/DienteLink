import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PatientRecord } from '../types';
import { sileo } from 'sileo';
import { formatCurrency, getLocalISODate } from './utils';

export const generatePatientPDF = async (patient: PatientRecord, clinicName: string, doctorName: string) => {
    try {
        const doc = new jsPDF() as any;
        if (!doc || !doc.internal) throw new Error("No se pudo iniciar jsPDF");

        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        let y = 15;

        // Custom Colors & Premium Styles
        const PRIMARY: [number, number, number] = [15, 23, 42]; // Slate 900
        const SECONDARY: [number, number, number] = [100, 116, 139]; // Slate 500
        const ACCENT: [number, number, number] = [14, 116, 144]; // Cyan 700 (Very clinical)
        const LIGHT_BG: [number, number, number] = [241, 245, 249]; // Slate 100

        const checkPage = (needed: number) => {
            if (y + needed > pageH - 25) { 
                doc.addPage(); 
                y = 25; 
            }
        };

        const drawSectionHeader = (title: string, iconStr: string = '') => {
            checkPage(15);
            y += 6;
            
            // Accent left bar
            doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
            doc.rect(14, y - 5, 2, 8, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
            doc.text(`${iconStr} ${title}`.toUpperCase(), 20, y);
            
            doc.setFont('helvetica', 'normal');
            y += 8;
        };

        // ── 1. Header (Premium Clinic Branding) ──
        doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
        doc.rect(0, 0, pageW, 8, 'F'); // Top accent strip

        y = 25;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
        doc.text(clinicName || 'Clínica Dental', 15, y);

        doc.setFontSize(10);
        doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
        doc.text(`Dr(a). ${doctorName}`, 15, y + 6);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 15, y + 11);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
        doc.text('EXPEDIENTE CLÍNICO', pageW - 15, y, { align: 'right' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
        doc.text(`ID: ${patient.id.slice(0, 8).toUpperCase()}`, pageW - 15, y + 6, { align: 'right' });

        doc.setDrawColor(226, 232, 240);
        doc.line(15, y + 16, pageW - 15, y + 16);
        
        y += 24;

        // ── 2. Datos Demográficos (Grid layout using autoTable) ──
        drawSectionHeader('Datos del Paciente');
        autoTable(doc, {
            startY: y,
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: 2, textColor: PRIMARY },
            body: [
                [
                    { content: 'Nombre:', styles: { fontStyle: 'bold', textColor: SECONDARY } }, patient.identification.fullName,
                    { content: 'Fecha Nac.:', styles: { fontStyle: 'bold', textColor: SECONDARY } }, patient.identification.birthDate
                ],
                [
                    { content: 'Teléfono:', styles: { fontStyle: 'bold', textColor: SECONDARY } }, patient.identification.phone,
                    { content: 'Email:', styles: { fontStyle: 'bold', textColor: SECONDARY } }, patient.identification.email
                ],
                [
                    { content: 'Género:', styles: { fontStyle: 'bold', textColor: SECONDARY } }, patient.identification.gender,
                    { content: 'Ocupación:', styles: { fontStyle: 'bold', textColor: SECONDARY } }, patient.identification.occupation
                ],
                [
                    { content: 'Dirección:', styles: { fontStyle: 'bold', textColor: SECONDARY } }, 
                    { content: patient.identification.address, colSpan: 3 }
                ]
            ],
            margin: { left: 15, right: 15 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;

        // ── 3. Historia Clínica (Antecedentes) ──
        drawSectionHeader('Anamnesis y Antecedentes');
        autoTable(doc, {
            startY: y,
            theme: 'grid',
            headStyles: { fillColor: LIGHT_BG, textColor: PRIMARY, fontStyle: 'bold', lineWidth: 0.1, lineColor: 226 },
            bodyStyles: { fontSize: 9, textColor: PRIMARY, lineWidth: 0.1, lineColor: 226 },
            body: [
                ['Alergias', patient.clinicalHistory.allergies?.join(', ') || 'Ninguna registrada'],
                ['Enfermedades Base', patient.clinicalHistory.previousDiseases || 'Ninguna registrada'],
                ['Medicamentos Activos', patient.clinicalHistory.medications || 'Ninguno registrado'],
                ['Motivo de Consulta', patient.clinicalHistory.motiveOfConsult || 'Revisión general']
            ],
            columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold', fillColor: LIGHT_BG } },
            margin: { left: 15, right: 15 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;

        // Helper for clinical tables
        const drawClinicalTable = (head: string[][], body: (string|number)[][], colWidths?: any) => {
            autoTable(doc, {
                startY: y,
                head: head,
                body: body,
                theme: 'striped',
                headStyles: { fillColor: ACCENT, textColor: 255, fontSize: 9, fontStyle: 'bold' },
                bodyStyles: { fontSize: 8, textColor: PRIMARY },
                alternateRowStyles: { fillColor: LIGHT_BG },
                margin: { left: 15, right: 15 },
                columnStyles: colWidths,
            });
            y = (doc as any).lastAutoTable.finalY + 8;
        };

        // ── 4. Odontograma ──
        const teethWithConditions = (patient.odontogram || []).filter(t => t.surfaces && t.surfaces.length > 0);
        if (teethWithConditions.length > 0) {
            drawSectionHeader('Odontograma Inicial');
            const odontoData = teethWithConditions.map(t => [
                `Pieza #${t.id}`,
                t.surfaces.map(s => `${s.surface}: ${s.condition}`).join(', ')
            ]);
            drawClinicalTable([['Pieza', 'Hallazgos / Condiciones']], odontoData, { 0: { cellWidth: 30 } });
        }

        // ── 5. Periodontograma ──
        const perioTeeth = (patient.periodontogram?.teeth || []).filter(t => {
            const hasMeasurements = [...t.buccal, ...t.lingual].some(s => s.depth > 0 || s.recession > 0 || s.bleeding);
            return hasMeasurements || t.mobility > 0 || t.furcation > 0;
        });
        if (perioTeeth.length > 0) {
            drawSectionHeader('Sondaje Periodontal');
            const perioData = perioTeeth.map(t => {
                const buccalDepths = t.buccal.map(s => s.depth).join('/');
                const lingualDepths = t.lingual.map(s => s.depth).join('/');
                const bleeding = [...t.buccal, ...t.lingual].filter(s => s.bleeding).length;
                return [
                    `#${t.toothId}`,
                    `${buccalDepths}`,
                    `${lingualDepths}`,
                    bleeding > 0 ? `${bleeding}/6` : '-',
                    t.mobility > 0 ? String(t.mobility) : '-',
                    t.furcation > 0 ? String(t.furcation) : '-',
                ];
            });
            drawClinicalTable(
                [['Pieza', 'Prof. Vestibular', 'Prof. Lingual', 'BOP (Sangrado)', 'Movilidad', 'Furcación']], 
                perioData
            );
        }

        // ── 6. Historial de Evolución ──
        if (patient.evolutionNotes?.length > 0) {
            drawSectionHeader('Notas de Evolución');
            const notesData = patient.evolutionNotes.map(n => [n.date, n.procedure || 'Consulta', n.content]);
            drawClinicalTable([['Fecha', 'Procedimiento', 'Observaciones Clínicas']], notesData, { 0: { cellWidth: 25 }, 1: { cellWidth: 40 } });
        }

        // ── 7. Plan de Tratamiento (Presupuesto) ──
        const budgetItems = patient.budget || [];
        if (budgetItems.length > 0) {
            drawSectionHeader('Plan de Tratamiento / Presupuesto');
            let totalB = 0;
            const budgetData = budgetItems.map(b => {
                const rowTotal = b.unitCost * b.quantity;
                totalB += rowTotal;
                return [
                    b.treatment,
                    b.toothId ? `#${b.toothId}` : 'Gral',
                    formatCurrency(b.unitCost),
                    b.quantity.toString(),
                    formatCurrency(rowTotal),
                ];
            });
            
            // Add total row
            budgetData.push([
                { content: 'TOTAL DEL TRATAMIENTO', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } } as any,
                { content: formatCurrency(totalB), styles: { fontStyle: 'bold' } } as any
            ]);

            drawClinicalTable([['Procedimiento Estimado', 'Pieza', 'Precio Unit.', 'Cant.', 'Subtotal']], budgetData);
        }

         // ── 8. Firmas (Si hay consentimiento) ──
         const consents = patient.consents || [];
         if (consents.length > 0) {
             checkPage(40);
             y += 20;
             doc.setDrawColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
             
             // Doctor Signature Line
             doc.line(30, y, 90, y);
             doc.setFontSize(8);
             doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
             doc.text(`Firma y Sello Dr(a). ${doctorName}`, 60, y + 5, { align: 'center' });

             // Patient Signature Line
             doc.line(120, y, 180, y);
             doc.text(`Firma del Paciente / Tutor`, 150, y + 5, { align: 'center' });
             doc.text(`${patient.identification.fullName}`, 150, y + 10, { align: 'center' });
         }

        // ── Footer (All Pages) ──
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setDrawColor(226, 232, 240);
            doc.line(15, pageH - 15, pageW - 15, pageH - 15);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            const footerText = `Documento Confidencial Médico-Legal — Propiedad de ${clinicName}`;
            doc.text(footerText, 15, pageH - 8);
            doc.setFont('helvetica', 'normal');
            doc.text(`Página ${i} de ${pageCount}`, pageW - 15, pageH - 8, { align: 'right' });
        }

        // ── Export ──
        const safeName = patient.identification.fullName.trim() || 'Paciente';
        const sName = safeName.replace(/\s+/g, '-').toLowerCase();
        const sDate = getLocalISODate(new Date());
        const filename = `Expediente-${sName}-${sDate}.pdf`;
        
        doc.save(filename);
        sileo.success({ title: 'PDF Generado Exitosamente', description: 'El expediente médico profesional ha sido guardado.' });
    } catch (error) {
        console.error('Error al generar PDF de expediente:', error);
        throw error;
    }
};
