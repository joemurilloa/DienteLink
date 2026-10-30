import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { PatientRecord, OdontogramSnapshot, PatientCollection, Payment } from '../types';
import { canSeeClinicMoney, canViewClinicalChart } from '../lib/roles';
import { useAuth } from '../services/authService';
import { sileo } from 'sileo';
import { ensurePeriodontogramData, ensureOdontogram } from '../lib/utils';
import { DEMO_PATIENTS } from '../lib/demoData';
import { PatientIdentificationSchema } from '../lib/schemas';
import {
  addPaymentViaRpc,
  isSavePatientRpcEnabled,
  MissingPatientVersionError,
  savePatientViaRpc,
} from '../lib/savePatientRpc';
import { savePatientLegacy } from '../lib/savePatientLegacy';
import { isRpcVersionConflict, rpcErrorMessage } from '../lib/rpcErrors';

// ===================== Helpers =====================
function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
    return arr.reduce((acc, item) => {
        const k = String(item[key]);
        if (!acc[k]) acc[k] = [];
        acc[k].push(item);
        return acc;
    }, {} as Record<string, T[]>);
}

import {
    DbPatientRow,
    DbEvolutionNoteRow,
    DbClinicalEventRow,
    DbBudgetItemRow,
    DbPaymentRow,
    DbConsentFormRow,
    DbPrescriptionRow,
    DbLabWorkRow,
    mergePatientClinical,
} from '../lib/dbTypes';

