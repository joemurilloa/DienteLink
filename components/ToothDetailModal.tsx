import React, { useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ToothData, SurfaceData, ToothSurface, ClinicalCondition } from '../types';
import { cn } from '../lib/utils';
import {
  X, ChevronLeft, ChevronRight, Shield, Zap, AlertTriangle,
  Hexagon, Diamond, Target, Star, Eye, Trash2, CheckCircle2,
  Sparkles, Crosshair, HelpCircle
} from 'lucide-react';

/* ─── Tooth information database ─── */
const TOOTH_INFO: Record<number, { fdi: number; name: string; anterior: boolean; type: string; arch: 'superior' | 'inferior'; quadrant: number }> = {
  1:  { fdi: 18, name: 'Tercer molar sup. derecho', anterior: false, type: 'Molar', arch: 'superior', quadrant: 1 },
  2:  { fdi: 17, name: 'Segundo molar sup. derecho', anterior: false, type: 'Molar', arch: 'superior', quadrant: 1 },
  3:  { fdi: 16, name: 'Primer molar sup. derecho', anterior: false, type: 'Molar', arch: 'superior', quadrant: 1 },
  4:  { fdi: 15, name: 'Segundo premolar sup. derecho', anterior: false, type: 'Premolar', arch: 'superior', quadrant: 1 },
  5:  { fdi: 14, name: 'Primer premolar sup. derecho', anterior: false, type: 'Premolar', arch: 'superior', quadrant: 1 },
  6:  { fdi: 13, name: 'Canino sup. derecho', anterior: true, type: 'Canino', arch: 'superior', quadrant: 1 },
  7:  { fdi: 12, name: 'Incisivo lateral sup. derecho', anterior: true, type: 'Incisivo', arch: 'superior', quadrant: 1 },
  8:  { fdi: 11, name: 'Incisivo central sup. derecho', anterior: true, type: 'Incisivo', arch: 'superior', quadrant: 1 },
  9:  { fdi: 21, name: 'Incisivo central sup. izquierdo', anterior: true, type: 'Incisivo', arch: 'superior', quadrant: 2 },
  10: { fdi: 22, name: 'Incisivo lateral sup. izquierdo', anterior: true, type: 'Incisivo', arch: 'superior', quadrant: 2 },
  11: { fdi: 23, name: 'Canino sup. izquierdo', anterior: true, type: 'Canino', arch: 'superior', quadrant: 2 },
  12: { fdi: 24, name: 'Primer premolar sup. izquierdo', anterior: false, type: 'Premolar', arch: 'superior', quadrant: 2 },
  13: { fdi: 25, name: 'Segundo premolar sup. izquierdo', anterior: false, type: 'Premolar', arch: 'superior', quadrant: 2 },
  14: { fdi: 26, name: 'Primer molar sup. izquierdo', anterior: false, type: 'Molar', arch: 'superior', quadrant: 2 },
  15: { fdi: 27, name: 'Segundo molar sup. izquierdo', anterior: false, type: 'Molar', arch: 'superior', quadrant: 2 },
  16: { fdi: 28, name: 'Tercer molar sup. izquierdo', anterior: false, type: 'Molar', arch: 'superior', quadrant: 2 },
  17: { fdi: 38, name: 'Tercer molar inf. izquierdo', anterior: false, type: 'Molar', arch: 'inferior', quadrant: 3 },
  18: { fdi: 37, name: 'Segundo molar inf. izquierdo', anterior: false, type: 'Molar', arch: 'inferior', quadrant: 3 },
  19: { fdi: 36, name: 'Primer molar inf. izquierdo', anterior: false, type: 'Molar', arch: 'inferior', quadrant: 3 },
  20: { fdi: 35, name: 'Segundo premolar inf. izquierdo', anterior: false, type: 'Premolar', arch: 'inferior', quadrant: 3 },
  21: { fdi: 34, name: 'Primer premolar inf. izquierdo', anterior: false, type: 'Premolar', arch: 'inferior', quadrant: 3 },
  22: { fdi: 33, name: 'Canino inf. izquierdo', anterior: true, type: 'Canino', arch: 'inferior', quadrant: 3 },
  23: { fdi: 32, name: 'Incisivo lateral inf. izquierdo', anterior: true, type: 'Incisivo', arch: 'inferior', quadrant: 3 },
  24: { fdi: 31, name: 'Incisivo central inf. izquierdo', anterior: true, type: 'Incisivo', arch: 'inferior', quadrant: 3 },
  25: { fdi: 41, name: 'Incisivo central inf. derecho', anterior: true, type: 'Incisivo', arch: 'inferior', quadrant: 4 },
  26: { fdi: 42, name: 'Incisivo lateral inf. derecho', anterior: true, type: 'Incisivo', arch: 'inferior', quadrant: 4 },
  27: { fdi: 43, name: 'Canino inf. derecho', anterior: true, type: 'Canino', arch: 'inferior', quadrant: 4 },
  28: { fdi: 44, name: 'Primer premolar inf. derecho', anterior: false, type: 'Premolar', arch: 'inferior', quadrant: 4 },
  29: { fdi: 45, name: 'Segundo premolar inf. derecho', anterior: false, type: 'Premolar', arch: 'inferior', quadrant: 4 },
  30: { fdi: 46, name: 'Primer molar inf. derecho', anterior: false, type: 'Molar', arch: 'inferior', quadrant: 4 },
  31: { fdi: 47, name: 'Segundo molar inf. derecho', anterior: false, type: 'Molar', arch: 'inferior', quadrant: 4 },
  32: { fdi: 48, name: 'Tercer molar inf. derecho', anterior: false, type: 'Molar', arch: 'inferior', quadrant: 4 },
};

