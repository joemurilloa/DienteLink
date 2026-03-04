import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Clock, User, Calendar, Check, X, AlertCircle,
  Settings, Share2, Copy, Eye, Plus, Trash2, Save, Globe,
  CheckCircle, Bell, RefreshCw, Link2
} from 'lucide-react';
import { DoctorAvailability, PublicBookingSettings, AppointmentRequest, Appointment } from '../types';
import { bookingService } from '../services/bookingService';
import { persistenceService } from '../services/persistenceService';
import { cn, generateId } from '../lib/utils';
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
  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<'requests' | 'config' | 'share'>('requests');

  // ── Requests state ──
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Config state ──
  const [availability, setAvailability] = useState<DoctorAvailability>(() => bookingService.getDoctorAvailability());
  const [settings, setSettings] = useState<PublicBookingSettings>(() => bookingService.getBookingSettings());
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Share state ──
  const [publicUrl, setPublicUrl] = useState('');

  // ── Load data ──
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

  // Listen for real-time updates
  useEffect(() => {
    const handle = () => loadRequests();
    window.addEventListener('bookingRequestsUpdated', handle);
    window.addEventListener('newAppointmentRequest', handle);
    return () => {
      window.removeEventListener('bookingRequestsUpdated', handle);
      window.removeEventListener('newAppointmentRequest', handle);
    };
  }, [loadRequests]);

  // ── Request actions ──
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

    // Create a real appointment in the calendar / dashboard
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
    await persistenceService.saveAppointment(appointment);

    // Dispatch event so Dashboard and Calendar refresh
    window.dispatchEvent(new CustomEvent('appointmentCreated', { detail: appointment }));

    sileo.success({
      title: `¡Cita aprobada para ${req.patientName}!`,
      description: `Agendada el ${req.requestedDate} a las ${req.requestedTime}`,
    });
    setRequests(bookingService.getAppointmentRequests());
  };

  const handleReject = async (id: string) => {
    await bookingService.rejectRequest(id);
    sileo.info({ title: 'Solicitud rechazada' });
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
      // When re-approving, also create the appointment
      await bookingService.updateRequestStatus(id, 'approved');
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
      await persistenceService.saveAppointment(appointment);
      window.dispatchEvent(new CustomEvent('appointmentCreated', { detail: appointment }));
      sileo.success({ title: `Cita re-aprobada para ${req.patientName}`, description: `${req.requestedDate} a las ${req.requestedTime}` });
    } else {
      await bookingService.updateRequestStatus(id, newStatus);
      sileo.info({ title: newStatus === 'pending' ? 'Solicitud marcada como pendiente' : 'Solicitud rechazada' });
    }

    setRequests(bookingService.getAppointmentRequests());
  };

  // ── Config actions ──
  const handleDayToggle = (dayOfWeek: number) => {
    setAvailability(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map(d =>
        d.dayOfWeek === dayOfWeek ? { ...d, enabled: !d.enabled } : d
      ),
    }));
    setHasChanges(true);
  };

  const addTimeSlot = (dayOfWeek: number) => {
    setAvailability(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map(d =>
        d.dayOfWeek === dayOfWeek
          ? { ...d, timeSlots: [...d.timeSlots, { start: '09:00', end: '10:00' }] }
          : d
      ),
    }));
    setHasChanges(true);
  };

  const updateTimeSlot = (dayOfWeek: number, idx: number, field: 'start' | 'end', value: string) => {
    setAvailability(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map(d =>
        d.dayOfWeek === dayOfWeek
          ? { ...d, timeSlots: d.timeSlots.map((s, i) => (i === idx ? { ...s, [field]: value } : s)) }
          : d
      ),
    }));
    setHasChanges(true);
  };

  const removeTimeSlot = (dayOfWeek: number, idx: number) => {
    setAvailability(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map(d =>
        d.dayOfWeek === dayOfWeek
          ? { ...d, timeSlots: d.timeSlots.filter((_, i) => i !== idx) }
          : d
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
      sileo.success({ title: '¡Configuración guardada!' });
    } catch (e) {
      sileo.error({ title: 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  // ── Share actions ──
  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    sileo.success({ title: '¡Link copiado!' });
  };

  const openPreview = () => {
    window.open(publicUrl, '_blank');
  };

  const shareWhatsApp = () => {
    const msg = `¡Agenda tu cita conmigo de forma fácil! 📅\n\n${publicUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ── Helpers ──
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const filteredRequests = requests.filter(r => filter === 'all' || r.status === filter);

  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const fmtTime = (s: string) => {
    const [h, m] = s.split(':');
    return new Date(0, 0, 0, +h, +m).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
      pending: { color: 'text-amber-600 bg-amber-50 border-amber-200', icon: <AlertCircle size={12} />, text: 'Pendiente' },
      approved: { color: 'text-green-600 bg-green-50 border-green-200', icon: <Check size={12} />, text: 'Aprobada' },
      rejected: { color: 'text-red-600 bg-red-50 border-red-200', icon: <X size={12} />, text: 'Rechazada' },
    };
    const b = map[status] || map.pending;
    return (
      <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 border rounded-full text-[11px] font-semibold', b.color)}>
        {b.icon} {b.text}
      </span>
    );
  };

  // ════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════

  return (
    <div className="flex-1 h-full overflow-y-auto page-transition">
      <div className="p-5 lg:p-8 pb-32 max-w-5xl mx-auto">
        {/* Header */}
        <header className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 border border-slate-200 hover:text-blue-600 transition-all active:scale-95"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Solicitudes</h2>
            <p className="text-sm text-slate-400 mt-0.5">Gestiona citas y configura tu agenda pública</p>
          </div>
          {pendingCount > 0 && (
            <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-xl text-sm font-bold">
              {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
            </span>
          )}
        </header>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6">
          {([
            { key: 'requests' as const, label: 'Solicitudes', icon: Bell, badge: pendingCount },
            { key: 'config' as const, label: 'Configurar', icon: Settings, badge: 0 },
            { key: 'share' as const, label: 'Compartir', icon: Link2, badge: 0 },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all',
                activeTab === tab.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <tab.icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ═══════════════ TAB: SOLICITUDES ═══════════════ */}
        {activeTab === 'requests' && (
          <div>
            {/* Filter + Refresh */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              {([
                { key: 'all' as const, label: 'Todas', count: requests.length },
                { key: 'pending' as const, label: 'Pendientes', count: requests.filter(r => r.status === 'pending').length },
                { key: 'approved' as const, label: 'Aprobadas', count: requests.filter(r => r.status === 'approved').length },
                { key: 'rejected' as const, label: 'Rechazadas', count: requests.filter(r => r.status === 'rejected').length },
              ]).map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    'px-3.5 py-2 rounded-lg text-xs font-semibold transition-all',
                    filter === f.key ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-200'
                  )}
                >
                  {f.label} ({f.count})
                </button>
              ))}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="ml-auto p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all disabled:opacity-50"
                title="Actualizar solicitudes"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>

            {loadingReqs ? (
              <div className="text-center py-16">
                <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-400">Cargando solicitudes...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                <Bell size={40} className="text-slate-200 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-600 mb-1">
                  {filter === 'all' ? 'Sin solicitudes aún' : `Sin solicitudes ${filter === 'pending' ? 'pendientes' : filter === 'approved' ? 'aprobadas' : 'rechazadas'}`}
                </h3>
                <p className="text-sm text-slate-400">Las citas agendadas desde tu enlace público aparecerán aquí.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((req, i) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-white rounded-xl border border-slate-100 p-5 hover:border-slate-200 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-bold text-sm">
                          {req.patientName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{req.patientName}</h4>
                          <p className="text-xs text-slate-400">{req.patientEmail}{req.patientPhone ? ` · ${req.patientPhone}` : ''}</p>
                        </div>
                      </div>
                      {statusBadge(req.status)}
                    </div>

                    <div className="flex flex-wrap gap-3 mb-3 text-sm text-slate-600">
                      <span className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-300" />{fmtDate(req.requestedDate)}</span>
                      <span className="flex items-center gap-1.5"><Clock size={14} className="text-slate-300" />{fmtTime(req.requestedTime)}</span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md text-xs font-medium">{req.appointmentType}</span>
                    </div>

                    {req.message && (
                      <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg mb-3 italic">"{req.message}"</p>
                    )}

                    {/* Action buttons — shown for ALL statuses */}
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                      {req.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(req.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
                          >
                            <Check size={16} /> Aprobar
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
                          >
                            <X size={16} /> Rechazar
                          </button>
                        </>
                      )}
                      {req.status === 'approved' && (
                        <button
                          onClick={() => handleChangeStatus(req.id, 'rejected')}
                          className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-50 transition-colors"
                        >
                          <X size={14} /> Revocar aprobación
                        </button>
                      )}
                      {req.status === 'rejected' && (
                        <>
                          <button
                            onClick={() => handleChangeStatus(req.id, 'approved')}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-semibold hover:bg-green-700 transition-colors"
                          >
                            <Check size={14} /> Aprobar
                          </button>
                          <button
                            onClick={() => handleChangeStatus(req.id, 'pending')}
                            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
                          >
                            <RefreshCw size={14} /> Reabrir
                          </button>
                        </>
                      )}
                      {/* Delete button always visible */}
                      <button
                        onClick={() => handleDelete(req.id)}
                        className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold transition-colors ml-auto"
                        title="Eliminar solicitud"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-300 mt-3">
                      Solicitado {new Date(req.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ TAB: CONFIGURAR ═══════════════ */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            {/* Save bar */}
            {hasChanges && (
              <div className="sticky top-0 z-10 flex items-center gap-3 bg-blue-50 border border-blue-200 p-3 rounded-xl">
                <p className="flex-1 text-sm text-blue-700 font-medium">Tienes cambios sin guardar</p>
                <button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  Guardar
                </button>
              </div>
            )}

            {/* General settings */}
            <section className="bg-white rounded-xl border border-slate-100 p-6">
              <h3 className="text-base font-bold text-slate-900 mb-4">Duración y Anticipación</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Duración por cita</label>
                  <select
                    value={availability.slotDuration}
                    onChange={e => { setAvailability(p => ({ ...p, slotDuration: +e.target.value })); setHasChanges(true); }}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1 hora</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Pausa entre citas</label>
                  <select
                    value={availability.bufferTime}
                    onChange={e => { setAvailability(p => ({ ...p, bufferTime: +e.target.value })); setHasChanges(true); }}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value={0}>Sin pausa</option>
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Anticipación máxima</label>
                  <select
                    value={availability.advanceBookingDays}
                    onChange={e => { setAvailability(p => ({ ...p, advanceBookingDays: +e.target.value })); setHasChanges(true); }}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value={7}>1 semana</option>
                    <option value={14}>2 semanas</option>
                    <option value={30}>1 mes</option>
                    <option value={60}>2 meses</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Weekly schedule */}
            <section className="bg-white rounded-xl border border-slate-100 p-6">
              <h3 className="text-base font-bold text-slate-900 mb-4">Horarios Semanales</h3>
              <div className="space-y-3">
                {daysOfWeek.map(day => {
                  const cfg = availability.weeklySchedule.find(d => d.dayOfWeek === day.value);
                  if (!cfg) return null;
                  return (
                    <div key={day.value} className={cn('rounded-xl border p-4 transition-colors', cfg.enabled ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50')}>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                          <button
                            onClick={() => handleDayToggle(day.value)}
                            className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all', cfg.enabled ? 'bg-blue-600 border-blue-600' : 'border-slate-300')}
                          >
                            {cfg.enabled && <Check size={12} className="text-white" />}
                          </button>
                          <span className={cn('text-sm font-semibold', cfg.enabled ? 'text-slate-900' : 'text-slate-400')}>{day.label}</span>
                        </label>
                        {cfg.enabled && (
                          <button onClick={() => addTimeSlot(day.value)} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                            <Plus size={14} /> Agregar
                          </button>
                        )}
                      </div>
                      {cfg.enabled && cfg.timeSlots.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {cfg.timeSlots.map((slot, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                              <input type="time" value={slot.start} onChange={e => updateTimeSlot(day.value, idx, 'start', e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                              <span className="text-slate-300 text-xs">—</span>
                              <input type="time" value={slot.end} onChange={e => updateTimeSlot(day.value, idx, 'end', e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                              <button onClick={() => removeTimeSlot(day.value, idx)} className="ml-auto p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 size={14} />
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

            {/* Booking page settings */}
            <section className="bg-white rounded-xl border border-slate-100 p-6">
              <h3 className="text-base font-bold text-slate-900 mb-4">Página de Reservas</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre del doctor</label>
                    <input type="text" value={settings.doctorName} onChange={e => { setSettings(p => ({ ...p, doctorName: e.target.value })); setHasChanges(true); }}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre de la clínica</label>
                    <input type="text" value={settings.clinicName} onChange={e => { setSettings(p => ({ ...p, clinicName: e.target.value })); setHasChanges(true); }}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Descripción</label>
                    <textarea value={settings.description} onChange={e => { setSettings(p => ({ ...p, description: e.target.value })); setHasChanges(true); }}
                      rows={2} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-3">
                    {([
                      { key: 'requirePhone', label: 'Requerir teléfono' },
                      { key: 'requireMessage', label: 'Requerir mensaje' },
                      { key: 'isActive', label: 'Agenda activa (aceptar citas)' },
                    ] as const).map(opt => (
                      <label key={opt.key} className="flex items-center gap-3 cursor-pointer">
                        <div
                          onClick={() => { setSettings(p => ({ ...p, [opt.key]: !p[opt.key] })); setHasChanges(true); }}
                          className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer', settings[opt.key] ? 'bg-blue-600 border-blue-600' : 'border-slate-300')}
                        >
                          {settings[opt.key] && <Check size={12} className="text-white" />}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Mensaje de confirmación</label>
                    <textarea value={settings.confirmationMessage} onChange={e => { setSettings(p => ({ ...p, confirmationMessage: e.target.value })); setHasChanges(true); }}
                      rows={2} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ═══════════════ TAB: COMPARTIR ═══════════════ */}
        {activeTab === 'share' && (
          <div className="space-y-6">
            {/* URL card */}
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Globe size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Tu Link Público</h3>
                  <p className="text-xs text-slate-400">Comparte este enlace para que tus pacientes agenden</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <code className="text-sm text-slate-600 break-all block">{publicUrl}</code>
              </div>

              <div className="flex gap-2">
                <button onClick={copyUrl} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                  <Copy size={16} /> Copiar Link
                </button>
                <button onClick={openPreview} className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                  <Eye size={16} /> Ver como Paciente
                </button>
              </div>
            </div>

            {/* Share options */}
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h3 className="text-base font-bold text-slate-900 mb-4">Compartir en</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button onClick={shareWhatsApp} className="flex items-center gap-3 p-4 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors font-semibold text-sm">
                  <Share2 size={20} /> WhatsApp
                </button>
                <button onClick={copyUrl} className="flex items-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors font-semibold text-sm">
                  <Copy size={20} /> Copiar Link
                </button>
                <button onClick={openPreview} className="flex items-center gap-3 p-4 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors font-semibold text-sm">
                  <Eye size={20} /> Vista Previa
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
              <h4 className="font-bold text-amber-800 text-sm mb-2">💡 Consejos</h4>
              <ul className="text-sm text-amber-700 space-y-1.5">
                <li>• Comparte el link en tus redes sociales y WhatsApp</li>
                <li>• Los pacientes agendan sin crear cuenta</li>
                <li>• Recibirás las solicitudes aquí para aprobar o rechazar</li>
                <li>• Puedes desactivar la agenda en la pestaña Configurar</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingManagementView;
