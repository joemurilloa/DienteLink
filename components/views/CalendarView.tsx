import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { persistenceService } from '../../services/persistenceService';
import ConfirmModal from '../ConfirmModal';
import { Appointment, AppointmentType } from '../../types';
import { cn, generateId, getInitials } from '../../lib/utils';
import { Plus, Trash2 } from 'lucide-react';
import { sileo } from 'sileo';

const APPOINTMENT_TYPES: AppointmentType[] = ['Consulta', 'Seguimiento', 'Cirugía', 'Revisión'];

const CalendarView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [appointments, setAppointments] = useState(persistenceService.getAppointments());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Refresh when a booking request is approved and creates an appointment
  useEffect(() => {
    const handleCreated = () => setAppointments(persistenceService.getAppointments());
    window.addEventListener('appointmentCreated', handleCreated);
    return () => window.removeEventListener('appointmentCreated', handleCreated);
  }, []);

  const patientNameFromParams = searchParams.get('patient') || '';
  const patientIdFromParams = searchParams.get('id') || '';

  const [newApt, setNewApt] = useState({
    patientName: patientNameFromParams,
    patientId: patientIdFromParams,
    time: '09:00',
    date: new Date().toISOString().split('T')[0],
    type: 'Consulta' as AppointmentType
  });

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  // Navigation helpers per view
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };
  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };
  const handleToday = () => setCurrentDate(new Date());

  const handleAddAppointment = async () => {
    setFormError('');
    if (!newApt.patientName.trim()) {
      setFormError('Ingresa el nombre del paciente');
      return;
    }
    if (newApt.patientName.trim().length < 3) {
      setFormError('El nombre debe tener al menos 3 caracteres');
      return;
    }

    // Check for schedule conflicts
    const conflict = appointments.find(a => a.date === newApt.date && a.time === newApt.time);
    if (conflict) {
      setFormError(`Ya existe una cita a las ${newApt.time} con ${conflict.patientName}. Elige otra hora.`);
      return;
    }

    // Try to find patient by name if no patientId is provided
    let patientId = newApt.patientId;
    let phoneNumber = '';
    const found = persistenceService.getPatients().find(
      p => patientId ? p.id === patientId : p.identification.fullName.toLowerCase() === newApt.patientName.toLowerCase()
    );
    if (found) {
      patientId = found.id;
      phoneNumber = found.identification.phone || '';
    }

    const appointment: Appointment = {
      id: generateId(),
      patientId,
      patientName: newApt.patientName,
      phoneNumber,
      time: newApt.time,
      date: newApt.date,
      type: newApt.type,
      status: 'Programada',
      reminderStatus: 'not_sent'
    };
    await persistenceService.saveAppointment(appointment);
    setAppointments(persistenceService.getAppointments());
    setIsAdding(false);
    setNewApt({ patientName: '', patientId: '', time: '09:00', date: newApt.date, type: 'Consulta' });
    sileo.success({ title: `Cita creada para ${appointment.patientName}`, description: `${appointment.date} a las ${appointment.time}` });
  };

  const handleDeleteAppointment = async (aptId: string) => {
    await persistenceService.deleteAppointment(aptId);
    setAppointments(persistenceService.getAppointments());
    setDeleteTarget(null);
    sileo.info({ title: 'Cita movida a la papelera', description: 'Puedes recuperarla desde Ajustes → Papelera' });
  };

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const dayNamesShort = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const dayNamesFull = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = daysInMonth(year, month);
  const skip = firstDayOfMonth(year, month);
  const todayStr = new Date().toISOString().split('T')[0];
  const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00

  // Week helpers
  const getWeekDates = () => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Start on Monday
    const monday = new Date(d.setDate(diff));
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return date;
    });
  };

  const fmtDate = (d: Date) => d.toISOString().split('T')[0];
  const fmtHour = (h: number) => `${String(h).padStart(2, '0')}:00`;

  // Header label
  const headerLabel = viewMode === 'month'
    ? `${monthNames[month]} ${year}`
    : viewMode === 'week'
      ? (() => {
        const dates = getWeekDates();
        const s = dates[0]; const e = dates[6];
        return s.getMonth() === e.getMonth()
          ? `${s.getDate()} – ${e.getDate()} ${monthNames[s.getMonth()]} ${s.getFullYear()}`
          : `${s.getDate()} ${monthNames[s.getMonth()].slice(0, 3)} – ${e.getDate()} ${monthNames[e.getMonth()].slice(0, 3)} ${e.getFullYear()}`;
      })()
      : `${dayNamesFull[currentDate.getDay()]} ${currentDate.getDate()} de ${monthNames[currentDate.getMonth()]} ${year}`;

  return (
    <div className="flex-1 h-full overflow-y-auto p-5 lg:p-8 pb-32 page-transition">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 border border-slate-200 hover:text-blue-600 transition-all active:scale-95">←</button>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Agenda</h2>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-[0.97]"
        >
          <Plus size={16} /> Nueva Cita
        </button>
      </header>

      {/* View Mode Toggle + Navigation */}
      <div className="card-premium p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* View selector */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            {([['month', 'Mes'], ['week', 'Semana'], ['day', 'Día']] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-semibold transition-all",
                  viewMode === mode
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            <button onClick={handleToday} className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-all border border-blue-100">
              Hoy
            </button>
            <button onClick={handlePrev} className="p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-slate-600">←</button>
            <h3 className="text-lg font-bold text-slate-900 min-w-[200px] text-center">{headerLabel}</h3>
            <button onClick={handleNext} className="p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-slate-600">→</button>
          </div>
        </div>
      </div>

      {/* Hint for new users */}
      <p className="text-xs text-slate-400 text-center mb-4 md:hidden">Toca en una fecha o hora para agregar una cita</p>

      {/* ══════ MONTHLY VIEW ══════ */}
      {viewMode === 'month' && (
        <div className="card-premium p-6 mb-6">
          <div className="grid grid-cols-7 gap-4">
            {dayNamesShort.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-3">{d}</div>
            ))}
            {Array.from({ length: skip }).map((_, i) => <div key={`skip-${i}`} />)}
            {Array.from({ length: days }).map((_, i) => {
              const d = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const dayApts = appointments.filter(a => a.date === dateStr);
              const isToday = todayStr === dateStr;

              return (
                <div
                  key={d}
                  onClick={() => {
                    setNewApt(prev => ({ ...prev, date: dateStr }));
                    setCurrentDate(new Date(dateStr));
                    setViewMode('day');
                  }}
                  className={cn(
                    "min-h-[100px] p-3 rounded-xl border transition-all cursor-pointer group hover:border-blue-200 hover:shadow-md",
                    isToday ? "bg-blue-50 border-blue-200" : "bg-white border-slate-100"
                  )}
                >
                  <span className={cn(
                    "text-xs font-bold mb-1.5 block",
                    isToday ? "text-blue-600" : "text-slate-400 group-hover:text-blue-500"
                  )}>{d}</span>
                  <div className="space-y-1">
                    {dayApts.map(a => (
                      <div key={a.id} className="px-2 py-1 bg-blue-600 text-white rounded-md text-[9px] font-medium truncate flex items-center justify-between gap-1">
                        <span className="truncate">{a.time} - {a.patientName}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(a.id); }}
                          className="text-red-300 hover:text-red-100 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                    {dayApts.length === 0 && (
                      <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus size={12} className="text-blue-300" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════ WEEKLY VIEW ══════ */}
      {viewMode === 'week' && (
        <div className="card-premium p-4 mb-6 overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Day headers */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-0 border-b border-slate-200 pb-3 mb-0">
              <div />
              {getWeekDates().map((date, i) => {
                const dateStr = fmtDate(date);
                const isToday = dateStr === todayStr;
                const dayApts = appointments.filter(a => a.date === dateStr);
                return (
                  <div key={i} className="text-center">
                    <p className={cn("text-[10px] font-semibold uppercase tracking-wider", isToday ? "text-blue-600" : "text-slate-400")}>
                      {dayNamesShort[(i + 1) % 7]}
                    </p>
                    <button
                      onClick={() => { setCurrentDate(date); setViewMode('day'); }}
                      className={cn(
                        "w-9 h-9 rounded-full text-sm font-bold mt-1 transition-all",
                        isToday ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-blue-50"
                      )}
                    >
                      {date.getDate()}
                    </button>
                    {dayApts.length > 0 && (
                      <div className="flex justify-center mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Time grid */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-0">
              {HOURS.map(hour => (
                <React.Fragment key={hour}>
                  <div className="h-16 flex items-start justify-end pr-3 pt-0.5">
                    <span className="text-[10px] font-semibold text-slate-400">{fmtHour(hour)}</span>
                  </div>
                  {getWeekDates().map((date, di) => {
                    const dateStr = fmtDate(date);
                    const hourApts = appointments.filter(a => {
                      if (a.date !== dateStr) return false;
                      if (!a.time) return false;
                      const aptHour = parseInt(a.time.split(':')[0] || '0', 10);
                      return aptHour === hour;
                    });
                    const isToday = dateStr === todayStr;
                    return (
                      <div
                        key={`${hour}-${di}`}
                        onClick={() => {
                          setNewApt(prev => ({ ...prev, date: dateStr, time: fmtHour(hour) }));
                          setIsAdding(true);
                        }}
                        className={cn(
                          "h-16 border-t border-l border-slate-100 px-1 py-0.5 cursor-pointer hover:bg-blue-50/50 transition-colors relative group",
                          isToday && "bg-blue-50/30"
                        )}
                      >
                        {hourApts.map(a => (
                          <div key={a.id} className="px-1.5 py-1 bg-blue-600 text-white rounded-md text-[10px] font-medium mb-0.5 truncate flex items-center justify-between gap-0.5">
                            <span className="truncate">{a.time} {a.patientName}</span>
                            <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(a.id); }} className="text-red-300 hover:text-red-100 flex-shrink-0 opacity-0 group-hover:opacity-100">
                              <Trash2 size={8} />
                            </button>
                          </div>
                        ))}
                        {hourApts.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus size={10} className="text-blue-300" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════ DAILY VIEW ══════ */}
      {viewMode === 'day' && (
        <div className="card-premium p-6 mb-6">
          <div className="space-y-0">
            {HOURS.map(hour => {
              const dateStr = fmtDate(currentDate);
              const hourApts = appointments.filter(a => {
                if (a.date !== dateStr) return false;
                if (!a.time) return false;
                const aptHour = parseInt(a.time.split(':')[0] || '0', 10);
                return aptHour === hour;
              });
              const isNow = todayStr === dateStr && new Date().getHours() === hour;

              return (
                <div
                  key={hour}
                  className={cn(
                    "flex gap-4 border-t border-slate-100 min-h-[72px] group cursor-pointer hover:bg-blue-50/40 transition-colors",
                    isNow && "bg-blue-50/60"
                  )}
                  onClick={() => {
                    setNewApt(prev => ({ ...prev, date: dateStr, time: fmtHour(hour) }));
                    setIsAdding(true);
                  }}
                >
                  {/* Hour label */}
                  <div className="w-16 flex-shrink-0 pt-2 text-right pr-3">
                    <span className={cn("text-xs font-semibold", isNow ? "text-blue-600" : "text-slate-400")}>{fmtHour(hour)}</span>
                    {isNow && <div className="w-2 h-2 bg-blue-600 rounded-full ml-auto mt-1" />}
                  </div>

                  {/* Appointments */}
                  <div className="flex-1 py-2 space-y-2">
                    {hourApts.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-3 bg-blue-600 text-white rounded-xl shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {getInitials(a.patientName)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm truncate">{a.patientName}</h4>
                            <p className="text-blue-200 text-xs">{a.time} · {a.type} · {a.status}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {a.patientId && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/patient/${a.patientId}`); }}
                              className="px-2.5 py-1.5 bg-white/20 rounded-lg text-[10px] font-semibold hover:bg-white/30 transition-all"
                            >
                              Ver
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(a.id); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-red-200 hover:text-red-100 hover:bg-red-500/30 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {hourApts.length === 0 && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-blue-400 text-xs font-medium py-2">
                        <Plus size={12} /> Agregar cita
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm page-transition">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md page-transition">
            <h3 className="text-xl font-bold text-slate-900 mb-5 tracking-tight">Agendar Cita</h3>
            <div className="space-y-4">
              {formError && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
                  {formError}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Paciente <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    value={newApt.patientName}
                    onChange={e => { setNewApt(p => ({ ...p, patientName: e.target.value, patientId: '' })); setFormError(''); }}
                    placeholder="Escribe el nombre del paciente..."
                  />
                  {/* Patient suggestions */}
                  {newApt.patientName.length >= 2 && !newApt.patientId && (() => {
                    const matches = persistenceService.getPatients()
                      .filter(p => p.identification.fullName.toLowerCase().includes(newApt.patientName.toLowerCase()))
                      .slice(0, 4);
                    if (matches.length === 0) return null;
                    return (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg z-10 overflow-hidden">
                        {matches.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => { setNewApt(prev => ({ ...prev, patientName: p.identification.fullName, patientId: p.id })); setFormError(''); }}
                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2 border-b border-slate-50 last:border-0"
                          >
                            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-[10px] font-bold flex-shrink-0">
                              {getInitials(p.identification.fullName)}
                            </div>
                            <span>{p.identification.fullName}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <p className="text-[10px] text-slate-300 ml-1">Puedes seleccionar un paciente existente o escribir un nombre nuevo</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Fecha</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none text-sm font-medium focus:border-blue-500 transition-all"
                    value={newApt.date}
                    onChange={e => { setNewApt(p => ({ ...p, date: e.target.value })); setFormError(''); }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Hora</label>
                  <input
                    type="time"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none text-sm font-medium focus:border-blue-500 transition-all"
                    value={newApt.time}
                    onChange={e => { setNewApt(p => ({ ...p, time: e.target.value })); setFormError(''); }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tipo de Cita</label>
                <div className="flex gap-2 flex-wrap">
                  {APPOINTMENT_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewApt(p => ({ ...p, type: t }))}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-semibold transition-all",
                        newApt.type === t
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-blue-50 hover:text-blue-600"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleAddAppointment}
                className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm shadow-md shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition-all mt-3"
              >
                Confirmar y Agendar
              </button>
              <button
                onClick={() => { setIsAdding(false); setFormError(''); }}
                className="w-full py-3 text-slate-400 text-xs font-semibold hover:text-red-500 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDeleteAppointment(deleteTarget)}
        title="Mover a papelera"
        description="La cita se moverá a la papelera. Podrás recuperarla desde Ajustes → Papelera si fue un error."
        confirmLabel="Sí, mover a papelera"
        variant="warning"
      />
    </div>
  );
};

export default CalendarView;
