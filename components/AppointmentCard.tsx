
import React from 'react';
import { Appointment } from '../types';
import { cn } from '../lib/utils';

interface AppointmentCardProps {
  appointment: Appointment;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment }) => {
  const statusColors = {
    Scheduled: 'bg-blue-50 text-blue-600',
    Completed: 'bg-emerald-50 text-emerald-600',
    Delayed: 'bg-amber-50 text-amber-600'
  };

  return (
    <div className="flex items-center p-4 mb-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <img 
        src={appointment.patientImage} 
        alt={appointment.patientName}
        className="w-12 h-12 rounded-full object-cover mr-4 ring-2 ring-slate-50"
      />
      <div className="flex-1">
        <h4 className="font-semibold text-slate-800 text-sm md:text-base">{appointment.patientName}</h4>
        <p className="text-xs text-slate-500 font-medium">{appointment.type} • {appointment.time}</p>
      </div>
      <span className={cn(
        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
        statusColors[appointment.status]
      )}>
        {appointment.status}
      </span>
    </div>
  );
};

export default AppointmentCard;
