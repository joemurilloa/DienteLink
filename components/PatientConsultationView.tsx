import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Users, 
  Calendar, 
  AlertTriangle, 
  Activity, 
  FileText, 
  LayoutGrid, 
  Clock, 
  CheckCircle,
  ArrowLeft,
  Plus,
  Eye,
  Stethoscope
} from 'lucide-react';
import { persistenceService } from '../services/persistenceService';
import { PatientRecord } from '../types';
import { cn } from '../lib/utils';

const PatientConsultationView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patientId');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(
    initialPatientId ? persistenceService.getPatientById(initialPatientId) : null
  );
  const [allPatients] = useState(persistenceService.getPatients());
  const [consultationStarted, setConsultationStarted] = useState(!!initialPatientId);

  // Filtrar pacientes basado en búsqueda
  const filteredPatients = allPatients.filter(patient => 
    patient.identification.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Obtener último tratamiento
  const getLastTreatment = (patient: PatientRecord) => {
    if (patient.history.length === 0) return 'Sin tratamientos previos';
    const last = patient.history[0];
    return `${last.description} (${last.date})`;
  };

  // Iniciar consulta
  const startConsultation = (patient: PatientRecord) => {
    setSelectedPatient(patient);
    setConsultationStarted(true);
    setSearchTerm('');
  };

  // Finalizar consulta
  const endConsultation = () => {
    setSelectedPatient(null);
    setConsultationStarted(false);
    setSearchTerm('');
  };

  if (!consultationStarted || !selectedPatient) {
    return (
      <div className="flex-1 h-full overflow-y-auto p-5 lg:p-8 pb-32 page-transition">
        {/* Header */}
        <header className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate('/')} 
            className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 border border-slate-200 hover:text-blue-600 transition-all active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Recepción de Paciente</h2>
            <p className="text-slate-500 text-sm mt-1">Busque al paciente para iniciar la consulta</p>
          </div>
        </header>

        {/* Búsqueda */}
        <div className="max-w-2xl mx-auto">
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre del paciente o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-lg bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
              autoFocus
            />
          </div>

          {/* Resultados de búsqueda */}
          <AnimatePresence>
            {searchTerm && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {filteredPatients.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl">
                    <Users className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-500 font-medium">No se encontraron pacientes</p>
                    <p className="text-slate-400 text-sm mt-1">Verifique el nombre o ID del paciente</p>
                  </div>
                ) : (
                  filteredPatients.map(patient => (
                    <motion.div
                      key={patient.id}
                      layout
                      className="bg-white rounded-2xl border border-slate-100 p-6 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group"
                      onClick={() => startConsultation(patient)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                            {patient.identification.fullName}
                          </h3>
                          <p className="text-slate-500 text-sm">ID: {patient.id.slice(0, 8)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 mb-1">Último tratamiento</p>
                          <p className="text-sm font-medium text-slate-600">{getLastTreatment(patient)}</p>
                        </div>
                      </div>
                      
                      {/* Alergias importantes */}
                      {patient.clinicalHistory.allergies.length > 0 && (
                        <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-100">
                          <AlertTriangle size={16} className="text-red-500" />
                          <span className="text-red-700 text-sm font-medium">
                            Alergias: {patient.clinicalHistory.allergies.join(', ')}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Estado inicial */}
          {!searchTerm && (
            <div className="text-center py-16 bg-gradient-to-br from-blue-50 to-blue-50 rounded-2xl border border-blue-100">
              <Stethoscope className="mx-auto text-blue-300 mb-6" size={64} />
              <h3 className="text-xl font-bold text-slate-800 mb-2">Listo para recibir pacientes</h3>
              <p className="text-slate-600 max-w-md mx-auto">
                Utilice el buscador para encontrar al paciente y acceder rápidamente a su expediente completo.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vista de consulta activa
  return (
    <div className="flex-1 h-full overflow-y-auto p-5 lg:p-8 pb-32 page-transition">
      {/* Header de consulta */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={endConsultation}
            className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 border border-slate-200 hover:text-red-600 hover:border-red-200 transition-all active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-900">{selectedPatient.identification.fullName}</h2>
            <p className="text-slate-500 text-sm">En consulta • ID: {selectedPatient.id.slice(0, 8)}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            En consulta
          </div>
          <button
            onClick={endConsultation}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-semibold text-sm hover:bg-red-100 transition-all border border-red-100"
          >
            Finalizar Consulta
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información del Paciente */}
        <div className="lg:col-span-1 space-y-4">
          {/* Datos básicos */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Eye size={18} className="text-slate-500" />
              Información Básica
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-slate-500 block">Edad:</span>
                <span className="font-medium">{new Date().getFullYear() - new Date(selectedPatient.identification.birthDate).getFullYear()} años</span>
              </div>
              <div>
                <span className="text-slate-500 block">Teléfono:</span>
                <span className="font-medium">{selectedPatient.identification.phone}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Email:</span>
                <span className="font-medium text-xs">{selectedPatient.identification.email}</span>
              </div>
            </div>
          </div>

          {/* Alergias y medicamentos */}
          {(selectedPatient.clinicalHistory.allergies.length > 0 || selectedPatient.clinicalHistory.medications) && (
            <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
              <h3 className="font-bold text-red-700 mb-4 flex items-center gap-2">
                <AlertTriangle size={18} />
                Información Crítica
              </h3>
              {selectedPatient.clinicalHistory.allergies.length > 0 && (
                <div className="mb-3">
                  <span className="text-red-600 text-xs font-semibold block mb-1">ALERGIAS:</span>
                  <span className="text-red-700 font-medium">{selectedPatient.clinicalHistory.allergies.join(', ')}</span>
                </div>
              )}
              {selectedPatient.clinicalHistory.medications && (
                <div>
                  <span className="text-red-600 text-xs font-semibold block mb-1">MEDICAMENTOS:</span>
                  <span className="text-red-700 font-medium">{selectedPatient.clinicalHistory.medications}</span>
                </div>
              )}
            </div>
          )}

          {/* Último tratamiento */}
          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-6">
            <h3 className="font-bold text-blue-700 mb-4 flex items-center gap-2">
              <Clock size={18} />
              Último Tratamiento
            </h3>
            <p className="text-blue-800 font-medium">{getLastTreatment(selectedPatient)}</p>
          </div>
        </div>

        {/* Acciones Clínicas */}
        <div className="lg:col-span-2">
          <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Activity size={20} />
            Herramientas de Consulta
          </h3>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Odontograma */}
            <button
              onClick={() => navigate(`/patient/${selectedPatient.id}?tab=odontogram`)}
              className="bg-white rounded-2xl border border-slate-100 p-6 hover:border-blue-200 hover:bg-blue-50/50 transition-all group text-center"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mx-auto mb-3 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <LayoutGrid size={24} />
              </div>
              <h4 className="font-semibold text-slate-700 mb-1">Odontograma</h4>
              <p className="text-xs text-slate-500">Diagnóstico dental</p>
            </button>

            {/* Evolución */}
            <button
              onClick={() => navigate(`/patient/${selectedPatient.id}?tab=notes`)}
              className="bg-white rounded-2xl border border-slate-100 p-6 hover:border-blue-200 hover:bg-blue-50/50 transition-all group text-center"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mx-auto mb-3 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <FileText size={24} />
              </div>
              <h4 className="font-semibold text-slate-700 mb-1">Evolución</h4>
              <p className="text-xs text-slate-500">Notas de seguimiento</p>
            </button>

            {/* Historial */}
            <button
              onClick={() => navigate(`/patient/${selectedPatient.id}?tab=history`)}
              className="bg-white rounded-2xl border border-slate-100 p-6 hover:border-blue-200 hover:bg-blue-50/50 transition-all group text-center"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mx-auto mb-3 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Activity size={24} />
              </div>
              <h4 className="font-semibold text-slate-700 mb-1">Historial</h4>
              <p className="text-xs text-slate-500">Tratamientos</p>
            </button>

            {/* Agendar Cita */}
            <button
              onClick={() => navigate(`/calendar?patient=${encodeURIComponent(selectedPatient.identification.fullName)}&id=${selectedPatient.id}`)}
              className="bg-white rounded-2xl border border-slate-100 p-6 hover:border-purple-200 hover:bg-purple-50/50 transition-all group text-center"
            >
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mx-auto mb-3 group-hover:bg-purple-600 group-hover:text-white transition-all">
                <Calendar size={24} />
              </div>
              <h4 className="font-semibold text-slate-700 mb-1">Agendar</h4>
              <p className="text-xs text-slate-500">Próxima cita</p>
            </button>

            {/* Ver Expediente Completo */}
            <button
              onClick={() => navigate(`/patient/${selectedPatient.id}`)}
              className="bg-white rounded-2xl border border-slate-100 p-6 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group text-center col-span-2 lg:col-span-1"
            >
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mx-auto mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <FileText size={24} />
              </div>
              <h4 className="font-semibold text-slate-700 mb-1">Expediente</h4>
              <p className="text-xs text-slate-500">Vista completa</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientConsultationView;