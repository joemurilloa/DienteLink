
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { ToothData, SurfaceData, ToothSurface, ClinicalCondition, OdontogramSnapshot } from '../types';
import { cn } from '../lib/utils';
import { sileo } from 'sileo';
import 'sileo/styles.css';
import {
  Clock, ChevronDown, ChevronUp,
  AlertTriangle, Zap, Shield, Eye, Crosshair,
  Square, Hexagon, Diamond, Star, Target,
  X as XIcon, Check, Copy, ArrowLeftRight, Info
} from 'lucide-react';

/* ================================================================
   TOOTH INFORMATION DATABASE
   Universal (1-32) → FDI, Spanish names, anterior/posterior
   ================================================================ */
const TOOTH_INFO: Record<number, { fdi: number; name: string; anterior: boolean }> = {
  1:  { fdi: 18, name: 'Tercer molar sup. derecho', anterior: false },
  2:  { fdi: 17, name: 'Segundo molar sup. derecho', anterior: false },
  3:  { fdi: 16, name: 'Primer molar sup. derecho', anterior: false },
  4:  { fdi: 15, name: 'Segundo premolar sup. derecho', anterior: false },
  5:  { fdi: 14, name: 'Primer premolar sup. derecho', anterior: false },
  6:  { fdi: 13, name: 'Canino sup. derecho', anterior: true },
  7:  { fdi: 12, name: 'Incisivo lateral sup. derecho', anterior: true },
  8:  { fdi: 11, name: 'Incisivo central sup. derecho', anterior: true },
  9:  { fdi: 21, name: 'Incisivo central sup. izquierdo', anterior: true },
  10: { fdi: 22, name: 'Incisivo lateral sup. izquierdo', anterior: true },
  11: { fdi: 23, name: 'Canino sup. izquierdo', anterior: true },
  12: { fdi: 24, name: 'Primer premolar sup. izquierdo', anterior: false },
  13: { fdi: 25, name: 'Segundo premolar sup. izquierdo', anterior: false },
  14: { fdi: 26, name: 'Primer molar sup. izquierdo', anterior: false },
  15: { fdi: 27, name: 'Segundo molar sup. izquierdo', anterior: false },
  16: { fdi: 28, name: 'Tercer molar sup. izquierdo', anterior: false },
  17: { fdi: 38, name: 'Tercer molar inf. izquierdo', anterior: false },
  18: { fdi: 37, name: 'Segundo molar inf. izquierdo', anterior: false },
  19: { fdi: 36, name: 'Primer molar inf. izquierdo', anterior: false },
  20: { fdi: 35, name: 'Segundo premolar inf. izquierdo', anterior: false },
  21: { fdi: 34, name: 'Primer premolar inf. izquierdo', anterior: false },
  22: { fdi: 33, name: 'Canino inf. izquierdo', anterior: true },
  23: { fdi: 32, name: 'Incisivo lateral inf. izquierdo', anterior: true },
  24: { fdi: 31, name: 'Incisivo central inf. izquierdo', anterior: true },
  25: { fdi: 41, name: 'Incisivo central inf. derecho', anterior: true },
  26: { fdi: 42, name: 'Incisivo lateral inf. derecho', anterior: true },
  27: { fdi: 43, name: 'Canino inf. derecho', anterior: true },
  28: { fdi: 44, name: 'Primer premolar inf. derecho', anterior: false },
  29: { fdi: 45, name: 'Segundo premolar inf. derecho', anterior: false },
  30: { fdi: 46, name: 'Primer molar inf. derecho', anterior: false },
  31: { fdi: 47, name: 'Segundo molar inf. derecho', anterior: false },
  32: { fdi: 48, name: 'Tercer molar inf. derecho', anterior: false },
};

const getSurfacesForTooth = (id: number): ToothSurface[] => {
  const info = TOOTH_INFO[id];
  const center: ToothSurface = info?.anterior ? 'incisal' : 'oclusal';
  return [center, 'vestibular', 'lingual', 'mesial', 'distal'];
};

const getSurfaceDisplayName = (surface: ToothSurface, toothId: number): string => {
  if (surface === 'lingual') return toothId <= 16 ? 'Palatino' : 'Lingual';
  const names: Record<ToothSurface, string> = {
    oclusal: 'Oclusal', incisal: 'Incisal', vestibular: 'Vestibular',
    lingual: 'Lingual', mesial: 'Mesial', distal: 'Distal',
  };
  return names[surface];
};

/* ================================================================
   CONDITION THEMES — 12 clinical conditions (colors per spec)
   ================================================================ */
interface ConditionTheme {
  label: string;
  abbr: string;
  color: string;
  bg: string;
  border: string;
  group: 'estado' | 'tratamiento' | 'especial';
  icon: React.FC<{ size?: number; className?: string }>;
  wholeToothOnly?: boolean;
  overlay?: 'x' | 'circle' | 'crown' | 'question';
}

