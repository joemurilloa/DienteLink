import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Appointment, ReminderStatus } from '../types';
import { cn, getInitials, formatAppDate } from '../lib/utils';
import { useAuth } from '../services/authService';
import { useAppointmentMutations } from '../hooks/useAppointments';
import { useNavigate } from 'react-router-dom';
import { Clock, X, User, Phone, Calendar, Tag, Play, Ban } from 'lucide-react';
import { whatsappService } from '../services/whatsappService';
import WhatsAppAction from './WhatsAppAction';

interface AppointmentCardProps {
  appointment: Appointment;
  onReminderSent?: (id: string, status: ReminderStatus) => void;
  onNavigateToPatient?: (appointment: Appointment) => void;
  showDate?: boolean;
}

const typeColors: Record<string, { bg: string; text: string; accent: string }> = {
  Consulta: { bg: 'bg-blue-50', text: 'text-blue-700', accent: 'border-blue-200' },
  Cirugía: { bg: 'bg-red-50', text: 'text-red-700', accent: 'border-red-200' },
  Revisión: { bg: 'bg-amber-50', text: 'text-amber-700', accent: 'border-amber-200' },
  Seguimiento: { bg: 'bg-emerald-50', text: 'text-emerald-700', accent: 'border-emerald-200' },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  Programada: { label: 'Programada', color: 'bg-blue-100 text-blue-700' },
  Completada: { label: 'Completada', color: 'bg-emerald-100 text-emerald-700' },
  Retrasada: { label: 'Retrasada', color: 'bg-amber-100 text-amber-700' },
  Eliminada: { label: 'Eliminada', color: 'bg-red-100 text-red-700' },
};

