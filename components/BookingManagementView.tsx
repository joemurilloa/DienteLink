import React, { useState, useEffect, useCallback } from 'react';

import {
  ArrowLeft, Clock, User, Calendar, Check, X,
  Settings, Share2, Copy, Eye, Plus, Trash2, Save, Globe,
  Bell, RefreshCw, Link2, MoreVertical
} from 'lucide-react';
import { DoctorAvailability, PublicBookingSettings, AppointmentRequest } from '../types';
import { bookingService } from '../services/bookingService';
import { useAppointments, useAppointmentMutations } from '../hooks/useAppointments';
import { cn, getInitials, formatAppDate } from '../lib/utils';
import { sileo } from 'sileo';
import 'sileo/styles.css';
import ConfirmModal from './ConfirmModal';
import { whatsappService } from '../services/whatsappService';
import { useAuth } from '../services/authService';
import WhatsAppAction from './WhatsAppAction';
import { queryClient } from '../lib/queryClient';
import { useRoleAccess } from './RoleGuard';
import { isRpcConflict, isRpcForbidden, isRpcInvalidState, rpcErrorMessage } from '../lib/rpcErrors';

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
  const { profile, clinicId } = useAuth();
  const { canApproveBookings } = useRoleAccess();
  const { data: appointments = [] } = useAppointments();
  const { deleteAppointment } = useAppointmentMutations();
  const [activeTab, setActiveTab] = useState<'requests' | 'config' | 'share'>('requests');
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [notifyReq, setNotifyReq] = useState<AppointmentRequest | null>(null);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<DoctorAvailability>(() => bookingService.getDoctorAvailability());
  const [settings, setSettings] = useState<PublicBookingSettings>(() => bookingService.getBookingSettings());
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // La página pública hereda el nombre de la clínica y del doctor del perfil,
  // mientras el doctor no haya puesto uno propio (el valor por defecto es genérico).
  useEffect(() => {
    const clinic = profile?.clinic_name?.trim();
    if (!clinic) return;
    const isDefault = !settings.clinicName || settings.clinicName === 'DienteLink Clínica';
    if (!isDefault && settings.requirePhone) return;
    const next = { ...settings, clinicName: clinic, doctorName: settings.doctorName || profile?.full_name || '', requirePhone: true };
    setSettings(next);
    bookingService.saveBookingSettings(next).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.clinic_name]);

  const loadRequests = useCallback(async () => {
    try {
      setLoadingReqs(true);
      await bookingService.refreshRequests();
      setRequests(bookingService.getAppointmentRequests());
    } catch (e) {
      console.error('Error loading requests:', e);
      sileo.error({ title: 'Error', description: 'No se pudieron cargar las solicitudes.' });
    } finally {
      setLoadingReqs(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
    setPublicUrl(bookingService.generatePublicBookingUrl());
  }, [loadRequests]);

  useEffect(() => {
    const handle = () => setRequests(bookingService.getAppointmentRequests());
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

  const handleApprove = async (id: string, forceOverlap = false) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;
    if (!canApproveBookings) {
      sileo.error({ title: 'Sin permiso', description: 'Tu rol no puede aprobar reservas.' });
      return;
    }

    setApprovingId(id);
    try {
      const result = await bookingService.approveRequestAtomic(id, forceOverlap);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['appointments', clinicId] }),
        queryClient.invalidateQueries({ queryKey: ['patients', clinicId] }),
      ]);
      setRequests(bookingService.getAppointmentRequests());

      if (result.possible_duplicates) {
        sileo.warning({
          title: 'Cita creada — revisar duplicados',
          description: 'Había varios pacientes parecidos; se creó un expediente nuevo para no mezclar historiales.',
        });
      }

      if (req.patientPhone) {
        setNotifyReq(req);
      } else {
        sileo.success({
          title: 'Cita en la agenda',
          description: `${formatAppDate(req.requestedDate)} a las ${req.requestedTime}. No hay teléfono para avisar.`,
        });
      }
    } catch (err: unknown) {
      if (isRpcConflict(err)) {
        sileo.warning({
          title: 'Horario ocupado',
          description: `${formatAppDate(req.requestedDate)} a las ${req.requestedTime}. Declina, reprograma o fuerza el solape.`,
        });
      } else if (isRpcInvalidState(err)) {
        sileo.info({
          title: 'Ya estaba procesada',
          description: 'Esta solicitud ya no está pendiente. Actualiza la lista.',
        });
        setRequests(bookingService.getAppointmentRequests());
      } else if (isRpcForbidden(err)) {
        sileo.error({ title: 'Sin permiso', description: 'Tu rol no puede aprobar reservas.' });
      } else {
        sileo.error({ title: 'No se pudo aprobar', description: rpcErrorMessage(err) });
      }
    } finally {
      setApprovingId(null);
    }
  };

  const tellPatient = () => {
    if (!notifyReq) return;
    const result = whatsappService.sendBookingConfirmation(
      notifyReq.patientPhone,
      notifyReq.patientName,
      notifyReq.requestedDate,
      notifyReq.requestedTime,
      profile?.clinic_name,
    );
    if (!result.success) {
      sileo.warning({ title: 'No se pudo abrir WhatsApp', description: result.error || 'Revisa el teléfono.' });
    }
    setNotifyReq(null);
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
      await handleApprove(id, false);
      return;
    }

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
      const nextSettings = { ...settings, requirePhone: true };
      await bookingService.saveDoctorAvailability(availability);
      await bookingService.saveBookingSettings(nextSettings);
      setSettings(nextSettings);
      setHasChanges(false);
      sileo.success({ title: 'Guardado' });
    } catch (e) {
      sileo.error({ title: 'Error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleOnlineBooking = async () => {
    const next = { ...settings, isActive: !settings.isActive, requirePhone: true };
    setSettings(next);
    try {
      await bookingService.saveBookingSettings(next);
      sileo.success({ title: next.isActive ? 'Reservas en línea encendidas' : 'Reservas en línea apagadas' });
    } catch {
      setSettings(settings);
      sileo.error({ title: 'No se pudo cambiar' });
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    sileo.success({ title: 'Link copiado' });
  };

  const openPreview = () => window.open(publicUrl, '_blank');

  const todayISO = new Date().toLocaleDateString('en-CA');
  const pendingCount = requests.filter(r => r.status === 'pending' && r.requestedDate >= todayISO).length;
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
    <div className="flex-1 h-full overflow-y-auto page-transition bg-white main-scroll">
      <div className="p-4 sm:p-6 lg:p-12 pb-32 max-w-[1200px] mx-auto space-y-6 sm:space-y-10">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl lg:text-4xl font-semibold text-slate-900 tracking-tight">Reservas</h1>
              {pendingCount > 0 && (
                <div className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-sm font-bold">
                  {pendingCount} por aprobar
                </div>
              )}
            </div>
            <p className="text-slate-500 font-medium text-sm sm:text-base">Reservas que llegaron por tu enlace. Aprueba las que sí vas a atender.</p>
          </div>
          <div className={cn('flex self-start md:self-auto bg-slate-100/80 p-1 rounded-xl', !settings.isActive && 'pointer-events-none select-none opacity-40')}>
            {([
              { key: 'requests', label: 'Buzón', icon: Bell },
              { key: 'config', label: 'Horarios', icon: Settings },
              { key: 'share', label: 'Enlace', icon: Link2 },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                  activeTab === tab.key ? "bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)]" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden"><tab.icon size={16}/></span>
              </button>
            ))}
          </div>
        </header>

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5">
          <div className="min-w-0">
            <p className="font-bold text-slate-900">Reservas en línea</p>
            <p className="text-sm text-slate-500 mt-0.5">
              {settings.isActive
                ? 'Los pacientes pueden pedir cita por tu enlace.'
                : 'Apagado. Nadie puede agendar por el enlace.'}
            </p>
          </div>
          <div
            role="switch"
            aria-checked={settings.isActive}
            aria-label="Reservas en línea"
            tabIndex={0}
            onClick={toggleOnlineBooking}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleOnlineBooking();
              }
            }}
            className={cn(
              'relative h-[31px] w-[51px] flex-shrink-0 rounded-full cursor-pointer transition-colors duration-200 ease-out',
              settings.isActive ? 'bg-[#34C759]' : 'bg-[#E9E9EA]',
            )}
          >
            <span
              className="absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white border border-black/5 shadow-[0_3px_1px_rgba(0,0,0,0.06),0_3px_8px_rgba(0,0,0,0.15)] transition-transform duration-200 ease-out"
              style={{ transform: settings.isActive ? 'translateX(22px)' : 'translateX(2px)' }}
            />
          </div>
        </div>

        <div className={cn('space-y-6 sm:space-y-10', !settings.isActive && 'pointer-events-none select-none opacity-40')}>

        {/* TAB: REQUESTS */}
        {activeTab === 'requests' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-300 pb-4 overflow-x-auto hide-scrollbar">
              {([
                { key: 'pending', label: 'Por aprobar' },
                { key: 'approved', label: 'En la agenda' },
                { key: 'rejected', label: 'Declinadas' },
                { key: 'all', label: 'Todas' },
              ] as const).map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "px-2.5 sm:px-4 py-2 rounded-[10px] text-[13px] font-bold transition-all whitespace-nowrap",
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
                className="w-11 h-11 rounded-[10px] flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>

            {loadingReqs ? (
              <div className="text-center py-20"><div className="w-11 h-11 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-16 px-4 max-w-lg mx-auto">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-400">
                  <Bell size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {filter === 'pending' ? 'Nada por aprobar' : 'Nada en esta lista'}
                </h3>
                <p className="text-[15px] font-medium text-slate-500 mb-8">
                  {filter === 'pending'
                    ? 'Comparte tu enlace para que los pacientes reserven. Las citas nuevas aparecen aquí.'
                    : 'No hay reservas con este estado.'}
                </p>
                {publicUrl && (
                  <div className="text-left bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Tu enlace de reservas</p>
                    <div className="flex items-start gap-2">
                      <code className="flex-1 text-sm font-semibold text-slate-700 break-all text-left">{publicUrl}</code>
                      <button
                        type="button"
                        onClick={copyUrl}
                        className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700 transition-colors"
                      >
                        <Copy size={15} />
                        Copiar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((req, i) => (
                  <div
                    key={req.id}
                    className="group bg-white rounded-2xl p-5 hover:bg-slate-50/50 transition-colors border border-slate-300 hover:border-slate-300 flex flex-col md:flex-row gap-5 items-start md:items-center relative animate-in fade-in slide-in-from-top-1 duration-300"
                  >
                    {/* Status Dot */}
                    <div className={cn("w-2 h-2 rounded-full mt-1.5 md:mt-0 flex-shrink-0", statusColor(req.status))} />
                    
                    {/* Profile & Info */}
                    <div className="flex-1 min-w-0 flex items-start gap-4">
                      <div className="w-11 h-11 bg-white border border-slate-300 shadow-sm rounded-xl flex items-center justify-center text-slate-600 font-bold text-sm">
                        {getInitials(req.patientName)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-[15px] text-slate-900 truncate">{req.patientName}</h4>
                          <span className={cn(
                            'text-[11px] font-bold px-2 py-0.5 rounded-md',
                            req.status === 'pending' && 'bg-amber-100 text-amber-800',
                            req.status === 'approved' && 'bg-blue-50 text-blue-700',
                            req.status === 'rejected' && 'bg-slate-100 text-slate-500',
                          )}>
                            {req.status === 'pending' ? 'Por aprobar' : req.status === 'approved' ? 'En la agenda' : req.requestedDate < todayISO ? 'Venció' : 'Declinada'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[13px] font-medium text-slate-500 leading-tight">
                          <span className="capitalize whitespace-nowrap">{formatAppDate(req.requestedDate)}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300 flex-shrink-0"/>
                          <span className="font-semibold text-slate-700 whitespace-nowrap">{fmtTime(req.requestedTime)}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300 flex-shrink-0"/>
                          <span className="whitespace-nowrap">{req.appointmentType}</span>
                          {req.patientPhone && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-slate-300 flex-shrink-0"/>
                              <a href={`tel:${req.patientPhone}`} className="whitespace-nowrap text-slate-700 hover:text-blue-700">{req.patientPhone}</a>
                            </>
                          )}
                        </div>
                        {req.message && (
                          <p className="mt-2 text-[13px] text-slate-600 bg-white border border-slate-300 p-2.5 rounded-lg">"{req.message}"</p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t border-slate-300 md:border-0 pt-4 md:pt-0">
                      {req.status === 'pending' && (
                        <>
                           <button
                             disabled={!canApproveBookings || approvingId === req.id}
                             onClick={() => handleApprove(req.id)}
                             className="px-5 py-2.5 bg-blue-600 text-white rounded-[10px] text-[13px] font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
                           >
                             {approvingId === req.id ? 'Aprobando…' : 'Aprobar'}
                           </button>
                           <button onClick={() => handleReject(req.id)} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-[10px] text-[13px] font-bold hover:bg-slate-200 transition-all">Declinar</button>
                        </>
                      )}
                      {req.status === 'approved' && req.patientPhone && (
                        <WhatsAppAction
                          storageKey={`reserva_${req.id}`}
                          label="Abrir WhatsApp"
                          sentLabel="Marcado"
                          title="Abrir WhatsApp con la confirmación de la cita"
                          send={() => whatsappService.sendBookingConfirmation(
                            req.patientPhone,
                            req.patientName,
                            req.requestedDate,
                            req.requestedTime,
                            profile?.clinic_name,
                          )}
                        />
                      )}
                      {req.status === 'rejected' && (
                        <button onClick={() => handleChangeStatus(req.id, 'approved')} className="px-4 py-2 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg text-sm font-bold transition-all">Aprobar</button>
                      )}
                      {req.status !== 'pending' && (
                        <button title="Eliminar solicitud" onClick={() => setDeleteTarget(req.id)} className="w-11 h-11 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: CONFIGURAR */}
        {activeTab === 'config' && (
          <div className="animate-in fade-in duration-300 max-w-4xl">
             <div className="mb-8">
               <h2 className="text-xl font-bold text-slate-900">Cuándo puedes atender</h2>
               <p className="text-sm text-slate-500 mt-1">Esto es lo que ve quien reserva por tu enlace.</p>
             </div>

             <div className="space-y-12">
               {/* Sección 1 */}
               <section>
                 <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Cómo se reservan</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                   <div className="space-y-2">
                     <label className="text-[13px] font-semibold text-slate-900">Cuánto dura una cita</label>
                     <select value={availability.slotDuration} onChange={e => { setAvailability(p => ({ ...p, slotDuration: +e.target.value })); setHasChanges(true); }} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none text-sm font-semibold border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all">
                       <option value={15}>15 minutos</option><option value={30}>30 minutos</option><option value={45}>45 minutos</option><option value={60}>1 hora</option>
                     </select>
                   </div>
                   <div className="space-y-2">
                     <label className="text-[13px] font-semibold text-slate-900">Tiempo entre citas</label>
                     <select value={availability.bufferTime} onChange={e => { setAvailability(p => ({ ...p, bufferTime: +e.target.value })); setHasChanges(true); }} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none text-sm font-semibold border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all">
                       <option value={0}>Sin pausa</option><option value={15}>15 minutos</option><option value={30}>30 minutos</option>
                     </select>
                   </div>
                   <div className="space-y-2">
                     <label className="text-[13px] font-semibold text-slate-900">Hasta cuándo pueden reservar</label>
                     <select value={availability.advanceBookingDays} onChange={e => { setAvailability(p => ({ ...p, advanceBookingDays: +e.target.value })); setHasChanges(true); }} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none text-sm font-semibold border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all">
                       <option value={7}>1 semana</option><option value={14}>2 semanas</option><option value={30}>1 mes</option><option value={60}>2 meses</option>
                     </select>
                   </div>
                 </div>
               </section>

               <div className="h-px bg-slate-100" />

               {/* Sección 2 */}
               <section>
                 <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Días y horarios</h3>
                 <div className="space-y-2">
                   {daysOfWeek.map(day => {
                     const cfg = availability.weeklySchedule.find(d => d.dayOfWeek === day.value);
                     if (!cfg) return null;
                     return (
                       <div key={day.value} className={cn("rounded-2xl p-4 transition-all duration-300", cfg.enabled ? "bg-white border border-slate-300 shadow-sm" : "bg-transparent border border-slate-300")}>
                         <div className="flex items-center justify-between">
                           <label className="flex items-center gap-4 cursor-pointer">
                             <input type="checkbox" checked={cfg.enabled} onChange={() => handleDayToggle(day.value)} className="w-5 h-5 rounded-md text-blue-600 border-slate-300 focus:ring-blue-600 transition-all cursor-pointer" />
                             <span className={cn('text-[15px] font-bold', cfg.enabled ? 'text-slate-900' : 'text-slate-500')}>{day.label}</span>
                           </label>
                           {cfg.enabled && (
                             <button onClick={() => addTimeSlot(day.value)} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-sm font-bold hover:bg-blue-100 transition-colors">
                               Otro horario
                             </button>
                           )}
                         </div>
                         {cfg.enabled && cfg.timeSlots.length > 0 && (
                           <div className="mt-4 pl-9 space-y-3">
                             {cfg.timeSlots.map((slot, idx) => (
                               <div key={idx} className="flex items-center gap-3">
                                 <input type="time" value={slot.start} onChange={e => updateTimeSlot(day.value, idx, 'start', e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold outline-none focus:border-blue-500 transition-colors" />
                                 <span className="text-slate-400 text-sm font-bold">A</span>
                                 <input type="time" value={slot.end} onChange={e => updateTimeSlot(day.value, idx, 'end', e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold outline-none focus:border-blue-500 transition-colors" />
                                 <button onClick={() => removeTimeSlot(day.value, idx)} className="w-11 h-11 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors ml-4">
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
               <section className="pb-12">
                 <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Lo que ve el paciente</h3>
                 <div className="max-w-xl space-y-5">
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[13px] font-semibold text-slate-900">Nombre que ve el paciente</label>
                        <input type="text" value={settings.doctorName} onChange={e => { setSettings(p => ({ ...p, doctorName: e.target.value })); setHasChanges(true); }} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none text-[15px] font-semibold focus:bg-white focus:border-blue-500 border border-slate-300 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[13px] font-semibold text-slate-900">Texto de la página</label>
                        <textarea rows={3} value={settings.description} onChange={e => { setSettings(p => ({ ...p, description: e.target.value })); setHasChanges(true); }} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none text-[13px] text-slate-600 focus:bg-white focus:border-blue-500 border border-slate-300 resize-none transition-all" />
                      </div>
                    </div>
                 </div>
               </section>
             </div>

             <div className="sticky bottom-4 mt-8 flex justify-end">
               <button
                  onClick={handleSaveConfig}
                  disabled={saving || !hasChanges}
                  className="px-6 py-3 bg-blue-600 text-white rounded-[12px] text-sm font-bold shadow-[0_4px_12px_rgba(37,99,235,0.2)] disabled:opacity-50 disabled:shadow-none hover:bg-blue-700 transition-all"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
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

             <div className="bg-slate-50 border border-slate-300 p-6 rounded-[24px] mb-8 relative group">
                <code className="text-[15px] font-semibold text-slate-700 break-all pr-12">{publicUrl}</code>
                <button onClick={copyUrl} className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white shadow-sm rounded-xl flex items-center justify-center text-slate-500 hover:text-blue-600 hover:scale-105 transition-all">
                  <Copy size={18} />
                </button>
             </div>

             <div className="grid grid-cols-1 gap-4 max-w-sm mx-auto">
                <button onClick={openPreview} className="p-4 bg-white border border-slate-300 rounded-[20px] shadow-sm hover:border-slate-300 hover:shadow-md transition-all flex flex-col items-center justify-center gap-3 group">
                   <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors"><Eye size={20} /></div>
                   <span className="text-[13px] font-bold text-slate-900">Probar como paciente</span>
                </button>
             </div>
          </div>
        )}
        </div>
      </div>

      {notifyReq && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setNotifyReq(null)}>
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Cita en la agenda</p>
            <h3 className="text-xl font-bold text-slate-900 mb-1">{notifyReq.patientName}</h3>
            <p className="text-sm text-slate-500 mb-5">
              {formatAppDate(notifyReq.requestedDate)} a las {fmtTime(notifyReq.requestedTime)}. ¿Le avisamos por WhatsApp?
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setNotifyReq(null)} className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm">
                Ahora no
              </button>
              <button type="button" onClick={tellPatient} className="flex-[2] py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm">
                Avisar
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          isOpen={true}
          title="Eliminar Solicitud"
          description="¿Estás seguro de que deseas eliminar esta solicitud de cita? Esta acción no se puede deshacer."
          confirmLabel="Eliminar Solicitud"
          cancelLabel="Cancelar"
          onConfirm={() => {
            handleDelete(deleteTarget);
            setDeleteTarget(null);
          }}
          onClose={() => setDeleteTarget(null)}
          variant="danger"
        />
      )}
    </div>
  );
};

export default BookingManagementView;
