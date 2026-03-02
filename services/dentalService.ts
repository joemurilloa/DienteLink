import { ToothData, SurfaceData, ToothSurface, ClinicalCondition, OdontogramSnapshot, ToothStatus } from '../types';
import { persistenceService } from './persistenceService';

// Migration: convert legacy ToothData (with status) to new format (with surfaces)
function migrateToothData(tooth: any): ToothData {
  if (tooth.surfaces !== undefined) return tooth as ToothData;
  // Legacy format: { id, status }
  const surfaces: SurfaceData[] = [];
  const oldStatus: ToothStatus | undefined = tooth.status;
  if (oldStatus && oldStatus !== 'healthy') {
    const isMolar = [1, 2, 3, 14, 15, 16, 17, 18, 19, 30, 31, 32].includes(tooth.id);
    const isPremolar = [4, 5, 12, 13, 20, 21, 28, 29].includes(tooth.id);
    const isAnterior = !isMolar && !isPremolar;
    const mainSurface: ToothSurface = isAnterior ? 'incisal' : 'oclusal';

    const conditionMap: Record<string, ClinicalCondition> = {
      caries: 'caries',
      missing: 'ausente',
      treated: 'obturado',
    };
    const condition = conditionMap[oldStatus] || 'caries';
    surfaces.push({ surface: mainSurface, condition });
  }
  return { id: tooth.id, surfaces };
}

class DentalService {
  async getPatientOdontogram(patientId: string): Promise<ToothData[]> {
    const patient = persistenceService.getPatientById(patientId);
    if (!patient) return [];

    // Initialize or migrate odontogram
    if (!patient.odontogram || patient.odontogram.length === 0) {
      patient.odontogram = Array.from({ length: 32 }, (_, i) => ({
        id: i + 1,
        surfaces: [] as SurfaceData[]
      }));
      await persistenceService.savePatient(patient);
    } else {
      // Migrate legacy data if needed
      const needsMigration = patient.odontogram.some((t: any) => t.surfaces === undefined);
      if (needsMigration) {
        patient.odontogram = patient.odontogram.map(migrateToothData);
        await persistenceService.savePatient(patient);
      }
    }

    return [...patient.odontogram];
  }

  async updateSurface(
    patientId: string,
    toothId: number,
    surface: ToothSurface,
    condition: ClinicalCondition | null
  ): Promise<boolean> {
    const patient = persistenceService.getPatientById(patientId);
    if (!patient) return false;

    patient.odontogram = patient.odontogram.map(t => {
      if (t.id !== toothId) return t;
      const tooth = migrateToothData(t);
      if (condition === null) {
        tooth.surfaces = tooth.surfaces.filter(s => s.surface !== surface);
      } else if (condition === 'healthy') {
        tooth.surfaces = tooth.surfaces.filter(s => s.surface !== surface);
      } else {
        const existing = tooth.surfaces.findIndex(s => s.surface === surface);
        if (existing !== -1) {
          tooth.surfaces[existing] = { surface, condition };
        } else {
          tooth.surfaces.push({ surface, condition });
        }
      }
      return tooth;
    });

    await persistenceService.savePatient(patient);
    console.log(`[Odontogram] Patient ${patientId}, Tooth ${toothId}, ${surface} -> ${condition}`);
    return true;
  }

  async saveSnapshot(patientId: string): Promise<boolean> {
    const patient = persistenceService.getPatientById(patientId);
    if (!patient) return false;

    const snapshot: OdontogramSnapshot = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      teeth: JSON.parse(JSON.stringify(patient.odontogram)),
    };

    if (!patient.odontogramHistory) patient.odontogramHistory = [];
    patient.odontogramHistory.unshift(snapshot);
    await persistenceService.savePatient(patient);
    return true;
  }

  getSnapshots(patientId: string): OdontogramSnapshot[] {
    const patient = persistenceService.getPatientById(patientId);
    return patient?.odontogramHistory || [];
  }

  // Legacy support — kept for BudgetPlanner compatibility
  async updateToothStatus(patientId: string, toothId: number, status: ToothStatus): Promise<boolean> {
    const conditionMap: Record<string, ClinicalCondition> = {
      caries: 'caries',
      missing: 'ausente',
      treated: 'obturado',
      healthy: 'healthy',
    };
    return this.updateSurface(patientId, toothId, 'oclusal', conditionMap[status] || null);
  }
}

export const dentalService = new DentalService();