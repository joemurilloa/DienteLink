import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { bookingService } from '../services/bookingService';
import { PublicBookingSettings, DoctorAvailability, AppointmentType } from '../types';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  MessageSquare,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  X
} from 'lucide-react';
import { cn, getLocalISODate } from '../lib/utils';

// NOTE: This page renders at /p/:doctorId - completely standalone, no app chrome
const PublicBookingPage: React.FC = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const [settings, setSettings] = useState<PublicBookingSettings | null>(null);
  const [availability, setAvailability] = useState<DoctorAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'select-date' | 'select-time' | 'fill-info' | 'confirmation'>('select-date');
  
  // Form state
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    appointmentType: 'Consulta' as AppointmentType,
    message: ''
  });
  
  // UI state
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Anti-spam: rate limiting (cooldown after each submission)
  const [cooldown, setCooldown] = useState(0);
  const COOLDOWN_SECONDS = 60;

  // Cooldown timer effect
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!doctorId) {
      setError('ID de doctor no válido');
      setLoading(false);
      return;
    }

    const loadBookingData = async () => {
      try {
        const bookingSettings = await bookingService.getPublicBookingSettings(doctorId);
        const doctorAvailability = await bookingService.getPublicDoctorAvailability(doctorId);
        
        if (!bookingSettings || !bookingSettings.isActive) {
          setError('Las reservas están temporalmente deshabilitadas');
          setLoading(false);
          return;
        }

        setSettings(bookingSettings);
        setAvailability(doctorAvailability);
        
        // Load available dates using the fetched availability
        if (doctorAvailability) {
          const dates = bookingService.getAvailableDates(doctorAvailability.advanceBookingDays, doctorAvailability);
          setAvailableDates(dates);
        }
        
        setLoading(false);
      } catch (err) {
        setError('Error al cargar la configuración de reservas');
        setLoading(false);
      }
    };

    loadBookingData();
  }, [doctorId]);

  useEffect(() => {
    if (selectedDate && availability) {
      let cancelled = false;
      const loadSlots = async (showLoader = true) => {
        if (showLoader) setLoadingSlots(true);
        try {
          const times = bookingService.generateAvailableSlots(selectedDate, availability);
          const available: string[] = [];
          for (const time of times) {
            if (cancelled) return;
            const ok = await bookingService.isSlotAvailable(selectedDate, time, doctorId);
            if (ok) available.push(time);
          }
          if (!cancelled) setAvailableTimes(available);
        } finally {
          if (!cancelled) setLoadingSlots(false);
        }
      };
      loadSlots(true);

      // Auto-refresh available slots every 30 seconds (silently, no skeleton)
      const interval = setInterval(() => loadSlots(false), 30000);
      return () => { cancelled = true; clearInterval(interval); };
    }
  }, [selectedDate, availability, doctorId]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    return new Date(0, 0, 0, parseInt(hours || '0', 10), parseInt(minutes || '0', 10))
      .toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
    setStep('select-time');
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep('fill-info');
  };

  const handleSubmit = async () => {
    setError('');
    
    // Anti-spam: rate limiting
    if (cooldown > 0) {
      setError(`Espera ${cooldown} segundos antes de enviar otra solicitud`);
      return;
    }

    // Validation
    if (!formData.name.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }

    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError('Por favor ingresa un email válido');
      return;
    }

    if (settings?.requirePhone && !formData.phone.trim()) {
      setError('Por favor ingresa tu teléfono');
      return;
    }

    if (settings?.requireMessage && !formData.message.trim()) {
      setError('Por favor ingresa un mensaje');
      return;
    }

    setIsSubmitting(true);

    try {
      // Re-verify the selected slot is still available right before booking
      const stillAvailable = await bookingService.isSlotAvailable(selectedDate, selectedTime, doctorId);
      if (!stillAvailable) {
        setError('Lo sentimos, este horario acaba de ser reservado por otro paciente. Por favor elige otro horario.');
        setIsSubmitting(false);
        // Refresh available times so user sees correct availability
        if (availability) {
          setLoadingSlots(true);
          const times = bookingService.generateAvailableSlots(selectedDate, availability);
          const available: string[] = [];
          for (const time of times) {
            const ok = await bookingService.isSlotAvailable(selectedDate, time, doctorId);
            if (ok) available.push(time);
          }
          setAvailableTimes(available);
          setLoadingSlots(false);
        }
        setStep('select-time');
        setSelectedTime('');
        return;
      }

      // Create appointment request
      const request = await bookingService.createAppointmentRequest(
        formData.name,
        formData.email,
        formData.phone,
        selectedDate,
        selectedTime,
        formData.appointmentType,
        formData.message,
        doctorId
      );

      setStep('confirmation');
      // Start cooldown to prevent rapid re-submissions
      setCooldown(COOLDOWN_SECONDS);
    } catch (err) {
      setError('Error al enviar la solicitud. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    switch (step) {
      case 'select-time':
        setStep('select-date');
        setSelectedTime('');
        break;
      case 'fill-info':
        setStep('select-time');
        break;
      default:
        break;
    }
  };

  // Calendar state for the date picker
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const availableDateSet = new Set(availableDates);

  const calendarDays = (() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    return { year, month, firstDay, totalDays };
  })();

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  if (loading) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 text-sm font-medium">Cargando agenda...</p>
        </div>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <X className="text-red-500" size={28} />
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-2">No disponible</h1>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="min-h-screen min-h-[100dvh] bg-white flex flex-col">
      {/* Compact Header */}
      <header className="border-b border-slate-100 px-4 py-3 flex items-center gap-3 bg-white sticky top-0 z-10">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
          <CalendarIcon size={18} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-bold text-slate-900 truncate">{settings.clinicName || 'Clínica Dental'}</h1>
          {settings.doctorName && <p className="text-[11px] text-slate-400 truncate">{settings.doctorName}</p>}
        </div>
        {/* Step indicator with label */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] font-semibold text-slate-400 hidden min-[380px]:block">
            {step === 'select-date' && 'Fecha'}
            {step === 'select-time' && 'Hora'}
            {step === 'fill-info' && 'Datos'}
            {step === 'confirmation' && 'Listo'}
          </span>
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={cn(
                'h-1.5 rounded-full transition-all',
                i <= ['select-date', 'select-time', 'fill-info', 'confirmation'].indexOf(step)
                  ? 'w-5 bg-blue-600' : 'w-1.5 bg-slate-200'
              )} />
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-lg mx-auto px-4 py-4">
          <AnimatePresence mode="wait">
            {/* ===== STEP 1: SELECT DATE (Calendar) ===== */}
            {step === 'select-date' && (
              <motion.div key="date" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Elige una fecha</h2>
                <p className="text-sm text-slate-400 mb-5">{settings.description || 'Selecciona el día que mejor te convenga.'}</p>

                {/* Calendar Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                    <ArrowLeft size={18} />
                  </button>
                  <span className="text-sm font-bold text-slate-900">{monthNames[calendarDays.month]} {calendarDays.year}</span>
                  <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                    <ArrowRight size={18} />
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['D', 'L', 'M', 'Mi', 'J', 'V', 'S'].map(d => (
                    <div key={d} className="text-center text-[10px] font-semibold uppercase text-slate-400 py-2">{d}</div>
                  ))}
                  {Array.from({ length: calendarDays.firstDay }).map((_, i) => <div key={`s-${i}`} />)}
                  {Array.from({ length: calendarDays.totalDays }).map((_, i) => {
                    const d = i + 1;
                    const dateStr = `${calendarDays.year}-${String(calendarDays.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const isAvailable = availableDateSet.has(dateStr);
                    const isSelected = selectedDate === dateStr;
                    const isToday = getLocalISODate(new Date()) === dateStr;

                    return (
                      <button
                        key={d}
                        disabled={!isAvailable}
                        onClick={() => isAvailable && handleDateSelect(dateStr)}
                        className={cn(
                          'aspect-square rounded-xl text-sm font-medium transition-all flex items-center justify-center',
                          isSelected ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                            : isAvailable ? 'hover:bg-blue-50 text-slate-900 hover:text-blue-600 cursor-pointer'
                            : 'text-slate-200 cursor-not-allowed',
                          isToday && !isSelected && 'ring-2 ring-blue-200'
                        )}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-slate-400 text-center mt-3">Los días resaltados tienen disponibilidad</p>
              </motion.div>
            )}

            {/* ===== STEP 2: SELECT TIME ===== */}
            {step === 'select-time' && (
              <motion.div key="time" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <button onClick={goBack} className="flex items-center gap-1.5 text-sm text-blue-600 font-semibold mb-4 hover:text-blue-700">
                  <ArrowLeft size={16} /> Cambiar fecha
                </button>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Elige un horario</h2>
                <p className="text-sm text-slate-400 mb-5">{formatDate(selectedDate)}</p>

                {loadingSlots ? (
                  <div>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="py-3 px-2 rounded-xl border border-slate-100 bg-slate-50 animate-pulse">
                          <div className="h-4 bg-slate-200 rounded-md mx-auto w-16"></div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 text-center">Consultando disponibilidad...</p>
                  </div>
                ) : availableTimes.length === 0 ? (
                  <div className="text-center py-10">
                    <Clock size={36} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 mb-4">No hay horarios disponibles para esta fecha</p>
                    <button onClick={goBack} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                      Elegir otra fecha
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableTimes.map(time => (
                      <button
                        key={time}
                        onClick={() => handleTimeSelect(time)}
                        className="py-3 px-2 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-center text-sm font-semibold text-slate-700 hover:text-blue-600"
                      >
                        {formatTime(time)}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ===== STEP 3: FILL INFO ===== */}
            {step === 'fill-info' && (
              <motion.div key="info" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <button onClick={goBack} className="flex items-center gap-1.5 text-sm text-blue-600 font-semibold mb-3 hover:text-blue-700">
                  <ArrowLeft size={16} /> Cambiar hora
                </button>

                {/* Summary chip */}
                <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-xl mb-3">
                  <CalendarIcon size={14} className="text-blue-600 flex-shrink-0" />
                  <span className="text-xs font-semibold text-blue-700">{formatDate(selectedDate)} — {formatTime(selectedTime)}</span>
                </div>

                <h2 className="text-lg font-bold text-slate-900 mb-3">Completa tus datos</h2>

                <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nombre completo *</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm" placeholder="Tu nombre completo" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Correo electrónico <span className="text-slate-300 normal-case">(opcional)</span></label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm" placeholder="tu@email.com (opcional)" />
                    </div>
                  </div>

                  {settings.requirePhone && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Teléfono *</label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm" placeholder="Tu número" />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Tipo de cita</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {settings.availableTypes.map(type => (
                        <button key={type} type="button" onClick={() => setFormData({ ...formData, appointmentType: type })}
                          className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                            formData.appointmentType === type
                              ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600'
                          )}>
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Motivo de consulta {settings.requireMessage ? '*' : <span className="text-slate-300 normal-case">(opcional)</span>}
                    </label>
                    <textarea
                      required={settings.requireMessage}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm resize-none"
                      placeholder="Ej: dolor en muela, limpieza dental, revisión..."
                    />
                  </div>

                  {error && (
                    <div className="p-2.5 bg-red-50 text-red-600 text-sm rounded-xl border border-red-200">{error}</div>
                  )}

                  <button type="submit" disabled={isSubmitting || cooldown > 0}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 sticky bottom-0">
                    {isSubmitting ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Enviando...</>
                    ) : cooldown > 0 ? (
                      <>Espera {cooldown}s</>
                    ) : (
                      <>Solicitar Cita <ArrowRight size={16} /></>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ===== STEP 4: CONFIRMATION ===== */}
            {step === 'confirmation' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
                <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                
                <h2 className="text-xl font-bold text-slate-900 mb-2">¡Solicitud enviada!</h2>
                <p className="text-sm text-slate-500 mb-6">Tu solicitud fue recibida correctamente.</p>
                
                <div className="bg-slate-50 rounded-xl p-5 text-left mb-5 space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Fecha</span>
                    <span className="font-semibold text-slate-900">{formatDate(selectedDate)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Hora</span>
                    <span className="font-semibold text-slate-900">{formatTime(selectedTime)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Tipo</span>
                    <span className="font-semibold text-slate-900">{formData.appointmentType}</span>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-sm text-blue-700">{settings.confirmationMessage || 'Te contactaremos pronto para confirmar tu cita.'}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer — hidden during form step to maximize space */}
      {step !== 'fill-info' && (
        <footer className="border-t border-slate-100 px-5 py-2 text-center flex-shrink-0">
          <p className="text-[10px] text-slate-300 font-medium">Agenda proporcionada por DienteLink</p>
        </footer>
      )}
    </div>
  );
};

export default PublicBookingPage;