export function dbToPatient(
    p: DbPatientRow,
    notes?: DbEvolutionNoteRow[] | null,
    events?: DbClinicalEventRow[] | null,
    budgetItems?: Partial<DbBudgetItemRow>[] | null,
    payments?: Partial<DbPaymentRow>[] | null,
    consents?: DbConsentFormRow[] | null,
    prescriptions?: DbPrescriptionRow[] | null,
    labWorks?: DbLabWorkRow[] | null,
    loadedCollections?: PatientCollection[],
): PatientRecord {
    const row = mergePatientClinical(p);
    return {
        id: row.id,
        identification: {
            fullName: row.full_name || '',
            birthDate: row.birth_date || '',
            gender: row.gender || '',
            address: row.address || '',
            phone: row.phone || '',
            email: row.email || '',
            occupation: row.occupation || '',
        },
        clinicalHistory: {
            allergies: row.allergies || [],
            medications: row.medications || '',
            previousDiseases: row.previous_diseases || '',
            familyHistory: row.family_history || '',
            motiveOfConsult: row.motive_of_consult || '',
            bloodType: row.blood_type || '',
            smoker: !!row.smoker,
            pregnant: !!row.pregnant,
            habits: row.habits || '',
            observations: row.observations || '',
        },
        evolutionNotes: (notes ?? []).map(n => ({
            id: n.id,
            date: n.date,
            content: n.content,
            procedure: n.procedure || '',
        })),
        history: (events ?? []).map(e => ({
            id: e.id,
            date: e.date,
            type: e.type as import('../types').EventType,
            description: e.description,
            toothId: e.tooth_id,
        })),
        consentSigned: row.consent_signed || false,
        odontogram: ensureOdontogram(row.odontogram),
        odontogramHistory: (row.odontogram_history as OdontogramSnapshot[]) || [],
        periodontogram: ensurePeriodontogramData(row.periodontogram),
        xrays: [],
        budget: (budgetItems ?? []).map(b => ({
            id: b.id || '',
            treatment: b.treatment || '',
            toothId: b.tooth_id ?? undefined,
            unitCost: b.unit_cost ?? 0,
            quantity: b.quantity ?? 1,
            status: b.status || 'pending',
            createdAt: b.created_at || '',
        })),
        payments: (payments ?? []).map(pay => ({
            id: pay.id || '',
            amount: pay.amount ?? 0,
            method: (pay.method as import('../types').PaymentMethod) || 'cash',
            note: pay.note || '',
            date: pay.date || '',
        })),
        labWorks: (labWorks ?? []).map(l => ({
            id: l.id,
            description: l.description,
            labName: l.lab_name,
            sentDate: l.sent_date,
            expectedDate: l.expected_date,
            cost: l.cost,
            status: l.status as import('../types').LabWorkStatus,
            createdAt: l.created_at,
        })),
        balance: 0,
        consents: (consents ?? []).map(c => ({
            id: c.id,
            title: c.title,
            content: c.content,
            signatureData: c.signature_data || '',
            signedAt: c.signed_at || '',
            witnessName: c.witness_name || '',
        })),
        prescriptions: (prescriptions ?? []).map(rx => ({
            id: rx.id,
            date: rx.date,
            diagnosis: rx.diagnosis || '',
            medications: (rx.medications as import('../types').PrescriptionMedication[]) || [],
            notes: rx.notes || '',
        })),
        loadedCollections,
        version: row.version,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function withoutSoftDeleted<T extends { deleted_at?: string | null }>(
  rows: T[] | null | undefined,
): T[] {
  return (rows ?? []).filter((r) => r.deleted_at == null);
}


export function usePatients() {
    const { user, clinicId, isGuest } = useAuth();

    return useQuery({
        queryKey: ['patients', clinicId],
        queryFn: async () => {
            // Guest mode: return demo data
            if (isGuest) return DEMO_PATIENTS;

            if (!clinicId) return [];

            // Lightweight query for the list view (Lazy Loading strategy)
            // We only fetch basic info + budgets and payments to calculate debt on the dashboard.
            // Explicitly selecting columns to avoid fetching heavy JSONB fields like odontogram.
            const { data, error } = await supabase
                .from('patients')
                .select(`
                    id, full_name, birth_date, gender, address, phone, email, occupation,
                    motive_of_consult, consent_signed, created_at, updated_at, version, deleted_at,
                    patient_clinical (allergies, medications, previous_diseases, family_history, blood_type, smoker, pregnant, habits, observations),
                    budget_items (id, unit_cost, quantity, status, deleted_at),
                    payments (id, amount, method, date, deleted_at)
                `)
                .eq('doctor_id', clinicId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching patients list:", error);
                return [];
            }

            return (data || []).map(p => {
                const row = p as unknown as import('../lib/dbTypes').DbPatientRow & {
                    budget_items?: (import('../lib/dbTypes').DbBudgetItemRow & { deleted_at?: string | null })[] | null;
                    payments?: (import('../lib/dbTypes').DbPaymentRow & { deleted_at?: string | null })[] | null;
                };
                const budget = withoutSoftDeleted(row.budget_items);
                const payments = withoutSoftDeleted(row.payments);
                const loaded: PatientCollection[] = [];
                if (Array.isArray(row.budget_items)) loaded.push('budget');
                if (Array.isArray(row.payments)) loaded.push('payments');
                return dbToPatient(
                    row,
                    undefined,
                    undefined,
                    budget,
                    payments,
                    undefined,
                    undefined,
                    undefined,
                    loaded,
                );
            });
        },
        enabled: !!clinicId && (isGuest || !!user),
    });
}

export function usePatient(patientId?: string) {
    const { clinicId, isGuest, profile } = useAuth();
    const canViewChart = canViewClinicalChart(profile?.role);
    
    const { data: patient, ...rest } = useQuery({
        queryKey: ['patient', patientId, clinicId],
        queryFn: async () => {
            // Guest mode: find patient in demo data
            if (isGuest) {
                return DEMO_PATIENTS.find(p => p.id === patientId);
            }

            if (!patientId || !clinicId) return undefined;
            
            // Full details query with PostgREST embeds (Joins)
            const { data, error } = await supabase
                .from('patients')
                .select(`
                    *,
                    patient_clinical (*),
                    evolution_notes (*),
                    clinical_events (*),
                    budget_items (*),
                    payments (*),
                    consent_forms (*),
                    prescriptions (*),
                    lab_works (*)
                `)
                .eq('id', patientId)
                .eq('doctor_id', clinicId)
                .is('deleted_at', null)
                .single();

            if (error) {
                console.error(`Error fetching full details for patient ${patientId}:`, error);
                return undefined;
            }

            // Map the nested data to PatientRecord
            const fullLoaded: PatientCollection[] = [
                ...(canViewChart ? ['evolutionNotes', 'history', 'consents', 'prescriptions'] as const : []),
                'budget', 'payments', 'labWorks',
            ];
            return dbToPatient(
                data,
                withoutSoftDeleted(data.evolution_notes),
                withoutSoftDeleted(data.clinical_events),
                withoutSoftDeleted(data.budget_items),
                withoutSoftDeleted(data.payments),
                withoutSoftDeleted(data.consent_forms),
                withoutSoftDeleted(data.prescriptions),
                withoutSoftDeleted(data.lab_works),
                fullLoaded,
            );
        },
        enabled: isGuest ? !!patientId : (!!patientId && !!clinicId),
    });

    return { patient, ...rest };
}

export function usePatientMutations() {
    const queryClient = useQueryClient();
    const { user, clinicId, isGuest, profile } = useAuth();
    const canSeeMoney = canSeeClinicMoney(profile?.role);
    const canViewChart = canViewClinicalChart(profile?.role);

    // Guest mode: local cache update only
    const guestPatientsUpdate = async (updater: (prev: PatientRecord[]) => PatientRecord[]) => {
        const prev = queryClient.getQueryData<PatientRecord[]>(['patients', 'demo']) || DEMO_PATIENTS;
        queryClient.setQueryData(['patients', 'demo'], updater(prev));
    };

    const saveMutation = useMutation({
        mutationFn: async (patient: PatientRecord) => {
            // Guest mode: update local cache only
            if (isGuest) {
                await guestPatientsUpdate(prev => {
                    const idx = prev.findIndex(p => p.id === patient.id);
                    const next = [...prev];
                    if (idx !== -1) next[idx] = { ...patient, updatedAt: new Date().toISOString() };
                    else next.unshift({ ...patient, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
                    return next;
                });
                return patient;
            }

            if (!clinicId) throw new Error('No doctor/clinic mapped');

            const idValidation = PatientIdentificationSchema.safeParse(patient.identification);
            if (!idValidation.success) {
                const firstIssue = idValidation.error.issues[0];
                throw new Error(`Datos inválidos: ${firstIssue.message} (campo: ${firstIssue.path.join('.')})`);
            }

            if (!isSavePatientRpcEnabled()) {
                return savePatientLegacy(patient, {
                    clinicId,
                    canSeeMoney,
                    canViewChart,
                });
            }

            const previous =
                queryClient.getQueryData<PatientRecord>(['patient', patient.id, clinicId]) ??
                queryClient.getQueryData<PatientRecord[]>(['patients', clinicId])?.find((p) => p.id === patient.id);

            const { patient: saved } = await savePatientViaRpc(patient, previous, {
                includeClinical: canViewChart,
                includeMoney: canSeeMoney,
            });
            return saved;
        },
        // Optimistic Updates!!! This completely replaces the local 800ms debounce cache with instant UI reactions.
        onMutate: async (newPatient) => {
            await queryClient.cancelQueries({ queryKey: ['patients', clinicId] });
            await queryClient.cancelQueries({ queryKey: ['patient', newPatient.id, clinicId] });
            const previous = queryClient.getQueryData<PatientRecord[]>(['patients', clinicId]);
            const previousPatient = queryClient.getQueryData<PatientRecord>(['patient', newPatient.id, clinicId]);
            const optimisticPatient = { ...newPatient, updatedAt: new Date().toISOString() };
            
            if (previous) {
                const idx = previous.findIndex(p => p.id === newPatient.id);
                const next = [...previous];
                if (idx !== -1) {
                    next[idx] = optimisticPatient;
                } else {
                    next.unshift({ ...newPatient, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
                }
                queryClient.setQueryData(['patients', clinicId], next);
            }

            queryClient.setQueryData(['patient', newPatient.id, clinicId], optimisticPatient);
            
            return { previous, previousPatient };
        },
        onError: (err, newPatient, context) => {
            const versionConflict =
                err instanceof MissingPatientVersionError || isRpcVersionConflict(err);
            if (versionConflict) {
                // Descartar pendingRemovedIds locales; invalidate recarga verdad del servidor.
                if (context?.previous) {
                    queryClient.setQueryData(
                        ['patients', clinicId],
                        context.previous.map((p) =>
                            p.id === newPatient.id ? { ...p, pendingRemovedIds: undefined } : p,
                        ),
                    );
                }
                if (context?.previousPatient) {
                    queryClient.setQueryData(['patient', newPatient.id, clinicId], {
                        ...context.previousPatient,
                        pendingRemovedIds: undefined,
                    });
                }
                sileo.error({
                    title: 'Conflicto de versión',
                    description:
                        'Recarga el expediente. Los borrados pendientes no se aplicaron (sin reintento).',
                });
                return;
            }
            if (context?.previous) {
                queryClient.setQueryData(['patients', clinicId], context.previous);
            }
            if (context?.previousPatient) {
                queryClient.setQueryData(['patient', newPatient.id, clinicId], context.previousPatient);
            }
            sileo.error({
                title: 'Error al sincronizar datos',
                description: rpcErrorMessage(err) || 'Los cambios fueron revertidos. Verifica tu conexión.',
            });
        },
        onSettled: (data, error, variables) => {
            if (isGuest) return;
            // DL412: invalidar para forzar recarga; no reintentar el mutate.
            queryClient.invalidateQueries({ queryKey: ['patients', clinicId] });
            queryClient.invalidateQueries({ queryKey: ['patient', variables.id, clinicId] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (patientId: string) => {
            // Guest mode: update local cache only
            if (isGuest) {
                await guestPatientsUpdate(prev => prev.filter(p => p.id !== patientId));
                return patientId;
            }

            if (!clinicId) throw new Error('No doctor/clinic mapped');

            // SOFT DELETE — never permanently erase clinical records.
            // Supabase RLS filters `deleted_at IS NULL` so the patient disappears
            // from all queries while the 10+ years of data remain intact in the DB.
            const { error: pErr } = await supabase
                .from('patients')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', patientId)
                .eq('doctor_id', clinicId);
            if (pErr) throw pErr;
            return patientId;
        },
        onMutate: async (patientId) => {
            await queryClient.cancelQueries({ queryKey: ['patients', clinicId] });
            const previous = queryClient.getQueryData<PatientRecord[]>(['patients', clinicId]);
            if (previous) {
                queryClient.setQueryData(['patients', clinicId], previous.filter(p => p.id !== patientId));
            }
            return { previous };
        },
        onError: (err, _, context) => {
            if (context?.previous) queryClient.setQueryData(['patients', clinicId], context.previous);
            sileo.error({ title: 'Error', description: 'No se pudo eliminar el paciente.' });
        },
        onSettled: (_, __, variables) => {
            queryClient.invalidateQueries({ queryKey: ['patients', clinicId] });
            queryClient.invalidateQueries({ queryKey: ['patient', variables, clinicId] });
            // Deleting a patient deletes their appointments via CASCADE, so invalidate appointments too
            queryClient.invalidateQueries({ queryKey: ['appointments', clinicId] });
        }
    });

    const addPaymentMutation = useMutation({
        mutationFn: async ({ patientId, payment }: { patientId: string; payment: Payment }) => {
            if (isGuest) {
                await guestPatientsUpdate(prev => prev.map(p =>
                    p.id === patientId ? { ...p, payments: [...(p.payments || []), payment] } : p
                ));
                return { patientId, payment };
            }

            if (!clinicId) throw new Error('No doctor/clinic mapped');

            if (isSavePatientRpcEnabled()) {
                const previous =
                    queryClient.getQueryData<PatientRecord>(['patient', patientId, clinicId]) ??
                    queryClient.getQueryData<PatientRecord[]>(['patients', clinicId])?.find((p) => p.id === patientId);
                if (!previous) throw new MissingPatientVersionError();
                const { patient: saved } = await addPaymentViaRpc(previous, payment, {
                    includeMoney: canSeeMoney,
                });
                queryClient.setQueryData(['patient', patientId, clinicId], saved);
                return { patientId, payment, version: saved.version };
            }

            const { error } = await supabase.from('payments').insert({
                id: payment.id,
                patient_id: patientId,
                doctor_id: clinicId,
                amount: payment.amount,
                method: payment.method,
                note: payment.note || null,
                date: payment.date,
            });
            if (error) throw error;
            return { patientId, payment };
        },
        onMutate: async ({ patientId, payment }) => {
            if (isGuest) return;
            await queryClient.cancelQueries({ queryKey: ['patients', clinicId] });
            const previousList = queryClient.getQueryData<PatientRecord[]>(['patients', clinicId]);
            const previousDetail = queryClient.getQueryData<PatientRecord>(['patient', patientId, clinicId]);
            const append = (p: PatientRecord) => ({ ...p, payments: [...(p.payments || []), payment] });
            if (previousList) {
                queryClient.setQueryData(['patients', clinicId], previousList.map(p => p.id === patientId ? append(p) : p));
            }
            if (previousDetail) {
                queryClient.setQueryData(['patient', patientId, clinicId], append(previousDetail));
            }
            return { previousList, previousDetail, patientId };
        },
        onError: (err, _vars, context) => {
            if (context?.previousList) queryClient.setQueryData(['patients', clinicId], context.previousList);
            if (context?.previousDetail) {
                queryClient.setQueryData(['patient', context.patientId, clinicId], context.previousDetail);
            }
            sileo.error({ title: 'No se registró el pago', description: 'Verifica tu conexión e inténtalo de nuevo.' });
        },
        onSettled: (_data, _err, variables) => {
            if (isGuest) return;
            queryClient.invalidateQueries({ queryKey: ['patients', clinicId] });
            queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId, clinicId] });
        },
    });

    return { savePatient: saveMutation, deletePatient: deleteMutation, addPayment: addPaymentMutation };
}
