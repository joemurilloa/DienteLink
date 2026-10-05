import { useCallback, useState } from 'react';
import { useAuth } from '../services/authService';
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

const storageKey = (id: string) => `dientelink_catalog_${id}`;

function loadCatalog(id: string): CatalogItem[] {
  try {
    const raw = localStorage.getItem(storageKey(id));
    if (!raw) return DEFAULT_CATALOG;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as CatalogItem[];
  } catch {
    // ignore
  }
  return DEFAULT_CATALOG;
}

/** Catálogo de precios del doctor (guardado en este dispositivo/navegador). */
export function usePriceCatalog() {
  const { clinicId, user } = useAuth();
  const id = clinicId || user?.id || 'default';
  const [catalog, setCatalogState] = useState<CatalogItem[]>(() => loadCatalog(id));

  const setCatalog = useCallback((items: CatalogItem[]) => {
    setCatalogState(items);
    try {
      localStorage.setItem(storageKey(id), JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [id]);

  const reset = useCallback(() => setCatalog(DEFAULT_CATALOG), [setCatalog]);

  return { catalog, setCatalog, reset };
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
