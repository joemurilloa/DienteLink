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

export const storageKey = (id: string) => `dientelink_catalog_${id}`;

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

/** Solo sube a la nube un catálogo que este navegador guardó de verdad. La lista de fábrica no cuenta. */
export function localCatalogToMigrate(raw: string | null): CatalogItem[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const items = parseCatalogItems(parsed, []);
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

export function loadLocalCatalog(id: string): CatalogItem[] {
  try {
    const raw = localStorage.getItem(storageKey(id));
    if (!raw) return DEFAULT_CATALOG;
    const parsed = JSON.parse(raw);
    return parseCatalogItems(parsed);
  } catch {
    return DEFAULT_CATALOG;
  }
}

export function saveLocalCatalog(id: string, items: CatalogItem[]) {
  try {
    localStorage.setItem(storageKey(id), JSON.stringify(items));
  } catch {
    // ignore quota/storage errors
  }
}

/**
 * Catálogo de precios de la clínica.
 * Sincronizado en Supabase (PostgreSQL) para todos los miembros del equipo,
 * con respaldo en localStorage para modo offline o invitado.
 */
export function usePriceCatalog() {
  const { clinicId, user, isGuest, profile } = useAuth();
  const queryClient = useQueryClient();
  const activeId = clinicId || user?.id || 'default';
  const canEdit = !isGuest && canSeeClinicMoney(profile?.role);

  const { data: catalog = loadLocalCatalog(activeId), isLoading } = useQuery({
    queryKey: ['priceCatalog', activeId],
    queryFn: async (): Promise<CatalogItem[]> => {
      // Si estamos en modo demo o no hay clínica mapeada, usar local
      if (isGuest || !clinicId) {
        return loadLocalCatalog(activeId);
      }

      try {
        const { data, error } = await supabase
          .from('price_catalogs')
          .select('items')
          .eq('doctor_id', clinicId)
          .maybeSingle();

        if (error) {
          // Si la tabla aún no existe o hay error de red, usamos el respaldo local
          console.warn('[usePriceCatalog] Usando respaldo local por error en Postgres:', error.message);
          return loadLocalCatalog(activeId);
        }

        if (data && Array.isArray(data.items)) {
          const parsed = parseCatalogItems(data.items, []);
          if (parsed.length > 0) saveLocalCatalog(activeId, parsed);
          return parsed.length > 0 ? parsed : loadLocalCatalog(activeId);
        }

        const custom = localCatalogToMigrate(
          typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey(activeId)) : null,
        );
        if (canEdit && custom) {
          const { error: seedErr } = await supabase
            .from('price_catalogs')
            .upsert(
              {
                doctor_id: clinicId,
                items: custom,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'doctor_id' }
            );
          if (seedErr) {
            console.warn('[usePriceCatalog] Error al sembrar catálogo inicial:', seedErr.message);
          }
          return custom;
        }
        return loadLocalCatalog(activeId);
      } catch (err) {
        console.warn('[usePriceCatalog] Excepción al consultar catálogo, usando local:', err);
        return loadLocalCatalog(activeId);
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de caché en memoria
  });

  const mutation = useMutation({
    mutationFn: async (newItems: CatalogItem[]) => {
      saveLocalCatalog(activeId, newItems);

      if (!isGuest && clinicId && canEdit) {
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

        if (error) {
          console.error('[usePriceCatalog] Error al guardar catálogo en Postgres:', error);
          throw error;
        }
      }
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
