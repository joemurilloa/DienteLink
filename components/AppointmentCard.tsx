
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Appointment, ReminderStatus } from '../types';
import { cn, getInitials, formatAppDate } from '../lib/utils';
import { whatsappService } from '../services/whatsappService';
import { emailReminderService } from '../services/emailReminderService';
import { useAuth } from '../services/authService';
import { usePatient } from '../hooks/usePatients';
import { useAppointmentMutations } from '../hooks/useAppointments';
import { useNavigate } from 'react-router-dom';
import { Clock, Send, CheckCircle2, Loader2, X, User, Phone, Calendar, Tag, Activity, Mail, CheckCircle, Smartphone, AlertTriangle, Play, Ban } from 'lucide-react';
import { sileo } from 'sileo';

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
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [isDeleting, setIsDeleting] = useState(false);
  const { profile } = useAuth();
  const { patient } = usePatient(appointment.patientId);
  const { updateAppointment } = useAppointmentMutations();
  const navigate = useNavigate();
  
  const isToday = appointment.date === new Date().toISOString().split('T')[0];
  const statusDot = appointment.status === 'Programada' ? 'bg-blue-400' : appointment.status === 'Completada' ? 'bg-emerald-400' : 'bg-amber-400';
  const typeColor = typeColors[appointment.type] || typeColors.Consulta;
  const statusInfo = statusLabels[appointment.status] || statusLabels.Programada;

  const handleSendReminder = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (appointment.reminderStatus === 'sent') return;
    if (!appointment.phoneNumber) {
      sileo.warning({ title: 'Sin teléfono', description: 'Este paciente no tiene número registrado' });
      return;
    }
    
    // Open WhatsApp with pre-filled reminder message (manual link)
    const result = whatsappService.sendManualAppointmentReminder(appointment);
    
    if (result.success) {
      if (onReminderSent) onReminderSent(appointment.id, 'sent');
      sileo.success({ title: 'WhatsApp abierto', description: `Recordatorio preparado para ${appointment.patientName}` });
    }
  };

  const handleSendEmail = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (emailStatus === 'sending' || emailStatus === 'sent') return;

    // Look up patient email
    const email = patient?.identification?.email;
    if (!email) {
      sileo.warning({ title: 'Sin correo electrónico', description: 'Este paciente no tiene email registrado' });
      return;
    }

    setEmailStatus('sending');
    const result = await emailReminderService.sendReminder({
      patientName: appointment.patientName,
      patientEmail: email,
      appointmentDate: appointment.date,
      appointmentTime: appointment.time,
      appointmentType: appointment.type,
      doctorName: profile?.full_name || 'Doctor',
      clinicName: profile?.clinic_name || '',
    });

    if (result.success) {
      setEmailStatus('sent');
      sileo.success({ title: `Email enviado a ${appointment.patientName}`, description: email });
    } else {
      setEmailStatus('error');
      sileo.error({ title: 'Error al enviar email', description: result.error || 'Intente de nuevo' });
    }
  };

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
        className="card-premium p-3.5 flex items-center gap-3.5 group cursor-pointer hover:border-blue-100 transition-all duration-200"
      >
        <div className="relative flex-shrink-0">
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <span className="text-slate-600 font-bold text-xs">{getInitials(appointment.patientName)}</span>
          </div>
          <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white", statusDot)} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-900 text-sm leading-tight truncate">{appointment.patientName}</h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {showDate && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">
                <Calendar size={10} className="text-slate-400" />
                {(() => {
                  try {
                    const d = new Date(appointment.date + 'T12:00:00');
                    return isNaN(d.getTime()) ? appointment.date : d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
                  } catch(e) { return appointment.date; }
                })()}
              </span>
            )}
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
          title={appointment.reminderStatus === 'sent' ? 'Recordatorio ya enviado' : 'Abrir WhatsApp con recordatorio'}
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
            appointment.reminderStatus === 'sent'
              ? "bg-blue-100 text-blue-600"
              : "bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white"
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
            <div className="px-5 pt-5 pb-4 border-b border-slate-100 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="w-1 h-1" />
                <div className="w-10 h-1 bg-slate-200 rounded-full sm:hidden" />
                <button
                  onClick={() => setShowDetail(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
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
                  <h3 className="text-base font-bold text-slate-900 leading-tight truncate">{appointment.patientName}</h3>
                  <span className={cn("inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-md", statusInfo.color)}>
                    {statusInfo.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="px-5 py-4 space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Calendar size={16} className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Fecha</p>
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
                <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Clock size={16} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Hora</p>
                  <p className="text-sm font-medium text-slate-800">{fmtTime(appointment.time)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", typeColor.bg)}>
                  <Tag size={16} className={typeColor.text} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tipo de Cita</p>
                  <p className="text-sm font-medium text-slate-800">{appointment.type}</p>
                </div>
              </div>

              {appointment.phoneNumber && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Phone size={16} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Teléfono</p>
                    <p className="text-sm font-medium text-slate-800">{appointment.phoneNumber}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-5 pb-5 pt-2 space-y-2">
              <div className="flex gap-2.5">
              <button
                onClick={(e) => handleSendReminder(e)}
                disabled={appointment.reminderStatus === 'sending' || appointment.reminderStatus === 'sent'}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all",
                  appointment.reminderStatus === 'sent'
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : appointment.reminderStatus === 'sending'
                    ? "bg-slate-100 text-slate-400"
                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                )}
              >
                {appointment.reminderStatus === 'sending' ? (
                  <><Loader2 size={14} className="animate-spin" /> Enviando...</>
                ) : appointment.reminderStatus === 'sent' ? (
                  <><CheckCircle2 size={14} /> Enviado</>
                ) : (
                  <><Send size={14} /> WhatsApp</>
                )}
              </button>
              <button
                onClick={(e) => handleSendEmail(e)}
                disabled={emailStatus === 'sending' || emailStatus === 'sent'}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all",
                  emailStatus === 'sent'
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : emailStatus === 'sending'
                    ? "bg-slate-100 text-slate-400"
                    : "bg-violet-600 text-white hover:bg-violet-700 shadow-sm"
                )}
              >
                {emailStatus === 'sending' ? (
                  <><Loader2 size={14} className="animate-spin" /> Enviando...</>
                ) : emailStatus === 'sent' ? (
                  <><CheckCircle2 size={14} /> Email enviado</>
                ) : (
                  <><Mail size={14} /> Email</>
                )}
              </button>
              </div>
              
              <div className="flex gap-2.5 mt-2 pt-2 border-t border-slate-100">
                {onNavigateToPatient && appointment.patientId && appointment.status === 'Programada' && (
                  <>
                    <button
                      onClick={() => { 
                        updateAppointment.mutate({ ...appointment, status: 'Eliminada' });
                        setShowDetail(false); 
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-all border border-red-100"
                      title="Marcar como No Asistió o Cancelada"
                    >
                      <Ban size={16} /> Cancelar
                    </button>
                    <button
                      onClick={() => { 
                        setShowDetail(false);
                        navigate(`/consultation?patientId=${appointment.patientId}&appointmentId=${appointment.id}`);
                      }}
                      className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all"
                    >
                      <Play size={16} className="fill-white" /> Iniciar Consulta
                    </button>
                  </>
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
