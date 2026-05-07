import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PatientRecord, Payment } from '../types';
import { sileo } from 'sileo';
import { formatCurrency, getLocalISODate } from './utils';

export const generatePaymentReceiptPDF = async (
    patient: PatientRecord,
    payment: Payment,
    clinicName: string,
    doctorName: string
) => {
    try {
        const doc = new jsPDF() as any;
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        let y = 15;

        // Colors
        const PRIMARY: [number, number, number] = [15, 23, 42]; // Slate 900
        const SECONDARY: [number, number, number] = [100, 116, 139]; // Slate 500
        const ACCENT: [number, number, number] = [14, 116, 144]; // Cyan 700
        const LIGHT_BG: [number, number, number] = [241, 245, 249]; // Slate 100

        // Header Accent Strip
        doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
        doc.rect(0, 0, pageW, 8, 'F');

        y = 25;
        
        // Left side: Clinic Info
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
        doc.text(clinicName || 'Clínica Dental', 15, y);

        doc.setFontSize(10);
        doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
        doc.text(`Dr(a). ${doctorName}`, 15, y + 6);
        doc.text(`Fecha de emisión: ${payment.date}`, 15, y + 11);

        // Right side: Receipt Info
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
        doc.text('RECIBO OFICIAL', pageW - 15, y, { align: 'right' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
        // Generate a pseudo-receipt number based on the payment ID
        const receiptNumber = payment.id.split('-')[0].toUpperCase();
        doc.text(`N° RECIBO: ${receiptNumber}`, pageW - 15, y + 6, { align: 'right' });

        doc.setDrawColor(226, 232, 240);
        doc.line(15, y + 16, pageW - 15, y + 16);
        
        y += 26;

        // Patient Info
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
        doc.text('DATOS DEL PACIENTE', 15, y);
        y += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Nombre: ${patient.identification.fullName}`, 15, y);
        doc.text(`Identificación/ID: ${patient.id.split('-')[0].toUpperCase()}`, 15, y + 5);
        if (patient.identification.email) {
            doc.text(`Correo: ${patient.identification.email}`, 15, y + 10);
            y += 5;
        }
        
        y += 15;

        // Payment Details Table
        const getMethodLabel = (m: string) => {
            switch(m) {
                case 'cash': return 'Efectivo';
                case 'card': return 'Tarjeta de Crédito/Débito';
                case 'transfer': return 'Transferencia Bancaria';
                default: return 'Otro';
            }
        };

        autoTable(doc, {
            startY: y,
            head: [['Concepto', 'Método de Pago', 'Importe Neto']],
            body: [
                [
                    payment.note || 'Abono a tratamiento odontológico', 
                    getMethodLabel(payment.method), 
                    formatCurrency(payment.amount)
                ]
            ],
            theme: 'striped',
            headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 10, fontStyle: 'bold' },
            bodyStyles: { fontSize: 10, textColor: PRIMARY, cellPadding: 6 },
            margin: { left: 15, right: 15 },
        });

        y = (doc as any).lastAutoTable.finalY + 15;

        // Totals Section
        doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
        doc.rect(pageW - 85, y - 5, 70, 30, 'F');
        
        doc.setFontSize(10);
        doc.text('Subtotal:', pageW - 80, y + 2);
        doc.text('Impuestos:', pageW - 80, y + 8);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL PAGADO:', pageW - 80, y + 16);

        doc.setFont('helvetica', 'normal');
        doc.text(formatCurrency(payment.amount), pageW - 20, y + 2, { align: 'right' });
        doc.text(formatCurrency(0), pageW - 20, y + 8, { align: 'right' }); // Taxes at 0 for now
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
        doc.text(formatCurrency(payment.amount), pageW - 20, y + 16, { align: 'right' });

        y += 40;

        // Current Balance Status
        const totalBudget = (patient.budget || []).reduce((acc, item) => acc + (item.unitCost * item.quantity), 0);
        const totalPaid = (patient.payments || []).reduce((acc, p) => acc + p.amount, 0);
        const balance = Math.max(0, totalBudget - totalPaid);

        doc.setFontSize(9);
        doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
        doc.text(`Estado de Cuenta Actualizado:`, 15, y);
        doc.text(`Total del Presupuesto: ${formatCurrency(totalBudget)}`, 15, y + 5);
        doc.text(`Saldo Pendiente (Deuda): ${formatCurrency(balance)}`, 15, y + 10);

        y += 40;

        // Signature Line
        doc.setDrawColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
        doc.line(15, y, 75, y);
        doc.text('Firma y Sello Recibido', 45, y + 5, { align: 'center' });

        // Footer
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Este documento es un comprobante de pago emitido por ${clinicName}.`, 15, pageH - 12);
        doc.text(`Generado vía DienteLink — ${getLocalISODate()}`, 15, pageH - 8);

        // Export
        const safeName = patient.identification.fullName.trim().replace(/\s+/g, '-').toLowerCase();
        const filename = `Recibo-${receiptNumber}-${safeName}.pdf`;
        
        doc.save(filename);
        sileo.success({ title: 'Recibo Generado', description: 'El recibo de pago ha sido descargado.' });
    } catch (error) {
        console.error('Error al generar PDF de recibo:', error);
        sileo.error({ title: 'Error', description: 'No se pudo generar el recibo PDF.' });
    }
};

export const generateAccountStatementPDF = async (
    patient: PatientRecord,
    clinicName: string,
    doctorName: string
) => {
    try {
        const doc = new jsPDF() as any;
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        let y = 15;

        // Colors
        const PRIMARY: [number, number, number] = [15, 23, 42]; 
        const SECONDARY: [number, number, number] = [100, 116, 139]; 
        const ACCENT: [number, number, number] = [14, 116, 144]; 
        const LIGHT_BG: [number, number, number] = [241, 245, 249]; 

        // Header Accent Strip
        doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
        doc.rect(0, 0, pageW, 8, 'F');

        y = 25;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
        doc.text(clinicName || 'Clínica Dental', 15, y);

        doc.setFontSize(10);
        doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
        doc.text(`Dr(a). ${doctorName}`, 15, y + 6);
        doc.text(`Fecha de emisión: ${getLocalISODate()}`, 15, y + 11);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
        doc.text('ESTADO DE CUENTA', pageW - 15, y, { align: 'right' });

        doc.setDrawColor(226, 232, 240);
        doc.line(15, y + 16, pageW - 15, y + 16);
        
        y += 26;

        // Patient Info
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
        doc.text('DATOS DEL PACIENTE', 15, y);
        y += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Nombre: ${patient.identification.fullName}`, 15, y);
        doc.text(`Identificación/ID: ${patient.id.split('-')[0].toUpperCase()}`, 15, y + 5);
        if (patient.identification.email) {
            doc.text(`Correo: ${patient.identification.email}`, 15, y + 10);
            y += 5;
        }
        
        y += 15;

        // Balance Summary
        const totalBudget = (patient.budget || []).reduce((acc, item) => acc + (item.unitCost * item.quantity), 0);
        const totalPaid = (patient.payments || []).reduce((acc, p) => acc + p.amount, 0);
        const balance = Math.max(0, totalBudget - totalPaid);

        doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
        doc.rect(15, y - 5, pageW - 30, 20, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
        doc.text(`Total Tratamientos: ${formatCurrency(totalBudget)}`, 20, y + 2);
        doc.text(`Total Pagado: ${formatCurrency(totalPaid)}`, pageW / 2 - 20, y + 2);
        
        doc.setTextColor(balance > 0 ? 220 : ACCENT[0], balance > 0 ? 38 : ACCENT[1], balance > 0 ? 38 : ACCENT[2]);
        doc.text(`Saldo Pendiente: ${formatCurrency(balance)}`, pageW - 60, y + 2);

        y += 25;

        // Treatments Breakdown
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
        doc.text('RESUMEN DE TRATAMIENTOS', 15, y);
        y += 5;

        const budgetRows = (patient.budget || []).map(b => [
            b.createdAt.split('T')[0] || '-',
            b.treatment,
            b.toothId ? `#${b.toothId}` : 'N/A',
            `${b.quantity}x ${formatCurrency(b.unitCost)}`,
            b.status === 'completed' ? 'Completado' : b.status === 'in_progress' ? 'En curso' : 'Pendiente',
            formatCurrency(b.unitCost * b.quantity)
        ]);

        if (budgetRows.length > 0) {
            autoTable(doc, {
                startY: y,
                head: [['Fecha', 'Tratamiento', 'Pieza', 'Precio', 'Estado', 'Total']],
                body: budgetRows,
                theme: 'grid',
                headStyles: { fillColor: SECONDARY, textColor: 255, fontSize: 9 },
                bodyStyles: { fontSize: 8, textColor: PRIMARY },
                margin: { left: 15, right: 15 },
            });
            y = (doc as any).lastAutoTable.finalY + 15;
        } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text('No hay tratamientos registrados.', 15, y + 5);
            y += 15;
        }

        // Payments Breakdown
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('HISTORIAL DE PAGOS', 15, y);
        y += 5;

        const getMethodLabel = (m: string) => {
            switch(m) {
                case 'cash': return 'Efectivo';
                case 'card': return 'Tarjeta';
                case 'transfer': return 'Transferencia';
                default: return 'Otro';
            }
        };

        const paymentRows = (patient.payments || []).map(p => [
            p.date,
            p.note || 'Abono',
            getMethodLabel(p.method),
            formatCurrency(p.amount)
        ]);

        if (paymentRows.length > 0) {
            autoTable(doc, {
                startY: y,
                head: [['Fecha', 'Concepto / Nota', 'Método', 'Monto']],
                body: paymentRows,
                theme: 'striped',
                headStyles: { fillColor: ACCENT, textColor: 255, fontSize: 9 },
                bodyStyles: { fontSize: 9, textColor: PRIMARY },
                margin: { left: 15, right: 15 },
            });
        } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text('No hay pagos registrados.', 15, y + 5);
        }

        const safeName = patient.identification.fullName.trim().replace(/\s+/g, '-').toLowerCase();
        const filename = `EstadoCuenta-${safeName}.pdf`;
        
        doc.save(filename);
        sileo.success({ title: 'Estado de Cuenta', description: 'El documento ha sido descargado.' });
    } catch (error) {
        console.error('Error al generar estado de cuenta:', error);
        sileo.error({ title: 'Error', description: 'No se pudo generar el documento.' });
    }
};
