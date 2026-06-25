import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PatientList from '../PatientList';
import NewPatientModal from '../NewPatientModal';
import { usePatients, usePatientMutations } from '../../hooks/usePatients';
import { PatientRecord as PatientRecordType } from '../../types';
import { usePatientsTip } from '../ContextualTips';
import { useSubscription, FREE_PATIENT_LIMIT } from '../../hooks/useSubscription';

const PatientsView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: patients = [] } = usePatients();
  const { savePatient } = usePatientMutations();
  const { hasAccess } = useSubscription();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Contextual tip (show once)
  usePatientsTip();

  // Handle ?new=true param — but guard against limit
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      const atLimit = !hasAccess && patients.length >= FREE_PATIENT_LIMIT;
      if (atLimit) {
        navigate('/billing');
      } else {
        setIsModalOpen(true);
      }
    }
  }, [searchParams, hasAccess, patients.length]);

  const handleAdd = () => {
    const atLimit = !hasAccess && patients.length >= FREE_PATIENT_LIMIT;
    if (atLimit) {
      navigate('/billing');
      return;
    }
    setIsModalOpen(true);
  };

  const handleSave = async (newPatient: PatientRecordType) => {
    try {
      await savePatient.mutateAsync(newPatient);
      navigate(`/patient/${newPatient.id}`);
    } catch (e) {
      // The error is already handled and displayed by onError in usePatientMutations,
      // but we catch it here to prevent the unhandled rejection from breaking the UI
      // and to ensure we only navigate on success.
      console.error("Save failed:", e);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 lg:p-12 pb-32">
      <PatientList
        patients={patients}
        onSelect={(p) => navigate(`/patient/${p.id}`)}
        onAdd={handleAdd}
      />
      <NewPatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
};

export default PatientsView;
