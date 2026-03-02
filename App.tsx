
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import AppointmentCard from './components/AppointmentCard';
import PatientList from './components/PatientList';
import NewPatientModal from './components/NewPatientModal';
import PatientConsultationView from './components/PatientConsultationView';
import PublicBookingPage from './components/PublicBookingPage';
import AppointmentRequestsManager from './components/AppointmentRequestsManager';
import BookingManagementView from './components/BookingManagementView';
import { whatsappService } from './services/whatsappService';
import { persistenceService } from './services/persistenceService';
import { bookingService } from './services/bookingService';
import { AuthProvider, useAuth } from './services/authService';
import AuthPage from './components/AuthPage';
import { useKeyboardShortcuts, useFocusManagement } from './lib/KeyboardShortcuts';

// Lazy loading for better performance
const PatientRecord = React.lazy(() => import('./components/PatientRecord'));
const Odontogram = React.lazy(() => import('./components/Odontogram'));
const XRayViewer = React.lazy(() => import('./components/XRayViewer'));
import GlobalSearch from './components/GlobalSearch';
import { Appointment, ReminderStatus, PatientRecord as PatientRecordType, AppointmentType, AppointmentRequest } from './types';
import { cn, generateId } from './lib/utils';
import { Plus, Calendar as CalendarIcon, History, Search, Settings, Trash2, Users, Activity, Clock, Bell } from 'lucide-react';
import { sileo, Toaster } from 'sileo';
import 'sileo/styles.css';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const doctorName = profile?.full_name || 'Doctor';
  const doctorInitials = doctorName.split(' ').filter(w => w.length > 0).map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'DR';

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allPatients, setAllPatients] = useState(() => persistenceService.getPatients());
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<AppointmentRequest[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];

  // Weekly procedures count
  const weeklyProcedures = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    return allPatients.reduce((sum, p) => {
      return sum + p.history.filter(e => e.date >= weekAgoStr && e.date <= today).length;
    }, 0);
  }, [allPatients, today]);

  const loadPendingRequests = useCallback(async () => {
    try {
      await bookingService.refreshRequests();
    } catch (e) {
      // refreshRequests might fail if not initialized yet
    }
    const requests = bookingService.getPendingRequests();
    setPendingRequests(requests);
  }, []);

  useEffect(() => {
    setAppointments(persistenceService.getAppointmentsForDate(today));
    loadPendingRequests();

    // Listen for new appointment requests
    const handleNewRequest = (event: CustomEvent) => {
      const newRequest = event.detail as AppointmentRequest;
      setPendingRequests(prev => [newRequest, ...prev]);
    };

    window.addEventListener('newAppointmentRequest', handleNewRequest as EventListener);

    const unsubscribe = whatsappService.subscribe(({ appointmentId, status }) => {
      setAppointments(prev => {
        const updated = prev.map(apt => apt.id === appointmentId ? { ...apt, status } : apt);
        const apt = updated.find(a => a.id === appointmentId);
        if (apt) {
          persistenceService.saveAppointment(apt).catch(console.error);
          // Friendly notification for appointment updates
          if (status === 'confirmed') {
            sileo.success({ title: `¡Perfecto! ${apt.patientName} confirmó su cita para hoy`, description: '¿Todo listo para recibirle?' });
          } else if (status === 'cancelled') {
            sileo.warning({ title: `${apt.patientName} canceló su cita`, description: 'Puedes reprogramarla cuando gustes' });
          }
        }
        return updated;
      });
    });

    return () => {
      window.removeEventListener('newAppointmentRequest', handleNewRequest as EventListener);
      unsubscribe();
    };
  }, [loadPendingRequests]);

  const handleReminderStatusUpdate = useCallback((id: string, status: ReminderStatus) => {
    setAppointments(prev => {
      const updated = prev.map(apt => apt.id === id ? { ...apt, reminderStatus: status } : apt);
      const apt = updated.find(a => a.id === id);
      if (apt) {
        persistenceService.saveAppointment(apt).catch(console.error);
        // Friendly reminder notifications
        if (status === 'sent') {
          sileo.success({ title: `Recordatorio enviado a ${apt.patientName} ✨`, description: 'Le llegará por WhatsApp en unos segundos' });
        } else if (status === 'failed') {
          sileo.error({ title: `No pudimos contactar a ${apt.patientName}`, description: 'Revisa el número de teléfono o inténtalo de nuevo' });
        }
      }
      return updated;
    });
  }, []);

  return (
    <div className="flex-1 h-full overflow-y-auto hide-scrollbar pb-32 lg:pb-8 p-5 lg:p-8 page-transition">
        {/* Eliminar el header anterior ya integrado arriba */}

      <div className="space-y-6 lg:space-y-8">
        {/* ===== Header mejorado con búsqueda integrada ===== */}
        <section className="animate-in-up stagger-delay-1">
          <div className="bg-white rounded-2xl lg:rounded-3xl border border-slate-100 p-6 lg:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
              <div className="flex-1">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight mb-1">
                  {getGreeting()}, <span className="text-blue-600">{doctorName.replace(/^Dr\.?\s*/i, '')}</span>
                </h2>
                <p className="text-sm text-slate-500">
                  {new Date().toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              
              {/* Búsqueda integrada - mobile first */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsSearchOpen(true);
                    sileo.info({ title: '¡Hola! ¿A quién buscamos hoy?', description: 'Puedes buscar por nombre, cédula o teléfono' });
                  }}
                  className="flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-blue-50 rounded-xl border border-slate-200 hover:border-blue-200 transition-all group flex-1 lg:flex-none lg:min-w-[280px]"
                >
                  <Search size={18} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                  <span className="text-sm text-slate-400 group-hover:text-slate-600 transition-colors">Buscar pacientes...</span>
                  <div className="hidden lg:flex items-center gap-1 px-2 py-1 bg-slate-200 group-hover:bg-slate-300 rounded-lg text-[10px] font-semibold text-slate-500 ml-auto">
                    <kbd>⌘K</kbd>
                  </div>
                </button>
                
                <div className="w-12 h-12 rounded-xl overflow-hidden ring-2 ring-blue-100 shadow-sm bg-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{doctorInitials}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* ===== Citas de Hoy — Principal ===== */}
        <section className="animate-in-up stagger-delay-2">
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <h3 className="text-lg lg:text-xl font-bold text-slate-900 tracking-tight">Agenda de Hoy</h3>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-semibold">{appointments.length} citas</span>
              <button
                onClick={() => {
                  navigate('/calendar');
                  sileo.success({ title: '¡Vamos a programar una nueva cita!', description: 'Selecciona fecha y hora para tu paciente' });
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Nueva Cita</span>
                <span className="sm:hidden">Nueva</span>
              </button>
            </div>
          </div>
          
          {appointments.length === 0 ? (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl border border-slate-100 p-8 lg:p-12 text-center">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 lg:mb-6">
                <CalendarIcon size={32} className="text-slate-300" />
              </div>
              <h4 className="text-lg lg:text-xl font-semibold text-slate-600 mb-2">Sin citas programadas</h4>
              <p className="text-slate-400 mb-6 lg:mb-8 max-w-sm mx-auto">No hay citas para el día de hoy. Programa la primera cita del día.</p>
              <button
                onClick={() => {
                  navigate('/calendar');
                  sileo.success({ title: '¡Perfecto! Programa tu primera cita del día', description: '¡Que tengas un excelente día de trabajo!' });
                }}
                className="px-6 py-3 lg:px-8 lg:py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25"
              >
                Programar Primera Cita
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
              {appointments.map(apt => (
                <AppointmentCard key={apt.id} appointment={apt} onReminderSent={handleReminderStatusUpdate} />
              ))}
            </div>
          )}
        </section>

        {/* ===== Solicitudes de Cita ===== */}
        <section className="animate-in-up stagger-delay-3">
          <div className={cn(
            'rounded-2xl lg:rounded-3xl border p-6 lg:p-8',
            pendingRequests.length > 0
              ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
              : 'bg-white border-slate-100'
          )}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {pendingRequests.length > 0 && <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>}
                <h3 className={cn('text-lg lg:text-xl font-bold', pendingRequests.length > 0 ? 'text-amber-800' : 'text-slate-900')}>
                  Solicitudes de Cita {pendingRequests.length > 0 && `(${pendingRequests.length})`}
                </h3>
              </div>
              <button
                onClick={() => navigate('/booking/manage')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all',
                  pendingRequests.length > 0
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                )}
              >
                <Bell size={16} />
                <span className="hidden sm:inline">Ver Solicitudes</span>
                <span className="sm:hidden">Ver</span>
              </button>
            </div>
            
            {pendingRequests.length > 0 ? (
              <>
                <div className="space-y-3">
                  {pendingRequests.slice(0, 3).map(request => {
                    const fmtDate = (dateStr: string) => {
                      return new Date(dateStr).toLocaleDateString('es-ES', {
                        month: 'short',
                        day: 'numeric'
                      });
                    };

                    const fmtTime = (timeStr: string) => {
                      const [hours, minutes] = timeStr.split(':');
                      return new Date(0, 0, 0, parseInt(hours), parseInt(minutes))
                        .toLocaleTimeString('es-ES', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: true 
                        });
                    };

                    return (
                      <div key={request.id} className="bg-white rounded-xl p-4 border border-amber-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                            {request.patientName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">{request.patientName}</div>
                            <div className="text-xs text-slate-500">
                              {fmtDate(request.requestedDate)} - {fmtTime(request.requestedTime)} ({request.appointmentType})
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate('/booking/manage')}
                          className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-200 transition-colors"
                        >
                          Revisar
                        </button>
                      </div>
                    );
                  })}
                </div>

                {pendingRequests.length > 3 && (
                  <div className="mt-4 text-center">
                    <span className="text-sm text-amber-600">
                      +{pendingRequests.length - 3} solicitudes más
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <Bell size={32} className="text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-medium">No hay solicitudes pendientes</p>
                <p className="text-xs text-slate-300 mt-1">Las citas solicitadas desde tu enlace público aparecerán aquí</p>
              </div>
            )}
          </div>
        </section>

        {/* ===== Acciones Rápidas de Gestión ===== */}
        <section className="animate-in-up stagger-delay-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 lg:mb-6">Herramientas de Gestión</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            <button
              onClick={() => {
                navigate('/patients?new=true');
                sileo.success({ title: '¡Excelente! Vamos a registrar un nuevo paciente', description: 'Completa la ficha para empezar su historia clínica' });
              }}
              className="flex flex-col items-center gap-3 lg:gap-4 p-4 lg:p-6 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all shadow-sm group"
            >
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Plus size={20} className="lg:hidden" />
                <Plus size={24} className="hidden lg:block" />
              </div>
              <span className="font-semibold text-slate-700 text-sm lg:text-base text-center leading-tight">Nuevo Paciente</span>
            </button>
            
            <button
              onClick={() => {
                navigate('/patients');
                sileo.info({ title: 'Explorando tu lista de pacientes', description: `Tienes ${allPatients.length} paciente${allPatients.length !== 1 ? 's' : ''} registrado${allPatients.length !== 1 ? 's' : ''}` });
              }}
              className="flex flex-col items-center gap-3 lg:gap-4 p-4 lg:p-6 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all shadow-sm group"
            >
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Users size={20} className="lg:hidden" />
                <Users size={24} className="hidden lg:block" />
              </div>
              <span className="font-semibold text-slate-700 text-sm lg:text-base text-center leading-tight">Ver Pacientes</span>
            </button>
            
            <button
              onClick={() => {
                navigate('/settings');
                sileo.info({ title: 'Configurando tu espacio de trabajo', description: 'Ajusta DienteLink a tu manera de trabajar' });
              }}
              className="flex flex-col items-center gap-3 lg:gap-4 p-4 lg:p-6 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all shadow-sm group"
            >
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 group-hover:bg-slate-600 group-hover:text-white transition-all">
                <Settings size={20} className="lg:hidden" />
                <Settings size={24} className="hidden lg:block" />
              </div>
              <span className="font-semibold text-slate-700 text-sm lg:text-base text-center leading-tight">Configuración</span>
            </button>
            
            <button
              onClick={() => {
                navigate('/consultation');
                sileo.success({ title: 'Modo consulta activado 📟', description: 'Herramienta perfecta para atención directa' });
              }}
              className="flex flex-col items-center gap-3 lg:gap-4 p-4 lg:p-6 bg-gradient-to-br from-blue-50 to-slate-50 rounded-2xl border border-blue-100 hover:border-blue-200 hover:from-blue-100 hover:to-slate-100 transition-all shadow-sm group col-span-2 lg:col-span-1"
            >
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all">
                <Activity size={20} className="lg:hidden" />
                <Activity size={24} className="hidden lg:block" />
              </div>
              <span className="font-semibold text-blue-700 text-sm lg:text-base text-center leading-tight">Recibir Paciente</span>
            </button>
          </div>
        </section>
      </div>

      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};

const PatientsView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [patients, setPatients] = useState<PatientRecordType[]>(persistenceService.getPatients());
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('new') === 'true');

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const handleSave = async (newPatient: PatientRecordType) => {
    await persistenceService.savePatient(newPatient);
    setPatients(persistenceService.getPatients());
    navigate(`/patient/${newPatient.id}`);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 lg:p-12 pb-32">
      <PatientList
        patients={patients}
        onSelect={(p) => navigate(`/patient/${p.id}`)}
        onAdd={() => setIsModalOpen(true)}
      />
      <NewPatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
};

