import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePatient, usePatientMutations } from '../../hooks/usePatients';
import { PatientRecord as PatientRecordType } from '../../types';
import { ArrowLeft } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { idToFdi } from '../../lib/toothNumber';
import { isSessionExpiredError } from '../../lib/rpcErrors';
import { SaveAckContext } from '../patient-record/FormInputs';
import { sileo } from 'sileo';

const PatientRecord = React.lazy(() => import('../PatientRecord'));

const PatientDetailView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { patient, isLoading, isError, refetch } = usePatient(id);
  const { savePatient } = usePatientMutations();
  const [displayPatient, setDisplayPatient] = useState<PatientRecordType | undefined>(patient);
  const [saveProblem, setSaveProblem] = useState<null | 'failed' | 'session'>(null);
  const [saveAck, setSaveAck] = useState(0);
  const holdLocal = useRef(false);

  useEffect(() => {
    if (holdLocal.current) return;
    if (patient) setDisplayPatient(patient);
  }, [patient]);

  useEffect(() => {
    if (!saveProblem) return;
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [saveProblem]);

  const currentPatient = displayPatient || patient;

  const snapshot = useMemo(() => {
    if (!currentPatient) return null;
    const motive = currentPatient.clinicalHistory?.motiveOfConsult?.trim() || 'Sin motivo registrado';
    const affected = (currentPatient.odontogram || [])
      .filter(t => t.surfaces && t.surfaces.length > 0)
      .map(t => idToFdi(t.id))
      .filter((fdi): fdi is number => fdi != null);
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

  if (isError) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center px-6">
        <p className="text-lg font-semibold text-slate-600 mb-2">No se pudo cargar el expediente</p>
        <p className="text-sm text-slate-500 mb-4">No es un paciente inexistente. La consulta falló.</p>
        <button
          type="button"
          onClick={() => { void refetch(); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
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
    try {
      await savePatient.mutateAsync(updated);
      holdLocal.current = false;
      setSaveProblem(null);
      sileo.clear();
      setSaveAck((n) => n + 1);
    } catch (err) {
      holdLocal.current = true;
      setSaveProblem(isSessionExpiredError(err) ? 'session' : 'failed');
      throw err instanceof Error ? err : new Error('No se guardó');
    }
  };

  const discardUnsaved = () => {
    holdLocal.current = false;
    setSaveProblem(null);
    sileo.clear();
    if (patient) setDisplayPatient(patient);
  };

  const leaveChart = () => {
    if (saveProblem && !window.confirm('Tienes cambios sin guardar. Si sales, se pierden.')) return;
    holdLocal.current = false;
    setSaveProblem(null);
    sileo.clear();
    if (window.history.length > 1) navigate(-1);
    else navigate('/patients');
  };

  return (
    <SaveAckContext.Provider value={saveAck}>
    <div className="flex-1 h-full overflow-y-auto flex flex-col p-4 md:p-5 lg:p-8 pb-24 md:pb-12 page-transition main-scroll">
      <React.Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }>
        <header className="mb-4 md:mb-6 space-y-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={leaveChart}
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
        {saveProblem && (
          <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <p className="font-semibold">{saveProblem === 'session' ? 'Tu sesión venció' : 'No se guardó'}</p>
            <p className="mt-1 text-red-800">
              {saveProblem === 'session'
                ? 'Entra de nuevo para guardar. Reintentar el mismo envío no va a funcionar. Si sales, se pierde lo escrito.'
                : 'Lo que escribiste sigue en esta pantalla. Si sales del expediente, se pierde.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {saveProblem === 'session' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm('Al salir se pierde lo que no se guardó. ¿Entrar de nuevo?')) return;
                    holdLocal.current = false;
                    setSaveProblem(null);
                    navigate('/login');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-700 text-white text-sm font-semibold"
                >
                  Entrar de nuevo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { if (currentPatient) void handleUpdate(currentPatient).catch(() => undefined); }}
                  className="px-3 py-1.5 rounded-lg bg-red-700 text-white text-sm font-semibold"
                >
                  Reintentar
                </button>
              )}
              <button
                type="button"
                onClick={discardUnsaved}
                className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-sm font-semibold text-red-900"
              >
                Volver a lo último guardado
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 md:min-h-[680px]">
          <PatientRecord patient={currentPatient!} onUpdate={handleUpdate} />
        </div>
      </React.Suspense>
    </div>
    </SaveAckContext.Provider>
  );
};

export default PatientDetailView;
