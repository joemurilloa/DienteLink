import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePatient, usePatientMutations } from '../../hooks/usePatients';
import { PatientRecord as PatientRecordType } from '../../types';
import { ArrowLeft } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

const PatientRecord = React.lazy(() => import('../PatientRecord'));

/** Universal 1–32 → FDI (mismo orden que el odontograma). */
const FDI = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 38, 37, 36, 35, 34, 33, 32, 31, 41, 42, 43, 44, 45, 46, 47, 48];
const fdiOf = (id: number) => FDI[id - 1] ?? id;

const PatientDetailView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { patient, isLoading } = usePatient(id);
  const { savePatient } = usePatientMutations();
  const [displayPatient, setDisplayPatient] = useState<PatientRecordType | undefined>(patient);

  useEffect(() => {
    if (patient) setDisplayPatient(patient);
  }, [patient]);

  const currentPatient = displayPatient || patient;

  const snapshot = useMemo(() => {
    if (!currentPatient) return null;
    const motive = currentPatient.clinicalHistory?.motiveOfConsult?.trim() || 'Sin motivo registrado';
    const affected = (currentPatient.odontogram || [])
      .filter(t => t.surfaces && t.surfaces.length > 0)
      .map(t => fdiOf(t.id));
    const pieceLabel = affected.length
      ? affected.length === 1
        ? `Pieza ${affected[0]}`
        : `Piezas ${affected.join(', ')}`
      : 'Sin piezas marcadas';
    const totalBudget = (currentPatient.budget || []).reduce((sum, b) => sum + b.unitCost * b.quantity, 0);
    const totalPaid = (currentPatient.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const amountDue = Math.max(0, totalBudget - totalPaid);
    return { motive, pieceLabel, amountDue };
  }, [currentPatient]);

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

  return (
    <div className="flex-1 h-full overflow-y-auto flex flex-col p-4 md:p-5 lg:p-8 pb-24 md:pb-12 page-transition main-scroll">
      <React.Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }>
        <header className="mb-4 md:mb-6 space-y-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/patients'))}
              className="w-10 h-10 min-w-[40px] bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-500 border border-slate-200 hover:text-blue-600 transition-all cursor-pointer"
              title="Volver"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h2 className="text-lg md:text-2xl font-bold text-slate-900 tracking-tight truncate">{currentPatient!.identification.fullName}</h2>
              <p className="text-slate-500 font-medium text-xs sm:text-sm mt-0.5">{currentPatient!.identification.phone || 'Expediente clínico'}</p>
            </div>
          </div>
          {snapshot && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Motivo de consulta</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate" title={snapshot.motive}>{snapshot.motive}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pieza</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">{snapshot.pieceLabel}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cobro pendiente</p>
                <p className={`text-sm font-semibold mt-0.5 ${snapshot.amountDue > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                  {snapshot.amountDue > 0 ? formatCurrency(snapshot.amountDue) : 'Sin saldo'}
                </p>
              </div>
            </div>
          )}
        </header>
        <div className="flex-1 md:min-h-[680px]">
          <PatientRecord patient={currentPatient!} onUpdate={handleUpdate} />
        </div>
      </React.Suspense>
    </div>
  );
};

export default PatientDetailView;
