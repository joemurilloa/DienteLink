
import React from 'react';
import { Appointment, ReminderStatus } from '../types';
import { cn } from '../lib/utils';
import { whatsappService } from '../services/whatsappService';
import { Clock, Send, CheckCircle2, Loader2 } from 'lucide-react';

interface AppointmentCardProps {
  appointment: Appointment;
  onReminderSent?: (id: string, status: ReminderStatus) => void;
}

const typeColors: Record<string, { bg: string; text: string }> = {
  Consulta: { bg: 'bg-teal-50', text: 'text-teal-700' },
  Cirugía: { bg: 'bg-red-50', text: 'text-red-700' },
  Revisión: { bg: 'bg-amber-50', text: 'text-amber-700' },
  Seguimiento: { bg: 'bg-blue-50', text: 'text-blue-700' },
};

const AppointmentCard: React.FC<AppointmentCardProps> = React.memo(({ appointment, onReminderSent }) => {
  const statusDot = appointment.status === 'Programada' ? 'bg-emerald-400' : appointment.status === 'Completada' ? 'bg-blue-400' : 'bg-amber-400';
  const typeColor = typeColors[appointment.type] || typeColors.Consulta;

  const handleSendReminder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (appointment.reminderStatus === 'sending' || appointment.reminderStatus === 'sent') return;
    if (onReminderSent) onReminderSent(appointment.id, 'sending');
    const result = await whatsappService.sendAppointmentReminder(appointment);
    if (onReminderSent) onReminderSent(appointment.id, result.success ? 'sent' : 'error');
  };

  return (
    <div className="card-premium p-3.5 flex items-center gap-3.5 group cursor-pointer hover:border-teal-100 transition-all duration-200">
      <div className="relative flex-shrink-0">
        <img
          src={appointment.patientImage}
          alt={appointment.patientName}
          className="w-11 h-11 rounded-xl object-cover"
          loading="lazy"
        />
        <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white", statusDot)} />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-slate-900 text-sm leading-tight truncate">{appointment.patientName}</h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
            <Clock size={10} className="text-slate-400" />
            {appointment.time}
          </span>
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-md", typeColor.bg, typeColor.text)}>
            {appointment.type}
          </span>
        </div>
      </div>

      <button
        onClick={handleSendReminder}
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
          appointment.reminderStatus === 'sent'
            ? "bg-emerald-100 text-emerald-600"
            : "bg-slate-50 text-slate-400 hover:bg-teal-600 hover:text-white"
        )}
      >
        {appointment.reminderStatus === 'sending' ? (
          <Loader2 size={16} className="animate-spin" />
        ) : appointment.reminderStatus === 'sent' ? (
          <CheckCircle2 size={16} />
        ) : (
          <Send size={14} />
        )}
      </button>
    </div>
  );
});

AppointmentCard.displayName = 'AppointmentCard';

export default AppointmentCard;
