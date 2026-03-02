import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppointmentRequest } from '../types';
import { bookingService } from '../services/bookingService';
import { persistenceService } from '../services/persistenceService';
import { sileo } from 'sileo';
import 'sileo/styles.css';
import { 
  Clock, 
  User, 
  Mail, 
  Phone, 
  MessageSquare,
  Check,
  X,
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  onRequestUpdate?: () => void;
}

const AppointmentRequestsManager: React.FC<Props> = ({ onRequestUpdate }) => {
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string>('');

  useEffect(() => {
    loadRequests();
    
    // Listen for new appointment requests
    const handleNewRequest = (event: CustomEvent) => {
      const newRequest = event.detail as AppointmentRequest;
      setRequests(prev => [newRequest, ...prev]);
      
      sileo.info({ title: `Nueva solicitud de cita de ${newRequest.patientName} 📅`, description: `${formatDate(newRequest.requestedDate)} a las ${formatTime(newRequest.requestedTime)}` });
      
      onRequestUpdate?.();
    };

    window.addEventListener('newAppointmentRequest', handleNewRequest as EventListener);
    
    return () => {
      window.removeEventListener('newAppointmentRequest', handleNewRequest as EventListener);
    };
  }, [onRequestUpdate]);

  const loadRequests = () => {
    try {
      const allRequests = bookingService.getAppointmentRequests();
      setRequests(allRequests);
    } catch (error) {
      sileo.error({ title: 'Error al cargar solicitudes', description: 'No se pudieron cargar las solicitudes de citas' });
    } finally {
      setLoading(false);
    }
  };

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
    const [hours, minutes] = timeStr.split(':');
    return new Date(0, 0, 0, parseInt(hours), parseInt(minutes))
      .toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
  };

  const handleApprove = async (request: AppointmentRequest) => {
    setProcessingId(request.id);
    
    try {
      // Approve the request
      const approvedRequest = await bookingService.approveRequest(request.id);
      if (!approvedRequest) {
        throw new Error('No se pudo aprobar la solicitud');
      }

      // Create actual appointment
      const appointment = {
        id: `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        patientId: '', // Will be created if needed
        patientName: request.patientName,
        phoneNumber: request.patientPhone,
        time: request.requestedTime,
        date: request.requestedDate,
        type: request.appointmentType,
        status: 'Programada' as const,
        reminderStatus: 'not_sent' as const,
        patientImage: undefined
      };

      // Save appointment
      await persistenceService.saveAppointment(appointment);

      // Update local state
      setRequests(prev => prev.map(r => 
        r.id === request.id ? approvedRequest : r
      ));

      sileo.success({ title: `¡Cita aprobada para ${request.patientName}! ✅`, description: 'Se ha añadido a tu agenda y se notificará al paciente' });

      onRequestUpdate?.();
    } catch (error) {
      sileo.error({ title: 'Error al aprobar la cita', description: 'Hubo un problema al processar la solicitud' });
    } finally {
      setProcessingId('');
    }
  };

  const handleReject = async (request: AppointmentRequest) => {
    setProcessingId(request.id);
    
    try {
      const rejectedRequest = await bookingService.rejectRequest(request.id);
      if (!rejectedRequest) {
        throw new Error('No se pudo rechazar la solicitud');
      }

      // Update local state
      setRequests(prev => prev.map(r => 
        r.id === request.id ? rejectedRequest : r
      ));

      sileo.warning({ title: `Solicitud de ${request.patientName} rechazada`, description: 'El horario queda disponible nuevamente' });

      onRequestUpdate?.();
    } catch (error) {
      sileo.error({ title: 'Error al rechazar la cita', description: 'Hubo un problema al processar la solicitud' });
    } finally {
      setProcessingId('');
    }
  };

  const getStatusColor = (status: AppointmentRequest['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusIcon = (status: AppointmentRequest['status']) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} />;
      case 'approved':
        return <CheckCircle2 size={16} />;
      case 'rejected':
        return <XCircle size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  const getStatusText = (status: AppointmentRequest['status']) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'approved':
        return 'Aprobada';
      case 'rejected':
        return 'Rechazada';
      default:
        return 'Desconocido';
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
            <h3 className="text-lg font-semibold text-slate-900">
              Solicitudes Pendientes ({pendingRequests.length})
            </h3>
          </div>
          
          <div className="space-y-4">
            <AnimatePresence>
              {pendingRequests.map(request => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {request.patientName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{request.patientName}</h4>
                          <div className="text-sm text-slate-500">{request.appointmentType}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <CalendarIcon size={16} />
                          {formatDate(request.requestedDate)}
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Clock size={16} />
                          {formatTime(request.requestedTime)}
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail size={16} />
                          {request.patientEmail}
                        </div>
                        {request.patientPhone && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Phone size={16} />
                            {request.patientPhone}
                          </div>
                        )}
                      </div>

                      {request.message && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-xl">
                          <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
                            <MessageSquare size={14} />
                            Mensaje
                          </div>
                          <p className="text-sm text-slate-700">{request.message}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleReject(request)}
                        disabled={processingId === request.id}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingId === request.id ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <X size={16} />
                        )}
                        Rechazar
                      </button>
                      
                      <button
                        onClick={() => handleApprove(request)}
                        disabled={processingId === request.id}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingId === request.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Check size={16} />
                        )}
                        Aprobar
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400">
                    Solicitud recibida: {new Date(request.createdAt).toLocaleString('es-ES')}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Historial de Solicitudes ({processedRequests.length})
          </h3>
          
          <div className="space-y-3">
            {processedRequests.slice(0, 10).map(request => (
              <div
                key={request.id}
                className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-slate-400 to-slate-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                    {request.patientName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{request.patientName}</div>
                    <div className="text-xs text-slate-500">
                      {formatDate(request.requestedDate)} - {formatTime(request.requestedTime)}
                    </div>
                  </div>
                </div>

                <div className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold',
                  getStatusColor(request.status)
                )}>
                  {getStatusIcon(request.status)}
                  {getStatusText(request.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {requests.length === 0 && (
        <div className="text-center py-12">
          <CalendarIcon size={48} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-2">No hay solicitudes de citas</h3>
          <p className="text-slate-500">Las solicitudes aparecerán aquí cuando los pacientes usen tu link público.</p>
        </div>
      )}
    </div>
  );
};

export default AppointmentRequestsManager;