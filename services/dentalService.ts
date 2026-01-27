import { ToothData, ToothStatus } from '../types';
import { persistenceService } from './persistenceService';

class DentalService {
  async getPatientOdontogram(patientId: string): Promise<ToothData[]> {
    const patient = persistenceService.getPatientById(patientId);
    if (!patient) return [];

    // Si el paciente no tiene odontograma inicializado, lo hacemos aquí
    if (!patient.odontogram || patient.odontogram.length === 0) {
      patient.odontogram = Array.from({ length: 32 }, (_, i) => ({
        id: i + 1,
        status: 'healthy' as ToothStatus
      }));
      persistenceService.savePatient(patient);
    }

    return [...patient.odontogram];
  }

  async updateToothStatus(patientId: string, toothId: number, status: ToothStatus): Promise<boolean> {
    const patient = persistenceService.getPatientById(patientId);
    if (!patient) return false;

    patient.odontogram = patient.odontogram.map(t =>
      t.id === toothId ? { ...t, status } : t
    );

    persistenceService.savePatient(patient);
    console.log(`[Persistent Sync] Patient ${patientId}, Tooth ${toothId} -> ${status}`);
    return true;
  }
}

export const dentalService = new DentalService();