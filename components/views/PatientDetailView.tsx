import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePatient, usePatientMutations } from '../../hooks/usePatients';
import { PatientRecord as PatientRecordType } from '../../types';
import { ArrowLeft } from 'lucide-react';

const PatientRecord = React.lazy(() => import('../PatientRecord'));

const PatientDetailView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { patient, isLoading } = usePatient(id);
  const { savePatient } = usePatientMutations();
  const [displayPatient, setDisplayPatient] = useState<PatientRecordType | undefined>(patient);

  useEffect(() => {
    if (patient) setDisplayPatient(patient);
  }, [patient]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

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
    setDisplayPatient(updated);
    await savePatient.mutateAsync(updated);
  };

  const currentPatient = displayPatient || patient;

  return (
    <div className="flex-1 h-full overflow-y-auto flex flex-col p-4 md:p-5 lg:p-8 pb-24 md:pb-12 page-transition main-scroll">
      <React.Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }>
        <header className="flex items-center justify-between gap-3 mb-4 md:mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/patients'))}
              className="w-10 h-10 min-w-[40px] bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-500 border border-slate-200 hover:text-blue-600 transition-all cursor-pointer"
              title="Volver"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h2 className="text-lg md:text-2xl font-bold text-slate-900 tracking-tight truncate">{currentPatient.identification.fullName}</h2>
              <p className="text-slate-500 font-medium text-xs sm:text-sm mt-0.5">{currentPatient.identification.phone || 'Expediente clínico'}</p>
            </div>
          </div>
        </header>
        <div className="flex-1 md:min-h-[680px]">
          <PatientRecord patient={currentPatient} onUpdate={handleUpdate} />
        </div>
      </React.Suspense>
    </div>
  );
};

export default PatientDetailView;
