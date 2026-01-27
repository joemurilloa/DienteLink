
import React from 'react';
import { Appointment, ReminderStatus } from '../types';
import { cn } from '../lib/utils';
import { whatsappService } from '../services/whatsappService';

interface AppointmentCardProps {
  appointment: Appointment;
  onReminderSent?: (id: string, status: ReminderStatus) => void;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, onReminderSent }) => {
  const statusConfig = {
    Scheduled: { color: 'text-blue-600', bg: 'bg-blue-50/50', label: 'Programada' },
    Completed: { color: 'text-emerald-600', bg: 'bg-emerald-50/50', label: 'Completada' },
    Delayed: { color: 'text-amber-600', bg: 'bg-amber-50/50', label: 'Retrasada' }
  };

  const config = statusConfig[appointment.status];

  const handleSendReminder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (appointment.reminderStatus === 'sending' || appointment.reminderStatus === 'sent') return;
    if (onReminderSent) onReminderSent(appointment.id, 'sending');
    const result = await whatsappService.sendAppointmentReminder(appointment);
    if (onReminderSent) onReminderSent(appointment.id, result.success ? 'sent' : 'error');
  };

  return (
    <div className="depth-card group relative mb-4">
      <div className="glass-panel p-4 rounded-[28px] flex items-center gap-4 cursor-pointer transition-all duration-300 group-hover:bg-white/90">
        <div className="relative">
          <img 
            src={appointment.patientImage} 
            alt={appointment.patientName}
            className="w-14 h-14 rounded-2xl object-cover shadow-lg shadow-slate-200 group-hover:scale-105 transition-transform"
          />
          <div className={cn("absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white", appointment.status === 'Scheduled' ? 'bg-emerald-500' : 'bg-amber-500')} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-900 text-[15px] tracking-tight truncate">{appointment.patientName}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">{appointment.time}</span>
            <span className="text-[11px] text-slate-400 font-medium truncate">{appointment.type}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button 
            onClick={handleSendReminder}
            className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-sm",
              appointment.reminderStatus === 'sent' ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white"
            )}
          >
            {appointment.reminderStatus === 'sending' ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : appointment.reminderStatus === 'sent' ? (
              <span className="text-sm">✓</span>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-14.1 8.38 8.38 0 0 1 7.6 3a2.1 2.1 0 0 0 3 0" />
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentCard;
