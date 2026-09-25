import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Appointment, ReminderStatus } from '../types';
import { cn, getInitials, formatAppDate } from '../lib/utils';
import { useAuth } from '../services/authService';
import { usePatient } from '../hooks/usePatients';
import { useAppointmentMutations } from '../hooks/useAppointments';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, X, User, Phone, Calendar, Tag, Play, Ban, MessageCircle } from 'lucide-react';
import { sileo } from 'sileo';
import { whatsappService } from '../services/whatsappService';


// WhatsApp SVG icon — matches official brand color #25D366
const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.561 4.14 1.535 5.875L0 24l6.322-1.505A11.954 11.954 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.006-1.37l-.36-.213-3.722.886.93-3.618-.234-.372A9.818 9.818 0 0 1 12 2.182c5.42 0 9.818 4.398 9.818 9.818s-4.398 9.818-9.818 9.818z"/>
  </svg>
);

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

  const handleSendWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!appointment.phoneNumber) {
      sileo.warning({
        title: 'Sin teléfono',
        description: `El paciente ${appointment.patientName} no tiene un número registrado.`
      });
      return;
    }

    const result = whatsappService.sendAppointmentReminder(appointment, profile?.clinic_name);
    if (result.success) {
      if (onReminderSent) {
        onReminderSent(appointment.id, 'sent');
      }
      sileo.success({
        title: 'WhatsApp Abierto',
        description: `Mensaje de recordatorio preparado para ${appointment.patientName}.`
      });
    } else {
      sileo.error({
        title: 'Error de WhatsApp',
        description: result.error || 'No se pudo abrir WhatsApp para este paciente.'
      });
    }
  };

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

        {/* Botón directo para enviar WhatsApp Web */}
        <button
          type="button"
          onClick={handleSendWhatsApp}
          title={
            appointment.reminderStatus === 'sent'
              ? 'Recordatorio ya enviado por WhatsApp. Clic para reenviar.'
              : 'Enviar recordatorio directo por WhatsApp Web al paciente'
          }
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 cursor-pointer active:scale-95",
            appointment.reminderStatus === 'sent'
              ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 border border-emerald-200 shadow-sm"
              : "bg-[#25D366] hover:bg-[#20ba5a] text-white shadow-md hover:shadow-emerald-500/25"
          )}
          aria-label="Enviar recordatorio por WhatsApp"
        >
          {appointment.reminderStatus === 'sent' ? (
            <div className="relative flex items-center justify-center">
              <WhatsAppIcon size={18} />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
            </div>
          ) : (
            <WhatsAppIcon size={19} />
          )}
        </button>
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
              {/* WhatsApp Web direct sender button */}
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className={cn(
                  "w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer active:scale-[0.98]",
                  appointment.reminderStatus === 'sent'
                    ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : "bg-[#25D366] hover:bg-[#20ba5a] text-white shadow-md shadow-emerald-500/20"
                )}
              >
                <WhatsAppIcon size={18} />
                {appointment.reminderStatus === 'sent' ? (
                  <span>Recordatorio enviado • Clic para reenviar por WhatsApp</span>
                ) : (
                  <span>Enviar recordatorio por WhatsApp</span>
                )}
              </button>

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
