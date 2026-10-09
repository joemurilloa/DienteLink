import React, { useState } from 'react';
import { sileo } from 'sileo';
import { bookingService } from '../../../services/bookingService';
import { hoursError, hoursFromAvailability, scheduleFromHours, type ClinicHours } from '../../../lib/clinicHours';
import ClinicHoursFields from '../../ClinicHoursFields';
import { useAuth } from '../../../services/authService';

const ClinicHoursSettings: React.FC = () => {
  const { clinicId, user } = useAuth();
  const [hours, setHours] = useState<ClinicHours>(() => hoursFromAvailability(bookingService.getDoctorAvailability()));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const error = hoursError(hours);
    if (error) {
      sileo.error({ title: 'Revisa el horario', description: error });
      return;
    }
    setSaving(true);
    try {
      const current = bookingService.getDoctorAvailability();
      await bookingService.saveDoctorAvailability({
        ...current,
        weeklySchedule: scheduleFromHours(hours),
      });
      const progressKey = `dientelink_hours_reviewed_${clinicId || user?.id || 'default'}`;
      try { localStorage.setItem(progressKey, '1'); } catch { /* ignore */ }
      sileo.success({ title: 'Horario guardado', description: 'Se usa al agendar y en las reservas en línea.' });
    } catch {
      sileo.error({ title: 'No se pudo guardar el horario' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-premium p-6 space-y-5">
      <div>
        <h3 className="text-base font-bold text-slate-900">Horario de atención</h3>
        <p className="text-sm text-slate-500 mt-0.5">Al agendar una cita solo aparecen estas horas. El enlace de reservas usa el mismo horario.</p>
      </div>
      <ClinicHoursFields value={hours} onChange={setHours} />
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
      >
        {saving ? 'Guardando...' : 'Guardar horario'}
      </button>
    </div>
  );
};

export default ClinicHoursSettings;
