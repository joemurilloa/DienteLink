import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DoctorAvailability, DayAvailability, TimeSlot, PublicBookingSettings } from '../types';
import { bookingService } from '../services/bookingService';
import { sileo } from 'sileo';
import 'sileo/styles.css';
import { 
  Clock, 
  Calendar, 
  Settings, 
  Copy, 
  Eye, 
  Plus, 
  Trash2, 
  Save, 
  Share2,
  Globe,
  CheckCircle,
  Edit3,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  onClose?: () => void;
}

const daysOfWeek = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' }
];

const BookingConfiguration: React.FC<Props> = ({ onClose }) => {
  const [availability, setAvailability] = useState<DoctorAvailability>(() => bookingService.getDoctorAvailability());
  const [settings, setSettings] = useState<PublicBookingSettings>(() => bookingService.getBookingSettings());
  const [activeTab, setActiveTab] = useState<'schedule' | 'settings' | 'preview'>('schedule');
  const [publicUrl, setPublicUrl] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setPublicUrl(bookingService.generatePublicBookingUrl());
  }, []);

  const handleDayToggle = (dayOfWeek: number) => {
    const updatedSchedule = availability.weeklySchedule.map(day =>
      day.dayOfWeek === dayOfWeek 
        ? { ...day, enabled: !day.enabled }
        : day
    );
    
    setAvailability({ ...availability, weeklySchedule: updatedSchedule });
    setHasChanges(true);
  };

  const addTimeSlot = (dayOfWeek: number) => {
    const updatedSchedule = availability.weeklySchedule.map(day =>
      day.dayOfWeek === dayOfWeek
        ? {
            ...day,
            timeSlots: [...day.timeSlots, { start: '09:00', end: '10:00' }]
          }
        : day
    );
    
    setAvailability({ ...availability, weeklySchedule: updatedSchedule });
    setHasChanges(true);
  };

  const updateTimeSlot = (dayOfWeek: number, slotIndex: number, field: 'start' | 'end', value: string) => {
    const updatedSchedule = availability.weeklySchedule.map(day =>
      day.dayOfWeek === dayOfWeek
        ? {
            ...day,
            timeSlots: day.timeSlots.map((slot, index) =>
              index === slotIndex ? { ...slot, [field]: value } : slot
            )
          }
        : day
    );
    
    setAvailability({ ...availability, weeklySchedule: updatedSchedule });
    setHasChanges(true);
  };

  const removeTimeSlot = (dayOfWeek: number, slotIndex: number) => {
    const updatedSchedule = availability.weeklySchedule.map(day =>
      day.dayOfWeek === dayOfWeek
        ? {
            ...day,
            timeSlots: day.timeSlots.filter((_, index) => index !== slotIndex)
          }
        : day
    );
    
    setAvailability({ ...availability, weeklySchedule: updatedSchedule });
    setHasChanges(true);
  };

  const handleSave = async () => {
    await bookingService.saveDoctorAvailability(availability);
    await bookingService.saveBookingSettings(settings);
    setHasChanges(false);
    
    sileo.success({ title: '¡Configuración guardada exitosamente! ⚙️', description: 'Tu agenda pública ya está actualizada' });
  };

  const copyPublicUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    sileo.success({ title: '¡Link copiado al portapapeles! 📋', description: 'Compártelo en tus redes sociales' });
  };

  const openPreview = () => {
    window.open(publicUrl, '_blank');
    sileo.info({ title: 'Abriendo vista previa...', description: 'Así verán tus pacientes la página de reservas' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-300 flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Configurar Agenda Pública</h2>
            <p className="text-slate-600 mt-1">Sistema de reservas tipo Calendly para tus pacientes</p>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <motion.button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Save size={20} />
                Guardar
              </motion.button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-300">
          {[
            { key: 'schedule', label: 'Horarios', icon: Calendar },
            { key: 'settings', label: 'Configuración', icon: Settings },
            { key: 'preview', label: 'Compartir', icon: Share2 }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'schedule' | 'settings' | 'preview')}
              className={cn(
                'flex items-center gap-2 px-6 py-4 font-semibold transition-colors',
                activeTab === tab.key
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              )}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              {/* Global Settings */}
              <div className="bg-slate-50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Configuración General</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Duración por cita</label>
                    <select
                      value={availability.slotDuration}
                      onChange={(e) => {
                        setAvailability({ ...availability, slotDuration: Number(e.target.value) });
                        setHasChanges(true);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={15}>15 minutos</option>
                      <option value={30}>30 minutos</option>
                      <option value={45}>45 minutos</option>
                      <option value={60}>1 hora</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tiempo entre citas</label>
                    <select
                      value={availability.bufferTime}
                      onChange={(e) => {
                        setAvailability({ ...availability, bufferTime: Number(e.target.value) });
                        setHasChanges(true);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={0}>Sin pausa</option>
                      <option value={15}>15 minutos</option>
                      <option value={30}>30 minutos</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Días de anticipación</label>
                    <select
                      value={availability.advanceBookingDays}
                      onChange={(e) => {
                        setAvailability({ ...availability, advanceBookingDays: Number(e.target.value) });
                        setHasChanges(true);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={7}>1 semana</option>
                      <option value={14}>2 semanas</option>
                      <option value={30}>1 mes</option>
                      <option value={60}>2 meses</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Weekly Schedule */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Horarios Semanales</h3>
                {daysOfWeek.map(day => {
                  const dayConfig = availability.weeklySchedule.find(d => d.dayOfWeek === day.value);
                  if (!dayConfig) return null;

                  return (
                    <div key={day.value} className="bg-white border border-slate-300 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleDayToggle(day.value)}
                            className={cn(
                              'w-6 h-6 rounded-md border-2 transition-all',
                              dayConfig.enabled 
                                ? 'bg-blue-600 border-blue-600' 
                                : 'border-slate-300 hover:border-slate-400'
                            )}
                          >
                            {dayConfig.enabled && (
                              <CheckCircle size={16} className="text-white m-auto" />
                            )}
                          </button>
                          <span className="text-lg font-semibold text-slate-900">{day.label}</span>
                        </div>
                        {dayConfig.enabled && (
                          <button
                            onClick={() => addTimeSlot(day.value)}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                          >
                            <Plus size={16} />
                            Agregar horario
                          </button>
                        )}
                      </div>

                      {dayConfig.enabled && (
                        <div className="space-y-3">
                          {dayConfig.timeSlots.map((slot, index) => (
                            <div key={index} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                              <input
                                type="time"
                                value={slot.start}
                                onChange={(e) => updateTimeSlot(day.value, index, 'start', e.target.value)}
                                className="px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-slate-500">hasta</span>
                              <input
                                type="time"
                                value={slot.end}
                                onChange={(e) => updateTimeSlot(day.value, index, 'end', e.target.value)}
                                className="px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <button
                                onClick={() => removeTimeSlot(day.value, index)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Información básica</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Nombre del doctor</label>
                    <input
                      type="text"
                      value={settings.doctorName}
                      onChange={(e) => {
                        setSettings({ ...settings, doctorName: e.target.value });
                        setHasChanges(true);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Nombre de la clínica</label>
                    <input
                      type="text"
                      value={settings.clinicName}
                      onChange={(e) => {
                        setSettings({ ...settings, clinicName: e.target.value });
                        setHasChanges(true);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Descripción</label>
                    <textarea
                      value={settings.description}
                      onChange={(e) => {
                        setSettings({ ...settings, description: e.target.value });
                        setHasChanges(true);
                      }}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Opciones de reserva</h3>
                  
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.requirePhone}
                        onChange={(e) => {
                          setSettings({ ...settings, requirePhone: e.target.checked });
                          setHasChanges(true);
                        }}
                        className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Requerir teléfono</span>
                    </label>

                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.requireMessage}
                        onChange={(e) => {
                          setSettings({ ...settings, requireMessage: e.target.checked });
                          setHasChanges(true);
                        }}
                        className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Requerir mensaje</span>
                    </label>

                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.isActive}
                        onChange={(e) => {
                          setSettings({ ...settings, isActive: e.target.checked });
                          setHasChanges(true);
                        }}
                        className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Agenda activa</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Mensaje de confirmación</label>
                    <textarea
                      value={settings.confirmationMessage}
                      onChange={(e) => {
                        setSettings({ ...settings, confirmationMessage: e.target.value });
                        setHasChanges(true);
                      }}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-50 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Globe className="text-blue-600" size={24} />
                  <h3 className="text-lg font-semibold text-slate-900">Tu Link Público de Reservas</h3>
                </div>
                
                <div className="bg-white rounded-xl p-4 border border-slate-300">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-600">URL pública</span>
                    <div className="flex gap-2">
                      <button
                        onClick={copyPublicUrl}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Copy size={16} />
                        Copiar
                      </button>
                      <button
                        onClick={openPreview}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Eye size={16} />
                        Vista Previa
                      </button>
                    </div>
                  </div>
                  <code className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg block break-all">
                    {publicUrl}
                  </code>
                </div>

                <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <h4 className="font-semibold text-amber-800 mb-2">💡 Cómo usarlo</h4>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• Comparte este link en tus redes sociales</li>
                    <li>• Tus pacientes pueden agendar sin necesidad de registro</li>
                    <li>• Recibirás notificaciones cuando lleguen solicitudes</li>
                    <li>• Puedes aprobar o rechazar cada cita desde la app</li>
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={() => {
                    const whatsappMessage = `¡Agenda tu cita conmigo de forma fácil y rápida! 📅✨\n\n${publicUrl}`;
                    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
                    window.open(whatsappUrl, '_blank');
                    sileo.success({ title: '¡Compartiendo en WhatsApp! 💚', description: 'Tu link de reservas está listo para compartir' });
                  }}
                  className="flex items-center gap-3 p-4 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors"
                >
                  <Share2 size={20} />
                  <span className="font-semibold">Compartir en WhatsApp</span>
                </button>

                <button
                  onClick={copyPublicUrl}
                  className="flex items-center gap-3 p-4 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                >
                  <Copy size={20} />
                  <span className="font-semibold">Copiar Link</span>
                </button>

                <button
                  onClick={openPreview}
                  className="flex items-center gap-3 p-4 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors"
                >
                  <Eye size={20} />
                  <span className="font-semibold">Ver como Paciente</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default BookingConfiguration;