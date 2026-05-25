import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Clock, AlertTriangle, FileText, CheckCircle, Activity, LayoutGrid, Save, Loader2, Pill, Plus, Trash2, User, Play
} from 'lucide-react';
import { usePatient, usePatientMutations } from '../hooks/usePatients';
import { useAppointments, useAppointmentMutations } from '../hooks/useAppointments';
import { PatientRecord, EvolutionNote, ClinicalEvent, Prescription } from '../types';
import { sileo } from 'sileo';
import { cn, getInitials } from '../lib/utils';
import { useAuth } from '../services/authService';
import PatientRecordComponent from './PatientRecord';

const PatientConsultationView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');
  const appointmentId = searchParams.get('appointmentId');
  
  const { patient: fullPatient, isLoading: isLoadingPatient } = usePatient(patientId || undefined);
  const { data: allAppointments = [] } = useAppointments();
  const { savePatient } = usePatientMutations();
  const { updateAppointment } = useAppointmentMutations();

  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [appointment, setAppointment] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    motivo: '',
    procedimiento: '',
    diagnostico: '',
    notas: ''
  });

  const [showPrescription, setShowPrescription] = useState(false);
  const [medications, setMedications] = useState<any[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [timer, setTimer] = useState(0);
  
  const [viewMode, setViewMode] = useState<'form' | 'expediente'>('form');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (fullPatient) {
      setPatient(fullPatient);
    }
    if (appointmentId) {
      const a = allAppointments.find(x => x.id === appointmentId);
      if (a) {
        setAppointment(a);
        if (!formData.motivo) {
          setFormData(prev => ({ ...prev, motivo: a.type }));
        }
      }
    }
  }, [fullPatient, appointmentId, allAppointments]);

  // Tecla ESC para navegación fluida
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showConfirm) setShowConfirm(false);
        else if (viewMode === 'expediente') setViewMode('form');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showConfirm, viewMode]);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const addMedication = () => {
    setMedications(prev => [...prev, { id: crypto.randomUUID(), name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  };

  const removeMedication = (id: string) => {
    setMedications(prev => prev.filter(m => m.id !== id));
  };

  const getLastTreatment = (patient: PatientRecord) => {
    if (!patient.history || patient.history.length === 0) return 'Ninguno';
    const last = patient.history[0];
    return `${last.description} (${last.date})`;
  };

  const handleFinish = async (isDraft: boolean = false) => {
    if (!patient) return;
    if (!formData.procedimiento.trim() && !formData.notas.trim() && !formData.diagnostico.trim()) {
      sileo.warning({ title: 'Consulta vacía', description: 'Por favor agrega algún procedimiento o nota para guardar la sesión.' });
      return;
    }

    setIsSaving(true);
    
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const newPatient = { ...patient };
      let hasChanges = false;

      // 1. Crear Nota de Evolución
      if (formData.notas.trim() || formData.procedimiento.trim() || formData.diagnostico.trim()) {
        const newNote: EvolutionNote = {
          id: crypto.randomUUID(),
          date: dateStr,
          procedure: formData.procedimiento.trim() || 'Consulta General',
          content: `${formData.motivo ? `**Motivo:** ${formData.motivo}\n` : ''}${formData.diagnostico ? `**Diagnóstico:** ${formData.diagnostico}\n` : ''}${formData.notas ? `\n**Notas:**\n${formData.notas.trim()}` : ''}`
        };
        newPatient.evolutionNotes = [newNote, ...(newPatient.evolutionNotes || [])];
        hasChanges = true;
      }

      // 2. Crear Historial Clínico
      if (formData.procedimiento.trim()) {
        const newEvent: ClinicalEvent = {
          id: crypto.randomUUID(),
          date: dateStr,
          type: 'treatment',
          description: formData.procedimiento.trim()
        };
        newPatient.history = [newEvent, ...(newPatient.history || [])];
        hasChanges = true;
      }

      // 3. Crear Receta
      if (showPrescription && medications.some(m => m.name.trim())) {
        const validMeds = medications.filter(m => m.name.trim());
        const newPrescription: Prescription = {
          id: crypto.randomUUID(),
          date: dateStr,
          diagnosis: formData.diagnostico || 'Atención General',
          medications: validMeds,
          notes: ''
        };
        newPatient.prescriptions = [newPrescription, ...(newPatient.prescriptions || [])];
        hasChanges = true;
      }

      if (hasChanges) {
        await savePatient.mutateAsync(newPatient);
      }

      if (appointment && !isDraft) {
        await updateAppointment.mutateAsync({ ...appointment, status: 'Completada' });
      }

      sileo.success({ title: isDraft ? 'Borrador Guardado' : 'Consulta Finalizada', description: isDraft ? 'Se ha guardado en el expediente para continuar después.' : 'El expediente ha sido actualizado automáticamente.' });
      navigate('/');
    } catch (error) {
      console.error(error);
      sileo.error({ title: 'Error', description: 'Hubo un problema guardando la consulta.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!patientId || isLoadingPatient) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-slate-50">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!patient) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0 relative z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')} 
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Consulta Activa
            </h1>
            <p className="text-xs font-bold text-slate-600">DienteLink Co-Pilot</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            <Clock size={14} className="text-slate-500" />
            <span className="text-sm font-mono font-bold text-slate-700">{formatTime(timer)}</span>
          </div>
          
          <button 
            onClick={() => handleFinish(true)} 
            disabled={isSaving}
            className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95"
          >
            <Save size={16} />
            <span className="hidden sm:inline">Guardar Borrador</span>
          </button>

          <button 
            onClick={() => setShowConfirm(true)} 
            disabled={isSaving}
            className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            <span className="hidden sm:inline">Finalizar Consulta</span>
          </button>
        </div>
      </header>

      {viewMode === 'expediente' ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          <div className="bg-white px-6 py-3 border-b border-slate-200 flex items-center shadow-sm z-10 w-full shrink-0">
            <button 
              onClick={() => {
                setSearchParams({ patientId: patientId || '', appointmentId: appointmentId || '' });
                setViewMode('form');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 font-bold text-sm rounded-xl hover:bg-blue-100 transition-colors"
            >
              <ArrowLeft size={16} /> Volver a Consulta Activa
            </button>
            <span className="ml-4 text-sm font-semibold text-slate-500 flex items-center gap-2 divide-x divide-slate-300">
              <span className="pr-2 text-slate-800">Expediente de {patient.identification.fullName}</span>
              <span className="pl-2 uppercase tracking-widest text-[10px]">{searchParams.get('tab') || ''}</span>
            </span>
          </div>
          <div className="flex-1 overflow-auto relative">
            <div className="absolute inset-0 p-4 sm:p-6 lg:p-8">
              <PatientRecordComponent patient={patient} onUpdate={(p) => setPatient(p)} />
            </div>
          </div>
        </div>
      ) : (
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Column: Context Area */}
        <aside className="w-[320px] bg-white border-r border-slate-200 flex flex-col overflow-y-auto hide-scrollbar">
          <div className="p-6 space-y-6">
            
            {/* Patient Identity */}
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-2xl mb-4 shadow-sm">
                {getInitials(patient.identification.fullName)}
              </div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">{patient.identification.fullName}</h2>
              <p className="text-sm font-medium text-slate-500 mt-1">
                {new Date().getFullYear() - new Date(patient.identification.birthDate).getFullYear()} años
              </p>
            </div>

            <hr className="border-slate-100" />

            {/* Critical Info */}
            <div className="space-y-4">
              {patient.clinicalHistory.allergies.length > 0 && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl">
                  <div className="flex items-center gap-2 text-red-700 font-bold text-xs uppercase tracking-wider mb-2">
                    <AlertTriangle size={14} /> Alergias
                  </div>
                  <p className="text-sm font-semibold text-red-900">{patient.clinicalHistory.allergies.join(', ')}</p>
                </div>
              )}
              
              <div className="bg-blue-50/50 border border-blue-100/50 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider">
                  <Activity size={14} /> Último Trat.
                </div>
                <p className="text-sm font-medium text-blue-900 leading-snug">
                  {getLastTreatment(patient)}
                </p>
              </div>
            </div>

            {/* Quick Nav (Inline toggle) */}
            <div className="pt-4 space-y-3">
              <button 
                onClick={() => {
                  setSearchParams({ patientId: patientId || '', appointmentId: appointmentId || '', tab: 'odontogram' });
                  setViewMode('expediente');
                }}
                className="w-full h-14 flex items-center justify-center gap-3 bg-white border-2 border-slate-100 text-slate-700 text-sm font-bold rounded-[20px] hover:bg-slate-50 hover:border-blue-200 transition-all active:scale-95 shadow-sm"
              >
                <LayoutGrid size={18} className="text-blue-500" /> Ver Odontograma
              </button>
              <button 
                onClick={() => {
                  setSearchParams({ patientId: patientId || '', appointmentId: appointmentId || '', tab: 'id' });
                  setViewMode('expediente');
                }}
                className="w-full h-14 flex items-center justify-center gap-3 bg-white border-2 border-slate-100 text-slate-700 text-sm font-bold rounded-[20px] hover:bg-slate-50 hover:border-indigo-200 transition-all active:scale-95 shadow-sm"
              >
                <User size={18} className="text-indigo-500" /> Expediente Completo
              </button>
            </div>

          </div>
        </aside>

        {/* Right Column: Active Form */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-6 sm:p-10 hide-scrollbar">
          <div className="max-w-3xl mx-auto space-y-8">
            
            <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-8">
              
              {/* Motivo */}
              <div className="space-y-3">
                <label className="text-[13px] font-bold uppercase tracking-widest text-slate-600">Motivo de Consulta</label>
                <input 
                  type="text"
                  placeholder="Ej. Evaluación de caries, Dolor de muela..."
                  value={formData.motivo}
                  onChange={e => setFormData(p => ({ ...p, motivo: e.target.value }))}
                  className="w-full px-5 py-5 text-base sm:text-lg bg-slate-50 rounded-[20px] outline-none text-slate-900 font-semibold focus:ring-2 focus:ring-blue-100 focus:bg-white border border-transparent focus:border-blue-200 transition-all"
                />
              </div>

              {/* Diagnóstico */}
              <div className="space-y-3">
                <label className="text-[13px] font-bold uppercase tracking-widest text-slate-600">Diagnóstico (Opcional)</label>
                <input 
                  type="text"
                  placeholder="Ej. Pulpitis irreversible en pieza 46"
                  value={formData.diagnostico}
                  onChange={e => setFormData(p => ({ ...p, diagnostico: e.target.value }))}
                  className="w-full px-5 py-5 text-base sm:text-lg bg-slate-50 rounded-[20px] outline-none text-slate-900 font-semibold focus:ring-2 focus:ring-blue-100 focus:bg-white border border-transparent focus:border-blue-200 transition-all"
                />
              </div>

              {/* Procedimiento Realizado */}
              <div className="space-y-3">
                <label className="flex items-center justify-between text-[13px] font-bold uppercase tracking-widest text-slate-600">
                  <span>Procedimiento Realizado <span className="text-red-400">*</span></span>
                  <span className="text-[11px] text-slate-400 capitalize normal-case font-medium">Se añadirá al historial de tratamientos</span>
                </label>
                <input 
                  type="text"
                  placeholder="Ej. Limpieza ultrasónica, Extracción, Resina"
                  value={formData.procedimiento}
                  onChange={e => setFormData(p => ({ ...p, procedimiento: e.target.value }))}
                  className="w-full px-5 py-5 text-base sm:text-lg bg-blue-50/30 rounded-[20px] outline-none text-blue-900 font-semibold focus:ring-2 focus:ring-blue-100 focus:bg-white border border-blue-100 transition-all placeholder:text-blue-300"
                />
              </div>

              {/* Notas de Evolución */}
              <div className="space-y-3">
                <label className="flex items-center justify-between text-[13px] font-bold uppercase tracking-widest text-slate-600">
                  <span>Notas de Evolución</span>
                  <span className="text-[11px] text-slate-400 capitalize normal-case font-medium">Observaciones generales de la atención</span>
                </label>
                <textarea 
                  rows={4}
                  placeholder="Describe la evolución, anestesia aplicada, complicaciones o indicaciones..."
                  value={formData.notas}
                  onChange={e => setFormData(p => ({ ...p, notas: e.target.value }))}
                  className="w-full px-5 py-5 text-base sm:text-lg bg-slate-50 rounded-[20px] outline-none text-slate-900 font-medium focus:ring-2 focus:ring-blue-100 focus:bg-white border border-transparent focus:border-blue-200 transition-all resize-none"
                />
              </div>

            </div>

            {/* Prescriptions Section */}
            <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                    <Pill size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 leading-tight">Receta Médica</h2>
                    <p className="text-xs font-semibold text-slate-500">Opcional. Se guardará en el expediente.</p>
                  </div>
                </div>
                {!showPrescription ? (
                  <button 
                    onClick={() => { setShowPrescription(true); if(medications.length===0) addMedication(); }} 
                    className="px-4 py-2 bg-slate-50 hover:bg-violet-50 hover:text-violet-700 text-slate-600 font-bold text-xs rounded-lg transition-colors border border-slate-200 hover:border-violet-200"
                  >
                    + Agregar Medicamentos
                  </button>
                ) : (
                  <button 
                    onClick={() => { setShowPrescription(false); setMedications([]); }} 
                    className="px-4 py-2 bg-slate-50 hover:bg-red-50 hover:text-red-600 text-slate-600 font-bold text-xs rounded-lg transition-colors border border-slate-200 hover:border-red-200"
                  >
                    Quitar Receta
                  </button>
                )}
              </div>

              {showPrescription && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  {medications.map((med, index) => (
                    <div key={med.id} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl relative group">
                      <button 
                        onClick={() => removeMedication(med.id)} 
                        className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-red-400 border border-slate-200 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Medicamento</label>
                          <input 
                            type="text" value={med.name} placeholder="Ej. Amoxicilina 500mg"
                            onChange={e => { const m = [...medications]; m[index].name = e.target.value; setMedications(m); }}
                            className="w-full px-4 py-2.5 bg-white rounded-xl outline-none text-sm font-semibold border border-slate-200 focus:border-violet-400"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Dosis / Frecuencia</label>
                          <input 
                            type="text" value={med.frequency} placeholder="Ej. 1 tableta cada 8 horas"
                            onChange={e => { const m = [...medications]; m[index].frequency = e.target.value; setMedications(m); }}
                            className="w-full px-4 py-2.5 bg-white rounded-xl outline-none text-sm font-semibold border border-slate-200 focus:border-violet-400"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Duración</label>
                          <input 
                            type="text" value={med.duration} placeholder="Ej. Por 7 días"
                            onChange={e => { const m = [...medications]; m[index].duration = e.target.value; setMedications(m); }}
                            className="w-full px-4 py-2.5 bg-white rounded-xl outline-none text-sm font-semibold border border-slate-200 focus:border-violet-400"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Indicaciones Adicionales</label>
                          <input 
                            type="text" value={med.instructions} placeholder="Opcional"
                            onChange={e => { const m = [...medications]; m[index].instructions = e.target.value; setMedications(m); }}
                            className="w-full px-4 py-2.5 bg-white rounded-xl outline-none text-sm font-semibold border border-slate-200 focus:border-violet-400"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button 
                    onClick={addMedication} 
                    className="w-full py-4 bg-white border-2 border-dashed border-slate-200 hover:border-violet-300 rounded-2xl text-violet-600 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus size={16} /> Añadir otro medicamento
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Footer Action Area */}
            <div className="pt-4 pb-12 flex items-center justify-end">
              <button 
                onClick={() => setShowConfirm(true)} 
                disabled={isSaving}
                className="px-8 py-5 bg-slate-900 hover:bg-slate-800 text-white text-lg font-bold rounded-[20px] shadow-xl shadow-slate-900/20 flex items-center gap-3 transition-all active:scale-95"
              >
                {isSaving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                {isSaving ? 'Guardando Expediente...' : 'Finalizar y Guardar Consulta'}
              </button>
            </div>

          </div>
        </main>

      </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-md"
            >
              <div className="p-8">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={32} className="text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 text-center mb-2">¿Finalizar Consulta?</h3>
                <p className="text-slate-500 text-center text-sm leading-relaxed mb-8">
                  Se generarán las notas clínicas, se agregará al historial del paciente y la cita se marcará como completada. 
                  Asegúrate de haber ingresado toda la información necesaria.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowConfirm(false)}
                    disabled={isSaving}
                    className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Volver a Editar
                  </button>
                  <button 
                    onClick={() => {
                        setShowConfirm(false);
                        handleFinish();
                    }}
                    disabled={isSaving}
                    className="flex-1 py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PatientConsultationView;