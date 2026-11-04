import React, { useState } from 'react';
import { sileo } from 'sileo';
import { bookingService } from '../../../services/bookingService';
import { daysShareOneSchedule, hoursError, hoursFromAvailability, scheduleFromHours, type ClinicHours } from '../../../lib/clinicHours';
import ClinicHoursFields from '../../ClinicHoursFields';
import ConfirmModal from '../../ConfirmModal';
import { useAuth } from '../../../services/authService';

const ClinicHoursSettings: React.FC = () => {
  const { clinicId, user } = useAuth();
  const [hours, setHours] = useState<ClinicHours>(() => hoursFromAvailability(bookingService.getDoctorAvailability()));
  const [saving, setSaving] = useState(false);
  const [confirmFlatten, setConfirmFlatten] = useState(false);
  const mixedDays = !daysShareOneSchedule(bookingService.getDoctorAvailability());

  const save = async () => {
    const error = hoursError(hours);
    if (error) {
      sileo.error({ title: 'Revisa el horario', description: error });
      return;
    }
    setConfirmFlatten(false);
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
        <p className="text-sm text-slate-500 mt-0.5">Los días marcados usan este mismo horario. La Agenda y el enlace de reservas lo respetan. Un día con otra hora se cambia en Reservas.</p>
        {mixedDays && (
          <p className="text-sm text-amber-800 mt-2">Ahora mismo hay días con horas distintas. Guardar aquí los deja todos iguales.</p>
        )}
      </div>
      <ClinicHoursFields value={hours} onChange={setHours} />
      <button
        type="button"
        onClick={() => {
          const error = hoursError(hours);
          if (error) {
            sileo.error({ title: 'Revisa el horario', description: error });
            return;
          }
          if (!daysShareOneSchedule(bookingService.getDoctorAvailability())) {
            setConfirmFlatten(true);
            return;
          }
          void save();
        }}
        disabled={saving}
        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
      >
        {saving ? 'Guardando...' : 'Guardar horario'}
      </button>
      <ConfirmModal
        isOpen={confirmFlatten}
        onClose={() => setConfirmFlatten(false)}
        onConfirm={() => { void save(); }}
        title="Igualar el horario"
        description="Hay días con horas distintas en Reservas. Al guardar, todos los días marcados quedan con el horario de esta pantalla."
        confirmLabel="Igualar y guardar"
        variant="warning"
      />
    </div>
  );
};

export default ClinicHoursSettings;
