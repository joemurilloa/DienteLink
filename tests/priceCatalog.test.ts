import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CATALOG,
  localCatalogToMigrate,
  parseCatalogItems,
  suggestBudgetItem,
  CatalogItem,
} from '../lib/priceCatalog';
import { ToothData } from '../types';

describe('priceCatalog', () => {
  it('DEFAULT_CATALOG tiene tarifas iniciales válidas', () => {
    expect(DEFAULT_CATALOG.length).toBeGreaterThan(0);
    for (const item of DEFAULT_CATALOG) {
      expect(item.id).toBeTruthy();
      expect(item.name.trim().length).toBeGreaterThan(0);
      expect(item.cost).toBeGreaterThan(0);
    }
  });

  describe('parseCatalogItems', () => {
    it('retorna DEFAULT_CATALOG si el input no es un arreglo válido', () => {
      expect(parseCatalogItems(null)).toEqual(DEFAULT_CATALOG);
      expect(parseCatalogItems(undefined)).toEqual(DEFAULT_CATALOG);
      expect(parseCatalogItems('invalid')).toEqual(DEFAULT_CATALOG);
      expect(parseCatalogItems([])).toEqual(DEFAULT_CATALOG);
    });

    it('normaliza y filtra items válidos', () => {
      const raw = [
        { id: 'custom-1', name: '  Blanqueamiento Láser  ', cost: 4500 },
        { id: '', name: 'Fluorización', cost: 250 },
        { name: 'Sin ID', cost: 150 },
        { id: 'corrupto', name: 123, cost: 'abc' },
      ];

      const result = parseCatalogItems(raw);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ id: 'custom-1', name: 'Blanqueamiento Láser', cost: 4500 });
      expect(result[1].name).toBe('Fluorización');
      expect(result[1].cost).toBe(250);
      expect(result[1].id).toBeTruthy();
      expect(result[2].name).toBe('Sin ID');
      expect(result[2].cost).toBe(150);
      expect(result[2].id).toBeTruthy();
    });

    it('no migra la lista de fábrica ni un catálogo vacío', () => {
      expect(localCatalogToMigrate(null)).toBeNull();
      expect(localCatalogToMigrate('')).toBeNull();
      expect(localCatalogToMigrate('[]')).toBeNull();
      expect(localCatalogToMigrate('not-json')).toBeNull();
      const custom = localCatalogToMigrate(JSON.stringify([{ id: 'a', name: 'Limpieza', cost: 700 }]));
      expect(custom).toEqual([{ id: 'a', name: 'Limpieza', cost: 700 }]);
    });
  });

  describe('suggestBudgetItem', () => {
    const customCatalog: CatalogItem[] = [
      { id: '1', name: 'Resina Fotocurado', cost: 850 },
      { id: '2', name: 'Extracción Simple', cost: 1100 },
      { id: '3', name: 'Endodoncia Uniradicular', cost: 3200 },
      { id: '4', name: 'Corona de Zirconia', cost: 5000 },
    ];

    it('sugiere resina para diente con caries', () => {
      const tooth: ToothData = {
        id: 11,
        status: 'caries',
        surfaces: [{ surface: 'vestibular', condition: 'caries' }],
      };
      const suggestion = suggestBudgetItem(tooth, customCatalog);
      expect(suggestion.treatment).toBe('Resina Fotocurado');
      expect(suggestion.cost).toBe('850');
    });

    it('sugiere extracción cuando está indicada', () => {
      const tooth: ToothData = {
        id: 18,
        status: 'caries',
        surfaces: [{ surface: 'oclusal', condition: 'extraccion_indicada' }],
      };
      const suggestion = suggestBudgetItem(tooth, customCatalog);
      expect(suggestion.treatment).toBe('Extracción Simple');
      expect(suggestion.cost).toBe('1100');
    });

    it('sugiere endodoncia para tratamiento de conducto', () => {
      const tooth: ToothData = {
        id: 21,
        status: 'caries',
        surfaces: [{ surface: 'lingual', condition: 'tratamiento_conducto' }],
      };
      const suggestion = suggestBudgetItem(tooth, customCatalog);
      expect(suggestion.treatment).toBe('Endodoncia Uniradicular');
      expect(suggestion.cost).toBe('3200');
    });

    it('retorna vacío cuando el diente está sano', () => {
      const tooth: ToothData = {
        id: 12,
        status: 'healthy',
        surfaces: [{ surface: 'mesial', condition: 'healthy' }],
      };
      const suggestion = suggestBudgetItem(tooth, customCatalog);
      expect(suggestion.treatment).toBe('');
      expect(suggestion.cost).toBe('');
    });
  });
});