/* SVG surface cross coordinates (viewBox 0 0 24 24) */
const SURFACE_PATHS: Record<string, string> = {
  vestibular: 'M 2 2 L 22 2 L 17 8 L 7 8 Z',
  distal:     'M 22 2 L 22 22 L 17 17 L 17 8 Z',
  lingual:    'M 22 22 L 2 22 L 7 17 L 17 17 Z',
  mesial:     'M 2 22 L 2 2 L 7 8 L 7 17 Z',
  center:     'M 7 8 L 17 8 L 17 17 L 7 17 Z',
};

const SURFACE_LABEL_POS: Record<string, [number, number]> = {
  vestibular: [12, 5],
  distal:     [19.5, 12],
  lingual:    [12, 19.5],
  mesial:     [4.5, 12],
  center:     [12, 12.5],
};

interface ConditionMeta {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ElementType;
}

const CONDITION_METAS: Record<ClinicalCondition, ConditionMeta> = {
  healthy:              { label: 'Sano',            color: '#94A3B8', bg: 'bg-slate-100',  border: 'border-slate-300', icon: Shield },
  caries:               { label: 'Caries',           color: '#EF4444', bg: 'bg-red-50',     border: 'border-red-300',   icon: Crosshair },
  obturado:             { label: 'Obturado (Resina)',color: '#3B82F6', bg: 'bg-blue-50',    border: 'border-blue-300',  icon: CheckCircle2 },
  fractura:             { label: 'Fractura',         color: '#8B5CF6', bg: 'bg-violet-50',  border: 'border-violet-300',icon: AlertTriangle },
  extraccion_indicada:  { label: 'Extracción Ind.',  color: '#F97316', bg: 'bg-orange-50',  border: 'border-orange-300',icon: X },
  tratamiento_conducto: { label: 'Endodoncia',       color: '#EC4899', bg: 'bg-pink-50',    border: 'border-pink-300',  icon: Zap },
  corona_indicada:      { label: 'Corona Indicada',  color: '#F59E0B', bg: 'bg-amber-50',   border: 'border-amber-300', icon: Hexagon },
  protesis_implante:    { label: 'Prótesis/Impl.',   color: '#2563EB', bg: 'bg-blue-50',    border: 'border-blue-300',  icon: Diamond },
  ausente:              { label: 'Ausente/Extraído', color: '#64748B', bg: 'bg-slate-100',  border: 'border-slate-300', icon: X },
  implante_presente:    { label: 'Implante Colocado',color: '#2563EB', bg: 'bg-blue-50',    border: 'border-blue-300',  icon: Target },
  corona_presente:      { label: 'Corona Presente',  color: '#F59E0B', bg: 'bg-amber-50',   border: 'border-amber-300', icon: Star },
  en_observacion:       { label: 'En Observación',   color: '#6366F1', bg: 'bg-indigo-50',  border: 'border-indigo-300',icon: Eye },
};

interface ToothDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  toothId: number | null;
  teeth: ToothData[];
  selectedCondition: ClinicalCondition;
  onSelectCondition: (cond: ClinicalCondition) => void;
  onSurfaceClick: (toothId: number, surface: ToothSurface) => void;
  onClearSurface: (toothId: number, surface: ToothSurface) => void;
  onClearWholeTooth: (toothId: number) => void;
  onSetWholeToothCondition: (toothId: number, condition: ClinicalCondition) => void;
  onNavigateTooth: (nextId: number) => void;
  readOnly?: boolean;
}

