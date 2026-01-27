import { ToothData, ToothStatus } from '../types';

class DentalService {
  // Mock database storage
  private records: Record<string, ToothData[]> = {};

  async getPatientOdontogram(patientId: string): Promise<ToothData[]> {
    if (!this.records[patientId]) {
      // Initialize with 32 healthy teeth
      this.records[patientId] = Array.from({ length: 32 }, (_, i) => ({
        id: i + 1,
        status: 'healthy'
      }));
    }
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...this.records[patientId]];
  }

  async updateToothStatus(patientId: string, toothId: number, status: ToothStatus): Promise<boolean> {
    if (!this.records[patientId]) await this.getPatientOdontogram(patientId);
    
    this.records[patientId] = this.records[patientId].map(t => 
      t.id === toothId ? { ...t, status } : t
    );

    console.log(`[Real-time Sync] Patient ${patientId}, Tooth ${toothId} -> ${status}`);
    // In a real app, this would be a PATCH request to your backend
    return true;
  }
}

export const dentalService = new DentalService();