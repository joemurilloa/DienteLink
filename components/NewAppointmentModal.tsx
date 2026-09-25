import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppointments, useAppointmentMutations } from '../hooks/useAppointments';
import { usePatients } from '../hooks/usePatients';
import { Appointment, AppointmentType } from '../types';
import { cn, generateId, getInitials, getLocalISODate } from '../lib/utils';
import { sileo } from 'sileo';

const APPOINTMENT_TYPES: AppointmentType[] = ['Consulta', 'Seguimiento', 'Cirugía', 'Revisión'];

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPatientId?: string;
  initialPatientName?: string;
  initialDate?: string;
  initialTime?: string;
  onSuccess?: (appointment: Appointment) => void;
}

const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({
  isOpen,
  onClose,
  initialPatientId = '',
  initialPatientName = '',
  initialDate,
  initialTime = '09:00',
  onSuccess,
}) => {
  const { data: appointments = [] } = useAppointments();
  const { createAppointment } = useAppointmentMutations();
  const { data: patientsList = [] } = usePatients();

  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [dateSliderOffset, setDateSliderOffset] = useState(0);

  const [newApt, setNewApt] = useState({
    patientName: initialPatientName,
    patientId: initialPatientId,
    time: initialTime,
    date: initialDate || getLocalISODate(new Date()),
    type: 'Consulta' as AppointmentType,
  });

  // Keep state synced when props change or modal reopens
  useEffect(() => {
    if (isOpen) {
      setNewApt({
        patientName: initialPatientName,
        patientId: initialPatientId,
        time: initialTime,
        date: initialDate || getLocalISODate(new Date()),
        type: 'Consulta' as AppointmentType,
      });
      setFormError('');
      setShowDropdown(false);
      setDateSliderOffset(0);
    }
  }, [isOpen, initialPatientId, initialPatientName, initialDate, initialTime]);

  if (!isOpen) return null;

  const todayStr = getLocalISODate(new Date());
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handleAddAppointment = async () => {
    if (isCreating) return;
    setIsCreating(true);
    setFormError('');

    if (!newApt.patientName.trim()) {
      setFormError('El nombre del paciente es requerido');
      setIsCreating(false);
      return;
    }
    if (newApt.patientName.trim().length < 3) {
      setFormError('El nombre es demasiado corto');
      setIsCreating(false);
      return;
    }

    const conflict = appointments.find(
      a => a.date === newApt.date && a.time === newApt.time && a.status !== 'Eliminada'
    );
    if (conflict) {
      setFormError(`Conflicto de horario: ${newApt.time} ya está reservado para ${conflict.patientName}.`);
      setIsCreating(false);
      return;
    }

    let patientId = newApt.patientId;
    let phoneNumber = '';
    const found = patientsList.find(p =>
      patientId
        ? p.id === patientId
        : p.identification.fullName.toLowerCase() === newApt.patientName.toLowerCase()
    );

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
      reminderStatus: 'not_sent',
    };

    createAppointment.mutate(appointment, {
      onSuccess: () => {
        sileo.success({
          title: 'Cita Agendada',
          description: `${appointment.patientName} a las ${appointment.time}`,
        });
        onSuccess?.(appointment);
        onClose();
      },
      onSettled: () => setIsCreating(false),
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/35 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] sm:rounded-[28px] shadow-2xl w-[95%] sm:w-full sm:max-w-lg md:max-w-xl max-h-[88dvh] flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 sm:px-8 pt-6 pb-4 flex items-center justify-between border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Agendar Cita</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Selecciona el paciente, fecha y horario</p>
          </div>
          <button
            onClick={() => {
              onClose();
              setFormError('');
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-5 space-y-6 custom-scrollbar">
          {formError && (
            <div className="px-4 py-3 bg-red-50 text-red-600 rounded-xl text-sm font-semibold border border-red-100">
              {formError}
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-2 relative">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Paciente *</label>
              {newApt.patientId ? (
                <div className="w-full p-3.5 bg-blue-50/60 border border-blue-100 rounded-2xl flex items-center justify-between animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-600/20">
                      {getInitials(newApt.patientName)}
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-slate-900 leading-tight">{newApt.patientName}</p>
                      {(() => {
                        const p = patientsList.find(x => x.id === newApt.patientId);
                        return p && p.identification.phone ? (
                          <p className="text-xs font-semibold text-slate-500 mt-0.5">{p.identification.phone}</p>
                        ) : (
                          <p className="text-xs font-semibold text-blue-600 mt-0.5">Expediente Encontrado</p>
                        );
                      })()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewApt(p => ({ ...p, patientName: '', patientId: '' }));
                      setShowDropdown(true);
                    }}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-800 transition-colors"
                    title="Cambiar paciente"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search size={16} />
                  </div>
                  <input
                    autoFocus
                    className="w-full pl-11 pr-5 py-3 bg-slate-50 rounded-xl outline-none text-[15px] font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all border border-slate-200"
                    value={newApt.patientName}
                    onChange={e => {
                      setNewApt(p => ({ ...p, patientName: e.target.value }));
                      setShowDropdown(true);
                      setFormError('');
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Busca paciente o escribe un nombre nuevo..."
                  />

                  {showDropdown && (
                    <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 max-h-[240px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                      {(() => {
                        const query = newApt.patientName.toLowerCase().trim();
                        const matches = query
                          ? patientsList.filter(
                              p =>
                                p.identification.fullName.toLowerCase().includes(query) ||
                                (p.identification.phone && p.identification.phone.includes(query))
                            )
                          : patientsList;

                        if (matches.length === 0) {
                          return (
                            <div
                              className="p-4 text-center cursor-pointer hover:bg-slate-50 transition-colors"
                              onClick={() => setShowDropdown(false)}
                            >
                              <p className="text-sm font-bold text-slate-700">"{newApt.patientName}"</p>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Clic aquí para continuar con este nombre.
                              </p>
                            </div>
                          );
                        }

                        return matches.map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setNewApt(prev => ({
                                ...prev,
                                patientName: p.identification.fullName,
                                patientId: p.id,
                              }));
                              setShowDropdown(false);
                              setFormError('');
                            }}
                            className="flex items-center gap-3.5 p-3 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0 group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 group-hover:bg-blue-600 group-hover:text-white font-bold text-xs flex items-center justify-center flex-shrink-0 transition-colors">
                              {getInitials(p.identification.fullName)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
                                {p.identification.fullName}
                              </p>
                              <p className="text-xs text-slate-400 font-medium mt-0.5">
                                {p.identification.phone || 'Sin teléfono'}
                              </p>
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
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Fecha</label>
                  <input
                    type="date"
                    min={todayStr}
                    className="text-xs font-bold text-blue-600 bg-transparent outline-none cursor-pointer hover:underline"
                    value={newApt.date}
                    onChange={e => setNewApt(p => ({ ...p, date: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDateSliderOffset(prev => Math.max(0, prev - 7))}
                    disabled={dateSliderOffset === 0}
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                      dateSliderOffset === 0
                        ? 'text-slate-200 cursor-not-allowed'
                        : 'text-slate-500 hover:bg-slate-100'
                    )}
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 flex-1 px-1">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() + dateSliderOffset + i);
                      const dateStr = getLocalISODate(d);
                      const isSelected = newApt.date === dateStr;
                      const dayName = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()];
                      const monthName = monthNames[d.getMonth()].slice(0, 3);
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      return (
                        <button
                          key={dateStr}
                          onClick={() => setNewApt(p => ({ ...p, date: dateStr }))}
                          type="button"
                          className={cn(
                            'flex flex-col items-center justify-center flex-1 min-w-0 h-[72px] rounded-2xl border transition-all',
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/30'
                              : isWeekend
                              ? 'bg-slate-50 border-slate-200 text-slate-400 hover:border-blue-300'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                          )}
                        >
                          <span className={cn('text-[11px] font-bold uppercase', isSelected ? 'text-blue-100' : 'text-slate-400')}>
                            {dayName}
                          </span>
                          <span className="text-[17px] font-bold my-0.5 leading-none">{d.getDate()}</span>
                          <span className={cn('text-[10px] font-semibold', isSelected ? 'text-blue-200' : 'text-slate-400')}>
                            {monthName}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setDateSliderOffset(prev => prev + 7)}
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-slate-500 hover:bg-slate-100 transition-all"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Hora</label>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                  {Array.from({ length: 27 }).map((_, i) => {
                    const hour = Math.floor(i / 2) + 7;
                    const mins = i % 2 === 0 ? '00' : '30';
                    const timeStr = `${hour.toString().padStart(2, '0')}:${mins}`;
                    const isTaken = appointments.some(
                      a => a.date === newApt.date && a.time === timeStr && a.status !== 'Eliminada'
                    );

                    return (
                      <button
                        key={timeStr}
                        type="button"
                        onClick={() => !isTaken && setNewApt(p => ({ ...p, time: timeStr }))}
                        disabled={isTaken}
                        className={cn(
                          'py-2 rounded-xl text-xs font-bold transition-all border',
                          isTaken
                            ? 'bg-slate-50 text-slate-300 border-slate-200 line-through cursor-not-allowed'
                            : newApt.time === timeStr
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/30'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
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
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Tipo de Consulta</label>
              <div className="flex flex-wrap gap-2">
                {APPOINTMENT_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewApt(p => ({ ...p, type: t }))}
                    className={cn(
                      'px-4 py-2 rounded-xl text-xs font-bold transition-all border',
                      newApt.type === t
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-600/25'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-8 py-4 bg-slate-50/80 border-t border-slate-200 flex gap-3 flex-shrink-0 justify-end">
          <button
            type="button"
            onClick={() => {
              onClose();
              setFormError('');
            }}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAddAppointment}
            disabled={isCreating}
            className="px-6 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            {isCreating ? 'Guardando...' : 'Confirmar Cita'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NewAppointmentModal;