export const ToothDetailModal: React.FC<ToothDetailModalProps> = ({
  isOpen,
  onClose,
  toothId,
  teeth,
  selectedCondition,
  onSelectCondition,
  onSurfaceClick,
  onClearSurface,
  onClearWholeTooth,
  onSetWholeToothCondition,
  onNavigateTooth,
  readOnly = false,
}) => {
  const [hoveredSurface, setHoveredSurface] = React.useState<ToothSurface | null>(null);

  // Close on Escape, navigate with arrow keys
  useEffect(() => {
    if (!isOpen || toothId === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        const prev = toothId === 1 ? 32 : toothId - 1;
        onNavigateTooth(prev);
      } else if (e.key === 'ArrowRight') {
        const next = toothId === 32 ? 1 : toothId + 1;
        onNavigateTooth(next);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toothId, onClose, onNavigateTooth]);

  if (!isOpen || toothId === null) return null;

  const tooth = teeth.find(t => t.id === toothId) || { id: toothId, surfaces: [] };
  const info = TOOTH_INFO[toothId] || {
    fdi: 0,
    name: `Pieza ${toothId}`,
    anterior: false,
    type: 'Diente',
    arch: toothId <= 16 ? 'superior' : 'inferior',
    quadrant: 1,
  };

  const isUpper = toothId <= 16;
  const centerSurfaceName: ToothSurface = info.anterior ? 'incisal' : 'oclusal';
  const lingualSurfaceName = isUpper ? 'Palatino' : 'Lingual';
  const surfaces: ToothSurface[] = [centerSurfaceName, 'vestibular', 'lingual', 'mesial', 'distal'];

  // Detect special whole-tooth condition (ausente, implante, corona, etc.)
  const specials: ClinicalCondition[] = ['ausente', 'implante_presente', 'corona_presente', 'en_observacion'];
  const wholeToothCond = tooth.surfaces.find(s => specials.includes(s.condition))?.condition || null;

  const getSurfaceCond = (surface: ToothSurface): ClinicalCondition | null => {
    const s = tooth.surfaces.find(item => item.surface === surface);
    return s ? s.condition : null;
  };

  const activeTool = CONDITION_METAS[selectedCondition] || CONDITION_METAS.healthy;

  return createPortal(
    <div className="fixed inset-0 z-[12000] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] z-10 animate-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onNavigateTooth(toothId === 1 ? 32 : toothId - 1)}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
                title="Pieza anterior (←)"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => onNavigateTooth(toothId === 32 ? 1 : toothId + 1)}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
                title="Pieza siguiente (→)"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                  {info.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
                  FDI {info.fdi}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700">
                  Universal #{toothId}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Arcada {info.arch === 'superior' ? 'Superior' : 'Inferior'} • Cuadrante {info.quadrant} • {info.type}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          
          {/* Active condition tool indicator banner */}
          {!readOnly && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Herramienta Activa:</span>
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-white shadow-sm"
                  style={{ backgroundColor: activeTool.color }}
                >
                  <activeTool.icon size={13} />
                  {activeTool.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Toca una cara para aplicar o remover la condición activa
              </p>
            </div>
          )}

          {/* Interactive Core: Large Surface Diagram + Surface Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            
            {/* Visual Large Touch Diagram */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50/70 rounded-3xl border border-slate-200 relative">
              <div className="relative w-52 h-52 sm:w-60 sm:h-60">
                <svg viewBox="0 0 24 24" className="w-full h-full filter drop-shadow-md">
                  {surfaces.map((surface) => {
                    const pathKey = (surface === 'oclusal' || surface === 'incisal') ? 'center' : surface;
                    const cond = getSurfaceCond(surface);
                    const meta = cond ? CONDITION_METAS[cond] : null;
                    const fillColor = meta ? meta.color : '#FFFFFF';
                    const isHovered = hoveredSurface === surface;

                    return (
                      <g key={surface}>
                        <path
                          d={SURFACE_PATHS[pathKey]}
                          fill={isHovered ? (cond ? fillColor : '#BFDBFE') : fillColor}
                          stroke={cond ? fillColor : (isHovered ? '#3B82F6' : '#94A3B8')}
                          strokeWidth={isHovered ? '0.9' : '0.6'}
                          className="cursor-pointer transition-all duration-150 active:opacity-75"
                          onClick={() => !readOnly && onSurfaceClick(toothId, surface)}
                          onMouseEnter={() => setHoveredSurface(surface)}
                          onMouseLeave={() => setHoveredSurface(null)}
                        />
                      </g>
                    );
                  })}

                  {/* Surface Labels on SVG */}
                  {surfaces.map((s) => {
                    const pathKey = (s === 'oclusal' || s === 'incisal') ? 'center' : s;
                    const [cx, cy] = SURFACE_LABEL_POS[pathKey];
                    const cond = getSurfaceCond(s);
                    const label =
                      s === 'oclusal' ? 'O' :
                      s === 'incisal' ? 'I' :
                      s === 'vestibular' ? 'V' :
                      s === 'lingual' ? (isUpper ? 'P' : 'L') :
                      s === 'mesial' ? 'M' : 'D';

                    return (
                      <text
                        key={`label-${s}`}
                        x={cx}
                        y={cy}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="3.8"
                        fontWeight="900"
                        fill={cond ? '#FFFFFF' : '#475569'}
                        className="pointer-events-none select-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]"
                      >
                        {label}
                      </text>
                    );
                  })}
                </svg>

                {/* Whole tooth badge if absent/implant */}
                {wholeToothCond && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] rounded-3xl flex flex-col items-center justify-center p-4 text-white text-center animate-in fade-in">
                    <span className="font-black text-sm uppercase tracking-wider mb-1">
                      {CONDITION_METAS[wholeToothCond]?.label || wholeToothCond}
                    </span>
                    <p className="text-xs text-slate-200 mb-3">Pieza completa con condición especial</p>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => onClearWholeTooth(toothId)}
                        className="px-3 py-1.5 bg-white text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-100 shadow-sm"
                      >
                        Restaurar a sano
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Surface indicator chips below diagram */}
              <div className="mt-4 flex flex-wrap justify-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200">V: Vestibular</span>
                <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200">{info.anterior ? 'I: Incisal' : 'O: Oclusal'}</span>
                <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200">{isUpper ? 'P: Palatino' : 'L: Lingual'}</span>
                <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200">M: Mesial</span>
                <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200">D: Distal</span>
              </div>
            </div>

            {/* Surface List & Status */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                Estado por Superficie
              </h4>

              <div className="space-y-2">
                {surfaces.map((surface) => {
                  const cond = getSurfaceCond(surface);
                  const meta = cond ? CONDITION_METAS[cond] : null;
                  const surfaceName =
                    surface === 'lingual' ? lingualSurfaceName :
                    surface === 'oclusal' ? 'Oclusal' :
                    surface === 'incisal' ? 'Incisal' :
                    surface === 'vestibular' ? 'Vestibular' :
                    surface === 'mesial' ? 'Mesial' : 'Distal';

                  return (
                    <div
                      key={surface}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-xl border transition-all",
                        meta ? "bg-white border-slate-300 shadow-sm" : "bg-slate-50/60 border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: meta ? meta.color : '#CBD5E1' }}
                        />
                        <span className="font-bold text-sm text-slate-700">{surfaceName}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {meta ? (
                          <>
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-lg text-white"
                              style={{ backgroundColor: meta.color }}
                            >
                              {meta.label}
                            </span>
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => onClearSurface(toothId, surface)}
                                className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                                title="Limpiar superficie"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">Sana</span>
                        )}

                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => onSurfaceClick(toothId, surface)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all active:scale-95"
                          >
                            Aplicar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Whole-Tooth Actions */}
          {!readOnly && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                Acciones para Pieza Completa
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => onClearWholeTooth(toothId)}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all active:scale-95"
                >
                  <Shield size={14} className="text-emerald-500" />
                  Marcar Sana
                </button>

                <button
                  type="button"
                  onClick={() => onSetWholeToothCondition(toothId, 'ausente')}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all active:scale-95"
                >
                  <X size={14} className="text-slate-500" />
                  Ausente
                </button>

                <button
                  type="button"
                  onClick={() => onSetWholeToothCondition(toothId, 'corona_presente')}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all active:scale-95"
                >
                  <Star size={14} className="text-amber-500" />
                  Corona
                </button>

                <button
                  type="button"
                  onClick={() => onSetWholeToothCondition(toothId, 'implante_presente')}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all active:scale-95"
                >
                  <Target size={14} className="text-blue-500" />
                  Implante
                </button>
              </div>
            </div>
          )}

          {/* Condition Palette Picker (Switch Active Tool inside Modal) */}
          {!readOnly && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                Cambiar Condición Activa
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {(Object.entries(CONDITION_METAS) as [ClinicalCondition, ConditionMeta][]).map(([key, meta]) => {
                  const isSelected = selectedCondition === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onSelectCondition(key)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all text-left",
                        isSelected
                          ? "bg-slate-900 text-white border-slate-900 shadow-md scale-[1.02]"
                          : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                      )}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: meta.color }}
                      />
                      <span className="truncate">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <span className="text-xs font-medium text-slate-400 hidden sm:inline">
            Usa las flechas ← y → para navegar entre piezas dentales
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
          >
            Listo
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ToothDetailModal;
