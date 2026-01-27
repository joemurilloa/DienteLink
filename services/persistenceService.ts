
import { PatientRecord, Appointment, ClinicalEvent } from '../types';
import { getAppointments, getPatientRecords } from './mockData';

const STORAGE_KEYS = {
    PATIENTS: 'dientelink_patients',
    APPOINTMENTS: 'dientelink_appointments',
};

class PersistenceService {
    // Inicializar datos si no existen
    init() {
        if (!localStorage.getItem(STORAGE_KEYS.PATIENTS)) {
            localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(getPatientRecords()));
        }
        if (!localStorage.getItem(STORAGE_KEYS.APPOINTMENTS)) {
            localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(getAppointments()));
        }
    }

    // --- Pacientes ---
    getPatients(): PatientRecord[] {
        const data = localStorage.getItem(STORAGE_KEYS.PATIENTS);
        return data ? JSON.parse(data) : [];
    }

    getPatientById(id: string): PatientRecord | undefined {
        return this.getPatients().find(p => p.id === id);
    }

    savePatient(patient: PatientRecord) {
        const patients = this.getPatients();
        const index = patients.findIndex(p => p.id === patient.id);
        if (index !== -1) {
            patients[index] = patient;
        } else {
            patients.push(patient);
        }
        localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
    }

    // --- Eventos Clínicos (Sincronización) ---
    addClinicalEvent(patientId: string, event: Omit<ClinicalEvent, 'id'>) {
        const patient = this.getPatientById(patientId);
        if (!patient) return;

        const newEvent: ClinicalEvent = {
            ...event,
            id: Math.random().toString(36).substr(2, 9),
        };

        patient.history = [newEvent, ...patient.history];
        patient.balance += event.cost;

        // Si es un tratamiento, podríamos actualizar el odontograma aquí si el modelo lo requiere
        // Por ahora, solo guardamos el evento en el historial.

        this.savePatient(patient);
    }

    // --- Citas ---
    getAppointments(): Appointment[] {
        const data = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
        return data ? JSON.parse(data) : [];
    }

    saveAppointment(appointment: Appointment) {
        const appointments = this.getAppointments();
        const index = appointments.findIndex(a => a.id === appointment.id);
        if (index !== -1) {
            appointments[index] = appointment;
        } else {
            appointments.push(appointment);
        }
        localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
    }
}

export const persistenceService = new PersistenceService();
persistenceService.init();
