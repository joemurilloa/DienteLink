
import { supabase } from '../lib/supabase';
import { PatientRecord, Appointment, ClinicalEvent, ToothData, SurfaceData, OdontogramSnapshot, BudgetItem, Payment, ConsentForm, Prescription } from '../types';
import { ensurePeriodontogramData } from '../lib/utils';

// ==========================================================
// In-Memory Cache + Supabase Write-Through Persistence
//
// Reads are SYNC (from memory) — no component changes needed.
// Writes are ASYNC (update memory + push to Supabase).
// Call init(userId) once after login before rendering the app.
// ==========================================================

class PersistenceService {
    private patients: PatientRecord[] = [];
    private appointments: Appointment[] = [];
    private userId: string | null = null;
    private _ready = false;
    private _onError: ((message: string) => void) | null = null;

    get ready() { return this._ready; }

    /** Register a callback to surface Supabase write errors to the UI */
    onError(cb: (message: string) => void) { this._onError = cb; }

    private notifyError(context: string, error: any) {
        console.error(`[Supabase] ${context}:`, error);
        if (this._onError) {
            this._onError(`Error al guardar ${context}. Los cambios se mantienen localmente pero no se sincronizaron con la nube.`);
        }
    }

    // --- Initialization (loads everything from Supabase once) ---
    async init(userId: string): Promise<void> {
        this.userId = userId;
        
        const [patientsRes, aptsRes, notesRes, eventsRes, budgetRes, paymentsRes, consentsRes, prescriptionsRes] = await Promise.all([
            supabase.from('patients').select('*').eq('doctor_id', userId).order('created_at', { ascending: false }),
            supabase.from('appointments').select('*').eq('doctor_id', userId).order('date').order('time'),
            supabase.from('evolution_notes').select('*').eq('doctor_id', userId).order('created_at', { ascending: false }),
            supabase.from('clinical_events').select('*').eq('doctor_id', userId).order('created_at', { ascending: false }),
            supabase.from('budget_items').select('*').eq('doctor_id', userId).order('created_at', { ascending: false }),
            supabase.from('payments').select('*').eq('doctor_id', userId).order('created_at', { ascending: false }),
            supabase.from('consent_forms').select('*').eq('doctor_id', userId).order('created_at', { ascending: false }),
            supabase.from('prescriptions').select('*').eq('doctor_id', userId).order('created_at', { ascending: false }),
        ]);

        const notesByPatient = groupBy(notesRes.data || [], 'patient_id');
        const eventsByPatient = groupBy(eventsRes.data || [], 'patient_id');
        const budgetByPatient = groupBy(budgetRes.data || [], 'patient_id');
        const paymentsByPatient = groupBy(paymentsRes.data || [], 'patient_id');
        const consentsByPatient = groupBy(consentsRes.data || [], 'patient_id');
        const prescriptionsByPatient = groupBy(prescriptionsRes.data || [], 'patient_id');

        this.patients = (patientsRes.data || []).map(p =>
            dbToPatient(p, notesByPatient[p.id] || [], eventsByPatient[p.id] || [], budgetByPatient[p.id] || [], paymentsByPatient[p.id] || [], consentsByPatient[p.id] || [], prescriptionsByPatient[p.id] || [])
        );
        this.appointments = (aptsRes.data || []).map(dbToAppointment);
        this._ready = true;
    }

    reset() {
        this.patients = [];
        this.appointments = [];
        this.userId = null;
        this._ready = false;
    }

    private uid(): string {
        if (!this.userId) throw new Error('PersistenceService not initialized — call init(userId) first');
        return this.userId;
    }

    // ===================== PATIENTS (sync reads) =====================

    getPatients(): PatientRecord[] {
        return this.patients;
    }

    getPatientById(id: string): PatientRecord | undefined {
        return this.patients.find(p => p.id === id);
    }

    // ===================== PATIENTS (async writes) =====================

