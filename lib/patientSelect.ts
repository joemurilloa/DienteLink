/**
 * Listado de pacientes.
 * Con el RPC apagado, producción no tiene patients.version ni deleted_at
 * en budget_items / payments. Pedirlas hace fallar toda la consulta.
 * patients.deleted_at sí existe desde el baseline.
 */
export function patientListSelect(rpcEnabled: boolean): string {
  const version = rpcEnabled ? 'version, ' : '';
  const budget = rpcEnabled
    ? 'budget_items (id, unit_cost, quantity, status, deleted_at)'
    : 'budget_items (id, unit_cost, quantity, status)';
  const payments = rpcEnabled
    ? 'payments (id, amount, method, date, deleted_at)'
    : 'payments (id, amount, method, date)';

  return `
    id, full_name, birth_date, gender, address, phone, email, occupation,
    motive_of_consult, consent_signed, created_at, updated_at, ${version}deleted_at,
    patient_clinical (allergies, medications, previous_diseases, family_history, blood_type, smoker, pregnant, habits, observations),
    ${budget},
    ${payments}
  `;
}
