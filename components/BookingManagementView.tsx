import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Clock, User, Calendar, Check, X,
  Settings, Share2, Copy, Eye, Plus, Trash2, Save, Globe,
  Bell, RefreshCw, Link2, MoreVertical
} from 'lucide-react';
import { DoctorAvailability, PublicBookingSettings, AppointmentRequest, Appointment } from '../types';
import { bookingService } from '../services/bookingService';
import { useAppointments, useAppointmentMutations } from '../hooks/useAppointments';
import { cn, generateId, getInitials, formatAppDate } from '../lib/utils';
import { sileo } from 'sileo';
import 'sileo/styles.css';

interface Props {
  onBack: () => void;
}

const daysOfWeek = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
];

export const BookingManagementView: React.FC<Props> = ({ onBack }) => {
  const { data: appointments = [] } = useAppointments();
  const { createAppointment, deleteAppointment } = useAppointmentMutations();
  const [activeTab, setActiveTab] = useState<'requests' | 'config' | 'share'>('requests');
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [availability, setAvailability] = useState<DoctorAvailability>(() => bookingService.getDoctorAvailability());
  const [settings, setSettings] = useState<PublicBookingSettings>(() => bookingService.getBookingSettings());
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');

  const loadRequests = useCallback(async () => {
    try {
      setLoadingReqs(true);
      await bookingService.refreshRequests();
      setRequests(bookingService.getAppointmentRequests());
    } catch (e) {
      console.error('Error loading requests:', e);
    } finally {
      setLoadingReqs(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
    setPublicUrl(bookingService.generatePublicBookingUrl());
  }, [loadRequests]);

  useEffect(() => {
    const handle = () => loadRequests();
    window.addEventListener('bookingRequestsUpdated', handle);
    window.addEventListener('newAppointmentRequest', handle);
    return () => {
      window.removeEventListener('bookingRequestsUpdated', handle);
      window.removeEventListener('newAppointmentRequest', handle);
    };
  }, [loadRequests]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
    sileo.success({ title: 'Solicitudes actualizadas' });
  };

  const handleApprove = async (id: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    const approved = await bookingService.approveRequest(id);
    if (!approved) return;

    const appointment: Appointment = {
      id: generateId(),
      patientId: '',
      patientName: req.patientName,
      phoneNumber: req.patientPhone || '',
      time: req.requestedTime,
      date: req.requestedDate,
      type: req.appointmentType,
      status: 'Programada',
      reminderStatus: 'not_sent',
    };
    
    createAppointment.mutate(appointment, {
      onSuccess: () => {
        sileo.success({
          title: '¡Cita Aprobada!',
          description: `Agendada el ${formatAppDate(req.requestedDate)} a las ${req.requestedTime}`,
        });
      }
    });
    
    setRequests(bookingService.getAppointmentRequests());
  };

  const handleReject = async (id: string) => {
    await bookingService.rejectRequest(id);
    sileo.info({ title: 'Solicitud declinada' });
    setRequests(bookingService.getAppointmentRequests());
  };

  const handleDelete = async (id: string) => {
    await bookingService.deleteRequest(id);
    sileo.info({ title: 'Solicitud eliminada' });
    setRequests(bookingService.getAppointmentRequests());
  };

  const handleChangeStatus = async (id: string, newStatus: 'pending' | 'approved' | 'rejected') => {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    if (newStatus === 'approved') {
      await bookingService.updateRequestStatus(id, 'approved');
      const alreadyExists = appointments.some(a =>
        a.patientName === req.patientName && a.date === req.requestedDate && a.time === req.requestedTime && a.status !== 'Eliminada'
      );
      if (!alreadyExists) {
        const appointment: Appointment = {
          id: generateId(),
          patientId: '',
          patientName: req.patientName,
          phoneNumber: req.patientPhone || '',
          time: req.requestedTime,
          date: req.requestedDate,
          type: req.appointmentType,
          status: 'Programada',
          reminderStatus: 'not_sent',
        };
        createAppointment.mutate(appointment, {
          onSuccess: () => sileo.success({ title: `Aprobada para el ${formatAppDate(req.requestedDate)}` })
        });
      } else {
        sileo.success({ title: `Restaurada para el ${formatAppDate(req.requestedDate)}` });
      }
    } else {
      if (req.status === 'approved') {
        const linkedAppt = appointments.find(a =>
          a.patientName === req.patientName && a.date === req.requestedDate && a.time === req.requestedTime && a.status !== 'Eliminada'
        );
        if (linkedAppt) {
          deleteAppointment.mutate(linkedAppt.id);
        }
      }
      await bookingService.updateRequestStatus(id, newStatus);
      sileo.info({ title: 'Estado actualizado' });
    }
    setRequests(bookingService.getAppointmentRequests());
  };

  const handleDayToggle = (dayOfWeek: number) => {
    setAvailability(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map(d => d.dayOfWeek === dayOfWeek ? { ...d, enabled: !d.enabled } : d),
    }));
    setHasChanges(true);
  };

  const addTimeSlot = (dayOfWeek: number) => {
    setAvailability(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map(d =>
        d.dayOfWeek === dayOfWeek ? { ...d, timeSlots: [...d.timeSlots, { start: '09:00', end: '10:00' }] } : d
      ),
    }));
    setHasChanges(true);
  };

  const updateTimeSlot = (dayOfWeek: number, idx: number, field: 'start' | 'end', value: string) => {
    setAvailability(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map(d =>
        d.dayOfWeek === dayOfWeek ? { ...d, timeSlots: d.timeSlots.map((s, i) => (i === idx ? { ...s, [field]: value } : s)) } : d
      ),
    }));
    setHasChanges(true);
  };

  const removeTimeSlot = (dayOfWeek: number, idx: number) => {
    setAvailability(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map(d =>
        d.dayOfWeek === dayOfWeek ? { ...d, timeSlots: d.timeSlots.filter((_, i) => i !== idx) } : d
      ),
    }));
    setHasChanges(true);
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await bookingService.saveDoctorAvailability(availability);
      await bookingService.saveBookingSettings(settings);
      setHasChanges(false);
      sileo.success({ title: 'Guardado' });
    } catch (e) {
      sileo.error({ title: 'Error' });
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    sileo.success({ title: 'Link copiado' });
  };

  const openPreview = () => window.open(publicUrl, '_blank');
  const shareWhatsApp = () => {
    const msg = `¡Agenda tu cita conmigo fácilmente! 📅\n\n${publicUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const filteredRequests = requests.filter(r => filter === 'all' || r.status === filter);

  const fmtTime = (s: string) => {
    if (!s) return '';
    const [h, m] = s.split(':');
    return new Date(0, 0, 0, parseInt(h || '0', 10), parseInt(m || '0', 10)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const statusColor = (status: string) => {
    if (status === 'pending') return 'bg-amber-400';
    if (status === 'approved') return 'bg-green-500';
    return 'bg-slate-300';
  };

  return (
    <div className="flex-1 h-full overflow-y-auto page-transition bg-white">
      <div className="p-6 lg:p-12 pb-32 max-w-[1200px] mx-auto space-y-10">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={onBack}
                className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              <h1 className="text-3xl lg:text-4xl font-semibold text-slate-900 tracking-tight">Solicitudes</h1>
              {pendingCount > 0 && (
                <div className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold animate-pulse">
                  {pendingCount} Pendientes
                </div>
              )}
            </div>
            <p className="text-slate-500 font-medium pl-11">Gestiona las reservas hechas desde tu enlace público.</p>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex bg-slate-100/80 p-1 rounded-xl">
               {([
                { key: 'requests', label: 'Buzón', icon: Bell },
                { key: 'config', label: 'Horarios', icon: Settings },
                { key: 'share', label: 'Enlace', icon: Link2 },
               ] as const).map(tab => (
                 <button
                   key={tab.key}
                   onClick={() => setActiveTab(tab.key)}
                   className={cn(
                     "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                     activeTab === tab.key ? "bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)]" : "text-slate-400 hover:text-slate-700"
                   )}
                 >
                   <span className="hidden sm:inline">{tab.label}</span>
                   <span className="sm:hidden"><tab.icon size={16}/></span>
                 </button>
               ))}
             </div>
          </div>
        </header>

        {/* TAB: REQUESTS */}
        {activeTab === 'requests' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4 overflow-x-auto hide-scrollbar">
              {([
                { key: 'all', label: 'Todas' },
                { key: 'pending', label: 'Pendientes' },
                { key: 'approved', label: 'Aprobadas' },
                { key: 'rejected', label: 'Rechazadas' },
              ] as const).map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "px-4 py-2 rounded-[10px] text-[13px] font-bold transition-all whitespace-nowrap",
                    filter === f.key ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  {f.label}
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-10 h-10 rounded-[10px] flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>

            {loadingReqs ? (
              <div className="text-center py-20"><div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-24">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-300">
                  <Bell size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Buzón vacío</h3>
                <p className="text-[15px] font-medium text-slate-400">Las peticiones de cita aparecerán aquí para tu aprobación.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((req, i) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="group bg-white rounded-2xl p-5 hover:bg-slate-50/50 transition-colors border border-transparent hover:border-slate-100 flex flex-col md:flex-row gap-5 items-start md:items-center relative"
                  >
                    {/* Status Dot */}
                    <div className={cn("w-2 h-2 rounded-full mt-1.5 md:mt-0 flex-shrink-0", statusColor(req.status))} />
                    
                    {/* Profile & Info */}
                    <div className="flex-1 min-w-0 flex items-start gap-4">
                      <div className="w-11 h-11 bg-white border border-slate-100 shadow-sm rounded-xl flex items-center justify-center text-slate-600 font-bold text-sm">
                        {getInitials(req.patientName)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-[15px] text-slate-900 truncate">{req.patientName}</h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[13px] font-medium text-slate-500">
                          <span className="capitalize">{formatAppDate(req.requestedDate)}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"/>
                          <span className="font-semibold text-slate-700">{fmtTime(req.requestedTime)}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"/>
                          <span>{req.appointmentType}</span>
                        </div>
                        {req.message && (
                          <p className="mt-2 text-[13px] text-slate-600 bg-white border border-slate-100 p-2.5 rounded-lg">"{req.message}"</p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity w-full md:w-auto justify-end border-t border-slate-100 md:border-0 pt-4 md:pt-0">
                      {req.status === 'pending' && (
                        <>
                           <button onClick={() => handleApprove(req.id)} className="px-5 py-2.5 bg-slate-900 text-white rounded-[10px] text-[13px] font-bold hover:bg-slate-800 transition-all">Aprobar</button>
                           <button onClick={() => handleReject(req.id)} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-[10px] text-[13px] font-bold hover:bg-slate-200 transition-all">Declinar</button>
                        </>
                      )}
                      {req.status === 'approved' && (
                        <button onClick={() => handleChangeStatus(req.id, 'rejected')} className="px-4 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-all">Revocar</button>
                      )}
                      {req.status === 'rejected' && (
                        <button onClick={() => handleChangeStatus(req.id, 'approved')} className="px-4 py-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg text-xs font-bold transition-all">Re-Aprobar</button>
                      )}
                      <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block" />
                      <button onClick={() => handleDelete(req.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="absolute right-5 top-5 md:hidden text-[10px] uppercase font-bold text-slate-300">
                      {req.status}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: CONFIGURAR */}
        {activeTab === 'config' && (
          <div className="animate-in fade-in duration-300 max-w-4xl">
             <div className="flex items-center justify-between mb-8">
               <h2 className="text-xl font-bold text-slate-900">Ajustes de Agenda</h2>
               <button
                  onClick={handleSaveConfig}
                  disabled={saving || !hasChanges}
                  className="px-6 py-3 bg-blue-600 text-white rounded-[12px] text-sm font-bold shadow-[0_4px_12px_rgba(37,99,235,0.2)] disabled:opacity-50 disabled:shadow-none hover:bg-blue-700 transition-all"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
             </div>

             <div className="space-y-12">
               {/* Sección 1 */}
               <section>
                 <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-6">Reglas de Reserva</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                   <div className="space-y-2">
                     <label className="text-[13px] font-semibold text-slate-900">Duración base</label>
                     <select value={availability.slotDuration} onChange={e => { setAvailability(p => ({ ...p, slotDuration: +e.target.value })); setHasChanges(true); }} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none text-sm font-semibold border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all">
                       <option value={15}>15 minutos</option><option value={30}>30 minutos</option><option value={45}>45 minutos</option><option value={60}>1 hora</option>
                     </select>
                   </div>
                   <div className="space-y-2">
                     <label className="text-[13px] font-semibold text-slate-900">Pausa intermedia</label>
                     <select value={availability.bufferTime} onChange={e => { setAvailability(p => ({ ...p, bufferTime: +e.target.value })); setHasChanges(true); }} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none text-sm font-semibold border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all">
                       <option value={0}>Sin pausa</option><option value={15}>15 minutos</option><option value={30}>30 minutos</option>
                     </select>
                   </div>
                   <div className="space-y-2">
                     <label className="text-[13px] font-semibold text-slate-900">Anticipación max.</label>
                     <select value={availability.advanceBookingDays} onChange={e => { setAvailability(p => ({ ...p, advanceBookingDays: +e.target.value })); setHasChanges(true); }} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none text-sm font-semibold border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all">
                       <option value={7}>1 semana</option><option value={14}>2 semanas</option><option value={30}>1 mes</option><option value={60}>2 meses</option>
                     </select>
                   </div>
                 </div>
               </section>

               <div className="h-px bg-slate-100" />

               {/* Sección 2 */}
               <section>
                 <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-6">Disponibilidad Semanal</h3>
                 <div className="space-y-2">
                   {daysOfWeek.map(day => {
                     const cfg = availability.weeklySchedule.find(d => d.dayOfWeek === day.value);
                     if (!cfg) return null;
                     return (
                       <div key={day.value} className={cn("rounded-2xl p-4 transition-all duration-300", cfg.enabled ? "bg-white border border-slate-100 shadow-sm" : "bg-transparent border border-transparent")}>
                         <div className="flex items-center justify-between">
                           <label className="flex items-center gap-4 cursor-pointer">
                             <input type="checkbox" checked={cfg.enabled} onChange={() => handleDayToggle(day.value)} className="w-5 h-5 rounded-md text-blue-600 border-slate-300 focus:ring-blue-600 transition-all cursor-pointer" />
                             <span className={cn('text-[15px] font-bold', cfg.enabled ? 'text-slate-900' : 'text-slate-400')}>{day.label}</span>
                           </label>
                           {cfg.enabled && (
                             <button onClick={() => addTimeSlot(day.value)} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition-colors">
                               Agregar Franja
                             </button>
                           )}
                         </div>
                         {cfg.enabled && cfg.timeSlots.length > 0 && (
                           <div className="mt-4 pl-9 space-y-3">
                             {cfg.timeSlots.map((slot, idx) => (
                               <div key={idx} className="flex items-center gap-3">
                                 <input type="time" value={slot.start} onChange={e => updateTimeSlot(day.value, idx, 'start', e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-semibold outline-none focus:border-blue-500 transition-colors" />
                                 <span className="text-slate-300 text-xs font-bold">A</span>
                                 <input type="time" value={slot.end} onChange={e => updateTimeSlot(day.value, idx, 'end', e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-semibold outline-none focus:border-blue-500 transition-colors" />
                                 <button onClick={() => removeTimeSlot(day.value, idx)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors ml-4">
                                   <X size={16} />
                                 </button>
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                     );
                   })}
                 </div>
               </section>

               <div className="h-px bg-slate-100" />

               {/* Sección 3 */}
               <section pb-12>
                 <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-6">Portal de Reservas</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[13px] font-semibold text-slate-900">Nombre del Perfil</label>
                        <input type="text" value={settings.doctorName} onChange={e => { setSettings(p => ({ ...p, doctorName: e.target.value })); setHasChanges(true); }} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none text-[15px] font-semibold focus:bg-white focus:border-blue-500 border border-transparent transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[13px] font-semibold text-slate-900">Descripción Médica</label>
                        <textarea rows={3} value={settings.description} onChange={e => { setSettings(p => ({ ...p, description: e.target.value })); setHasChanges(true); }} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none text-[13px] text-slate-600 focus:bg-white focus:border-blue-500 border border-transparent resize-none transition-all" />
                      </div>
                    </div>
                    <div className="space-y-5">
                       <label className="flex items-center gap-3 cursor-pointer p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                         <input type="checkbox" checked={settings.isActive} onChange={() => { setSettings(p => ({ ...p, isActive: !p.isActive })); setHasChanges(true); }} className="w-5 h-5 rounded-md cursor-pointer" />
                         <span className="text-sm font-bold text-slate-900">Agenda Pública Activa</span>
                       </label>
                       <label className="flex items-center gap-3 cursor-pointer p-2">
                         <input type="checkbox" checked={settings.requirePhone} onChange={() => { setSettings(p => ({ ...p, requirePhone: !p.requirePhone })); setHasChanges(true); }} className="w-4 h-4 rounded cursor-pointer" />
                         <span className="text-sm font-medium text-slate-700">Requerir teléfono obligatorio</span>
                       </label>
                    </div>
                 </div>
               </section>
             </div>
          </div>
        )}

        {/* TAB: COMPARTIR */}
        {activeTab === 'share' && (
          <div className="animate-in fade-in duration-300 max-w-2xl mx-auto mt-12">
             <div className="text-center mb-10">
               <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[28px] flex items-center justify-center mx-auto mb-6 rotate-3">
                 <Globe size={32} className="-rotate-3" />
               </div>
               <h2 className="text-2xl font-bold text-slate-900 mb-2">Comparte tu Agenda</h2>
               <p className="text-slate-500 font-medium">Envía este enlace a tus pacientes para que reserven su propia cita desde cualquier dispositivo.</p>
             </div>

             <div className="bg-slate-50 border border-slate-100 p-6 rounded-[24px] mb-8 relative group">
                <code className="text-[15px] font-semibold text-slate-700 break-all pr-12">{publicUrl}</code>
                <button onClick={copyUrl} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:scale-105 transition-all">
                  <Copy size={18} />
                </button>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <button onClick={openPreview} className="p-4 bg-white border border-slate-200 rounded-[20px] shadow-sm hover:border-slate-300 hover:shadow-md transition-all flex flex-col items-center justify-center gap-3 group">
                   <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors"><Eye size={20} /></div>
                   <span className="text-[13px] font-bold text-slate-900">Probar como paciente</span>
                </button>
                <button onClick={shareWhatsApp} className="p-4 bg-white border border-slate-200 rounded-[20px] shadow-sm hover:border-green-200 hover:shadow-md transition-all flex flex-col items-center justify-center gap-3 group">
                   <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 group-hover:bg-green-500 group-hover:text-white transition-colors"><Share2 size={20} /></div>
                   <span className="text-[13px] font-bold text-green-700">Enviar por WhatsApp</span>
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingManagementView;
