import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Activity,
  FileText,
  Search,
  Plus,
  Clock,
  Play,
  Mic,
  MicOff,
  X
} from 'lucide-react';
import { PatientRecord as PatientRecordType, Appointment, ClinicalEvent, EvolutionNote } from '../../types';
import { useAppointments } from '../../hooks/useAppointments';
import NewAppointmentModal from '../NewAppointmentModal';
import { cn, getLocalISODate, generateId } from '../../lib/utils';
import { sileo } from 'sileo';

interface Props {
  patient: PatientRecordType;
  onUpdate: (updatedPatient: PatientRecordType) => void;
}

type TimelineFilter = 'all' | 'appointments' | 'treatments' | 'evolution';

interface TimelineItem {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string;
  kind: 'appointment' | 'treatment' | 'evolution';
  title: string;
  subtitle?: string;
  content?: string;
  badge?: string;
  badgeColor?: string;
  raw: Appointment | ClinicalEvent | EvolutionNote;
}

const UnifiedTimelineTab: React.FC<Props> = ({ patient, onUpdate }) => {
  const navigate = useNavigate();
  const { data: allAppointments = [] } = useAppointments();
  const todayStr = getLocalISODate(new Date());

  // Modals & form state
  const [isNewAptOpen, setIsNewAptOpen] = useState(false);
  const [isNewRecordOpen, setIsNewRecordOpen] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState<'treatment' | 'note'>('note');

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKind, setFilterKind] = useState<TimelineFilter>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // New treatment form state
  const [newTreatment, setNewTreatment] = useState({
    date: todayStr,
    description: '',
    type: 'treatment' as ClinicalEvent['type'],
    toothId: ''
  });

  // New note form state (with voice dictation)
  const [newNote, setNewNote] = useState({
    date: todayStr,
    procedure: '',
    content: ''
  });
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Setup speech recognition
  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-HN';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setNewNote(prev => ({
            ...prev,
            content: prev.content + (prev.content && !prev.content.endsWith(' ') ? ' ' : '') + finalTranscript
          }));
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      sileo.error({ title: 'No disponible', description: 'Tu navegador no soporta dictado por voz.' });
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        sileo.info({ title: 'Dictado activo 🎙️', description: 'Habla con naturalidad para transcribir.' });
      } catch (e) {
        setIsRecording(false);
      }
    }
  };

  const handleAddTreatment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTreatment.description.trim()) {
      sileo.error({ title: 'Descripción requerida', description: 'Ingresa el procedimiento realizado.' });
      return;
    }

    const event: ClinicalEvent = {
      id: generateId(),
      date: newTreatment.date || todayStr,
      type: newTreatment.type,
      description: newTreatment.description.trim(),
      toothId: newTreatment.toothId ? parseInt(newTreatment.toothId, 10) : undefined
    };

    onUpdate({
      ...patient,
      history: [event, ...(patient.history || [])]
    });

    setNewTreatment({ date: todayStr, description: '', type: 'treatment', toothId: '' });
    setIsNewRecordOpen(false);
    sileo.success({ title: 'Procedimiento guardado', description: 'Registrado en la cronología del paciente.' });
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.procedure.trim() || !newNote.content.trim()) {
      sileo.error({ title: 'Campos incompletos', description: 'Ingresa el procedimiento y el contenido de la nota.' });
      return;
    }

    const note: EvolutionNote = {
      id: generateId(),
      date: newNote.date || todayStr,
      procedure: newNote.procedure.trim(),
      content: newNote.content.trim()
    };

    onUpdate({
      ...patient,
      evolutionNotes: [note, ...(patient.evolutionNotes || [])]
    });

    setNewNote({ date: todayStr, procedure: '', content: '' });
    setIsNewRecordOpen(false);
    sileo.success({ title: 'Nota de evolución guardada', description: 'Añadida al expediente del paciente.' });
  };

  // Filter patient's appointments
  const patientAppointments = useMemo(() => {
    return allAppointments.filter(
      apt =>
        (apt.patientId === patient.id ||
          apt.patientName.toLowerCase().trim() === patient.identification.fullName.toLowerCase().trim()) &&
        apt.status !== 'Eliminada'
    );
  }, [allAppointments, patient.id, patient.identification.fullName]);

  // Combine appointments, treatments, and notes into unified timeline items
  const allTimelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    // 1. Appointments
    patientAppointments.forEach(apt => {
      items.push({
        id: `apt-${apt.id}`,
        date: apt.date,
        time: apt.time,
        kind: 'appointment',
        title: `Cita: ${apt.type}`,
        subtitle: `Horario: ${apt.time} • Estado: ${apt.status}`,
        badge: apt.status,
        badgeColor:
          apt.status === 'Completada'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : apt.status === 'Retrasada'
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-blue-50 text-blue-700 border-blue-200',
        raw: apt
      });
    });

    // 2. Clinical Events / Treatments
    (patient.history || []).forEach(evt => {
      const typeLabels: Record<string, string> = {
        treatment: 'Tratamiento',
        cleaning: 'Limpieza',
        extraction: 'Extracción',
        diagnose: 'Diagnóstico',
        other: 'Procedimiento'
      };

      items.push({
        id: `evt-${evt.id}`,
        date: evt.date,
        kind: 'treatment',
        title: evt.description,
        subtitle: evt.toothId ? `Pieza dental #${evt.toothId}` : undefined,
        badge: typeLabels[evt.type] || 'Procedimiento',
        badgeColor:
          evt.type === 'treatment'
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : evt.type === 'cleaning'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : evt.type === 'extraction'
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-amber-50 text-amber-700 border-amber-200',
        raw: evt
      });
    });

    // 3. Evolution Notes
    (patient.evolutionNotes || []).forEach(note => {
      items.push({
        id: `note-${note.id}`,
        date: note.date,
        kind: 'evolution',
        title: `Evolución: ${note.procedure || 'Nota Clínica'}`,
        content: note.content,
        badge: 'Nota Clínica',
        badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
        raw: note
      });
    });

    // Sort reverse-chronologically (newest first, taking time into account if same date)
    return items.sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return (b.time || '').localeCompare(a.time || '');
    });
  }, [patientAppointments, patient.history, patient.evolutionNotes]);

  // Available years for dropdown
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    allTimelineItems.forEach(item => {
      if (item.date && item.date.length >= 4) {
        years.add(item.date.slice(0, 4));
      }
    });
    return Array.from(years).sort().reverse();
  }, [allTimelineItems]);

  // Filtered timeline items
  const filteredItems = useMemo(() => {
    let result = allTimelineItems;

    // Filter by kind
    if (filterKind === 'appointments') {
      result = result.filter(item => item.kind === 'appointment');
    } else if (filterKind === 'treatments') {
      result = result.filter(item => item.kind === 'treatment');
    } else if (filterKind === 'evolution') {
      result = result.filter(item => item.kind === 'evolution');
    }

    // Filter by year
    if (selectedYear !== 'all') {
      result = result.filter(item => item.date.startsWith(selectedYear));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item => {
        return (
          item.date.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
          (item.content && item.content.toLowerCase().includes(q)) ||
          (item.badge && item.badge.toLowerCase().includes(q))
        );
      });
    }

    return result;
  }, [allTimelineItems, filterKind, selectedYear, searchQuery]);

  // Group items by date for clear visual grouping
  const groupedByDate = useMemo(() => {
    const groups: { date: string; items: TimelineItem[] }[] = [];
    const dateMap = new Map<string, TimelineItem[]>();

    filteredItems.forEach(item => {
      const existing = dateMap.get(item.date);
      if (existing) {
        existing.push(item);
      } else {
        const arr = [item];
        dateMap.set(item.date, arr);
        groups.push({ date: item.date, items: arr });
      }
    });

    return groups;
  }, [filteredItems]);

  const formatDateHeader = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T12:00:00');
      if (isNaN(d.getTime())) return dateStr;

      const formatted = d.toLocaleDateString('es-HN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      if (dateStr === todayStr) {
        return `Hoy • ${formatted}`;
      }
      if (dateStr > todayStr) {
        return `Próxima Fecha • ${formatted}`;
      }
      return formatted;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-in-up duration-500 max-w-5xl mx-auto pb-16">
      {/* ── Top Header & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Historial y Agenda</h3>
          <p className="text-slate-500 text-sm mt-0.5">
            Cronología de citas, tratamientos y notas de evolución de {patient.identification.fullName}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Action 1: Nueva Nota */}
          <button
            type="button"
            onClick={() => {
              setActiveFormTab('note');
              setIsNewRecordOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:border-purple-300 hover:text-purple-700 transition-all shadow-sm cursor-pointer"
          >
            <FileText size={15} className="text-purple-600" />
            <span>+ Nota</span>
          </button>

          {/* Action 2: Nuevo Tratamiento */}
          <button
            type="button"
            onClick={() => {
              setActiveFormTab('treatment');
              setIsNewRecordOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:border-emerald-300 hover:text-emerald-700 transition-all shadow-sm cursor-pointer"
          >
            <Activity size={15} className="text-emerald-600" />
            <span>+ Tratamiento</span>
          </button>

          {/* Action 3: Agendar Cita */}
          <button
            type="button"
            onClick={() => setIsNewAptOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm shadow-blue-600/25 cursor-pointer"
          >
            <Calendar size={15} />
            <span>Agendar Cita</span>
          </button>
        </div>
      </div>

      {/* ── Metrics Summary Bar ── */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="card-premium p-3.5 sm:p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Calendar size={18} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Citas</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums leading-tight">
              {patientAppointments.length}
            </p>
          </div>
        </div>

        <div className="card-premium p-3.5 sm:p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Activity size={18} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tratamientos</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums leading-tight">
              {(patient.history || []).length}
            </p>
          </div>
        </div>

        <div className="card-premium p-3.5 sm:p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
            <FileText size={18} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Notas Evolución</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums leading-tight">
              {(patient.evolutionNotes || []).length}
            </p>
          </div>
        </div>
      </div>

      {/* ── Smart Search & Filters Bar ── */}
      <div className="card-premium p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar en el pasado (ej. resina, 2025, limpieza, consulta)..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-400 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Year selector */}
          {availableYears.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Año:</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 cursor-pointer"
              >
                <option value="all">Todos los años</option>
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pt-1">
          <button
            type="button"
            onClick={() => setFilterKind('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer',
              filterKind === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            Todos ({allTimelineItems.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterKind('evolution')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer',
              filterKind === 'evolution'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            )}
          >
            <FileText size={13} />
            Notas ({ (patient.evolutionNotes || []).length })
          </button>

          <button
            type="button"
            onClick={() => setFilterKind('treatments')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer',
              filterKind === 'treatments'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            )}
          >
            <Activity size={13} />
            Tratamientos ({ (patient.history || []).length })
          </button>

          <button
            type="button"
            onClick={() => setFilterKind('appointments')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer',
              filterKind === 'appointments'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            )}
          >
            <Calendar size={13} />
            Citas ({patientAppointments.length})
          </button>

          {(searchQuery || filterKind !== 'all' || selectedYear !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterKind('all');
                setSelectedYear('all');
              }}
              className="text-xs text-blue-600 font-semibold hover:underline ml-auto whitespace-nowrap pl-2 cursor-pointer"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      </div>

      {/* ── Main Chronological Timeline ── */}
      {groupedByDate.length === 0 ? (
        <div className="card-premium p-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center mb-3">
            <Clock size={24} className="text-slate-400" />
          </div>
          <h4 className="text-base font-bold text-slate-800 mb-1">
            {searchQuery || filterKind !== 'all' || selectedYear !== 'all'
              ? 'Sin resultados para esta búsqueda'
              : 'Sin historial ni citas registradas'}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mb-5">
            {searchQuery || filterKind !== 'all' || selectedYear !== 'all'
              ? 'Intenta cambiar el término de búsqueda o quitar los filtros aplicados.'
              : 'Comienza agendando la primera cita o redactando la primera nota de evolución.'}
          </p>
          <div className="flex gap-2 flex-wrap justify-center">
            <button
              type="button"
              onClick={() => {
                setActiveFormTab('note');
                setIsNewRecordOpen(true);
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
            >
              + Nueva Nota
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFormTab('treatment');
                setIsNewRecordOpen(true);
              }}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:border-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              + Registrar Tratamiento
            </button>
            <button
              type="button"
              onClick={() => setIsNewAptOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
            >
              + Agendar Cita
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-7">
          {groupedByDate.map(group => {
            const isFuture = group.date > todayStr;
            const isToday = group.date === todayStr;

            return (
              <div key={group.date} className="space-y-3">
                {/* Date Group Header */}
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border capitalize flex items-center gap-2 shadow-xs',
                      isToday
                        ? 'bg-blue-600 text-white border-blue-600'
                        : isFuture
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    )}
                  >
                    <span>{formatDateHeader(group.date)}</span>
                    <span className="text-[10px] opacity-80">
                      ({group.items.length} {group.items.length === 1 ? 'registro' : 'registros'})
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                {/* Cards for this date */}
                <div className="space-y-2.5 pl-2 sm:pl-3 border-l-2 border-slate-200 ml-3">
                  {group.items.map(item => {
                    if (item.kind === 'appointment') {
                      const apt = item.raw as Appointment;
                      return (
                        <div
                          key={item.id}
                          className="card-premium p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-300"
                        >
                          <div className="flex items-start sm:items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                              <Calendar size={18} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="text-sm font-bold text-slate-900">{item.title}</h5>
                                {item.badge && (
                                  <span
                                    className={cn(
                                      'text-[10px] font-bold px-2 py-0.5 rounded-md border',
                                      item.badgeColor
                                    )}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                                <Clock size={12} className="text-slate-400" />
                                <span>{item.time || 'Horario programado'}</span>
                                <span>•</span>
                                <span>{apt.phoneNumber || 'Sin teléfono'}</span>
                              </p>
                            </div>
                          </div>

                          {/* Quick action for appointment */}
                          {apt.status === 'Programada' && (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/consultation?patientId=${patient.id}&appointmentId=${apt.id}`
                                )
                              }
                              className="self-end sm:self-center flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                            >
                              <Play size={12} className="fill-white" />
                              <span>Iniciar Consulta</span>
                            </button>
                          )}
                        </div>
                      );
                    }

                    if (item.kind === 'treatment') {
                      return (
                        <div
                          key={item.id}
                          className="card-premium p-4 flex items-center justify-between gap-3 hover:border-emerald-300"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                              <Activity size={18} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="text-sm font-bold text-slate-900">{item.title}</h5>
                                {item.badge && (
                                  <span
                                    className={cn(
                                      'text-[10px] font-bold px-2 py-0.5 rounded-md border',
                                      item.badgeColor
                                    )}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              {item.subtitle && (
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (item.kind === 'evolution') {
                      return (
                        <div
                          key={item.id}
                          className="card-premium p-4 space-y-2 hover:border-purple-300"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                                <FileText size={15} />
                              </div>
                              <h5 className="text-sm font-bold text-slate-900">{item.title}</h5>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-purple-50 text-purple-700 border-purple-200">
                              Nota de Evolución
                            </span>
                          </div>
                          {item.content && (
                            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 whitespace-pre-wrap font-sans">
                              {item.content}
                            </p>
                          )}
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal to Schedule New Appointment ── */}
      <NewAppointmentModal
        isOpen={isNewAptOpen}
        onClose={() => setIsNewAptOpen(false)}
        initialPatientId={patient.id}
        initialPatientName={patient.identification.fullName}
      />

      {/* ── Modal to Add Treatment or Evolution Note (Portaled to body for full screen overlay) ── */}
      {isNewRecordOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsNewRecordOpen(false)}
          >
            <div
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header Tabs */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveFormTab('note')}
                    className={cn(
                      'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                      activeFormTab === 'note'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    <FileText size={13} />
                    <span>Nota de Evolución</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveFormTab('treatment')}
                    className={cn(
                      'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                      activeFormTab === 'treatment'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    <Activity size={13} />
                    <span>Registrar Tratamiento</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNewRecordOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              {activeFormTab === 'note' ? (
                <form onSubmit={handleAddNote} className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                        Procedimiento / Asunto *
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        placeholder="Ej. Control de ortodoncia, resina, limpieza..."
                        value={newNote.procedure}
                        onChange={e => setNewNote(p => ({ ...p, procedure: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-purple-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                        Fecha *
                      </label>
                      <input
                        type="date"
                        required
                        value={newNote.date}
                        onChange={e => setNewNote(p => ({ ...p, date: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-purple-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Detalle de Evolución Clínica *
                      </label>
                      <button
                        type="button"
                        onClick={toggleRecording}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                          isRecording
                            ? 'bg-red-50 text-red-600 animate-pulse border border-red-200'
                            : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                        )}
                      >
                        {isRecording ? <MicOff size={13} /> : <Mic size={13} />}
                        <span>{isRecording ? 'Detener dictado' : 'Dictar por voz 🎙️'}</span>
                      </button>
                    </div>
                    <textarea
                      rows={5}
                      required
                      placeholder="Escribe o dicta las observaciones clínicas, avances del tratamiento, indicaciones o medicamentos..."
                      value={newNote.content}
                      onChange={e => setNewNote(p => ({ ...p, content: e.target.value }))}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-purple-500 transition-all resize-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsNewRecordOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                    >
                      Guardar Nota de Evolución
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleAddTreatment} className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                        Procedimiento Realizado *
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        placeholder="Ej. Resina oclusal, profilaxis, exodoncia..."
                        value={newTreatment.description}
                        onChange={e =>
                          setNewTreatment(p => ({ ...p, description: e.target.value }))
                        }
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                        Fecha *
                      </label>
                      <input
                        type="date"
                        required
                        value={newTreatment.date}
                        onChange={e => setNewTreatment(p => ({ ...p, date: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                        Tipo de Procedimiento
                      </label>
                      <select
                        value={newTreatment.type}
                        onChange={e =>
                          setNewTreatment(p => ({
                            ...p,
                            type: e.target.value as ClinicalEvent['type']
                          }))
                        }
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-emerald-500"
                      >
                        <option value="treatment">Tratamiento General</option>
                        <option value="cleaning">Limpieza / Profilaxis</option>
                        <option value="extraction">Extracción / Cirugía</option>
                        <option value="diagnose">Diagnóstico</option>
                        <option value="other">Otro</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                        Pieza Dental (Opcional)
                      </label>
                      <input
                        type="number"
                        placeholder="Ej. 14, 21, 36..."
                        value={newTreatment.toothId}
                        onChange={e =>
                          setNewTreatment(p => ({ ...p, toothId: e.target.value }))
                        }
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsNewRecordOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                    >
                      Guardar Tratamiento
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default UnifiedTimelineTab;
