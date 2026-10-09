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
    <div className="flex-1 flex flex-col min-h-0 bg-white page-transition main-scroll pb-28 md:pb-6">
      <div className="flex-1 flex flex-col max-w-[1400px] w-full mx-auto p-4 pt-8 lg:p-6 gap-4">
        
        {/* Superior Minimalist Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl lg:text-4xl font-semibold text-slate-900 tracking-tight">Agenda</h1>
            </div>
            <p className="text-slate-500 font-medium text-sm">Organiza tu clínica fácilmente.</p>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex bg-slate-100/80 p-1 rounded-xl flex-1 sm:flex-none">
              {([['day', 'Día'], ['week', 'Semana'], ['month', 'Mes']] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer",
                    viewMode === mode ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
               onClick={() => setIsAdding(true)}
               className="h-10 px-3 sm:px-5 rounded-xl bg-blue-600 text-white font-bold text-sm whitespace-nowrap shadow-sm shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Plus size={16} /> <span>Nueva cita</span>
            </button>
          </div>
        </header>

        {/* Date Navigation Strip */}
        <div className="flex items-center justify-between border-y border-slate-200 py-3 px-2 flex-shrink-0">
          <button onClick={handleToday} className="px-3 sm:px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer">
            Hoy
          </button>
          
          <div className="flex items-center gap-1 sm:gap-8">
            <button type="button" onClick={handlePrev} aria-label="Periodo anterior" className="w-11 h-11 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight sm:min-w-[200px] text-center">
              {headerLabel}
            </h2>
            <button type="button" onClick={handleNext} aria-label="Periodo siguiente" className="w-11 h-11 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer">
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="hidden sm:block w-16" /> {/* Spacer */}
        </div>

        <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">
          
          {/* ══════ MONTH VIEW ══════ */}
          {viewMode === 'month' && (
            <div className="flex flex-col border border-slate-300 bg-white rounded-3xl overflow-hidden">
              <div className="grid grid-cols-7 bg-slate-50">
                {dayNamesShort.map(d => (
                  <div key={d} className="h-9 flex items-center justify-center text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 bg-white">
                {Array.from({ length: skip }).map((_, i) => <div key={`s-${i}`} className="min-h-[48px] sm:min-h-[88px] bg-slate-50/80 border-r border-b border-slate-200" />)}
                
                {Array.from({ length: days }).map((_, i) => {
                const d = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isToday = todayStr === dateStr;
                const isPast = dateStr < todayStr;
                const dayApts = appointments.filter(a => a.date === dateStr && a.status !== 'Eliminada');

                return (
                  <div
                    key={d}
                    className={cn(
                        "flex flex-col items-center sm:items-stretch min-h-[48px] sm:min-h-[88px] border-r border-b border-slate-200 p-1 sm:p-1.5 transition-colors",
                        isPast ? "bg-slate-50 opacity-60" : "bg-white",
                        isToday && !isPast && "bg-blue-50/40"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => { setCurrentDate(new Date(year, month, d)); setViewMode('day'); }}
                      aria-label={`Ver citas del día ${d}`}
                      className={cn("flex flex-col items-center w-full rounded-lg cursor-pointer", !isPast && "hover:bg-blue-50/40")}
                    >
                    <span className={cn(
                      "w-7 h-7 flex items-center justify-center rounded-full text-sm",
                      isToday
                        ? "bg-blue-600 text-white font-extrabold"
                        : isPast
                          ? "text-slate-400 font-semibold"
                          : "text-slate-800 font-bold"
                    )}>{d}</span>

                    {dayApts.length > 0 && (
                      <span className="sm:hidden mt-0.5 flex items-center justify-center">
                        {dayApts.length === 1 ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                        ) : (
                          <span className="min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold leading-4">
                            {dayApts.length}
                          </span>
                        )}
                      </span>
                    )}
                    </button>

                    <div className="hidden sm:block flex-1 space-y-1 px-0.5 overflow-hidden mt-1 w-full">
                      {dayApts.slice(0, 2).map(a => (
                        <div key={a.id} className="px-1.5 py-0.5 bg-blue-50 border border-blue-200/70 rounded-md flex items-center justify-between group/apt">
                          <button
                            type="button"
                            onClick={() => { if (a.patientId) navigate(`/patient/${a.patientId}`); }}
                            className="min-w-0 text-left text-[10px] font-semibold text-blue-800 truncate hover:underline"
                            aria-label={`Abrir expediente de ${a.patientName}, ${a.time}`}
                          >
                            {a.time} {a.patientName.split(' ')[0]}
                          </button>
                          <button type="button" onClick={() => setDeleteTarget(a.id)} aria-label={`Eliminar cita de ${a.patientName}`} className="w-6 h-6 -my-1 -mr-1 rounded-md flex items-center justify-center text-blue-400 hover:text-red-600 hover:bg-red-50 lg:opacity-40 lg:group-hover/apt:opacity-100 flex-shrink-0 ml-1 transition-colors">
                            <Trash2 size={13} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                      {dayApts.length > 2 && (
                        <div className="text-[10px] font-bold text-slate-500 px-1 py-0.5 text-right">
                          +{dayApts.length - 2} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}
          {viewMode === 'month' && (
            <p className="sm:hidden text-center text-xs text-slate-400 font-medium">Toca un día para ver las citas</p>
          )}

          {/* ══════ WEEK VIEW ══════ */}
          {viewMode === 'week' && (
            <>
              <div className="sm:hidden grid grid-cols-7 gap-1">
                {getWeekDates().map((date, i) => {
                  const dateStr = fmtDate(date);
                  const isToday = dateStr === todayStr;
                  const count = appointments.filter(a => a.date === dateStr && a.status !== 'Eliminada').length;
                  return (
                    <button
                      type="button"
                      key={i}
                      onClick={() => { setCurrentDate(date); setViewMode('day'); }}
                      className={cn(
                        "flex flex-col items-center py-3 rounded-2xl border",
                        isToday ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-200 text-slate-800"
                      )}
                    >
                      <span className={cn("text-[10px] font-bold uppercase", isToday ? "text-blue-100" : "text-slate-400")}>{dayNamesShort[(i + 1) % 7]}</span>
                      <span className="text-lg font-bold mt-0.5">{date.getDate()}</span>
                      {count > 0 && (
                        <span className={cn("mt-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold leading-4", isToday ? "bg-white text-blue-600" : "bg-blue-600 text-white")}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="sm:hidden text-center text-xs text-slate-400 font-medium -mt-1">Toca un día para ver las citas</p>

            <div className="hidden sm:block overflow-x-auto border border-slate-300 rounded-3xl bg-white">
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
                            className={cn(
                              "h-24 border-r border-b border-slate-50 p-1 transition-colors",
                              isPast ? "bg-slate-50/50" : "group hover:bg-blue-50/40",
                              isToday && !isPast && "bg-blue-50/10"
                            )}
                          >
                            {hourApts.length === 0 && !isPast && (
                              <button
                                type="button"
                                onClick={() => {
                                  setNewApt(p => ({...p, date: dateStr, time: fmtHour(hour)}));
                                  setIsAdding(true);
                                }}
                                aria-label={`Agendar el ${dateStr} a las ${fmtHour(hour)}`}
                                className="w-full h-full rounded-lg"
                              />
                            )}
                            {hourApts.map(a => (
                              <div key={a.id} className="p-2 mb-1 bg-blue-50/80 border border-blue-100 rounded-xl flex flex-col justify-center h-[calc(100%-4px)]">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-blue-600">{a.time}</span>
                                  <button type="button" onClick={() => setDeleteTarget(a.id)} aria-label={`Eliminar cita de ${a.patientName}`} className="w-8 h-8 -my-1 -mr-1 rounded-lg flex items-center justify-center text-red-300 hover:text-red-600 hover:bg-red-50 lg:opacity-50 lg:group-hover:opacity-100 transition-all">
                                    <Trash2 size={15} aria-hidden="true" />
                                  </button>
                                </div>
                                <button type="button" onClick={() => { if (a.patientId) navigate(`/patient/${a.patientId}`); }} className="text-left text-sm font-semibold text-slate-800 line-clamp-2 mt-0.5 leading-tight hover:text-blue-700">
                                  {a.patientName}
                                </button>
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
            </>
          )}

          {/* ══════ DAY VIEW ══════ */}
          {viewMode === 'day' && (
            <div className="bg-white rounded-3xl border border-slate-300 p-2.5 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              {HOURS.map(hour => {
                const dateStr = fmtDate(currentDate);
                const isNow = todayStr === dateStr && new Date().getHours() === hour;
                const hourApts = appointments.filter(a => a.date === dateStr && a.status !== 'Eliminada' && parseInt(a.time.split(':')[0] || '0', 10) === hour);

                return (
                  <div key={hour} className="flex min-h-[80px] group relative">
                    <div className="w-14 sm:w-24 flex-shrink-0 text-right pr-3 sm:pr-6 pt-5 relative">
                      <span className={cn("text-[13px] font-semibold", isNow ? "text-blue-600" : "text-slate-500")}>{fmtHour(hour)}</span>
                      {isNow && <div className="absolute right-0 top-6 w-2 h-2 bg-blue-600 rounded-full translate-x-1" />}
                    </div>
                    
                    <div className={cn(
                      "flex-1 min-w-0 border-t border-slate-300 py-3 pl-2 sm:pl-6 pr-0 sm:pr-2 space-y-3",
                      isNow ? "border-t-blue-200 bg-blue-50/5" : ""
                    )}>
                      {hourApts.map(a => (
                          <article 
                            key={a.id} 
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-300/60 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all group/apt hover:border-blue-200"
                          >
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                              <div className="w-12 h-12 bg-blue-50 rounded-[14px] flex items-center justify-center text-blue-600 font-bold text-sm">
                                {getInitials(a.patientName)}
                              </div>
                              <div>
                                {a.patientId ? (
                                  <button type="button" onClick={() => navigate(`/patient/${a.patientId}`)} className="font-bold text-slate-900 text-[15px] text-left hover:text-blue-700">
                                    {a.patientName}
                                  </button>
                                ) : (
                                  <h4 className="font-bold text-slate-900 text-[15px]">{a.patientName}</h4>
                                )}
                                <p className="text-sm text-slate-500 font-medium mt-0.5">{a.time} · {a.type} · {a.status}</p>
                              </div>
                            </div>
                          
                          <div className="flex items-center gap-2 mt-4 sm:mt-0 sm:opacity-0 group-hover/apt:opacity-100 transition-opacity justify-end">
                            {a.patientId && (
                              <button type="button" onClick={() => navigate(`/patient/${a.patientId}`)} className="px-3 sm:px-4 py-2 whitespace-nowrap bg-slate-50 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl text-sm font-bold transition-all">
                                Historia clínica
                              </button>
                            )}
                            <button type="button" onClick={() => setDeleteTarget(a.id)} className="px-3 sm:px-4 py-2 whitespace-nowrap bg-slate-50 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl text-sm font-bold transition-all">
                              Eliminar
                            </button>
                          </div>
                        </article>
                      ))}
                      
                      {dateStr >= todayStr && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewApt(p => ({...p, date: dateStr, time: fmtHour(hour)}));
                            setIsAdding(true);
                          }}
                          className="h-full w-full border-2 border-dashed border-slate-300 rounded-2xl flex items-center px-4 transition-all hover:border-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          <span className="text-sm font-bold text-slate-500 flex items-center gap-2"><Plus size={14} aria-hidden="true"/> Agendar aquí</span>
                        </button>
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
