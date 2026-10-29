/**
 * odontogramData.ts — Tooth database, condition themes, SVG shapes, and
 * pure utility functions used across Odontogram sub-components.
 *
 * Extracted from Odontogram.tsx to break the 1,503-line monolith.
 * All exports are side-effect-free constants or pure functions.
 */

import React from 'react';
import {
  AlertTriangle, Zap, Shield, Eye, Crosshair,
  Square, Hexagon, Diamond, Star, Target, MousePointer2,
  X as XIcon,
} from 'lucide-react';
import { ToothSurface, ClinicalCondition } from '../../types';

// ---------------------------------------------------------------------------
// Tooth Information Database
// Universal numbering (1-32) → FDI, Spanish names, anterior/posterior flag
// ---------------------------------------------------------------------------

export interface ToothInfo {
  fdi: number;
  name: string;
  anterior: boolean;
}

export const TOOTH_INFO: Record<number, ToothInfo> = {
  1:  { fdi: 18, name: 'Tercer molar sup. derecho',          anterior: false },
  2:  { fdi: 17, name: 'Segundo molar sup. derecho',         anterior: false },
  3:  { fdi: 16, name: 'Primer molar sup. derecho',          anterior: false },
  4:  { fdi: 15, name: 'Segundo premolar sup. derecho',      anterior: false },
  5:  { fdi: 14, name: 'Primer premolar sup. derecho',       anterior: false },
  6:  { fdi: 13, name: 'Canino sup. derecho',                anterior: true  },
  7:  { fdi: 12, name: 'Incisivo lateral sup. derecho',      anterior: true  },
  8:  { fdi: 11, name: 'Incisivo central sup. derecho',      anterior: true  },
  9:  { fdi: 21, name: 'Incisivo central sup. izquierdo',    anterior: true  },
  10: { fdi: 22, name: 'Incisivo lateral sup. izquierdo',    anterior: true  },
  11: { fdi: 23, name: 'Canino sup. izquierdo',              anterior: true  },
  12: { fdi: 24, name: 'Primer premolar sup. izquierdo',     anterior: false },
  13: { fdi: 25, name: 'Segundo premolar sup. izquierdo',    anterior: false },
  14: { fdi: 26, name: 'Primer molar sup. izquierdo',        anterior: false },
  15: { fdi: 27, name: 'Segundo molar sup. izquierdo',       anterior: false },
  16: { fdi: 28, name: 'Tercer molar sup. izquierdo',        anterior: false },
  17: { fdi: 38, name: 'Tercer molar inf. izquierdo',        anterior: false },
  18: { fdi: 37, name: 'Segundo molar inf. izquierdo',       anterior: false },
  19: { fdi: 36, name: 'Primer molar inf. izquierdo',        anterior: false },
  20: { fdi: 35, name: 'Segundo premolar inf. izquierdo',    anterior: false },
  21: { fdi: 34, name: 'Primer premolar inf. izquierdo',     anterior: false },
  22: { fdi: 33, name: 'Canino inf. izquierdo',              anterior: true  },
  23: { fdi: 32, name: 'Incisivo lateral inf. izquierdo',    anterior: true  },
  24: { fdi: 31, name: 'Incisivo central inf. izquierdo',    anterior: true  },
  25: { fdi: 41, name: 'Incisivo central inf. derecho',      anterior: true  },
  26: { fdi: 42, name: 'Incisivo lateral inf. derecho',      anterior: true  },
  27: { fdi: 43, name: 'Canino inf. derecho',                anterior: true  },
  28: { fdi: 44, name: 'Primer premolar inf. derecho',       anterior: false },
  29: { fdi: 45, name: 'Segundo premolar inf. derecho',      anterior: false },
  30: { fdi: 46, name: 'Primer molar inf. derecho',          anterior: false },
  31: { fdi: 47, name: 'Segundo molar inf. derecho',         anterior: false },
  32: { fdi: 48, name: 'Tercer molar inf. derecho',          anterior: false },
};

