import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { persistenceService } from '../../services/persistenceService';
import { PatientRecord as PatientRecordType } from '../../types';
import { History } from 'lucide-react';

const PatientRecord = React.lazy(() => import('../PatientRecord'));

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

export default PatientDetailView;