const PatientDetailView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientRecordType | undefined>(persistenceService.getPatientById(id || ''));

  if (!patient) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <p className="text-lg font-semibold text-slate-600 mb-2">Paciente no encontrado</p>
        <button 
          onClick={() => navigate('/patients')} 
          className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          Volver a Pacientes
        </button>
      </div>
    </div>
  );

  const handleUpdate = async (updated: PatientRecordType) => {
    await persistenceService.savePatient(updated);
    setPatient(updated);
  };

  const handleDelete = async () => {
    if (window.confirm(`¿Eliminar el expediente de ${patient.identification.fullName}? Esta acción no se puede deshacer.`)) {
      await persistenceService.deletePatient(patient.id);
      navigate('/patients');
    }
  };

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col p-5 lg:p-8 pb-32 page-transition">
      <React.Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }>
        <header className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/patients')} className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 border border-slate-200 hover:text-blue-600 transition-all">←</button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-1">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{patient.identification.fullName}</h2>
            <p className="text-slate-400 font-medium text-xs mt-0.5">Expediente #{patient.id.slice(0, 8)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-red-50 text-red-500 rounded-xl font-semibold text-sm hover:bg-red-100 transition-all border border-red-100"
            >
              <Trash2 size={14} /> Eliminar
            </button>
            <button
              onClick={() => navigate(`/calendar?patient=${encodeURIComponent(patient.identification.fullName)}&id=${patient.id}`)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20"
            >
              <History size={14} /> Agendar Cita
            </button>
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <PatientRecord patient={patient} onUpdate={handleUpdate} />
      </div>
      </React.Suspense>
    </div>
  );
};

const APPOINTMENT_TYPES: AppointmentType[] = ['Consulta', 'Seguimiento', 'Cirugía', 'Revisión'];

const CalendarView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [appointments, setAppointments] = useState(persistenceService.getAppointments());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAdding, setIsAdding] = useState(false);

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

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleAddAppointment = async () => {
    if (!newApt.patientName) return;

    // Try to find patient by name if no patientId is provided
    let patientId = newApt.patientId;
    if (!patientId) {
      const found = persistenceService.getPatients().find(
        p => p.identification.fullName.toLowerCase() === newApt.patientName.toLowerCase()
      );
      patientId = found?.id || '';
    }

    const appointment: Appointment = {
      id: generateId(),
      patientId,
      patientName: newApt.patientName,
      phoneNumber: '',
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
    sileo.success({ title: `¡Cita creada para ${appointment.patientName}!`, description: `${appointment.date} a las ${appointment.time} — ${appointment.type}` });
  };

  const handleDeleteAppointment = async (e: React.MouseEvent, aptId: string) => {
    e.stopPropagation();
    if (window.confirm('¿Eliminar esta cita?')) {
      await persistenceService.deleteAppointment(aptId);
      setAppointments(persistenceService.getAppointments());
      sileo.info({ title: 'Cita eliminada correctamente', description: 'Puedes reprogramarla cuando lo necesites' });
    }
  };

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = daysInMonth(year, month);
  const skip = firstDayOfMonth(year, month);

  return (
    <div className="flex-1 h-full overflow-y-auto p-5 lg:p-8 pb-32 page-transition">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
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

      <div className="card-premium p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900">{monthNames[month]} {year}</h3>
          <div className="flex gap-2">
            <button onClick={handlePrevMonth} className="p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-slate-600">←</button>
            <button onClick={handleNextMonth} className="p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-slate-600">→</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(d => (
            <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-3">{d}</div>
          ))}
          {Array.from({ length: skip }).map((_, i) => <div key={`skip-${i}`} />)}
          {Array.from({ length: days }).map((_, i) => {
            const d = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayApts = appointments.filter(a => a.date === dateStr);
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            return (
              <div
                key={d}
                onClick={() => {
                  setNewApt(prev => ({ ...prev, date: dateStr }));
                  setIsAdding(true);
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
                        onClick={(e) => handleDeleteAppointment(e, a.id)}
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

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm page-transition">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md page-transition">
            <h3 className="text-xl font-bold text-slate-900 mb-5 tracking-tight">Agendar Cita</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Paciente</label>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  value={newApt.patientName}
                  onChange={e => setNewApt(p => ({ ...p, patientName: e.target.value }))}
                  placeholder="Nombre del paciente..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Fecha</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none text-sm font-medium focus:border-blue-500 transition-all"
                    value={newApt.date}
                    onChange={e => setNewApt(p => ({ ...p, date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Hora</label>
                  <input
                    type="time"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none text-sm font-medium focus:border-blue-500 transition-all"
                    value={newApt.time}
                    onChange={e => setNewApt(p => ({ ...p, time: e.target.value }))}
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
                onClick={() => setIsAdding(false)}
                className="w-full py-3 text-slate-400 text-xs font-semibold hover:text-red-500 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsView: React.FC = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const doctorName = profile?.full_name || 'Doctor';
  const doctorRole = profile?.role || 'Odontólogo';
  const doctorInitials = doctorName.split(' ').filter(w => w.length > 0).map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'DR';

  const handleClearData = async () => {
    if (window.confirm('¿Borrar todos los datos? Esto eliminará pacientes, citas y toda la información almacenada. Esta acción no se puede deshacer.')) {
      await persistenceService.clearAllData();
      window.location.reload();
    }
  };

  const handleSignOut = async () => {
    persistenceService.reset();
    bookingService.reset();
    await signOut();
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-5 lg:p-8 pb-32 page-transition">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/')} className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 border border-slate-200 hover:text-blue-600 transition-all active:scale-95">←</button>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Ajustes</h2>
      </header>

      <div className="max-w-2xl space-y-5">
        <div className="card-premium p-6">
          <h3 className="text-base font-bold text-slate-900 mb-5">Perfil del Doctor</h3>
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center ring-2 ring-blue-500/20">
              <span className="text-white font-bold text-xl">{doctorInitials}</span>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{doctorName}</p>
              <p className="text-sm font-medium text-slate-400">{doctorRole}</p>
            </div>
          </div>
        </div>

        <div className="card-premium p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4">Información de la App</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-sm font-medium text-slate-400">Versión</span>
              <span className="text-sm font-bold text-slate-900">1.0.0</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-sm font-medium text-slate-400">Pacientes Registrados</span>
              <span className="text-sm font-bold text-slate-900">{persistenceService.getPatients().length}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-slate-400">Citas Totales</span>
              <span className="text-sm font-bold text-slate-900">{persistenceService.getAppointments().length}</span>
            </div>
          </div>
        </div>

        <div className="card-premium p-6 border-red-100">
          <h3 className="text-base font-bold text-red-600 mb-3">Zona de Peligro</h3>
          <p className="text-sm text-slate-400 mb-4">Borrar todos los datos almacenados localmente. Esta acción no se puede deshacer.</p>
          <button
            onClick={handleClearData}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 rounded-xl font-semibold text-sm hover:bg-red-100 transition-all border border-red-100"
          >
            <Trash2 size={14} />
            Borrar Todos los Datos
          </button>
        </div>

        <div className="card-premium p-6">
          <h3 className="text-base font-bold text-slate-900 mb-3">Sesión</h3>
          <p className="text-sm text-slate-400 mb-4">Cerrar sesión de DienteLink. Tus datos se mantienen seguros en la nube.</p>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-all border border-slate-200"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};

// Booking Wrapper Components
const BookingManagementWrapper: React.FC = () => {
  const navigate = useNavigate();
  return <BookingManagementView onBack={() => navigate('/')} />;
};

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center p-8">
            <h2 className="text-xl font-bold text-red-600 mb-4">Error en la aplicación</h2>
            <p className="text-slate-600 mb-4">Ha ocurrido un error inesperado.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { user } = useAuth();
  const [servicesReady, setServicesReady] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Initialize persistence & booking services when user is available
  useEffect(() => {
    if (!user) { setServicesReady(false); return; }
    const initServices = async () => {
      await Promise.all([
        persistenceService.init(user.id),
        bookingService.init(user.id),
      ]);
      setPendingCount(bookingService.getPendingRequests().length);
      setServicesReady(true);
    };
    initServices().catch(console.error);
  }, [user]);

  // Keep pending count in sync when requests change
  useEffect(() => {
    const refresh = () => setPendingCount(bookingService.getPendingRequests().length);
    window.addEventListener('bookingRequestsUpdated', refresh);
    window.addEventListener('newAppointmentRequest', refresh);
    // Also refresh when navigating back to dashboard
    const interval = setInterval(refresh, 5000);
    return () => {
      window.removeEventListener('bookingRequestsUpdated', refresh);
      window.removeEventListener('newAppointmentRequest', refresh);
      clearInterval(interval);
    };
  }, [servicesReady]);

  // Enhanced keyboard shortcuts
  useKeyboardShortcuts();
  useFocusManagement();

  // Ensure app always starts on dashboard for first load
  React.useEffect(() => {
    if (location.pathname === '/#/' || location.pathname === '/') {
      // Small delay to ensure the router is ready
      setTimeout(() => {
        if (location.pathname !== '/') {
          navigate('/', { replace: true });
        }
      }, 100);
    }
  }, []); // Run only on mount

  // Ctrl+K keyboard shortcut for global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getActivePath = () => {
    if (location.pathname.startsWith('/patient')) return 'patients';
    if (location.pathname === '/consultation') return 'consultation';
    if (location.pathname === '/calendar') return 'calendar';
    if (location.pathname.startsWith('/booking/manage')) return 'solicitudes';
    if (location.pathname === '/settings') return 'settings';
    return 'dashboard';
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Skip link for accessibility */}
      <a 
        href="#main-content" 
        className="skip-link"
        onFocus={(e) => e.target.scrollIntoView()}
      >
        Saltar al contenido principal
      </a>
      
      {!servicesReady ? (
        <div className="flex items-center justify-center w-full h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-slate-400 font-medium">Cargando datos...</p>
          </div>
        </div>
      ) : (
        <>
          <Sidebar activePath={getActivePath()} pendingRequestsCount={pendingCount} />
          <main 
            id="main-content"
            className="flex-1 flex flex-col relative overflow-hidden" 
            role="main"
            aria-label="Contenido principal"
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/patients" element={<PatientsView />} />
              <Route path="/patient/:id" element={
                <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
                  <PatientDetailView />
                </React.Suspense>
              } />
              <Route path="/consultation" element={
                <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
                  <PatientConsultationView />
                </React.Suspense>
              } />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/booking/manage" element={<BookingManagementWrapper />} />
              <Route path="/settings" element={<SettingsView />} />
              <Route path="*" element={<Dashboard />} />
            </Routes>
            <BottomNav activePath={getActivePath()} onSearchOpen={() => setIsSearchOpen(true)} />
          </main>
          <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </>
      )}
    </div>
  );
};

// Auth guard — shows login when not authenticated
const AuthGuard: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-slate-400 font-medium">Iniciando DienteLink...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return <Layout />;
};

const App: React.FC = () => (
  <Router>
    <ErrorBoundary>
      <AuthProvider>
        <Toaster position="top-center" theme="light" />
        <Routes>
          {/* Public booking page - completely independent, no sidebar/nav */}
          <Route path="/p/:doctorId" element={<PublicBookingPage />} />
          {/* Main app with auth guard */}
          <Route path="/*" element={<AuthGuard />} />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  </Router>
);

export default App;
