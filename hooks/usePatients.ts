import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { PatientRecord, ToothData, SurfaceData, OdontogramSnapshot } from '../types';
import { useAuth } from '../services/authService';
import { sileo } from 'sileo';
import { ensurePeriodontogramData } from '../lib/utils';

// ===================== Helpers =====================
function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
    return arr.reduce((acc, item) => {
        const k = String(item[key]);
        if (!acc[k]) acc[k] = [];
        acc[k].push(item);
        return acc;
    }, {} as Record<string, T[]>);
}

function dbToPatient(p: any, notes: any[], events: any[], budgetItems: any[] = [], payments: any[] = [], consents: any[] = [], prescriptions: any[] = []): PatientRecord {
    return {
        id: p.id,
        identification: {
            fullName: p.full_name || '',
            birthDate: p.birth_date || '',
            gender: p.gender || '',
            address: p.address || '',
            phone: p.phone || '',
            email: p.email || '',
            occupation: p.occupation || '',
        },
        clinicalHistory: {
            allergies: p.allergies || [],
            medications: p.medications || '',
            previousDiseases: p.previous_diseases || '',
            familyHistory: p.family_history || '',
            motiveOfConsult: p.motive_of_consult || '',
        },
        evolutionNotes: notes.map(n => ({
            id: n.id,
            date: n.date,
            content: n.content,
            procedure: n.procedure || '',
        })),
        history: events.map(e => ({
            id: e.id,
            date: e.date,
            type: e.type,
            description: e.description,
            toothId: e.tooth_id,
        })),
        consentSigned: p.consent_signed || false,
        odontogram: (p.odontogram as ToothData[]) || Array.from({ length: 32 }, (_, i) => ({ id: i + 1, surfaces: [] as SurfaceData[] })),
        odontogramHistory: (p.odontogram_history as OdontogramSnapshot[]) || [],
        periodontogram: ensurePeriodontogramData(p.periodontogram),
        xrays: [],
        budget: budgetItems.map(b => ({
            id: b.id,
            treatment: b.treatment,
            toothId: b.tooth_id,
            unitCost: b.unit_cost,
            quantity: b.quantity,
            status: b.status,
            createdAt: b.created_at,
        })),
        payments: payments.map(pay => ({
            id: pay.id,
            amount: pay.amount,
            method: pay.method,
            note: pay.note || '',
            date: pay.date,
        })),
        balance: 0,
        consents: consents.map(c => ({
            id: c.id,
            title: c.title,
            content: c.content,
            signatureData: c.signature_data || '',
            signedAt: c.signed_at || '',
            witnessName: c.witness_name || '',
        })),
        prescriptions: prescriptions.map(rx => ({
            id: rx.id,
            date: rx.date,
            diagnosis: rx.diagnosis || '',
            medications: rx.medications || [],
            notes: rx.notes || '',
        })),
        createdAt: p.created_at,
        updatedAt: p.updated_at,
    };
}

export function usePatients() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['patients', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];

            const [patientsRes, notesRes, eventsRes, budgetRes, paymentsRes, consentsRes, prescriptionsRes] = await Promise.all([
                supabase.from('patients').select('*').eq('doctor_id', user.id).order('created_at', { ascending: false }),
                supabase.from('evolution_notes').select('*').eq('doctor_id', user.id).order('created_at', { ascending: false }),
                supabase.from('clinical_events').select('*').eq('doctor_id', user.id).order('created_at', { ascending: false }),
                supabase.from('budget_items').select('*').eq('doctor_id', user.id).order('created_at', { ascending: false }),
                supabase.from('payments').select('*').eq('doctor_id', user.id).order('created_at', { ascending: false }),
                supabase.from('consent_forms').select('*').eq('doctor_id', user.id).order('created_at', { ascending: false }),
                supabase.from('prescriptions').select('*').eq('doctor_id', user.id).order('created_at', { ascending: false }),
            ]);

            const notesByPatient = groupBy(notesRes.data || [], 'patient_id');
            const eventsByPatient = groupBy(eventsRes.data || [], 'patient_id');
            const budgetByPatient = groupBy(budgetRes.data || [], 'patient_id');
            const paymentsByPatient = groupBy(paymentsRes.data || [], 'patient_id');
            const consentsByPatient = groupBy(consentsRes.data || [], 'patient_id');
            const prescriptionsByPatient = groupBy(prescriptionsRes.data || [], 'patient_id');

            return (patientsRes.data || []).map(p =>
                dbToPatient(p, notesByPatient[p.id] || [], eventsByPatient[p.id] || [], budgetByPatient[p.id] || [], paymentsByPatient[p.id] || [], consentsByPatient[p.id] || [], prescriptionsByPatient[p.id] || [])
            );
        },
        enabled: !!user?.id,
    });
}

// Optional hook to get a single patient from cache (doesn't trigger network request if the list is already loaded)
export function usePatient(patientId?: string) {
    const { user } = useAuth();
    const { data: patients, ...rest } = usePatients();

    const patient = patientId ? patients?.find(p => p.id === patientId) : undefined;

    return { patient, ...rest };
}

