import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppointments, useAppointmentMutations } from '../../hooks/useAppointments';
import { usePatients } from '../../hooks/usePatients';
import ConfirmModal from '../ConfirmModal';
import NewAppointmentModal from '../NewAppointmentModal';
import { Appointment, AppointmentType } from '../../types';
import { cn, getInitials, getLocalISODate } from '../../lib/utils';
import { Plus, Trash2, ChevronLeft, ChevronRight, X, Search } from 'lucide-react';
import { sileo } from 'sileo';
import { useCalendarTip } from '../ContextualTips';

const APPOINTMENT_TYPES: AppointmentType[] = ['Consulta', 'Seguimiento', 'Cirugía', 'Revisión'];

const CalendarView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewDate, setViewDate] = useState(new Date());
  const { data: appointments = [], isLoading } = useAppointments();
  const { data: patientsList = [] } = usePatients();
  const { createAppointment, deleteAppointment } = useAppointmentMutations();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Contextual tip (show once)
  useCalendarTip();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>(() => {
    return window.innerWidth < 768 ? 'day' : 'month';
  });

  const patientNameFromParams = searchParams.get('patient') || '';
  const patientIdFromParams = searchParams.get('id') || '';
  const [isAdding, setIsAdding] = useState(!!patientIdFromParams || searchParams.get('new') === 'true');
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
                    "px-4 py-2 rounded-lg text-sm font-bold transition-all",
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
        <div className="flex items-center justify-between border-y border-slate-300 py-3 px-2 flex-shrink-0">
          <button onClick={handleToday} className="px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            Hoy
          </button>
          
          <div className="flex items-center gap-8">
            <button onClick={handlePrev} className="w-11 h-11 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight min-w-[200px] text-center">
              {headerLabel}
            </h2>
            <button onClick={handleNext} className="w-11 h-11 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="w-16" /> {/* Spacer */}
        </div>

        <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">
          
          {/* ══════ MONTH VIEW ══════ */}
          {viewMode === 'month' && (
            <div className="flex-1 flex flex-col border border-slate-300 bg-slate-50/50 rounded-3xl overflow-hidden min-h-0">
              <div className="grid grid-cols-7 flex-shrink-0 bg-slate-50">
                {dayNamesShort.map(d => (
                  <div key={d} className="h-10 flex items-center justify-end pr-4 text-xs font-bold uppercase tracking-widest text-slate-600 border-r border-b border-slate-300 last:border-r-0">
                    {d}
                  </div>
                ))}
              </div>
              <div className="flex-1 grid grid-cols-7 auto-rows-[1fr] min-h-0 bg-white">
                {Array.from({ length: skip }).map((_, i) => <div key={`s-${i}`} className="bg-slate-50/80 border-r border-b border-slate-300" />)}
                
                {Array.from({ length: days }).map((_, i) => {
                const d = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isToday = todayStr === dateStr;
                const isPast = dateStr < todayStr;
                const dayApts = appointments.filter(a => a.date === dateStr && a.status !== 'Eliminada');
                const weekRow = Math.floor((skip + i) / 7);
                const isEvenRow = weekRow % 2 === 0;

                return (
                  <div
                    key={d}
                    onClick={() => { setCurrentDate(new Date(dateStr)); setViewMode('day'); }}
                    className={cn(
                        "flex flex-col border-r border-b border-slate-300 p-1.5 cursor-pointer transition-all relative min-h-0",
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
                            ? "text-slate-500 font-semibold" 
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
                          <span className="text-[9px] sm:text-xs font-bold text-blue-700 truncate">{a.time} {a.patientName.split(' ')[0]}</span>
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
            <div className="flex-1 overflow-y-auto hide-scrollbar border border-slate-300 rounded-3xl min-h-0 bg-white">
              <div className="min-w-[800px] flex flex-col h-max">
                {/* Headers */}
                <div className="grid grid-cols-[80px_repeat(7,1fr)] bg-slate-50/30 border-b border-slate-300 sticky top-0 z-10">
                  <div className="bg-white border-r border-slate-300" />
                  {getWeekDates().map((date, i) => {
                    const dateStr = fmtDate(date);
                    const isToday = dateStr === todayStr;
                    return (
                      <div key={i} className={cn("text-center py-4 border-r border-slate-300 bg-white", isToday && "bg-blue-50/20")}>
                        <p className={cn("text-xs font-bold uppercase tracking-wider mb-1", isToday ? "text-blue-600" : "text-slate-500")}>{dayNamesShort[(i + 1) % 7]}</p>
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
                        <span className="text-xs font-semibold text-slate-500">{fmtHour(hour)}</span>
                      </div>
                      {getWeekDates().map((date, di) => {
                        const dateStr = fmtDate(date);
                        const isToday = dateStr === todayStr;
                        const isPast = dateStr < todayStr;
                        const hourApts = appointments.filter(a => a.date === dateStr && a.status !== 'Eliminada' && parseInt(a.time.split(':')[0] || '0', 10) === hour);
                        
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
                                  <span className="text-xs font-bold text-blue-600">{a.time}</span>
                                  <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(a.id); }} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                                <span className="text-sm font-semibold text-slate-800 line-clamp-2 mt-0.5 leading-tight">{a.patientName}</span>
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
            <div className="flex-1 overflow-y-auto hide-scrollbar bg-white rounded-3xl border border-slate-300 p-4 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] min-h-0">
              {HOURS.map(hour => {
                const dateStr = fmtDate(currentDate);
                const isNow = todayStr === dateStr && new Date().getHours() === hour;
                const hourApts = appointments.filter(a => a.date === dateStr && a.status !== 'Eliminada' && parseInt(a.time.split(':')[0] || '0', 10) === hour);

                return (
                  <div key={hour} className="flex min-h-[80px] group relative">
                    <div className="w-24 flex-shrink-0 text-right pr-6 pt-5 relative">
                      <span className={cn("text-[13px] font-semibold", isNow ? "text-blue-600" : "text-slate-500")}>{fmtHour(hour)}</span>
                      {isNow && <div className="absolute right-0 top-6 w-2 h-2 bg-blue-600 rounded-full translate-x-1" />}
                    </div>
                    
                    <div className={cn(
                      "flex-1 border-t border-slate-300 py-3 pl-6 pr-2 space-y-3",
                      isNow ? "border-t-blue-200 bg-blue-50/5" : ""
                    )}>
                      {hourApts.map(a => (
                          <div 
                            key={a.id} 
                            onClick={() => { if (a.patientId) navigate(`/patient/${a.patientId}`); }}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-300/60 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all group/apt cursor-pointer hover:border-blue-200"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-blue-50 rounded-[14px] flex items-center justify-center text-blue-600 font-bold text-sm">
                                {getInitials(a.patientName)}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-[15px]">{a.patientName}</h4>
                                <p className="text-sm text-slate-500 font-medium mt-0.5">{a.time} · {a.type} · {a.status}</p>
                              </div>
                            </div>
                          
                          <div className="flex items-center gap-2 mt-4 sm:mt-0 sm:opacity-0 group-hover/apt:opacity-100 transition-opacity justify-end">
                            {a.patientId && (
                              <button onClick={(e) => { e.stopPropagation(); navigate(`/patient/${a.patientId}`); }} className="px-4 py-2 bg-slate-50 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl text-sm font-bold transition-all">
                                Ficha Clínica
                              </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(a.id); }} className="px-4 py-2 bg-slate-50 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl text-sm font-bold transition-all">
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
                            "h-full border-2 border-dashed border-slate-300 rounded-2xl flex items-center px-4 transition-all",
                            dateStr < todayStr ? "hidden" : "hover:border-slate-300 opacity-0 group-hover:opacity-100 cursor-pointer"
                          )}
                        >
                          <span className="text-sm font-bold text-slate-500 flex items-center gap-2"><Plus size={14}/> Agendar aquí</span>
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

      <NewAppointmentModal
        isOpen={isAdding}
        onClose={() => {
          setIsAdding(false);
          if (searchParams.get('new') || searchParams.get('patient') || searchParams.get('id')) {
            setSearchParams({});
          }
        }}
        initialPatientId={newApt.patientId}
        initialPatientName={newApt.patientName}
        initialDate={newApt.date}
        initialTime={newApt.time}
      />

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