const conditionThemes: Record<ClinicalCondition, ConditionTheme> = {
  healthy:               { label: 'Sano',            abbr: 'SN',  color: '#94A3B8', bg: 'bg-slate-100',   border: 'border-slate-300',   group: 'estado',      icon: Shield },
  caries:                { label: 'Caries',           abbr: 'CA',  color: '#EF4444', bg: 'bg-red-50',      border: 'border-red-200',     group: 'estado',      icon: Crosshair },
  obturado:              { label: 'Obturado',         abbr: 'OB',  color: '#3B82F6', bg: 'bg-blue-50',     border: 'border-blue-200',    group: 'estado',      icon: Square },
  fractura:              { label: 'Fractura',         abbr: 'FR',  color: '#8B5CF6', bg: 'bg-violet-50',   border: 'border-violet-200',  group: 'estado',      icon: AlertTriangle },
  extraccion_indicada:   { label: 'Extracción Ind.',  abbr: 'EI',  color: '#F97316', bg: 'bg-orange-50',   border: 'border-orange-200',  group: 'tratamiento', icon: XIcon },
  tratamiento_conducto:  { label: 'Endodoncia',       abbr: 'EN',  color: '#EC4899', bg: 'bg-pink-50',     border: 'border-pink-200',    group: 'tratamiento', icon: Zap },
  corona_indicada:       { label: 'Corona Ind.',      abbr: 'CI',  color: '#F59E0B', bg: 'bg-amber-50',    border: 'border-amber-200',   group: 'tratamiento', icon: Hexagon },
  protesis_implante:     { label: 'Prótesis/Impl.',   abbr: 'PI',  color: '#3b82f6', bg: 'bg-blue-50',  border: 'border-blue-200', group: 'tratamiento', icon: Diamond },
  ausente:               { label: 'Ausente',          abbr: 'AU',  color: '#94A3B8', bg: 'bg-slate-100',   border: 'border-slate-300',   group: 'especial',    icon: XIcon,   wholeToothOnly: true, overlay: 'x' },
  implante_presente:     { label: 'Implante',         abbr: 'IP',  color: '#3b82f6', bg: 'bg-blue-50',  border: 'border-blue-200', group: 'especial',    icon: Target,  wholeToothOnly: true, overlay: 'circle' },
  corona_presente:       { label: 'Corona Presente',  abbr: 'CP',  color: '#F59E0B', bg: 'bg-amber-50',    border: 'border-amber-200',   group: 'especial',    icon: Star,    wholeToothOnly: true, overlay: 'crown' },
  en_observacion:        { label: 'En Observación',   abbr: 'OBS', color: '#6366F1', bg: 'bg-indigo-50',   border: 'border-indigo-200',  group: 'especial',    icon: Eye,     wholeToothOnly: true, overlay: 'question' },
};

const CONDITION_GROUPS: { key: string; label: string; conditions: ClinicalCondition[] }[] = [
  { key: 'estado', label: 'Estado', conditions: ['healthy', 'caries', 'obturado', 'fractura'] },
  { key: 'tratamiento', label: 'Tratamiento Indicado', conditions: ['extraccion_indicada', 'tratamiento_conducto', 'corona_indicada', 'protesis_implante'] },
  { key: 'especial', label: 'Estado Especial', conditions: ['ausente', 'implante_presente', 'corona_presente', 'en_observacion'] },
];

/* ================================================================
   UTILITY FUNCTIONS
   ================================================================ */
const getSurfaceColor = (surfaces: SurfaceData[], surface: ToothSurface): string => {
  const found = surfaces.find(s => s.surface === surface);
  if (!found || found.condition === 'healthy') return '#FFFFFF';
  return conditionThemes[found.condition]?.color || '#FFFFFF';
};

const getWholeToothCondition = (surfaces: SurfaceData[]): ClinicalCondition | null => {
  for (const s of surfaces) {
    if (conditionThemes[s.condition]?.wholeToothOnly) return s.condition;
  }
  return null;
};

const getConditionCount = (surfaces: SurfaceData[]): number =>
  surfaces.filter(s => s.condition !== 'healthy').length;

/* ================================================================
   ANATOMICAL TOOTH SVG SHAPES — extracted from original build
   ViewBox: 0 0 100 140
   ================================================================ */
type ToothType = 'molar' | 'premolar' | 'canine' | 'incisor';

const getToothType = (id: number): ToothType => {
  const molars = [1,2,3,14,15,16,17,18,19,30,31,32];
  const premolars = [4,5,12,13,20,21,28,29];
  const canines = [6,11,22,27];
  if (molars.includes(id)) return 'molar';
  if (premolars.includes(id)) return 'premolar';
  if (canines.includes(id)) return 'canine';
  return 'incisor';
};

const TOOTH_OUTLINES: Record<ToothType, string> = {
  molar:    'M15 30C15 15 30 8 50 8C70 8 85 15 85 30C85 50 80 80 75 110C70 125 60 130 50 130C40 130 30 125 25 110C20 80 15 50 15 30Z',
  premolar: 'M22 28C22 16 35 10 50 10C65 10 78 16 78 28C78 48 74 80 68 112C62 126 50 130 50 130C50 130 38 126 32 112C26 80 22 48 22 28Z',
  canine:   'M28 28C28 18 40 12 50 12C60 12 72 18 72 28C72 48 68 82 62 112C58 128 50 132 42 128C32 112 28 48 28 28Z',
  incisor:  'M25 22C25 14 35 10 50 10C65 10 75 14 75 22C75 42 72 82 65 112C60 126 50 130 40 124C30 108 25 42 25 22Z',
};

/* Small 5-surface oclusal cross diagram (positioned below the tooth) */
const MINI_SURFACE_PATHS: Record<string, string> = {
  vestibular: 'M 2 2 L 22 2 L 17 8 L 7 8 Z',
  distal:     'M 22 2 L 22 22 L 17 17 L 17 8 Z',
  lingual:    'M 22 22 L 2 22 L 7 17 L 17 17 Z',
  mesial:     'M 2 22 L 2 2 L 7 8 L 7 17 Z',
  center:     'M 7 8 L 17 8 L 17 17 L 7 17 Z',
};

const MINI_SURFACE_LABEL_POS: Record<string, [number, number]> = {
  vestibular: [12, 5],
  distal: [19.5, 12],
  lingual: [12, 19.5],
  mesial: [4.5, 12],
  center: [12, 13],
};

/* ================================================================
   PROPS
   ================================================================ */
interface OdontogramProps {
  patientId: string;
  teeth: ToothData[];
  onUpdate: (teeth: ToothData[]) => void;
  snapshots?: OdontogramSnapshot[];
}

/* ================================================================
   TOOTH DIAGRAM — Interactive 5-surface SVG with tooltip
   ================================================================ */
interface ToothDiagramProps {
  tooth: ToothData;
  selectedCondition: ClinicalCondition;
  onSurfaceClick: (toothId: number, surface: ToothSurface) => void;
  onClearSurface: (toothId: number, surface: ToothSurface) => void;
  size?: number;
  highlight?: boolean;
  readOnly?: boolean;
}