export function usePatientMutations() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const saveMutation = useMutation({
        mutationFn: async (patient: PatientRecord) => {
            if (!user?.id) throw new Error('No doctor mapped');
            const doctorId = user.id;

            // 1. Main patient record
            const { error: pErr } = await supabase.from('patients').upsert({
                id: patient.id,
                doctor_id: doctorId,
                full_name: patient.identification.fullName,
                birth_date: patient.identification.birthDate || null,
                gender: patient.identification.gender || null,
                address: patient.identification.address || null,
                phone: patient.identification.phone || null,
                email: patient.identification.email || null,
                occupation: patient.identification.occupation || null,
                allergies: patient.clinicalHistory.allergies,
                medications: patient.clinicalHistory.medications || null,
                previous_diseases: patient.clinicalHistory.previousDiseases || null,
                family_history: patient.clinicalHistory.familyHistory || null,
                motive_of_consult: patient.clinicalHistory.motiveOfConsult || null,
                consent_signed: patient.consentSigned,
                odontogram: patient.odontogram,
                odontogram_history: patient.odontogramHistory || [],
                periodontogram: patient.periodontogram,
                updated_at: patient.updatedAt || new Date().toISOString(),
            }, { onConflict: 'id' });

            if (pErr) throw new Error(`Error en paciente: ${pErr.message}`);

            // 2. Sub-tables
            const syncSubTable = async (tableName: string, items: any[], mapFn: (i: any) => any) => {
                if (items && items.length > 0) {
                    const { error } = await supabase.from(tableName).upsert(items.map(mapFn), { onConflict: 'id' });
                    if (error) throw error;
                    const currentIds = items.map(i => i.id);
                    await supabase.from(tableName).delete().eq('patient_id', patient.id).not('id', 'in', `(${currentIds.join(',')})`);
                } else {
                    await supabase.from(tableName).delete().eq('patient_id', patient.id);
                }
            };

            await syncSubTable('evolution_notes', patient.evolutionNotes || [], n => ({
                id: n.id, patient_id: patient.id, doctor_id: doctorId, date: n.date, content: n.content, procedure: n.procedure
            }));

            await syncSubTable('clinical_events', patient.history || [], e => ({
                id: e.id, patient_id: patient.id, doctor_id: doctorId, date: e.date, type: e.type, description: e.description, tooth_id: e.toothId || null
            }));

            await syncSubTable('budget_items', patient.budget || [], b => ({
                id: b.id, patient_id: patient.id, doctor_id: doctorId, treatment: b.treatment, tooth_id: b.toothId || null, unit_cost: b.unitCost, quantity: b.quantity, status: b.status, created_at: b.createdAt
            }));

            await syncSubTable('payments', patient.payments || [], p => ({
                id: p.id, patient_id: patient.id, doctor_id: doctorId, amount: p.amount, method: p.method, note: p.note, date: p.date
            }));

            await syncSubTable('consent_forms', patient.consents || [], c => ({
                id: c.id, patient_id: patient.id, doctor_id: doctorId, title: c.title, content: c.content, signature_data: c.signatureData, signed_at: c.signedAt, witness_name: c.witnessName || null
            }));

            await syncSubTable('prescriptions', patient.prescriptions || [], rx => ({
                id: rx.id, patient_id: patient.id, doctor_id: doctorId, date: rx.date, diagnosis: rx.diagnosis, medications: rx.medications, notes: rx.notes
            }));

            return patient;
        },
        // Optimistic Updates!!! This completely replaces the local 800ms debounce cache with instant UI reactions.
        onMutate: async (newPatient) => {
            await queryClient.cancelQueries({ queryKey: ['patients', user?.id] });
            const previous = queryClient.getQueryData<PatientRecord[]>(['patients', user?.id]);
            
            if (previous) {
                const idx = previous.findIndex(p => p.id === newPatient.id);
                const next = [...previous];
                if (idx !== -1) {
                    next[idx] = { ...newPatient, updatedAt: new Date().toISOString() };
                } else {
                    next.unshift({ ...newPatient, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
                }
                queryClient.setQueryData(['patients', user?.id], next);
            }
            
            return { previous };
        },
        onError: (err, newPatient, context) => {
            if (context?.previous) {
                queryClient.setQueryData(['patients', user?.id], context.previous);
            }
            sileo.error({ title: 'Error al sincronizar datos', description: 'Los cambios fueron revertidos. Verifica tu conexión.' });
        },
        onSettled: () => {
            // Keep it fresh without annoying the user
            queryClient.invalidateQueries({ queryKey: ['patients', user?.id] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (patientId: string) => {
            if (!user?.id) throw new Error('No doctor mapped');
            const { error: pErr } = await supabase.from('patients').delete().eq('id', patientId).eq('doctor_id', user.id);
            if (pErr) throw pErr;
            return patientId;
        },
        onMutate: async (patientId) => {
            await queryClient.cancelQueries({ queryKey: ['patients', user?.id] });
            const previous = queryClient.getQueryData<PatientRecord[]>(['patients', user?.id]);
            if (previous) {
                queryClient.setQueryData(['patients', user?.id], previous.filter(p => p.id !== patientId));
            }
            return { previous };
        },
        onError: (err, _, context) => {
            if (context?.previous) queryClient.setQueryData(['patients', user?.id], context.previous);
            sileo.error({ title: 'Error', description: 'No se pudo eliminar el paciente.' });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['patients', user?.id] });
            // Deleting a patient deletes their appointments via CASCADE, so invalidate appointments too
            queryClient.invalidateQueries({ queryKey: ['appointments', user?.id] });
        }
    });

    return { savePatient: saveMutation, deletePatient: deleteMutation };
}
