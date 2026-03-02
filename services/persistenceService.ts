
import { supabase } from '../lib/supabase';
import { PatientRecord, Appointment, ClinicalEvent, ToothData, SurfaceData, OdontogramSnapshot } from '../types';

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

    get ready() { return this._ready; }

    // --- Initialization (loads everything from Supabase once) ---
    async init(userId: string): Promise<void> {
        this.userId = userId;
        
        const [patientsRes, aptsRes, notesRes, eventsRes] = await Promise.all([
            supabase.from('patients').select('*').eq('doctor_id', userId).order('created_at', { ascending: false }),
            supabase.from('appointments').select('*').eq('doctor_id', userId).order('date').order('time'),
            supabase.from('evolution_notes').select('*').eq('doctor_id', userId).order('created_at', { ascending: false }),
            supabase.from('clinical_events').select('*').eq('doctor_id', userId).order('created_at', { ascending: false }),
        ]);

        const notesByPatient = groupBy(notesRes.data || [], 'patient_id');
        const eventsByPatient = groupBy(eventsRes.data || [], 'patient_id');

        this.patients = (patientsRes.data || []).map(p =>
            dbToPatient(p, notesByPatient[p.id] || [], eventsByPatient[p.id] || [])
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

        if (error) console.error('[Supabase] savePatient error:', error);

        // Sync evolution notes (delete + re-insert for simplicity)
        await supabase.from('evolution_notes').delete().eq('patient_id', patient.id);
        if (patient.evolutionNotes.length > 0) {
            await supabase.from('evolution_notes').insert(
                patient.evolutionNotes.map(n => ({
                    id: n.id,
                    patient_id: patient.id,
                    doctor_id: doctorId,
                    date: n.date,
                    content: n.content,
                    procedure: n.procedure,
                }))
            );
        }

        // Sync clinical events
        await supabase.from('clinical_events').delete().eq('patient_id', patient.id);
        if (patient.history.length > 0) {
            await supabase.from('clinical_events').insert(
                patient.history.map(e => ({
                    id: e.id,
                    patient_id: patient.id,
                    doctor_id: doctorId,
                    date: e.date,
                    type: e.type,
                    description: e.description,
                    tooth_id: e.toothId || null,
                }))
            );
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
        return this.appointments;
    }

    getAppointmentsForDate(dateStr: string): Appointment[] {
        return this.appointments.filter(a => a.date === dateStr);
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
        }, { onConflict: 'id' });

        if (error) console.error('[Supabase] saveAppointment error:', error);
    }

    async deleteAppointment(appointmentId: string): Promise<void> {
        this.appointments = this.appointments.filter(a => a.id !== appointmentId);
        await supabase.from('appointments').delete().eq('id', appointmentId).eq('doctor_id', this.uid());
    }

    // ===================== CLEAR ALL (settings danger zone) =====================

    async clearAllData(): Promise<void> {
        const doctorId = this.uid();
        this.patients = [];
        this.appointments = [];

        await Promise.all([
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

function dbToPatient(p: any, notes: any[], events: any[]): PatientRecord {
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
        periodontogram: (p.periodontogram as number[]) || new Array(32).fill(1),
        xrays: [],
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
    };
}

export const persistenceService = new PersistenceService();
