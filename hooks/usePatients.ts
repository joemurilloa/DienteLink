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
    const { user, clinicId } = useAuth();

    return useQuery({
        queryKey: ['patients', clinicId],
        queryFn: async () => {
            if (!clinicId) return [];

            // Lightweight query for the list view (Lazy Loading strategy)
            // We only fetch basic info + budgets and payments to calculate debt on the dashboard.
            // Explicitly selecting columns to avoid fetching heavy JSONB fields like odontogram.
            const { data, error } = await supabase
                .from('patients')
                .select(`
                    id, full_name, birth_date, gender, address, phone, email, occupation, 
                    allergies, medications, previous_diseases, family_history, motive_of_consult, consent_signed, 
                    created_at, updated_at,
                    budget_items (id, unit_cost, quantity, status),
                    payments (id, amount, method, date)
                `)
                .eq('doctor_id', clinicId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching patients list:", error);
                return [];
            }

            return (data || []).map(p => 
                dbToPatient(
                    p, 
                    [], // evolution_notes empty in list view
                    [], // clinical_events empty in list view
                    p.budget_items || [], 
                    p.payments || [], 
                    [], // consent_forms empty in list view
                    []  // prescriptions empty in list view
                )
            );
        },
        enabled: !!clinicId,
    });
}

export function usePatient(patientId?: string) {
    const { clinicId } = useAuth();
    
    const { data: patient, ...rest } = useQuery({
        queryKey: ['patient', patientId, clinicId],
        queryFn: async () => {
            if (!patientId || !clinicId) return undefined;
            
            // Full details query with PostgREST embeds (Joins)
            const { data, error } = await supabase
                .from('patients')
                .select(`
                    *,
                    evolution_notes (*),
                    clinical_events (*),
                    budget_items (*),
                    payments (*),
                    consent_forms (*),
                    prescriptions (*)
                `)
                .eq('id', patientId)
                .eq('doctor_id', clinicId)
                .single();

            if (error) {
                console.error(`Error fetching full details for patient ${patientId}:`, error);
                return undefined;
            }

            // Map the nested data to PatientRecord
            return dbToPatient(
                data,
                data.evolution_notes || [],
                data.clinical_events || [],
                data.budget_items || [],
                data.payments || [],
                data.consent_forms || [],
                data.prescriptions || []
            );
        },
        enabled: !!patientId && !!clinicId,
    });

    return { patient, ...rest };
}

export function usePatientMutations() {
    const queryClient = useQueryClient();
    const { user, clinicId } = useAuth();

    const saveMutation = useMutation({
        mutationFn: async (patient: PatientRecord) => {
            if (!clinicId) throw new Error('No doctor/clinic mapped');
            const doctorId = clinicId;

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

            // 2. Sub-tables sync logic
            const syncSubTable = async (tableName: string, items: any[], mapFn: (i: any) => any) => {
                const doctorId = clinicId;
                
                // A. Upsert all current items
                if (items && items.length > 0) {
                    const mapped = items.map(mapFn);
                    
                    const { error: upsertErr } = await supabase.from(tableName).upsert(mapped, { onConflict: 'id' });
                    if (upsertErr) {
                        console.error(`[Error Upserting ${tableName}]:`, upsertErr);
                        throw upsertErr;
                    }

                    // B. Delete items belonging to this patient/doctor that are NOT in the current list
                    const rawIds = items.map(i => i.id);
                    const currentIds = rawIds.filter(id => typeof id === 'string' && id.length > 0);

                    if (currentIds.length > 0) {
                        const { error: delErr } = await supabase.from(tableName)
                            .delete()
                            .eq('patient_id', patient.id)
                            .eq('doctor_id', doctorId)
                            .not('id', 'in', `(${currentIds.join(',')})`); // PostgREST IN requires parentheses
                        
                        if (delErr) {
                            console.error(`[Error Cleaning ${tableName}]:`, delErr);
                            throw delErr;
                        }
                    }
                } else {
                    // C. If no items, delete all for this patient/doctor
                    const { error: delErr } = await supabase.from(tableName)
                        .delete()
                        .eq('patient_id', patient.id)
                        .eq('doctor_id', doctorId);
                    
                    if (delErr) throw delErr;
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
            await queryClient.cancelQueries({ queryKey: ['patients', clinicId] });
            const previous = queryClient.getQueryData<PatientRecord[]>(['patients', clinicId]);
            
            if (previous) {
                const idx = previous.findIndex(p => p.id === newPatient.id);
                const next = [...previous];
                if (idx !== -1) {
                    next[idx] = { ...newPatient, updatedAt: new Date().toISOString() };
                } else {
                    next.unshift({ ...newPatient, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
                }
                queryClient.setQueryData(['patients', clinicId], next);
            }
            
            return { previous };
        },
        onError: (err, newPatient, context) => {
            if (context?.previous) {
                queryClient.setQueryData(['patients', clinicId], context.previous);
            }
            sileo.error({ title: 'Error al sincronizar datos', description: 'Los cambios fueron revertidos. Verifica tu conexión.' });
        },
        onSettled: (data, error, variables) => {
            // Keep it fresh without annoying the user
            queryClient.invalidateQueries({ queryKey: ['patients', clinicId] });
            queryClient.invalidateQueries({ queryKey: ['patient', variables.id, clinicId] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (patientId: string) => {
            if (!clinicId) throw new Error('No doctor/clinic mapped');
            const { error: pErr } = await supabase.from('patients').delete().eq('id', patientId).eq('doctor_id', clinicId);
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

    return { savePatient: saveMutation, deletePatient: deleteMutation };
}