const AppointmentCard: React.FC<AppointmentCardProps> = React.memo(({ appointment, onReminderSent, onNavigateToPatient, showDate }) => {
  const [showDetail, setShowDetail] = useState(false);
  const { deleteAppointment } = useAppointmentMutations();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const sendReminder = () => {
    if (!appointment.phoneNumber) {
      return { success: false, error: `${appointment.patientName} no tiene teléfono registrado.` };
    }
    return whatsappService.sendAppointmentReminder(appointment, profile?.clinic_name);
  };

  // El recordatorio solo tiene sentido para citas programadas que aún no pasan
  const canRemind = (() => {
    if (appointment.status !== 'Programada') return false;
    const [y, m, d] = (appointment.date || '').split('-').map(Number);
    const [hh, mm] = (appointment.time || '0:0').split(':').map(Number);
    if (!y || !m || !d) return false;
    return new Date(y, m - 1, d, hh || 0, mm || 0).getTime() > Date.now();
  })();
  const statusDot = appointment.status === 'Programada' ? 'bg-blue-400' : appointment.status === 'Completada' ? 'bg-emerald-400' : 'bg-amber-400';
  const typeColor = typeColors[appointment.type] || typeColors.Consulta;
  const statusInfo = statusLabels[appointment.status] || statusLabels.Programada;

  const fmtTime = (t: string) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const date = new Date(0, 0, 0, parseInt(h || '0', 10), parseInt(m || '0', 10));
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <>
      <div
        onClick={() => setShowDetail(true)}
        className="card-premium p-3.5 flex items-center gap-3.5 group cursor-pointer hover:border-blue-300"
      >
        <div className="relative flex-shrink-0">
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <span className="text-slate-600 font-bold text-sm">{getInitials(appointment.patientName)}</span>
          </div>
          <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white", statusDot)} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-900 text-sm leading-tight truncate">{appointment.patientName}</h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {showDate && (
              <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">
                <Calendar size={10} className="text-slate-500" />
                {(() => {
                  try {
                    const d = new Date(appointment.date + 'T12:00:00');
                    return isNaN(d.getTime()) ? appointment.date : d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
                  } catch(e) { return appointment.date; }
                })()}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
              <Clock size={10} className="text-slate-500" />
              {appointment.time}
            </span>
            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md", typeColor.bg, typeColor.text)}>
              {appointment.type}
            </span>
          </div>
        </div>

        {canRemind && (
          <WhatsAppAction
            variant="icon"
            storageKey={`reminder_${appointment.id}`}
            initiallySent={appointment.reminderStatus === 'sent'}
            persistLocal={false}
            label="Enviar recordatorio por WhatsApp"
            sentLabel="Recordatorio enviado"
            title="Abrir WhatsApp con el recordatorio listo"
            send={sendReminder}
            onSent={() => onReminderSent?.(appointment.id, 'sent')}
          />
        )}
      </div>

      {/* Appointment Detail Modal */}
      {showDetail && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-slate-300 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="w-1 h-1" />
                <div className="w-10 h-1 bg-slate-200 rounded-full sm:hidden" />
                <button
                  onClick={() => setShowDetail(false)}
                  className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">
                    {getInitials(appointment.patientName)}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 
                    onClick={() => {
                      if (onNavigateToPatient && appointment.patientId) {
                        setShowDetail(false);
                        onNavigateToPatient(appointment);
                      }
                    }}
                    className={cn(
                      "text-base font-bold text-slate-900 leading-tight truncate",
                      onNavigateToPatient && appointment.patientId && "cursor-pointer hover:text-blue-600 transition-colors"
                    )}
                    title={onNavigateToPatient && appointment.patientId ? "Ver expediente" : undefined}
                  >
                    {appointment.patientName}
                  </h3>
                  <span className={cn("inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-md", statusInfo.color)}>
                    {statusInfo.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="px-5 py-4 space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Calendar size={16} className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fecha</p>
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {(() => {
                      try {
                        if (!appointment.date) return 'Sin fecha';
                        const d = new Date(appointment.date + 'T12:00:00');
                        return isNaN(d.getTime()) ? appointment.date : d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                      } catch(e) {
                        return appointment.date || 'Fecha inválida';
                      }
                    })()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Clock size={16} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Hora</p>
                  <p className="text-sm font-medium text-slate-800">{fmtTime(appointment.time)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={cn("w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0", typeColor.bg)}>
                  <Tag size={16} className={typeColor.text} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tipo de Cita</p>
                  <p className="text-sm font-medium text-slate-800">{appointment.type}</p>
                </div>
              </div>

              {appointment.phoneNumber && (
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Phone size={16} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Teléfono</p>
                    <p className="text-sm font-medium text-slate-800">{appointment.phoneNumber}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-5 pb-5 pt-2 space-y-2">
              {canRemind && (
                <WhatsAppAction
                  variant="row"
                  storageKey={`reminder_${appointment.id}`}
                  initiallySent={appointment.reminderStatus === 'sent'}
                  persistLocal={false}
                  label="Enviar recordatorio por WhatsApp"
                  sentLabel="Recordatorio enviado"
                  send={sendReminder}
                  onSent={() => onReminderSent?.(appointment.id, 'sent')}
                />
              )}

              <div className="flex gap-2.5 mt-2 pt-2 border-t border-slate-300">
                {appointment.status === 'Programada' && (
                  <button
                    onClick={() => { 
                      deleteAppointment.mutate(appointment.id);
                      setShowDetail(false); 
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-all border border-red-100"
                    title="Cancelar esta cita"
                  >
                    <Ban size={16} /> Cancelar
                  </button>
                )}

                {onNavigateToPatient && appointment.patientId && appointment.status === 'Programada' && (
                  <button
                    onClick={() => { 
                      setShowDetail(false);
                      navigate(`/consultation?patientId=${appointment.patientId}&appointmentId=${appointment.id}`);
                    }}
                    className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    <Play size={16} className="fill-white" /> Iniciar Consulta
                  </button>
                )}

                {onNavigateToPatient && appointment.patientId && appointment.status !== 'Programada' && (
                  <button
                    onClick={() => { setShowDetail(false); onNavigateToPatient(appointment); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-md"
                  >
                    <User size={16} /> Ver Expediente
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
});

AppointmentCard.displayName = 'AppointmentCard';

export default AppointmentCard;