// ---------------------------------------------------------------------------
// Condition Themes
// ---------------------------------------------------------------------------

export interface ConditionTheme {
  label: string;
  abbr: string;
  color: string;
  bg: string;
  border: string;
  group: 'estado' | 'tratamiento' | 'especial';
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  wholeToothOnly?: boolean;
  overlay?: 'x' | 'circle' | 'crown' | 'question';
}

export const conditionThemes: Record<ClinicalCondition, ConditionTheme> = {
  healthy:              { label: 'Sano',           abbr: 'SN',  color: '#94A3B8', bg: 'bg-slate-100',  border: 'border-slate-300',  group: 'estado',      icon: Shield },
  caries:               { label: 'Caries',         abbr: 'CA',  color: '#EF4444', bg: 'bg-red-50',     border: 'border-red-200',    group: 'estado',      icon: Crosshair },
  obturado:             { label: 'Obturado',        abbr: 'OB',  color: '#3B82F6', bg: 'bg-blue-50',    border: 'border-blue-200',   group: 'estado',      icon: Square },
  fractura:             { label: 'Fractura',        abbr: 'FR',  color: '#8B5CF6', bg: 'bg-violet-50',  border: 'border-violet-200', group: 'estado',      icon: AlertTriangle },
  extraccion_indicada:  { label: 'Extracción Ind.', abbr: 'EI',  color: '#F97316', bg: 'bg-orange-50',  border: 'border-orange-200', group: 'tratamiento', icon: XIcon },
  tratamiento_conducto: { label: 'Endodoncia',      abbr: 'EN',  color: '#EC4899', bg: 'bg-pink-50',    border: 'border-pink-200',   group: 'tratamiento', icon: Zap },
  corona_indicada:      { label: 'Corona Ind.',     abbr: 'CI',  color: '#F59E0B', bg: 'bg-amber-50',   border: 'border-amber-200',  group: 'tratamiento', icon: Hexagon },
  protesis_implante:    { label: 'Prótesis/Impl.',  abbr: 'PI',  color: '#3b82f6', bg: 'bg-blue-50',    border: 'border-blue-200',   group: 'tratamiento', icon: Diamond },
  ausente:              { label: 'Ausente',         abbr: 'AU',  color: '#94A3B8', bg: 'bg-slate-100',  border: 'border-slate-300',  group: 'especial',    icon: XIcon,   wholeToothOnly: true, overlay: 'x'       },
  extraido:             { label: 'Extraído',        abbr: 'EX',  color: '#64748B', bg: 'bg-slate-100',  border: 'border-slate-300',  group: 'especial',    icon: XIcon,   wholeToothOnly: true, overlay: 'x'       },
  implante_presente:    { label: 'Implante',        abbr: 'IP',  color: '#3b82f6', bg: 'bg-blue-50',    border: 'border-blue-200',   group: 'especial',    icon: Target,  wholeToothOnly: true, overlay: 'circle'  },
  corona_presente:      { label: 'Corona Presente', abbr: 'CP',  color: '#F59E0B', bg: 'bg-amber-50',   border: 'border-amber-200',  group: 'especial',    icon: Star,    wholeToothOnly: true, overlay: 'crown'   },
  en_observacion:       { label: 'En Observación',  abbr: 'OBS', color: '#6366F1', bg: 'bg-indigo-50',  border: 'border-indigo-200', group: 'especial',    icon: Eye,     wholeToothOnly: true, overlay: 'question'},
};

export const CONDITION_GROUPS: { key: string; label: string; conditions: ClinicalCondition[] }[] = [
  { key: 'estado',      label: 'Estado',               conditions: ['healthy', 'caries', 'obturado', 'fractura'] },
  { key: 'tratamiento', label: 'Tratamiento Indicado',  conditions: ['extraccion_indicada', 'tratamiento_conducto', 'corona_indicada', 'protesis_implante'] },
  { key: 'especial',    label: 'Pieza Completa',        conditions: ['ausente', 'extraido', 'implante_presente', 'corona_presente', 'en_observacion'] },
];