const ToothDiagram: React.FC<ToothDiagramProps> = React.memo(({
  tooth, selectedCondition, onSurfaceClick, onClearSurface,
  size = 54, highlight = false, readOnly = false,
}) => {
  const [hoveredSurface, setHoveredSurface] = useState<ToothSurface | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const longPressRef = useRef<{ timer: number | null; triggered: boolean }>({ timer: null, triggered: false });

  const wholeCond = getWholeToothCondition(tooth.surfaces);
  const isAbsent = wholeCond === 'ausente';
  const hasSpecial = wholeCond !== null;
  const info = TOOTH_INFO[tooth.id];
  const surfaces = getSurfacesForTooth(tooth.id);
  const condCount = getConditionCount(tooth.surfaces);
  const toothType = getToothType(tooth.id);
  const outlinePath = TOOTH_OUTLINES[toothType];
  const isUpper = tooth.id <= 16;
  const toothW = size;
  const toothH = Math.round(size * 1.5);
  const miniSize = Math.round(size * 0.5);

  // Dominant color for the anatomical silhouette
  const dominantColor = useMemo(() => {
    if (hasSpecial) return conditionThemes[wholeCond!].color;
    const activeSurfaces = tooth.surfaces.filter(s => s.condition !== 'healthy');
    if (activeSurfaces.length === 0) return null;
    // Use the color of the first (most important) condition
    return conditionThemes[activeSurfaces[0].condition]?.color || null;
  }, [tooth.surfaces, hasSpecial, wholeCond]);

  const handleContextMenu = useCallback((e: React.MouseEvent, surface: ToothSurface) => {
    e.preventDefault();
    e.stopPropagation();
    if (!readOnly) onClearSurface(tooth.id, surface);
  }, [tooth.id, onClearSurface, readOnly]);

  const handlePointerDown = useCallback((surface: ToothSurface) => {
    if (readOnly) return;
    longPressRef.current.triggered = false;
    longPressRef.current.timer = window.setTimeout(() => {
      longPressRef.current.triggered = true;
      onClearSurface(tooth.id, surface);
    }, 600);
  }, [tooth.id, onClearSurface, readOnly]);

  const handlePointerUp = useCallback(() => {
    if (longPressRef.current.timer) {
      window.clearTimeout(longPressRef.current.timer);
      longPressRef.current.timer = null;
    }
  }, []);

  const handleClick = useCallback((surface: ToothSurface) => {
    if (readOnly || longPressRef.current.triggered) return;
    onSurfaceClick(tooth.id, surface);
  }, [tooth.id, onSurfaceClick, readOnly]);

  const clipId = `tooth-clip-${tooth.id}`;
  const gradId = `tooth-grad-${tooth.id}`;

  /* --- Absent tooth --- */
  if (isAbsent) {
    return (
      <div
        className="flex flex-col items-center gap-0.5 relative group"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div style={{ width: toothW, height: toothH }} className="relative flex items-center justify-center opacity-30">
          <svg viewBox="0 0 100 140" width={toothW} height={toothH}>
            <path d={outlinePath} fill="#CBD5E1" stroke="#94A3B8" strokeWidth="2.5" />
            <line x1="25" y1="20" x2="75" y2="120" stroke="#64748B" strokeWidth="3" />
            <line x1="75" y1="20" x2="25" y2="120" stroke="#64748B" strokeWidth="3" />
          </svg>
        </div>
        <span className="text-xs font-black text-slate-400 tabular-nums">{tooth.id}</span>

        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none z-50 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs whitespace-nowrap shadow-2xl min-w-[140px]">
              <p className="font-black text-sm mb-0.5">{info?.name}</p>
              <p className="text-slate-500 text-[9px] mb-1">Universal: {tooth.id} | FDI: {info?.fdi}</p>
              <p className="text-slate-500 italic border-t border-slate-700 pt-1">Ausente / Extraído</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const specialColor = hasSpecial ? conditionThemes[wholeCond!].color : null;
  const specialOverlay = hasSpecial ? conditionThemes[wholeCond!].overlay : null;
  const hasConds = condCount > 0;

  return (
    <div
      className="flex flex-col items-center gap-0 group relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => { setShowTooltip(false); setHoveredSurface(null); }}
    >
      {/* Condition count indicator */}
      {condCount > 0 && !hasSpecial && (
        <div className={cn(
          "w-[6px] h-[6px] rounded-full absolute -top-1 left-1/2 -translate-x-1/2 z-10",
          condCount >= 3 ? "bg-red-500" : "bg-amber-400"
        )} />
      )}

      {highlight && (
        <div className="absolute inset-0 rounded-lg border-2 border-dashed border-blue-400 z-20 pointer-events-none" />
      )}

      {/* Anatomical tooth silhouette */}
      <div style={{ width: toothW, height: toothH }} className="relative">
        <svg viewBox="0 0 100 140" width={toothW} height={toothH} className="drop-shadow-sm">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              {dominantColor ? (
                <>
                  <stop offset="0%" stopColor={dominantColor} stopOpacity="0.9" />
                  <stop offset="60%" stopColor={dominantColor} stopOpacity="0.5" />
                  <stop offset="100%" stopColor={dominantColor} stopOpacity="0.2" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#F8FAFC" />
                  <stop offset="100%" stopColor="#E2E8F0" />
                </>
              )}
            </linearGradient>
          </defs>

          {/* Main tooth shape */}
          <path
            d={outlinePath}
            fill={hasSpecial ? specialColor! : `url(#${gradId})`}
            stroke={hasConds || hasSpecial ? (dominantColor || '#E2E8F0') : '#E2E8F0'}
            strokeWidth="2.5"
            className="transition-all duration-300"
          />

          {/* Subtle anatomical crown line */}
          {!hasSpecial && (
            <path d="M30 40 L70 40" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" />
          )}

          {/* Special overlays on the anatomical shape */}
          {hasSpecial && specialOverlay === 'x' && (
            <g style={{ pointerEvents: 'none' }}>
              <line x1="30" y1="25" x2="70" y2="100" stroke="white" strokeWidth="3" />
              <line x1="70" y1="25" x2="30" y2="100" stroke="white" strokeWidth="3" />
            </g>
          )}
          {hasSpecial && specialOverlay === 'circle' && (
            <circle cx="50" cy="55" r="18" fill="none" stroke="white" strokeWidth="3" style={{ pointerEvents: 'none' }} />
          )}
          {hasSpecial && specialOverlay === 'crown' && (
            <g style={{ pointerEvents: 'none' }}>
              <rect x="32" y="20" width="36" height="30" rx="4" fill="none" stroke="white" strokeWidth="2.5" />
              <circle cx="50" cy="35" r="5" fill="white" />
            </g>
          )}
          {hasSpecial && specialOverlay === 'question' && (
            <text x="50" y="65" textAnchor="middle" fontSize="32" fontWeight="900" fill="white" style={{ pointerEvents: 'none' }}>?</text>
          )}
        </svg>
      </div>

      {/* Tooth number */}
      <span className={cn(
        "text-xs font-black tabular-nums transition-colors leading-tight",
        readOnly ? "text-slate-400" : "text-slate-500 group-hover:text-blue-600"
      )}>
        {tooth.id}
      </span>

      {/* Mini 5-surface cross diagram below the tooth */}
      {!hasSpecial && (
        <div style={{ width: miniSize, height: miniSize }} className="mt-0.5">
          <svg viewBox="0 0 24 24" width={miniSize} height={miniSize}>
            {surfaces.map((surface) => {
              const pathKey = (surface === 'oclusal' || surface === 'incisal') ? 'center' : surface;
              const fill = getSurfaceColor(tooth.surfaces, surface);
              const isActive = fill !== '#FFFFFF';
              const isHovered = hoveredSurface === surface && !readOnly;

              return (
                <g key={surface}>
                  <path
                    d={MINI_SURFACE_PATHS[pathKey]}
                    fill={isHovered && !readOnly ? (isActive ? fill : '#BFDBFE') : fill}
                    stroke={isActive ? fill : (isHovered && !readOnly ? '#93C5FD' : '#D1D5DB')}
                    strokeWidth={isHovered && !readOnly ? '0.9' : '0.6'}
                    style={{ cursor: readOnly ? 'default' : 'pointer', transition: 'fill 0.12s ease, stroke 0.12s ease' }}
                    onClick={(e) => { e.stopPropagation(); handleClick(surface); }}
                    onContextMenu={(e) => handleContextMenu(e, surface)}
                    onPointerDown={() => handlePointerDown(surface)}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onMouseEnter={() => setHoveredSurface(surface)}
                    onMouseLeave={() => setHoveredSurface(null)}
                  />
                </g>
              );
            })}
            {/* Labels on hover */}
            {hoveredSurface && !readOnly && surfaces.map(s => {
              const pathKey = (s === 'oclusal' || s === 'incisal') ? 'center' : s;
              const [cx, cy] = MINI_SURFACE_LABEL_POS[pathKey];
              const label =
                s === 'oclusal' ? 'O' : s === 'incisal' ? 'I' :
                s === 'vestibular' ? 'V' : s === 'lingual' ? (isUpper ? 'P' : 'L') :
                s === 'mesial' ? 'M' : 'D';
              const surfFill = getSurfaceColor(tooth.surfaces, s);
              return (
                <text
                  key={`lbl-${s}`} x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
                  fontSize="3.5" fontWeight="900"
                  fill={surfFill !== '#FFFFFF' ? 'white' : '#94A3B8'}
                  style={{ pointerEvents: 'none' }} opacity={0.9}
                >
                  {label}
                </text>
              );
            })}
          </svg>
        </div>
      )}

      {/* For special whole-tooth conditions, the tooth itself is clickable */}
      {hasSpecial && !readOnly && (
        <div
          className="absolute inset-0 cursor-pointer z-10"
          onClick={(e) => { e.stopPropagation(); handleClick('oclusal'); }}
          onContextMenu={(e) => handleContextMenu(e, 'oclusal')}
        />
      )}

      {/* Detailed tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="px-3 py-2.5 bg-slate-900 text-white rounded-xl text-xs whitespace-nowrap shadow-2xl min-w-[170px]">
            <p className="font-black text-sm mb-0.5">{info?.name}</p>
            <p className="text-slate-500 text-[9px] mb-1.5">Universal: {tooth.id} | FDI: {info?.fdi}</p>
            {tooth.surfaces.length > 0 ? (
              <div className="space-y-0.5 border-t border-slate-700 pt-1.5">
                {tooth.surfaces.map(s => (
                  <div key={s.surface} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: conditionThemes[s.condition]?.color }} />
                    <span className="text-slate-400">
                      {getSurfaceDisplayName(s.surface, tooth.id)}: {conditionThemes[s.condition]?.label}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 italic border-t border-slate-700 pt-1.5">Sin condiciones registradas</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

/* ================================================================
   CONDITION PANEL — Sidebar (desktop) / Bottom Sheet (mobile)
   ================================================================ */
interface ConditionPanelProps {
  selected: ClinicalCondition;
  onSelect: (c: ClinicalCondition) => void;
}

const ConditionPanel: React.FC<ConditionPanelProps> = React.memo(({ selected, onSelect }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const panelContent = (
    <div className="space-y-5">
      {/* Instructions */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-2">
          <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-700 font-bold leading-relaxed">
            <p>1. Selecciona una condición</p>
            <p>2. Click en la superficie del diente</p>
            <p className="text-blue-400 mt-1">Click derecho o mantener presionado → limpiar superficie</p>
          </div>
        </div>
      </div>

      {/* Active tool summary */}
      <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-blue-200 bg-blue-50/50">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
          style={{ backgroundColor: conditionThemes[selected].color }}
        >
          {React.createElement(conditionThemes[selected].icon, { size: 16, className: 'text-white' })}
        </div>
        <div>
          <p className="text-sm font-black text-slate-900">{conditionThemes[selected].label}</p>
          <p className="text-[9px] text-slate-500 font-bold">
            {conditionThemes[selected].wholeToothOnly ? 'Diente completo' : 'Por superficie'}
          </p>
        </div>
      </div>

      {/* Condition groups */}
      {CONDITION_GROUPS.map(group => (
        <div key={group.key}>
          <p className="text-[9px] font-black uppercase tracking-[2px] text-slate-400 mb-2">{group.label}</p>
          <div className="space-y-1">
            {group.conditions.map(cond => {
              const theme = conditionThemes[cond];
              const isActive = selected === cond;
              const Icon = theme.icon;
              return (
                <button
                  key={cond}
                  onClick={() => { onSelect(cond); setMobileOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border text-left",
                    isActive
                      ? "bg-blue-50 border-blue-400 text-slate-900 shadow-sm"
                      : `${theme.bg} ${theme.border} text-slate-600 hover:shadow-sm`
                  )}
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: isActive ? theme.color : `${theme.color}20` }}
                  >
                    <Icon size={12} style={{ color: isActive ? 'white' : theme.color }} />
                  </div>
                  <span className="flex-1">{theme.label}</span>
                  {isActive && <Check size={14} className="text-blue-500" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden xl:block w-64 flex-shrink-0">
        <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto hide-scrollbar pr-2">
          {panelContent}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 z-40">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border-t border-slate-300 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: conditionThemes[selected].color }}
            >
              {React.createElement(conditionThemes[selected].icon, { size: 12, className: 'text-white' })}
            </div>
            <span className="text-sm font-black text-slate-700">{conditionThemes[selected].label}</span>
            <span className="text-[9px] text-slate-500 font-bold">— toca para cambiar</span>
          </div>
          <ChevronUp size={16} className={cn("text-slate-500 transition-transform", mobileOpen && "rotate-180")} />
        </button>

        {mobileOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/20 z-[-1] animate-in fade-in duration-200"
                onClick={() => setMobileOpen(false)}
              />
              <div
                className="overflow-hidden bg-white border-t border-slate-300 animate-in slide-in-from-bottom-2 duration-300"
              >
                <div className="max-h-[50vh] overflow-y-auto p-4 pb-6">
                  {panelContent}
                </div>
              </div>
            </>
          )}
      </div>
    </>
  );
});

/* ================================================================
   CLINICAL SUMMARY PANEL — Collapsible with export
   ================================================================ */
const ClinicalSummaryPanel: React.FC<{ teeth: ToothData[] }> = React.memo(({ teeth }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    const condCounts: Record<string, { surfaces: number; teeth: Set<number> }> = {};
    let totalAffected = 0;

    teeth.forEach(t => {
      const hasConds = t.surfaces.some(s => s.condition !== 'healthy');
      if (hasConds) totalAffected++;
      t.surfaces.forEach(s => {
        if (s.condition === 'healthy') return;
        if (!condCounts[s.condition]) condCounts[s.condition] = { surfaces: 0, teeth: new Set() };
        condCounts[s.condition].surfaces++;
        condCounts[s.condition].teeth.add(t.id);
      });
    });

    const healthyCount = 32 - totalAffected;
    const integrity = Math.round((healthyCount / 32) * 100);
    const treatmentTeeth = teeth.filter(t =>
      t.surfaces.some(s => conditionThemes[s.condition]?.group === 'tratamiento')
    );

    return { condCounts, totalAffected, healthyCount, integrity, treatmentTeeth };
  }, [teeth]);

  const exportText = useMemo(() => {
    const lines: string[] = [];
    teeth.forEach(t => {
      const conds = t.surfaces.filter(s => s.condition !== 'healthy');
      if (conds.length === 0) return;
      const info = TOOTH_INFO[t.id];
      const surfaceTexts = conds.map(s =>
        `${getSurfaceDisplayName(s.surface, t.id)} ${conditionThemes[s.condition].label.toLowerCase()}`
      );
      lines.push(`Diente ${info?.fdi || t.id}: ${surfaceTexts.join(', ')}`);
    });
    return lines.join('\n') || 'Sin hallazgos registrados';
  }, [teeth]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(exportText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [exportText]);

  const condEntries = Object.entries(stats.condCounts) as [string, { surfaces: number; teeth: Set<number> }][];

  return (
    <div className="glass-panel rounded-3xl border border-white/60 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
            <Crosshair size={16} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-black text-slate-900">Resumen del Odontograma</p>
            <p className="text-[9px] text-slate-500 font-bold">
              {stats.totalAffected} dientes afectados · {condEntries.length} condicion{condEntries.length !== 1 ? 'es' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            <div className="px-2 py-1 bg-blue-50 rounded-lg">
              <span className="text-xs font-black text-blue-600">{stats.integrity}%</span>
            </div>
          </div>
          {expanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </div>
      </button>

      {expanded && (
          <div
            className="border-t border-slate-300 overflow-hidden animate-in slide-in-from-top-2 duration-300"
          >
            <div className="p-5 space-y-5">
              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl text-center">
                  <p className="text-[9px] font-black uppercase tracking-[1px] text-slate-500 mb-1">Integridad</p>
                  <div className="text-2xl font-black text-slate-900 tabular-nums">{stats.integrity}%</div>
                  <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ 
                        backgroundColor: stats.integrity > 70 ? '#3b82f6' : stats.integrity > 40 ? '#F59E0B' : '#EF4444',
                        width: `${stats.integrity}%` 
                      }}
                    />
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl text-center">
                  <p className="text-[9px] font-black uppercase tracking-[1px] text-slate-500 mb-1">Sanos</p>
                  <div className="text-2xl font-black text-blue-600 tabular-nums">{stats.healthyCount}</div>
                  <p className="text-[9px] text-slate-500">de 32</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl text-center">
                  <p className="text-[9px] font-black uppercase tracking-[1px] text-slate-500 mb-1">Afectados</p>
                  <div className="text-2xl font-black text-rose-500 tabular-nums">{stats.totalAffected}</div>
                  <p className="text-[9px] text-slate-500">dientes</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl text-center">
                  <p className="text-[9px] font-black uppercase tracking-[1px] text-slate-500 mb-1">Condiciones</p>
                  <div className="text-2xl font-black text-blue-600 tabular-nums">{condEntries.length}</div>
                  <p className="text-[9px] text-slate-500">distintas</p>
                </div>
              </div>

              {/* Per-condition counts */}
              {condEntries.length > 0 && (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[2px] text-slate-400 mb-2">Conteo por Condición</p>
                  <div className="space-y-1.5">
                    {condEntries.map(([cond, data]) => {
                      const theme = conditionThemes[cond as ClinicalCondition];
                      return (
                        <div key={cond} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: theme?.color }} />
                            <span className="text-xs font-bold text-slate-700">{theme?.label}</span>
                          </div>
                          <span className="text-xs font-black text-slate-500">
                            {data.surfaces} superficie{data.surfaces !== 1 ? 's' : ''} en {data.teeth.size} diente{data.teeth.size !== 1 ? 's' : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Treatment teeth list */}
              {stats.treatmentTeeth.length > 0 && (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[2px] text-slate-400 mb-2">Tratamiento Indicado</p>
                  <div className="space-y-1">
                    {stats.treatmentTeeth.map(t => {
                      const info = TOOTH_INFO[t.id];
                      const treatments = t.surfaces.filter(s => conditionThemes[s.condition]?.group === 'tratamiento');
                      return (
                        <div key={t.id} className="flex items-center gap-2 p-2.5 bg-orange-50 rounded-xl">
                          <span className="text-xs font-black text-slate-700 flex-shrink-0">
                            Pieza {info?.fdi}
                          </span>
                          <span className="text-xs text-slate-500">
                            {treatments.map(s => conditionThemes[s.condition].label).join(', ')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Export button */}
              <button
                onClick={handleCopy}
                className={cn(
                  "flex items-center justify-center gap-2 w-full py-3 rounded-xl text-xs font-black uppercase tracking-[1px] transition-all border",
                  copied
                    ? "bg-blue-100 text-blue-700 border-blue-200"
                    : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
                )}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado al portapapeles' : 'Exportar resumen como texto'}
              </button>
            </div>
          </div>
        )}
    </div>
  );
});

/* ================================================================
   SNAPSHOT HISTORY with Date Selector & Compare Mode
   ================================================================ */
interface SnapshotHistoryProps {
  snapshots: OdontogramSnapshot[];
  currentTeeth: ToothData[];
  compareMode: boolean;
  onToggleCompare: () => void;
  compareA: string;
  compareB: string;
  onSetCompareA: (id: string) => void;
  onSetCompareB: (id: string) => void;
  changedTeeth: Set<number>;
  viewingSnapshotId: string | null;
  onViewSnapshot: (id: string | null) => void;
}

const SnapshotHistory: React.FC<SnapshotHistoryProps> = React.memo(({
  snapshots, currentTeeth,
  compareMode, onToggleCompare, compareA, compareB, onSetCompareA, onSetCompareB, changedTeeth,
  viewingSnapshotId, onViewSnapshot,
}) => {
  const [listExpanded, setListExpanded] = useState(false);

  const options = useMemo(() => [
    { id: 'current', label: 'Estado Actual' },
    ...snapshots.map(s => ({
      id: s.id,
      label: new Date(s.date).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    }))
  ], [snapshots]);

  const getTeethForId = useCallback((id: string): ToothData[] => {
    if (id === 'current') return currentTeeth;
    return snapshots.find(s => s.id === id)?.teeth || [];
  }, [currentTeeth, snapshots]);

  return (
    <div className="glass-panel rounded-3xl border border-white/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
            <Clock size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">Historial de Estados</p>
            <p className="text-[9px] text-slate-500 font-bold">{snapshots.length} registro{snapshots.length !== 1 ? 's' : ''} guardado{snapshots.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {snapshots.length >= 1 && (
            <button
              onClick={onToggleCompare}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-[1px] transition-all border",
                compareMode ? "bg-blue-600 text-white border-blue-600" : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
              )}
            >
              <ArrowLeftRight size={12} />
              Comparar
            </button>
          )}
          {snapshots.length > 0 && (
            <button
              onClick={() => setListExpanded(!listExpanded)}
              className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-colors"
            >
              {listExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
            </button>
          )}
        </div>
      </div>

      {/* Date selector to view past snapshots */}
      {snapshots.length > 0 && (
        <div className="px-5 pb-3 flex items-center gap-3">
          <label className="text-[9px] font-black uppercase tracking-[2px] text-slate-500 flex-shrink-0">Ver versión:</label>
          <select
            value={viewingSnapshotId || 'current'}
            onChange={e => onViewSnapshot(e.target.value === 'current' ? null : e.target.value)}
            className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-700"
          >
            {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          {viewingSnapshotId && (
            <button
              onClick={() => onViewSnapshot(null)}
              className="px-3 py-2 bg-amber-100 text-amber-700 rounded-xl text-xs font-black border border-amber-200"
            >
              Volver al actual
            </button>
          )}
        </div>
      )}

      {/* Compare selectors */}
      {compareMode && (
          <div
            className="border-t border-slate-300 overflow-hidden animate-in slide-in-from-top-2 duration-300"
          >
            <div className="p-5">
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 w-full">
                  <label className="text-[9px] font-black uppercase tracking-[2px] text-slate-500 mb-1 block">Fecha A</label>
                  <select
                    value={compareA}
                    onChange={e => onSetCompareA(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-700"
                  >
                    {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                </div>
                <ArrowLeftRight size={16} className="text-slate-400 flex-shrink-0 mt-4 md:mt-0" />
                <div className="flex-1 w-full">
                  <label className="text-[9px] font-black uppercase tracking-[2px] text-slate-500 mb-1 block">Fecha B</label>
                  <select
                    value={compareB}
                    onChange={e => onSetCompareB(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-700"
                  >
                    {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {changedTeeth.size > 0 && (
                <div className="mt-3 p-2.5 bg-blue-50 rounded-xl">
                  <p className="text-xs font-bold text-blue-700">
                    <span className="font-black">{changedTeeth.size}</span> diente{changedTeeth.size !== 1 ? 's' : ''} con cambios — resaltados con borde punteado azul
                  </p>
                </div>
              )}

              {/* Mini compare grids */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {[compareA, compareB].map((snapId, idx) => {
                  const snapTeeth = getTeethForId(snapId);
                  const label = options.find(o => o.id === snapId)?.label || '';
                  return (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-[9px] font-black uppercase tracking-[1px] text-slate-500 mb-2">{label}</p>
                      <div className="flex flex-wrap gap-0.5">
                        {snapTeeth.map(t => {
                          const wholeCond = getWholeToothCondition(t.surfaces);
                          const isChanged = changedTeeth.has(t.id);
                          const hasConditions = t.surfaces.length > 0;
                          const color = hasConditions
                            ? (conditionThemes[wholeCond || t.surfaces[0]?.condition]?.color || '#3B82F6')
                            : undefined;
                          return (
                            <div
                              key={t.id}
                              className={cn(
                                "w-5 h-5 rounded-sm flex items-center justify-center text-[6px] font-black",
                                isChanged && "ring-1 ring-blue-400",
                                !hasConditions && "bg-white text-slate-400 border border-slate-300",
                              )}
                              style={hasConditions ? { backgroundColor: color, color: 'white' } : {}}
                            >
                              {t.id}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      {/* Snapshot list */}
      {listExpanded && snapshots.length > 0 && (
          <div
            className="border-t border-slate-300 overflow-hidden animate-in slide-in-from-top-2 duration-300"
          >
            <div className="p-5 space-y-2 max-h-48 overflow-y-auto hide-scrollbar">
              {snapshots.map((snap, i) => {
                const date = new Date(snap.date);
                const affected = snap.teeth.filter(t => t.surfaces && t.surfaces.length > 0).length;
                const isViewing = viewingSnapshotId === snap.id;
                return (
                  <button
                    key={snap.id}
                    onClick={() => onViewSnapshot(isViewing ? null : snap.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left",
                      isViewing ? "bg-blue-50 border border-blue-200" : "bg-slate-50 hover:bg-slate-100"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm text-[9px] font-black text-slate-500">
                        {snapshots.length - i}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-700">
                          {date.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[9px] text-slate-500">
                          {date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-slate-500">{affected} afectados</span>
                      {isViewing && (
                        <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md text-[8px] font-black uppercase">Viendo</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
    </div>
  );
});

/* ================================================================
   MAIN ODONTOGRAM COMPONENT
   ================================================================ */
const Odontogram: React.FC<OdontogramProps> = ({ patientId, teeth, onUpdate, snapshots = [] }) => {
  const [selectedCondition, setSelectedCondition] = useState<ClinicalCondition>('caries');
  const [viewingSnapshotId, setViewingSnapshotId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState<string>('current');
  const [compareB, setCompareB] = useState<string>(snapshots[0]?.id || '');

  // Teeth to display (current or from snapshot)
  const displayTeeth = useMemo(() => {
    if (!viewingSnapshotId) return teeth;
    const snap = snapshots.find(s => s.id === viewingSnapshotId);
    return snap?.teeth || teeth;
  }, [viewingSnapshotId, teeth, snapshots]);

  const isReadOnly = viewingSnapshotId !== null;

  // Changed teeth for compare highlighting
  const changedTeeth = useMemo(() => {
    if (!compareMode) return new Set<number>();
    const getTeeth = (id: string): ToothData[] => {
      if (id === 'current') return teeth;
      return snapshots.find(s => s.id === id)?.teeth || [];
    };
    const teethA = getTeeth(compareA);
    const teethB = getTeeth(compareB);
    const changed = new Set<number>();
    for (let i = 0; i < 32; i++) {
      const a = teethA[i];
      const b = teethB[i];
      if (!a || !b) continue;
      const sortSurfaces = (surfs: SurfaceData[]) =>
        [...surfs].sort((x, y) => x.surface.localeCompare(y.surface));
      if (JSON.stringify(sortSurfaces(a.surfaces)) !== JSON.stringify(sortSurfaces(b.surfaces))) {
        changed.add(a.id);
      }
    }
    return changed;
  }, [compareMode, compareA, compareB, teeth, snapshots]);

  /* --- Surface click handler --- */
  const handleSurfaceClick = useCallback((toothId: number, surface: ToothSurface) => {
    const theme = conditionThemes[selectedCondition];
    const toothInfo = TOOTH_INFO[toothId];

    const updatedTeeth = teeth.map(t => {
      if (t.id !== toothId) return t;
      const newSurfaces = [...t.surfaces];

      // Whole-tooth conditions
      if (theme.wholeToothOnly || selectedCondition === 'healthy') {
        if (selectedCondition === 'healthy') {
          sileo.success({ title: `${toothInfo.name} marcado como sano ✅`, description: 'Superficie restaurada y sin hallazgos' });
          return { ...t, surfaces: [] };
        }
        const existing = newSurfaces.find(s => s.condition === selectedCondition);
        if (existing) return { ...t, surfaces: [] };
        sileo.warning({ title: `Condición aplicada al ${toothInfo.name}`, description: `${selectedCondition.replace(/([A-Z])/g, ' $1').toLowerCase()}` });
        return { ...t, surfaces: [{ surface: 'oclusal' as ToothSurface, condition: selectedCondition }] };
      }

      // Per-surface conditions
      const existingIdx = newSurfaces.findIndex(s => s.surface === surface);
      if (existingIdx !== -1) {
        if (newSurfaces[existingIdx].condition === selectedCondition) {
          newSurfaces.splice(existingIdx, 1);
          sileo.info({ title: `Condición removida de superficie ${surface}`, description: `${toothInfo.name} - Superficie limpia` });
        } else {
          newSurfaces[existingIdx] = { surface, condition: selectedCondition };
          sileo.success({ title: `Superficie ${surface} actualizada`, description: `${toothInfo.name} - ${selectedCondition}` });
        }
      } else {
        newSurfaces.push({ surface, condition: selectedCondition });
        sileo.success({ title: `Hallazgo registrado en superficie ${surface}`, description: `${toothInfo.name} - ${selectedCondition}` });
      }
      return { ...t, surfaces: newSurfaces };
    });

    onUpdate(updatedTeeth);
  }, [teeth, selectedCondition, onUpdate, patientId]);

  /* --- Clear surface (right-click / long-press) --- */
  const handleClearSurface = useCallback((toothId: number, surface: ToothSurface) => {
    const toothBefore = teeth.find(t => t.id === toothId);
    if (!toothBefore) return;

    const wholeCond = getWholeToothCondition(toothBefore.surfaces);

    const updatedTeeth = teeth.map(t => {
      if (t.id !== toothId) return t;
      if (wholeCond) return { ...t, surfaces: [] };
      return { ...t, surfaces: t.surfaces.filter(s => s.surface !== surface) };
    });

    onUpdate(updatedTeeth);
  }, [teeth, onUpdate, patientId]);

  const handleToggleCompare = useCallback(() => {
    setCompareMode(prev => {
      if (!prev && snapshots.length > 0) {
        setCompareA('current');
        setCompareB(snapshots[0].id);
      }
      return !prev;
    });
  }, [snapshots]);

  /* --- Loading --- */
  if (!teeth || teeth.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-4">
        <div className="w-11 h-11 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-bold text-sm uppercase tracking-widest animate-pulse">Cargando odontograma…</p>
      </div>
    );
  }

  const upper = displayTeeth.slice(0, 16);
  const lower = displayTeeth.slice(16, 32);

  return (
    <div className="bg-white p-4 lg:p-6 rounded-2xl select-none border border-slate-300 shadow-sm transition-all duration-500">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight leading-tight mb-1">
            Odontograma
          </h3>
          <p className="text-slate-500 text-sm max-w-md leading-relaxed">
            Registra hallazgos por superficie. Los cambios se guardan automáticamente.
          </p>
        </div>
      </div>

      {/* Mobile Disclaimer */}
      <div className="md:hidden mb-4 p-3 bg-blue-50/80 border border-blue-200/50 rounded-xl flex items-start gap-2.5">
        <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs font-medium text-blue-800 leading-snug">
          Para una experiencia óptima al marcar piezas dentales, te recomendamos usar una <span className="font-bold">Tablet o Computadora</span>.
        </p>
      </div>

      {/* Read-only banner when viewing snapshot */}
      {isReadOnly && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-amber-600" />
            <span className="text-xs font-bold text-amber-700">
              Visualizando versión histórica — solo lectura
            </span>
          </div>
          <button
            onClick={() => setViewingSnapshotId(null)}
            className="px-3 py-1.5 bg-amber-200 text-amber-800 rounded-lg text-xs font-black hover:bg-amber-300 transition-colors"
          >
            Volver al actual
          </button>
        </div>
      )}

      {/* Main layout: sidebar + content */}
      <div className="flex gap-6">
        {!isReadOnly && (
          <ConditionPanel selected={selectedCondition} onSelect={setSelectedCondition} />
        )}

        <div className={cn("flex-1 space-y-2 relative pb-20 xl:pb-0")}>
          <div className="overflow-x-auto custom-scrollbar pb-8 -mx-6 px-6 lg:mx-0 lg:px-0">
            <div className="min-w-[850px] relative mx-auto">
              {/* Quadrant Vertical Center Line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 z-0 hidden md:block" />
          
          {/* Quadrant Labels */}
          <div className="absolute inset-0 pointer-events-none z-0 hidden md:block">
            <span className="absolute top-0 left-1/4 -translate-x-1/2 text-[40px] font-black text-slate-50 opacity-[0.03]">1</span>
            <span className="absolute top-0 right-1/4 translate-x-1/2 text-[40px] font-black text-slate-50 opacity-[0.03]">2</span>
            <span className="absolute bottom-20 left-1/4 -translate-x-1/2 text-[40px] font-black text-slate-50 opacity-[0.03]">4</span>
            <span className="absolute bottom-20 right-1/4 translate-x-1/2 text-[40px] font-black text-slate-50 opacity-[0.03]">3</span>
            
            <span className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-black text-slate-400 uppercase tracking-widest">Derecho</span>
            <span className="absolute right-0 top-1/2 -translate-y-1/2 rotate-90 text-xs font-black text-slate-400 uppercase tracking-widest">Izquierdo</span>
          </div>

          {/* Upper Arch */}
          <div className="flex flex-col items-center relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-slate-200" />
              <span className="text-xs font-black uppercase text-slate-500 tracking-[3px]">Arcada Superior</span>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-slate-200" />
            </div>
            <div className="flex flex-nowrap md:flex-wrap justify-center gap-x-1 md:gap-x-3 gap-y-6">
              {upper.map(tooth => (
                <ToothDiagram
                  key={tooth.id}
                  tooth={tooth}
                  selectedCondition={selectedCondition}
                  onSurfaceClick={handleSurfaceClick}
                  onClearSurface={handleClearSurface}
                  highlight={compareMode && changedTeeth.has(tooth.id)}
                  readOnly={isReadOnly}
                />
              ))}
            </div>
          </div>

          {/* Horizontal Quadrant Line */}
          <div className="flex items-center justify-center py-8 relative z-10">
            <div className="h-px w-full max-w-4xl bg-slate-300" />
          </div>

          {/* Lower Arch */}
          <div className="flex flex-col items-center relative z-10">
            <div className="flex flex-nowrap md:flex-wrap justify-center gap-x-1 md:gap-x-3 gap-y-6">
              {/* Lower Arch Reordered to match clinical standard: Quadrant 4 (Right) | Quadrant 3 (Left) */}
              {/* FDI 48-41 (IDs 32 to 25) */}
              {[32, 31, 30, 29, 28, 27, 26, 25].map(id => {
                const tooth = lower.find(t => t.id === id);
                if (!tooth) return null;
                return (
                  <ToothDiagram
                    key={tooth.id}
                    tooth={tooth}
                    selectedCondition={selectedCondition}
                    onSurfaceClick={handleSurfaceClick}
                    onClearSurface={handleClearSurface}
                    highlight={compareMode && changedTeeth.has(tooth.id)}
                    readOnly={isReadOnly}
                  />
                );
              })}
              
              {/* Separator gap for the vertical line */}
              <div className="w-1 hidden md:block" />

              {/* FDI 31-38 (IDs 24 to 17) */}
              {[24, 23, 22, 21, 20, 19, 18, 17].map(id => {
                const tooth = lower.find(t => t.id === id);
                if (!tooth) return null;
                return (
                  <ToothDiagram
                    key={tooth.id}
                    tooth={tooth}
                    selectedCondition={selectedCondition}
                    onSurfaceClick={handleSurfaceClick}
                    onClearSurface={handleClearSurface}
                    highlight={compareMode && changedTeeth.has(tooth.id)}
                    readOnly={isReadOnly}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-10">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-slate-200" />
              <span className="text-xs font-black uppercase text-slate-500 tracking-[3px]">Arcada Inferior</span>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-slate-200" />
            </div>
          </div>
            </div>
          </div>

          {/* Clinical Summary */}
          <ClinicalSummaryPanel teeth={displayTeeth} />

          {/* Snapshot History */}
          {snapshots.length > 0 && (
            <SnapshotHistory
              snapshots={snapshots}
              currentTeeth={teeth}
              compareMode={compareMode}
              onToggleCompare={handleToggleCompare}
              compareA={compareA}
              compareB={compareB}
              onSetCompareA={setCompareA}
              onSetCompareB={setCompareB}
              changedTeeth={changedTeeth}
              viewingSnapshotId={viewingSnapshotId}
              onViewSnapshot={setViewingSnapshotId}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Odontogram;
