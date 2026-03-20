import { ToothData, SurfaceData, ToothSurface, ClinicalCondition, OdontogramSnapshot, ToothStatus, PatientRecord } from '../types';

// Migration: convert legacy ToothData (with status) to new format (with surfaces)
function migrateToothData(tooth: any): ToothData {
  if (tooth.surfaces !== undefined) return tooth as ToothData;
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

/**
 * Pure utility functions for odontogram manipulation.
 * All functions receive patient data as input and return modified copies.
 * No side effects, no service dependencies.
 */
class DentalService {

  /**
   * Returns the odontogram for a patient, initializing or migrating if needed.
   * Returns { teeth, needsSave } — caller is responsible for persisting if needsSave is true.
   */
  getPatientOdontogram(patient: PatientRecord): { teeth: ToothData[]; patient: PatientRecord; needsSave: boolean } {
    let needsSave = false;

    if (!patient.odontogram || patient.odontogram.length === 0) {
      patient = {
        ...patient,
        odontogram: Array.from({ length: 32 }, (_, i) => ({
          id: i + 1,
          surfaces: [] as SurfaceData[]
        }))
      };
      needsSave = true;
    } else {
      const needsMigration = patient.odontogram.some((t: any) => t.surfaces === undefined);
      if (needsMigration) {
        patient = {
          ...patient,
          odontogram: patient.odontogram.map(migrateToothData)
        };
        needsSave = true;
      }
    }

    return { teeth: [...patient.odontogram], patient, needsSave };
  }

  /**
   * Updates a single surface on a tooth. Returns the updated patient record.
   * Caller is responsible for persisting.
   */
  updateSurface(
    patient: PatientRecord,
    toothId: number,
    surface: ToothSurface,
    condition: ClinicalCondition | null
  ): PatientRecord {
    const updatedOdontogram = patient.odontogram.map(t => {
      if (t.id !== toothId) return t;
      const tooth = migrateToothData(t);
      if (condition === null || condition === 'healthy') {
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

    return { ...patient, odontogram: updatedOdontogram };
  }

  /**
   * Creates a snapshot of the current odontogram. Returns updated patient record.
   * Caller is responsible for persisting.
   */
  createSnapshot(patient: PatientRecord): PatientRecord {
    const snapshot: OdontogramSnapshot = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      teeth: JSON.parse(JSON.stringify(patient.odontogram)),
    };

    return {
      ...patient,
      odontogramHistory: [snapshot, ...(patient.odontogramHistory || [])],
    };
  }

  getSnapshots(patient: PatientRecord): OdontogramSnapshot[] {
    return patient.odontogramHistory || [];
  }

  // Legacy support — kept for BudgetPlanner compatibility
  updateToothStatus(patient: PatientRecord, toothId: number, status: ToothStatus): PatientRecord {
    const conditionMap: Record<string, ClinicalCondition> = {
      caries: 'caries',
      missing: 'ausente',
      treated: 'obturado',
      healthy: 'healthy',
    };
    return this.updateSurface(patient, toothId, 'oclusal', conditionMap[status] || null);
  }
}

export const dentalService = new DentalService();