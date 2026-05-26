import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppointments, useAppointmentMutations } from '../../hooks/useAppointments';
import { usePatients } from '../../hooks/usePatients';
import ConfirmModal from '../ConfirmModal';
import { Appointment, AppointmentType } from '../../types';
import { cn, generateId, getInitials, getLocalISODate } from '../../lib/utils';
import { Plus, Trash2, ChevronLeft, ChevronRight, X, Search } from 'lucide-react';
import { sileo } from 'sileo';
import { useCalendarTip } from '../ContextualTips';

const APPOINTMENT_TYPES: AppointmentType[] = ['Consulta', 'Seguimiento', 'Cirugía', 'Revisión'];

const CalendarView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [viewDate, setViewDate] = useState(new Date());
  const { data: appointments = [], isLoading } = useAppointments();
  const { data: patientsList = [] } = usePatients();
  const { createAppointment, deleteAppointment } = useAppointmentMutations();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Contextual tip (show once)
  useCalendarTip();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>(() => {
    return window.innerWidth < 768 ? 'day' : 'month';
  });

  const patientNameFromParams = searchParams.get('patient') || '';
  const patientIdFromParams = searchParams.get('id') || '';
  const [isAdding, setIsAdding] = useState(!!patientIdFromParams || searchParams.get('new') === 'true');
  const [showDropdown, setShowDropdown] = useState(false);
  const [dateSliderOffset, setDateSliderOffset] = useState(0);
  const [newApt, setNewApt] = useState({
    patientName: patientNameFromParams,
    patientId: patientIdFromParams,
    time: '09:00',
    date: getLocalISODate(new Date()),
    type: 'Consulta' as AppointmentType
  });

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

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
    if (isCreating) return;
    setIsCreating(true);
    setFormError('');
    if (!newApt.patientName.trim()) { setFormError('El nombre del paciente es requerido'); return; }
    if (newApt.patientName.trim().length < 3) { setFormError('El nombre es demasiado corto'); return; }

    const conflict = appointments.find(a => 
      a.date === newApt.date && 
      a.time === newApt.time && 
      a.status !== 'Eliminada'
    );
    if (conflict) {
      setFormError(`Conflicto de horario: ${newApt.time} ya está reservado para ${conflict.patientName}.`);
      setIsCreating(false);
      return;
    }

    let patientId = newApt.patientId;
    let phoneNumber = '';
    const found = patientsList.find(p => patientId ? p.id === patientId : p.identification.fullName.toLowerCase() === newApt.patientName.toLowerCase());
    
    if (found) {
      patientId = found.id;
      phoneNumber = found.identification.phone || '';
    }

    const appointment: Appointment = {
      id: generateId(),
      patientId,
      patientName: newApt.patientName.trim(),
      phoneNumber,
      time: newApt.time,
      date: newApt.date,
      type: newApt.type,
      status: 'Programada',
      reminderStatus: 'not_sent'
    };

    createAppointment.mutate(appointment, {
      onSuccess: () => {
        sileo.success({ title: 'Cita Agendada', description: `${appointment.patientName} a las ${appointment.time}` });
        setIsAdding(false);
        setNewApt({ patientName: '', patientId: '', time: '09:00', date: newApt.date, type: 'Consulta' });
      },
      onSettled: () => setIsCreating(false)
    });
  };

  const handleDeleteAppointment = async (aptId: string) => {
    setDeleteTarget(null);
    deleteAppointment.mutate(aptId, {
      onSuccess: () => {
        sileo.info({ title: 'Cita eliminada', description: 'Se movió a la papelera del sistema.' });
      }
    });
  };

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const dayNamesShort = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = daysInMonth(year, month);
  const skip = firstDayOfMonth(year, month);
  const todayStr = getLocalISODate(new Date());
  const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00

  const getWeekDates = () => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return date;
    });
  };

  const fmtDate = (d: Date) => getLocalISODate(d);
  const fmtHour = (h: number) => `${String(h).padStart(2, '0')}:00`;

  const headerLabel = viewMode === 'month'
    ? `${monthNames[month]} ${year}`
    : viewMode === 'week'
      ? (() => {
        const dates = getWeekDates();
        const s = dates[0], e = dates[6];
        return s.getMonth() === e.getMonth()
          ? `${s.getDate()} - ${e.getDate()} de ${monthNames[s.getMonth()]} ${year}`
          : `${s.getDate()} de ${monthNames[s.getMonth()].slice(0, 3)} - ${e.getDate()} de ${monthNames[e.getMonth()].slice(0, 3)} ${year}`;
      })()
      : (() => {
          const d = currentDate.getDate();
          return `${d} de ${monthNames[currentDate.getMonth()]} ${year}`;
      })();

  return (
    <div className="flex-1 flex flex-col h-full bg-white page-transition overflow-hidden">
      <div className="flex-1 flex flex-col max-w-[1400px] w-full mx-auto p-4 pt-10 lg:p-6 lg:pb-6 gap-4 overflow-hidden">
        
        {/* Superior Minimalist Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl lg:text-4xl font-semibold text-slate-900 tracking-tight">Calendario</h1>
            </div>
            <p className="text-slate-500 font-medium pl-11">Organiza tu clínica fácilmente.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100/80 p-1 rounded-xl">
              {([['day', 'Día'], ['week', 'Semana'], ['month', 'Mes']] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                    viewMode === mode ? "bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)]" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
               onClick={() => setIsAdding(true)}
               className="h-10 px-5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-[0_4px_12px_rgba(37,99,235,0.2)] hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Nueva Cita</span>
            </button>
          </div>
        </header>

        {/* Date Navigation Strip */}
        <div className="flex items-center justify-between border-y border-slate-100 py-3 px-2 flex-shrink-0">
          <button onClick={handleToday} className="px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            Hoy
          </button>
          
          <div className="flex items-center gap-8">
            <button onClick={handlePrev} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight min-w-[200px] text-center">
              {headerLabel}
            </h2>
            <button onClick={handleNext} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="w-16" /> {/* Spacer */}
        </div>

        <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">
          
          {/* ══════ MONTH VIEW ══════ */}
          {viewMode === 'month' && (
            <div className="flex-1 flex flex-col border border-slate-200 bg-slate-50/50 rounded-3xl overflow-hidden min-h-0">
              <div className="grid grid-cols-7 flex-shrink-0 bg-slate-50">
                {dayNamesShort.map(d => (
                  <div key={d} className="h-10 flex items-center justify-end pr-4 text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-b border-slate-200 last:border-r-0">
                    {d}
                  </div>
                ))}
              </div>
              <div className="flex-1 grid grid-cols-7 auto-rows-[1fr] min-h-0 bg-white">
                {Array.from({ length: skip }).map((_, i) => <div key={`s-${i}`} className="bg-slate-50/80 border-r border-b border-slate-200" />)}
                
                {Array.from({ length: days }).map((_, i) => {
                const d = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isToday = todayStr === dateStr;
                const isPast = dateStr < todayStr;
                const dayApts = appointments.filter(a => a.date === dateStr);
                const weekRow = Math.floor((skip + i) / 7);
                const isEvenRow = weekRow % 2 === 0;

                return (
                  <div
                    key={d}
                    onClick={() => { setCurrentDate(new Date(dateStr)); setViewMode('day'); }}
                    className={cn(
                        "flex flex-col border-r border-b border-slate-200 p-1.5 cursor-pointer transition-all relative min-h-0",
                        isPast 
                          ? "bg-slate-100/70 opacity-50" 
                          : cn(
                              isEvenRow ? "bg-white" : "bg-slate-50/40",
                              "group hover:bg-blue-50/40 hover:z-10"
                            ),
                        isToday && !isPast && "ring-2 ring-inset ring-blue-500/30 bg-blue-50/20"
                    )}
                  >
                    <div className="flex justify-end flex-shrink-0 mb-1">
                      <span className={cn(
                        "w-7 h-7 flex items-center justify-center rounded-full text-sm",
                        isToday 
                          ? "bg-blue-600 text-white font-extrabold shadow-sm shadow-blue-600/30" 
                          : isPast 
                            ? "text-slate-400 font-semibold" 
                            : "text-slate-800 font-bold"
                      )}>{d}</span>
                    </div>

                    <div className="flex-1 space-y-1 px-0.5 overflow-y-auto hide-scrollbar">
                      {dayApts.map(a => (
                        <div 
                          key={a.id} 
                          onClick={(e) => { e.stopPropagation(); if (a.patientId) navigate(`/patient/${a.patientId}`); }}
                          className="px-1.5 py-1 bg-blue-100/60 border border-blue-200/60 rounded-md flex items-center justify-between group/apt cursor-pointer hover:bg-blue-200/60 transition-colors"
                        >
                          <span className="text-[9px] sm:text-[10px] font-bold text-blue-700 truncate">{a.time} {a.patientName.split(' ')[0]}</span>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(a.id); }} className="text-blue-300 hover:text-red-500 opacity-0 group-hover/apt:opacity-100 flex-shrink-0">
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}

          {/* ══════ WEEK VIEW ══════ */}
          {viewMode === 'week' && (
            <div className="flex-1 overflow-y-auto hide-scrollbar border border-slate-100 rounded-3xl min-h-0 bg-white">
              <div className="min-w-[800px] flex flex-col h-max">
                {/* Headers */}
                <div className="grid grid-cols-[80px_repeat(7,1fr)] bg-slate-50/30 border-b border-slate-100 sticky top-0 z-10">
                  <div className="bg-white border-r border-slate-100" />
                  {getWeekDates().map((date, i) => {
                    const dateStr = fmtDate(date);
                    const isToday = dateStr === todayStr;
                    return (
                      <div key={i} className={cn("text-center py-4 border-r border-slate-100 bg-white", isToday && "bg-blue-50/20")}>
                        <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", isToday ? "text-blue-600" : "text-slate-500")}>{dayNamesShort[(i + 1) % 7]}</p>
                        <p className={cn("text-2xl font-semibold", isToday ? "text-blue-600" : "text-slate-900")}>{date.getDate()}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Timeline Grid */}
                <div className="grid grid-cols-[80px_repeat(7,1fr)] bg-white">
                  {HOURS.map(hour => (
                    <React.Fragment key={hour}>
                      <div className="h-24 pr-4 pt-2 text-right border-r border-b border-slate-50 bg-white sticky left-0 z-10">
                        <span className="text-[11px] font-semibold text-slate-500">{fmtHour(hour)}</span>
                      </div>
                      {getWeekDates().map((date, di) => {
                        const dateStr = fmtDate(date);
                        const isToday = dateStr === todayStr;
                        const isPast = dateStr < todayStr;
                        const hourApts = appointments.filter(a => a.date === dateStr && parseInt(a.time.split(':')[0] || '0', 10) === hour);
                        
                        return (
                          <div 
                            key={`${hour}-${di}`} 
                            onClick={() => { 
                              if (!isPast) {
                                setNewApt(p => ({...p, date: dateStr, time: fmtHour(hour)})); 
                                setIsAdding(true); 
                              }
                            }}
                            className={cn(
                              "h-24 border-r border-b border-slate-50 p-1 transition-colors",
                              isPast ? "bg-slate-50/50 cursor-not-allowed" : "cursor-pointer group hover:bg-blue-50/40",
                              isToday && !isPast && "bg-blue-50/10"
                            )}
                          >
                            {hourApts.map(a => (
                              <div 
                                key={a.id} 
                                onClick={(e) => { e.stopPropagation(); if (a.patientId) navigate(`/patient/${a.patientId}`); }}
                                className="p-2 mb-1 bg-blue-50/80 border border-blue-100 rounded-xl flex flex-col justify-center h-[calc(100%-4px)] hover:shadow-sm cursor-pointer hover:bg-blue-100 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-blue-600">{a.time}</span>
                                  <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(a.id); }} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                                <span className="text-xs font-semibold text-slate-800 line-clamp-2 mt-0.5 leading-tight">{a.patientName}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════ DAY VIEW ══════ */}
          {viewMode === 'day' && (
            <div className="flex-1 overflow-y-auto hide-scrollbar bg-white rounded-3xl border border-slate-100 p-4 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] min-h-0">
              {HOURS.map(hour => {
                const dateStr = fmtDate(currentDate);
                const isNow = todayStr === dateStr && new Date().getHours() === hour;
                const hourApts = appointments.filter(a => a.date === dateStr && parseInt(a.time.split(':')[0] || '0', 10) === hour);

                return (
                  <div key={hour} className="flex min-h-[80px] group relative">
                    <div className="w-24 flex-shrink-0 text-right pr-6 pt-5 relative">
                      <span className={cn("text-[13px] font-semibold", isNow ? "text-blue-600" : "text-slate-500")}>{fmtHour(hour)}</span>
                      {isNow && <div className="absolute right-0 top-6 w-2 h-2 bg-blue-600 rounded-full translate-x-1" />}
                    </div>
                    
                    <div className={cn(
                      "flex-1 border-t border-slate-100 py-3 pl-6 pr-2 space-y-3",
                      isNow ? "border-t-blue-200 bg-blue-50/5" : ""
                    )}>
                      {hourApts.map(a => (
                          <div 
                            key={a.id} 
                            onClick={() => { if (a.patientId) navigate(`/patient/${a.patientId}`); }}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-100/60 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all group/apt cursor-pointer hover:border-blue-200"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-blue-50 rounded-[14px] flex items-center justify-center text-blue-600 font-bold text-sm">
                                {getInitials(a.patientName)}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-[15px]">{a.patientName}</h4>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">{a.time} · {a.type} · {a.status}</p>
                              </div>
                            </div>
                          
                          <div className="flex items-center gap-2 mt-4 sm:mt-0 sm:opacity-0 group-hover/apt:opacity-100 transition-opacity justify-end">
                            {a.patientId && (
                              <button onClick={(e) => { e.stopPropagation(); navigate(`/patient/${a.patientId}`); }} className="px-4 py-2 bg-slate-50 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl text-xs font-bold transition-all">
                                Ficha Clínica
                              </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(a.id); }} className="px-4 py-2 bg-slate-50 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl text-xs font-bold transition-all">
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {hourApts.length === 0 && (
                        <div 
                          onClick={() => { 
                            if (!(dateStr < todayStr)) {
                              setNewApt(p => ({...p, date: dateStr, time: fmtHour(hour)})); 
                              setIsAdding(true); 
                            }
                          }}
                          className={cn(
                            "h-full border-2 border-dashed border-transparent rounded-2xl flex items-center px-4 transition-all",
                            dateStr < todayStr ? "hidden" : "hover:border-slate-200 opacity-0 group-hover:opacity-100 cursor-pointer"
                          )}
                        >
                          <span className="text-xs font-bold text-slate-500 flex items-center gap-2"><Plus size={14}/> Agendar aquí</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/30 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[28px] sm:rounded-[32px] shadow-2xl w-[95%] sm:w-full sm:max-w-lg md:max-w-xl max-h-[90vh] flex flex-col border border-slate-100/80 animate-in zoom-in-95 duration-300 overflow-hidden">
            {/* Header */}
            <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-3.5 flex items-center justify-between border-b border-slate-50 flex-shrink-0">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Agendar Cita</h3>
              <button 
                onClick={() => { setIsAdding(false); setFormError(''); }} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all"
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-4 space-y-6 custom-scrollbar">
              {formError && (
                <div className="px-4 py-3 bg-red-50 text-red-600 rounded-xl text-sm font-semibold">
                  {formError}
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-2 relative">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Paciente *</label>
                  {newApt.patientId ? (
                    <div className="w-full p-4 bg-blue-50/50 border border-blue-100/50 rounded-xl flex items-center justify-between animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-600/20">
                          {getInitials(newApt.patientName)}
                        </div>
                        <div>
                          <p className="text-[15px] font-bold text-slate-900 leading-tight">{newApt.patientName}</p>
                          {(() => {
                            const p = patientsList.find(x => x.id === newApt.patientId);
                            return p && p.identification.phone ? (
                              <p className="text-[12px] font-semibold text-slate-500 mt-0.5">{p.identification.phone}</p>
                            ) : <p className="text-[12px] font-semibold text-slate-500 mt-0.5">Expediente Encontrado</p>;
                          })()}
                        </div>
                      </div>
                      <button onClick={() => { setNewApt(p => ({...p, patientName: '', patientId: ''})); setShowDropdown(true); }} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white/50" title="Cambiar paciente">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                        <Search size={16} />
                      </div>
                      <input
                        autoFocus
                        className="w-full pl-11 pr-5 py-3.5 bg-slate-50 rounded-xl outline-none text-[15px] font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all border border-slate-100"
                        value={newApt.patientName}
                        onChange={e => { setNewApt(p => ({...p, patientName: e.target.value})); setShowDropdown(true); setFormError(''); }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Busca o escribe el nombre..."
                      />
                      
                      {showDropdown && (
                        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-100 rounded-2xl shadow-xl z-20 max-h-[260px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                          {(() => {
                            const query = newApt.patientName.toLowerCase().trim();
                            const matches = query ? patientsList.filter(p => p.identification.fullName.toLowerCase().includes(query) || (p.identification.phone && p.identification.phone.includes(query))) : patientsList;
                            
                            if (matches.length === 0) {
                              return (
                                <div className="p-5 text-center cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setShowDropdown(false)}>
                                  <p className="text-[15px] font-bold text-slate-700">"{newApt.patientName}"</p>
                                  <p className="text-xs text-slate-500 font-medium mt-1">Clic aquí para continuar y crear registro básico.</p>
                                </div>
                              );
                            }

                            return matches.map(p => (
                              <div 
                                key={p.id} 
                                onClick={() => { setNewApt(prev => ({...prev, patientName: p.identification.fullName, patientId: p.id})); setShowDropdown(false); setFormError(''); }}
                                className="flex items-center gap-4 p-3 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0 group"
                              >
                                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 group-hover:bg-blue-600 group-hover:text-white font-bold text-sm flex items-center justify-center flex-shrink-0 transition-colors">
                                  {getInitials(p.identification.fullName)}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-700 leading-tight group-hover:text-blue-700 transition-colors">{p.identification.fullName}</p>
                                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wider">{p.identification.phone || 'Sin teléfono'}</p>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Fecha</label>
                      <input type="date" min={todayStr} className="text-[11px] font-bold text-blue-600 bg-transparent outline-none cursor-pointer hover:underline" value={newApt.date} onChange={e => setNewApt(p => ({...p, date: e.target.value}))}/>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Left arrow */}
                      <button
                        type="button"
                        onClick={() => setDateSliderOffset(prev => Math.max(0, prev - 7))}
                        disabled={dateSliderOffset === 0}
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                          dateSliderOffset === 0
                            ? "text-slate-200 cursor-not-allowed"
                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 active:scale-90"
                        )}
                      >
                        <ChevronLeft size={18} />
                      </button>

                      {/* Date pills */}
                      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 flex-1 px-1">
                        {Array.from({length: 7}).map((_, i) => {
                          const d = new Date();
                          d.setDate(d.getDate() + dateSliderOffset + i);
                          const dateStr = getLocalISODate(d);
                          const isSelected = newApt.date === dateStr;
                          const dayName = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][d.getDay()];
                          const monthName = monthNames[d.getMonth()].slice(0, 3);
                          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                          return (
                            <button
                              key={dateStr}
                              onClick={() => setNewApt(p => ({...p, date: dateStr}))}
                              type="button"
                              className={cn(
                                "flex flex-col items-center justify-center flex-1 min-w-0 h-[76px] rounded-2xl border transition-all active:scale-95",
                                isSelected 
                                  ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/30" 
                                  : isWeekend
                                    ? "bg-slate-50 border-slate-200 text-slate-400 hover:border-blue-300 hover:bg-blue-50/50"
                                    : "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50/50"
                              )}
                            >
                              <span className={cn("text-[10px] font-bold uppercase", isSelected ? "text-blue-100" : isWeekend ? "text-slate-300" : "text-slate-400")}>{dayName}</span>
                              <span className="text-[18px] font-bold my-0.5 leading-none">{d.getDate()}</span>
                              <span className={cn("text-[10px] font-semibold", isSelected ? "text-blue-200" : isWeekend ? "text-slate-300" : "text-slate-400")}>{monthName}</span>
                            </button>
                          )
                        })}
                      </div>

                      {/* Right arrow */}
                      <button
                        type="button"
                        onClick={() => setDateSliderOffset(prev => prev + 7)}
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all active:scale-90"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Hora</label>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-2">
                      {Array.from({ length: 27 }).map((_, i) => {
                        const hour = Math.floor(i / 2) + 7;
                        const mins = i % 2 === 0 ? '00' : '30';
                        const timeStr = `${hour.toString().padStart(2, '0')}:${mins}`;
                        const isTaken = appointments.some(a => a.date === newApt.date && a.time === timeStr && a.status !== 'Eliminada');
                        
                        return (
                          <button
                            key={timeStr}
                            type="button"
                            onClick={() => !isTaken && setNewApt(p => ({...p, time: timeStr}))}
                            disabled={isTaken}
                            className={cn(
                              "py-2.5 rounded-xl text-[13px] font-bold transition-all border",
                              isTaken 
                                ? "bg-slate-50 text-slate-300 border-slate-100 line-through cursor-not-allowed" 
                                : newApt.time === timeStr 
                                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/30" 
                                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 active:scale-95"
                            )}
                          >
                            {timeStr}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Tipo de Consulta</label>
                  <div className="flex flex-wrap gap-2">
                        {APPOINTMENT_TYPES.map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setNewApt(p => ({...p, type: t}))}
                            className={cn(
                              "px-5 py-2.5 rounded-xl text-sm font-bold transition-all border",
                              newApt.type === t ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/30" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300"
                            )}
                          >{t}</button>
                        ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 sm:px-8 py-4 sm:py-5 bg-slate-50 border-t border-slate-100 flex gap-3 flex-shrink-0 justify-end">
              <button 
                onClick={() => { setIsAdding(false); setFormError(''); }} 
                className="px-5 py-3 rounded-xl font-bold text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddAppointment} 
                disabled={isCreating} 
                className="px-6 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl shadow-[0_4px_12px_rgba(37,99,235,0.2)] hover:bg-blue-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 active:scale-95"
              >
                {isCreating ? 'Guardando...' : 'Confirmar Cita'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDeleteAppointment(deleteTarget)}
        title="Cancelar Cita"
        description="Esta cita se enviará a la lista de citas borradas. ¿Estás seguro?"
        confirmLabel="Eliminar Cita"
        variant="danger"
      />
    </div>
  );
};

export default CalendarView;
