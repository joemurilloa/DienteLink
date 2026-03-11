import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PatientList from '../PatientList';
import NewPatientModal from '../NewPatientModal';
import { persistenceService } from '../../services/persistenceService';
import { PatientRecord as PatientRecordType } from '../../types';

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

export default PatientsView;