// ---------------------------------------------------------------------------
// Tooth SVG shapes
// ---------------------------------------------------------------------------

export type ToothType = 'molar' | 'premolar' | 'canine' | 'incisor';

export const getToothType = (id: number): ToothType => {
  const molars    = [1, 2, 3, 14, 15, 16, 17, 18, 19, 30, 31, 32];
  const premolars = [4, 5, 12, 13, 20, 21, 28, 29];
  const canines   = [6, 11, 22, 27];
  if (molars.includes(id))    return 'molar';
  if (premolars.includes(id)) return 'premolar';
  if (canines.includes(id))   return 'canine';
  return 'incisor';
};

export const TOOTH_OUTLINES: Record<ToothType, string> = {
  molar:    'M15 30C15 15 30 8 50 8C70 8 85 15 85 30C85 50 80 80 75 110C70 125 60 130 50 130C40 130 30 125 25 110C20 80 15 50 15 30Z',
  premolar: 'M22 28C22 16 35 10 50 10C65 10 78 16 78 28C78 48 74 80 68 112C62 126 50 130 50 130C50 130 38 126 32 112C26 80 22 48 22 28Z',
  canine:   'M28 28C28 18 40 12 50 12C60 12 72 18 72 28C72 48 68 82 62 112C58 128 50 132 42 128C32 112 28 48 28 28Z',
  incisor:  'M25 22C25 14 35 10 50 10C65 10 75 14 75 22C75 42 72 82 65 112C60 126 50 130 40 124C30 108 25 42 25 22Z',
};

/** Small 5-surface oclusal cross diagram */
export const MINI_SURFACE_PATHS: Record<string, string> = {
  vestibular: 'M 2 2 L 22 2 L 17 8 L 7 8 Z',
  distal:     'M 22 2 L 22 22 L 17 17 L 17 8 Z',
  lingual:    'M 22 22 L 2 22 L 7 17 L 17 17 Z',
  mesial:     'M 2 22 L 2 2 L 7 8 L 7 17 Z',
  center:     'M 7 8 L 17 8 L 17 17 L 7 17 Z',
};

export const MINI_SURFACE_LABEL_POS: Record<string, [number, number]> = {
  vestibular: [12, 5],
  distal:     [19.5, 12],
  lingual:    [12, 19.5],
  mesial:     [4.5, 12],
  center:     [12, 13],
};

// ---------------------------------------------------------------------------
// Pure utility functions
// ---------------------------------------------------------------------------

import { SurfaceData } from '../../types';

export const getSurfacesForTooth = (id: number): ToothSurface[] => {
  const info = TOOTH_INFO[id];
  const center: ToothSurface = info?.anterior ? 'incisal' : 'oclusal';
  return [center, 'vestibular', 'lingual', 'mesial', 'distal'];
};

export const getSurfaceDisplayName = (surface: ToothSurface, toothId: number): string => {
  if (surface === 'lingual') return toothId <= 16 ? 'Palatino' : 'Lingual';
  const names: Record<ToothSurface, string> = {
    oclusal: 'Oclusal', incisal: 'Incisal', vestibular: 'Vestibular',
    lingual: 'Lingual', mesial: 'Mesial', distal: 'Distal',
  };
  return names[surface];
};

export const getSurfaceColor = (surfaces: SurfaceData[], surface: ToothSurface): string => {
  const found = surfaces.find(s => s.surface === surface);
  if (!found || found.condition === 'healthy') return '#FFFFFF';
  return conditionThemes[found.condition]?.color || '#FFFFFF';
};

export const getWholeToothCondition = (surfaces: SurfaceData[]): ClinicalCondition | null => {
  for (const s of surfaces) {
    if (conditionThemes[s.condition]?.wholeToothOnly) return s.condition;
  }
  return null;
};

export const getConditionCount = (surfaces: SurfaceData[]): number =>
  surfaces.filter(s => s.condition !== 'healthy').length;

// Re-export MousePointer2 so sub-components don't need to import it again
export { MousePointer2 };
