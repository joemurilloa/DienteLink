/**
 * ToothDiagram.tsx — Interactive 5-surface SVG tooth with tooltip.
 *
 * Handles both absent teeth (greyed-out X overlay) and active teeth
 * with per-surface clickable areas, long-press clear, and context menu clear.
 *
 * Extracted from the 1,503-line Odontogram.tsx monolith.
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { ToothData, ToothSurface, ClinicalCondition } from '../../types';
import { cn } from '../../lib/utils';
import {
  TOOTH_INFO,
  conditionThemes,
  getWholeToothCondition,
  getConditionCount,
  getToothType,
  TOOTH_OUTLINES,
  getSurfacesForTooth,
  getSurfaceColor,
  getSurfaceDisplayName,
  MINI_SURFACE_PATHS,
  MINI_SURFACE_LABEL_POS,
} from './odontogramData';

export interface ToothDiagramProps {
  tooth: ToothData;
  selectedCondition: ClinicalCondition | null;
  onSurfaceClick: (toothId: number, surface: ToothSurface) => void;
  onClearSurface: (toothId: number, surface: ToothSurface) => void;
  onToothClick?: (toothId: number) => void;
  size?: number;
  highlight?: boolean;
  readOnly?: boolean;
}

export const ToothDiagram: React.FC<ToothDiagramProps> = React.memo(({
  tooth, selectedCondition, onSurfaceClick, onClearSurface, onToothClick,
  size = 54, highlight = false, readOnly = false,
}: ToothDiagramProps) => {
  const [hoveredSurface, setHoveredSurface] = useState<ToothSurface | null>(null);
  const [showTooltip, setShowTooltip]       = useState(false);
  const longPressRef = useRef<{ timer: number | null; triggered: boolean }>({ timer: null, triggered: false });

  const wholeCond   = getWholeToothCondition(tooth.surfaces);
  const isAbsent    = wholeCond === 'ausente' || wholeCond === 'extraido';
  const hasSpecial  = wholeCond !== null;
  const info        = TOOTH_INFO[tooth.id];
  const surfaces    = getSurfacesForTooth(tooth.id);
  const condCount   = getConditionCount(tooth.surfaces);
  const toothType   = getToothType(tooth.id);
  const outlinePath = TOOTH_OUTLINES[toothType];
  const isUpper     = tooth.id <= 16;
  const toothW      = size;
  const toothH      = Math.round(size * 1.5);
  const miniSize    = Math.round(size * 0.5);

  const dominantColor = useMemo(() => {
    if (hasSpecial) return conditionThemes[wholeCond!].color;
    const active = tooth.surfaces.filter(s => s.condition !== 'healthy');
    if (active.length === 0) return null;
    return conditionThemes[active[0].condition]?.color || null;
  }, [tooth.surfaces, hasSpecial, wholeCond]);

  const handleContextMenu = useCallback((e: React.MouseEvent, surface: ToothSurface) => {
    e.preventDefault(); e.stopPropagation();
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

  const gradId = `tooth-grad-${tooth.id}`;

  /* --- Absent tooth --- */
  if (isAbsent) {
    return (
      <div
        className="flex flex-col items-center gap-0.5 relative group cursor-pointer"
        onClick={() => onToothClick?.(tooth.id)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToothClick?.(tooth.id); } }}
        role="button"
        tabIndex={readOnly ? -1 : 0}
        aria-label={`Abrir detalle de ${info?.name}, FDI ${info?.fdi}, ${conditionThemes[wholeCond!]?.label || 'pieza no presente'}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title="Toca para ver o restaurar pieza"
      >
        <div style={{ width: toothW, height: toothH }} className="relative flex items-center justify-center opacity-30 hover:opacity-50 transition-opacity">
          <svg viewBox="0 0 100 140" width={toothW} height={toothH}>
            <path d={outlinePath} fill="#CBD5E1" stroke="#94A3B8" strokeWidth="2.5" />
            <line x1="25" y1="20" x2="75" y2="120" stroke="#64748B" strokeWidth="3" />
            <line x1="75" y1="20" x2="25" y2="120" stroke="#64748B" strokeWidth="3" />
          </svg>
        </div>
        <span className="text-sm font-bold text-slate-500 tabular-nums">{info?.fdi ?? tooth.id}</span>

        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none z-50 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs whitespace-nowrap shadow-2xl min-w-[140px]">
              <p className="font-black text-sm mb-0.5">{info?.name}</p>
              <p className="text-slate-500 text-[9px] mb-1">Universal: {tooth.id} | FDI: {info?.fdi}</p>
              <p className="text-slate-500 italic border-t border-slate-700 pt-1">
                {wholeCond ? conditionThemes[wholeCond].label : 'Pieza no presente'} (Toca para editar)
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const specialColor   = hasSpecial ? conditionThemes[wholeCond!].color : null;
  const specialOverlay = hasSpecial ? conditionThemes[wholeCond!].overlay : null;
  const hasConds       = condCount > 0;

  return (
    <div
      className="flex flex-col items-center gap-0 group relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => { setShowTooltip(false); setHoveredSurface(null); }}
    >
      {/* Condition count dot */}
      {condCount > 0 && !hasSpecial && (
        <div className={cn(
          'w-[6px] h-[6px] rounded-full absolute -top-1 left-1/2 -translate-x-1/2 z-10',
          condCount >= 3 ? 'bg-red-500' : 'bg-amber-400',
        )} />
      )}

      {highlight && (
        <div className="absolute inset-0 rounded-lg border-2 border-dashed border-blue-400 z-20 pointer-events-none" />
      )}

      {/* Anatomical silhouette */}
      <div
        style={{ width: toothW, height: toothH }}
        className="relative cursor-pointer hover:scale-105 active:scale-95 transition-all"
        onClick={() => onToothClick?.(tooth.id)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToothClick?.(tooth.id); } }}
        role="button"
        tabIndex={readOnly ? -1 : 0}
        aria-label={`Abrir detalle de ${info?.name}, FDI ${info?.fdi}`}
        title="Toca para abrir Lupa Clínica de la Pieza"
      >
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

          <path
            d={outlinePath}
            fill={hasSpecial ? specialColor! : `url(#${gradId})`}
            stroke={hasConds || hasSpecial ? (dominantColor || '#E2E8F0') : '#E2E8F0'}
            strokeWidth="2.5"
            className="transition-all duration-300"
          />

          {!hasSpecial && <path d="M30 40 L70 40" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" />}

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

      {/* FDI number */}
      <span
        onClick={() => onToothClick?.(tooth.id)}
        className={cn(
          'text-sm font-bold tabular-nums transition-colors leading-tight cursor-pointer hover:underline',
          readOnly ? 'text-slate-500' : 'text-slate-700 group-hover:text-blue-600',
        )}
        title={`FDI ${info?.fdi ?? tooth.id} — tocar para abrir detalle`}
      >
        {info?.fdi ?? tooth.id}
      </span>

      {/* Mini 5-surface cross diagram */}
      {!hasSpecial && (
        <div style={{ width: miniSize, height: miniSize }} className="mt-0.5">
          <svg viewBox="0 0 24 24" width={miniSize} height={miniSize}>
            {surfaces.map(surface => {
              const pathKey  = (surface === 'oclusal' || surface === 'incisal') ? 'center' : surface;
              const fill     = getSurfaceColor(tooth.surfaces, surface);
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
                    onClick={e => { e.stopPropagation(); handleClick(surface); }}
                    onContextMenu={e => handleContextMenu(e, surface)}
                    onPointerDown={() => handlePointerDown(surface)}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onMouseEnter={() => setHoveredSurface(surface)}
                    onMouseLeave={() => setHoveredSurface(null)}
                  />
                </g>
              );
            })}
            {/* Surface labels on hover */}
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

      {/* Special condition click overlay */}
      {hasSpecial && !readOnly && (
        <div
          className="absolute inset-0 cursor-pointer z-10"
          onClick={e => { e.stopPropagation(); onToothClick ? onToothClick(tooth.id) : handleClick('oclusal'); }}
          onContextMenu={e => handleContextMenu(e, 'oclusal')}
          title="Toca para editar condición especial"
        />
      )}

      {/* Tooltip */}
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

ToothDiagram.displayName = 'ToothDiagram';
