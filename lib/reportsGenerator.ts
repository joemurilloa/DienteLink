import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PatientRecord, Appointment } from '../types';
import { sileo } from 'sileo';
import { formatCurrency, getLocalISODate } from './utils';

/**
 * Generates a monthly summary report PDF with revenue metrics and appointment stats.
 */
export const generateMonthlyReportPDF = async (
    month: number, 
    year: number, 
    patients: PatientRecord[], 
    appointments: Appointment[],
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

        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const monthName = monthNames[month];

        // Header
        doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
        doc.rect(0, 0, pageW, 8, 'F');

        y = 25;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
        doc.text(clinicName || 'Clínica Dental', 15, y);

        doc.setFontSize(10);
        doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
        doc.text(`Reporte de Desempeño Mensual - ${monthName} ${year}`, 15, y + 8);
        doc.text(`Dr(a). ${doctorName}`, 15, y + 13);

        doc.setDrawColor(226, 232, 240);
        doc.line(15, y + 18, pageW - 15, y + 18);
        y += 30;

        // Filter data for the month
        const monthApts = appointments.filter(a => {
            const d = new Date(a.date + 'T12:00:00');
            return d.getMonth() === month && d.getFullYear() === year;
        });

        const monthPayments: { amount: number, method: string, date: string, patient: string }[] = [];
        patients.forEach(p => {
            (p.payments || []).forEach(pay => {
                const d = new Date(pay.date + 'T12:00:00');
                if (d.getMonth() === month && d.getFullYear() === year) {
                    monthPayments.push({ ...pay, patient: p.identification.fullName });
                }
            });
        });

        // Summary Metrics
        doc.setFontSize(12);
        doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
        doc.text('RESUMEN GENERAL', 15, y);
        y += 10;

        const totalRevenue = monthPayments.reduce((s, p) => s + p.amount, 0);
        const completedApts = monthApts.filter(a => a.status === 'Completada').length;
        const newPatientsCount = patients.filter(p => {
            if (!p.createdAt) {
                // Fallback to first history item
                if (p.history.length === 0) return false;
                const firstDate = p.history[p.history.length - 1].date;
                const d = new Date(firstDate + 'T12:00:00');
                return d.getMonth() === month && d.getFullYear() === year;
            }
            const d = new Date(p.createdAt);
            return d.getMonth() === month && d.getFullYear() === year;
        }).length;

        autoTable(doc, {
            startY: y,
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 5 },
            body: [
                ['Total de Citas Atendidas:', String(completedApts), 'Total de Ingresos:', formatCurrency(totalRevenue)],
                ['Nuevos Pacientes:', String(newPatientsCount), 'Promedio por Cita:', formatCurrency(completedApts > 0 ? totalRevenue / completedApts : 0)]
            ],
            columnStyles: { 0: { fontStyle: 'bold', textColor: SECONDARY }, 2: { fontStyle: 'bold', textColor: SECONDARY } }
        });

        y = (doc as any).lastAutoTable.finalY + 15;

        // Payment Methods Breakdown
        doc.setFontSize(12);
        doc.text('DISTRIBUCIÓN POR MÉTODO DE PAGO', 15, y);
        y += 5;

        const methods = { cash: 0, card: 0, transfer: 0, other: 0 };
        monthPayments.forEach(p => {
            const m = p.method as keyof typeof methods;
            if (m in methods) methods[m] += p.amount;
        });

        autoTable(doc, {
            startY: y,
            head: [['Método', 'Monto Total']],
            body: [
                ['Efectivo', formatCurrency(methods.cash)],
                ['Tarjeta', formatCurrency(methods.card)],
                ['Transferencia', formatCurrency(methods.transfer)],
                ['Otro', formatCurrency(methods.other)]
            ],
            theme: 'striped',
            headStyles: { fillColor: ACCENT },
            margin: { left: 15, right: 100 }
        });

        y = (doc as any).lastAutoTable.finalY + 15;

        // Detailed Payments List
        doc.setFontSize(12);
        doc.text('DETALLE DE INGRESOS', 15, y);
        y += 5;

        const paymentRows = monthPayments
            .sort((a, b) => b.date.localeCompare(a.date))
            .map(p => [
                p.date, 
                p.patient, 
                p.method === 'cash' ? 'Efectivo' : p.method === 'card' ? 'Tarjeta' : p.method === 'transfer' ? 'Transf.' : 'Otro', 
                formatCurrency(p.amount)
            ]);

        if (paymentRows.length === 0) {
            doc.setFontSize(9);
            doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
            doc.text('No se registraron pagos en este periodo.', 15, y + 5);
        } else {
            autoTable(doc, {
                startY: y,
                head: [['Fecha', 'Paciente', 'Método', 'Monto']],
                body: paymentRows,
                theme: 'striped',
                headStyles: { fillColor: PRIMARY },
                styles: { fontSize: 8 }
            });
        }

        // Footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
            doc.text(`Página ${i} de ${pageCount}`, pageW - 15, pageH - 10, { align: 'right' });
            doc.text(`Reporte generado por DienteLink — ${getLocalISODate()}`, 15, pageH - 10);
        }

        doc.save(`Reporte-${monthName}-${year}.pdf`);
        sileo.success({ title: 'Reporte Generado', description: `Se ha descargado el reporte de ${monthName}.` });
    } catch (e) {
        console.error(e);
        sileo.error({ title: 'Error', description: 'No se pudo generar el reporte PDF.' });
    }
};
