import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from '../services/authService';
import { canSeeClinicMoney } from './roles';
import type { ClinicalCondition, ToothData } from '../types';

export interface CatalogItem {
  id: string;
  name: string;
  cost: number;
}

export const DEFAULT_CATALOG: CatalogItem[] = [
  { id: 'consulta', name: 'Consulta General', cost: 300 },
  { id: 'limpieza', name: 'Limpieza (Profilaxis)', cost: 600 },
  { id: 'resina-simple', name: 'Resina Simple', cost: 800 },
  { id: 'resina-compuesta', name: 'Resina Compuesta', cost: 1200 },
  { id: 'extraccion-simple', name: 'Extracción Simple', cost: 1000 },
  { id: 'extraccion-compleja', name: 'Extracción Compleja', cost: 2500 },
  { id: 'endodoncia', name: 'Endodoncia', cost: 3500 },
  { id: 'corona', name: 'Corona Metal/Porcelana', cost: 4000 },
  { id: 'blanqueamiento', name: 'Blanqueamiento', cost: 3000 },
];

export function parseCatalogItems(raw: unknown, emptyFallback: CatalogItem[] = DEFAULT_CATALOG): CatalogItem[] {
  if (!Array.isArray(raw)) return emptyFallback;
  const items: CatalogItem[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === 'object' &&
      typeof (item as Record<string, unknown>).name === 'string' &&
      typeof (item as Record<string, unknown>).cost === 'number'
    ) {
      const rec = item as Record<string, unknown>;
      items.push({
        id: typeof rec.id === 'string' && rec.id.length > 0 ? rec.id : crypto.randomUUID(),
        name: (rec.name as string).trim(),
        cost: Number(rec.cost) || 0,
      });
    }
  }
  return items.length > 0 ? items : emptyFallback;
}

/**
 * Catálogo de precios de la clínica.
 * La lista vive en Supabase y la caché de TanStack Query.
 */
export function usePriceCatalog() {
  const { clinicId, isGuest, profile } = useAuth();
  const queryClient = useQueryClient();
  const activeId = clinicId || 'none';
  const canEditRole = !isGuest && canSeeClinicMoney(profile?.role);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['priceCatalog', activeId],
    enabled: !isGuest && !!clinicId,
    queryFn: async (): Promise<CatalogItem[]> => {
      if (!clinicId) return DEFAULT_CATALOG;
      const { data: row, error } = await supabase
        .from('price_catalogs')
        .select('items')
        .eq('doctor_id', clinicId)
        .maybeSingle();

      if (error) throw error;
      if (!row || !Array.isArray(row.items)) return DEFAULT_CATALOG;
      const parsed = parseCatalogItems(row.items, []);
      return parsed.length > 0 ? parsed : DEFAULT_CATALOG;
    },
    staleTime: 1000 * 60 * 5,
  });

  const catalog = data ?? DEFAULT_CATALOG;
  const canEdit = canEditRole && !isLoading && !isError && data !== undefined;

  const mutation = useMutation({
    mutationFn: async (newItems: CatalogItem[]) => {
      if (!canEditRole || !clinicId) return newItems;

      const { error } = await supabase
        .from('price_catalogs')
        .upsert(
          {
            doctor_id: clinicId,
            items: newItems,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'doctor_id' }
        );

      if (error) throw error;
      return newItems;
    },
    onMutate: async (newItems) => {
      await queryClient.cancelQueries({ queryKey: ['priceCatalog', activeId] });
      const prev = queryClient.getQueryData<CatalogItem[]>(['priceCatalog', activeId]);
      queryClient.setQueryData(['priceCatalog', activeId], newItems);
      return { prev };
    },
    onError: (_err, _newItems, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['priceCatalog', activeId], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['priceCatalog', activeId] });
    },
  });

  const setCatalog = useCallback(
    (items: CatalogItem[]) => {
      mutation.mutate(items);
    },
    [mutation]
  );

  const reset = useCallback(() => {
    mutation.mutate(DEFAULT_CATALOG);
  }, [mutation]);

  return {
    catalog,
    setCatalog,
    reset,
    isLoading,
    isSaving: mutation.isPending,
    canEdit,
  };
}

// ── Sugerencia de tratamiento desde el odontograma ─────────────────────────────
const SUGGESTION_ORDER: { condition: ClinicalCondition; keyword: string; fallback: string }[] = [
  { condition: 'extraccion_indicada', keyword: 'extracci', fallback: 'Extracción' },
  { condition: 'tratamiento_conducto', keyword: 'endodoncia', fallback: 'Endodoncia' },
  { condition: 'corona_indicada', keyword: 'corona', fallback: 'Corona' },
  { condition: 'protesis_implante', keyword: 'implante', fallback: 'Implante / Prótesis' },
  { condition: 'caries', keyword: 'resina', fallback: 'Resina' },
  { condition: 'fractura', keyword: 'resina', fallback: 'Restauración' },
];

export function suggestBudgetItem(
  tooth: ToothData | undefined,
  catalog: CatalogItem[],
): { treatment: string; cost: string } {
  const present = new Set((tooth?.surfaces || []).map(s => s.condition));
  const match = SUGGESTION_ORDER.find(s => present.has(s.condition));
  if (!match) return { treatment: '', cost: '' };
  const item = catalog.find(c => c.name.toLowerCase().includes(match.keyword));
  return item
    ? { treatment: item.name, cost: String(item.cost) }
    : { treatment: match.fallback, cost: '' };
}