    async savePatient(patient: PatientRecord): Promise<void> {
        const doctorId = this.uid();

        // Update in-memory cache first (instant UI)
        const idx = this.patients.findIndex(p => p.id === patient.id);
        if (idx !== -1) { this.patients[idx] = patient; } else { this.patients.unshift(patient); }

        // Write to Supabase in background
        const { error } = await supabase.from('patients').upsert({
            id: patient.id,
            doctor_id: doctorId,
            full_name: patient.identification.fullName,
            birth_date: patient.identification.birthDate || null,
            gender: patient.identification.gender || null,
            address: patient.identification.address || null,
            phone: patient.identification.phone || null,
            email: patient.identification.email || null,
            occupation: patient.identification.occupation || null,
            allergies: patient.clinicalHistory.allergies,
            medications: patient.clinicalHistory.medications || null,
            previous_diseases: patient.clinicalHistory.previousDiseases || null,
            family_history: patient.clinicalHistory.familyHistory || null,
            motive_of_consult: patient.clinicalHistory.motiveOfConsult || null,
            consent_signed: patient.consentSigned,
            odontogram: patient.odontogram,
            odontogram_history: patient.odontogramHistory || [],
            periodontogram: patient.periodontogram,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

        if (error) this.notifyError('paciente', error);

        // Upsert evolution notes individually (safe for concurrent edits)
        if (patient.evolutionNotes.length > 0) {
            const { error: notesErr } = await supabase.from('evolution_notes').upsert(
                patient.evolutionNotes.map(n => ({
                    id: n.id,
                    patient_id: patient.id,
                    doctor_id: doctorId,
                    date: n.date,
                    content: n.content,
                    procedure: n.procedure,
                })),
                { onConflict: 'id' }
            );
            if (notesErr) this.notifyError('notas de evolución', notesErr);
        }

        // Upsert clinical events individually
        if (patient.history.length > 0) {
            const { error: eventsErr } = await supabase.from('clinical_events').upsert(
                patient.history.map(e => ({
                    id: e.id,
                    patient_id: patient.id,
                    doctor_id: doctorId,
                    date: e.date,
                    type: e.type,
                    description: e.description,
                    tooth_id: e.toothId || null,
                })),
                { onConflict: 'id' }
            );
            if (eventsErr) this.notifyError('eventos clínicos', eventsErr);
        }

        // Upsert budget items
        if (patient.budget && patient.budget.length > 0) {
            const { error: budgetErr } = await supabase.from('budget_items').upsert(
                patient.budget.map(b => ({
                    id: b.id,
                    patient_id: patient.id,
                    doctor_id: doctorId,
                    treatment: b.treatment,
                    tooth_id: b.toothId || null,
                    unit_cost: b.unitCost,
                    quantity: b.quantity,
                    status: b.status,
                    created_at: b.createdAt,
                })),
                { onConflict: 'id' }
            );
            if (budgetErr) this.notifyError('presupuesto', budgetErr);
        }

        // Upsert payments
        if (patient.payments && patient.payments.length > 0) {
            const { error: payErr } = await supabase.from('payments').upsert(
                patient.payments.map(p => ({
                    id: p.id,
                    patient_id: patient.id,
                    doctor_id: doctorId,
                    amount: p.amount,
                    method: p.method,
                    note: p.note,
                    date: p.date,
                })),
                { onConflict: 'id' }
            );
            if (payErr) this.notifyError('pagos', payErr);
        }

        // Upsert consent forms
        if (patient.consents && patient.consents.length > 0) {
            const { error: consentErr } = await supabase.from('consent_forms').upsert(
                patient.consents.map(c => ({
                    id: c.id,
                    patient_id: patient.id,
                    doctor_id: doctorId,
                    title: c.title,
                    content: c.content,
                    signature_data: c.signatureData,
                    signed_at: c.signedAt,
                    witness_name: c.witnessName || null,
                })),
                { onConflict: 'id' }
            );
            if (consentErr) this.notifyError('consentimientos', consentErr);
        }

        // Upsert prescriptions
        if (patient.prescriptions && patient.prescriptions.length > 0) {
            const { error: rxErr } = await supabase.from('prescriptions').upsert(
                patient.prescriptions.map(rx => ({
                    id: rx.id,
                    patient_id: patient.id,
                    doctor_id: doctorId,
                    date: rx.date,
                    diagnosis: rx.diagnosis,
                    medications: rx.medications,
                    notes: rx.notes,
                })),
                { onConflict: 'id' }
            );
            if (rxErr) this.notifyError('recetas', rxErr);
        }
    }

    async deletePatient(patientId: string): Promise<void> {
        // Update in-memory
        this.patients = this.patients.filter(p => p.id !== patientId);
        this.appointments = this.appointments.filter(a => a.patientId !== patientId);

        // Delete from Supabase (CASCADE handles notes + events)
        await supabase.from('patients').delete().eq('id', patientId).eq('doctor_id', this.uid());
        await supabase.from('appointments').delete().eq('patient_id', patientId).eq('doctor_id', this.uid());
    }

    // ===================== APPOINTMENTS (sync reads) =====================

    getAppointments(): Appointment[] {
        return this.appointments.filter(a => a.status !== 'Eliminada');
    }

    getDeletedAppointments(): Appointment[] {
        return this.appointments.filter(a => a.status === 'Eliminada');
    }

    getAppointmentsForDate(dateStr: string): Appointment[] {
        return this.appointments.filter(a => a.date === dateStr && a.status !== 'Eliminada');
    }

    // ===================== APPOINTMENTS (async writes) =====================

    async saveAppointment(appointment: Appointment): Promise<void> {
        const doctorId = this.uid();

        // Update in-memory
        const idx = this.appointments.findIndex(a => a.id === appointment.id);
        if (idx !== -1) { this.appointments[idx] = appointment; } else { this.appointments.push(appointment); }

        const { error } = await supabase.from('appointments').upsert({
            id: appointment.id,
            doctor_id: doctorId,
            patient_id: appointment.patientId || null,
            patient_name: appointment.patientName,
            phone_number: appointment.phoneNumber || null,
            time: appointment.time,
            date: appointment.date,
            type: appointment.type,
            status: appointment.status,
            reminder_status: appointment.reminderStatus,
            deleted_at: appointment.deletedAt || null,
        }, { onConflict: 'id' });

        if (error) this.notifyError('cita', error);
    }

    async deleteAppointment(appointmentId: string): Promise<void> {
        // Soft-delete: mark as 'Eliminada' with timestamp
        const apt = this.appointments.find(a => a.id === appointmentId);
        if (apt) {
            apt.status = 'Eliminada';
            apt.deletedAt = new Date().toISOString();
        }
        await supabase.from('appointments').update({ status: 'Eliminada', deleted_at: apt?.deletedAt || new Date().toISOString() }).eq('id', appointmentId).eq('doctor_id', this.uid());
    }

    async restoreAppointment(appointmentId: string): Promise<void> {
        const apt = this.appointments.find(a => a.id === appointmentId);
        if (apt) {
            apt.status = 'Programada';
            apt.deletedAt = undefined;
        }
        await supabase.from('appointments').update({ status: 'Programada', deleted_at: null }).eq('id', appointmentId).eq('doctor_id', this.uid());
    }

    async permanentlyDeleteAppointment(appointmentId: string): Promise<void> {
        this.appointments = this.appointments.filter(a => a.id !== appointmentId);
        await supabase.from('appointments').delete().eq('id', appointmentId).eq('doctor_id', this.uid());
    }

    // ===================== CLEAR ALL (settings danger zone) =====================

    async clearAllData(): Promise<void> {
        const doctorId = this.uid();
        this.patients = [];
        this.appointments = [];

        await Promise.all([
            supabase.from('payments').delete().eq('doctor_id', doctorId),
            supabase.from('budget_items').delete().eq('doctor_id', doctorId),
            supabase.from('consent_forms').delete().eq('doctor_id', doctorId),
            supabase.from('prescriptions').delete().eq('doctor_id', doctorId),
            supabase.from('appointments').delete().eq('doctor_id', doctorId),
            supabase.from('evolution_notes').delete().eq('doctor_id', doctorId),
            supabase.from('clinical_events').delete().eq('doctor_id', doctorId),
            supabase.from('patients').delete().eq('doctor_id', doctorId),
            supabase.from('appointment_requests').delete().eq('doctor_id', doctorId),
            supabase.from('doctor_availability').delete().eq('doctor_id', doctorId),
            supabase.from('booking_settings').delete().eq('doctor_id', doctorId),
        ]);
    }
}

// ===================== Helpers =====================

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
    return arr.reduce((acc, item) => {
        const k = String(item[key]);
        if (!acc[k]) acc[k] = [];
        acc[k].push(item);
        return acc;
    }, {} as Record<string, T[]>);
}

function dbToPatient(p: any, notes: any[], events: any[], budgetItems: any[] = [], payments: any[] = [], consents: any[] = [], prescriptions: any[] = []): PatientRecord {
    return {
        id: p.id,
        identification: {
            fullName: p.full_name || '',
            birthDate: p.birth_date || '',
            gender: p.gender || '',
            address: p.address || '',
            phone: p.phone || '',
            email: p.email || '',
            occupation: p.occupation || '',
        },
        clinicalHistory: {
            allergies: p.allergies || [],
            medications: p.medications || '',
            previousDiseases: p.previous_diseases || '',
            familyHistory: p.family_history || '',
            motiveOfConsult: p.motive_of_consult || '',
        },
        evolutionNotes: notes.map(n => ({
            id: n.id,
            date: n.date,
            content: n.content,
            procedure: n.procedure || '',
        })),
        history: events.map(e => ({
            id: e.id,
            date: e.date,
            type: e.type,
            description: e.description,
            toothId: e.tooth_id,
        })),
        consentSigned: p.consent_signed || false,
        odontogram: (p.odontogram as ToothData[]) || Array.from({ length: 32 }, (_, i) => ({ id: i + 1, surfaces: [] as SurfaceData[] })),
        odontogramHistory: (p.odontogram_history as OdontogramSnapshot[]) || [],
        periodontogram: ensurePeriodontogramData(p.periodontogram),
        xrays: [],
        budget: budgetItems.map(b => ({
            id: b.id,
            treatment: b.treatment,
            toothId: b.tooth_id,
            unitCost: b.unit_cost,
            quantity: b.quantity,
            status: b.status,
            createdAt: b.created_at,
        })),
        payments: payments.map(pay => ({
            id: pay.id,
            amount: pay.amount,
            method: pay.method,
            note: pay.note || '',
            date: pay.date,
        })),
        balance: 0, // will be computed by UI
        consents: consents.map(c => ({
            id: c.id,
            title: c.title,
            content: c.content,
            signatureData: c.signature_data || '',
            signedAt: c.signed_at || '',
            witnessName: c.witness_name || '',
        })),
        prescriptions: prescriptions.map(rx => ({
            id: rx.id,
            date: rx.date,
            diagnosis: rx.diagnosis || '',
            medications: rx.medications || [],
            notes: rx.notes || '',
        })),
    };
}

function dbToAppointment(a: any): Appointment {
    return {
        id: a.id,
        patientId: a.patient_id || '',
        patientName: a.patient_name || '',
        phoneNumber: a.phone_number || '',
        time: a.time,
        date: a.date,
        type: a.type,
        status: a.status,
        reminderStatus: a.reminder_status || 'not_sent',
        deletedAt: a.deleted_at || undefined,
    };
}

export const persistenceService = new PersistenceService();
