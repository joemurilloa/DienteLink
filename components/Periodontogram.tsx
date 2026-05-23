
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PeriodontogramData, PerioToothData, PerioSite } from '../types';
import { cn, createDefaultPeriodontogramData } from '../lib/utils';
import { RotateCcw, Droplets, AlertTriangle, Activity, ChevronLeft, ChevronRight } from 'lucide-react';

/* ================================================================
   TOOTH INFO
   ================================================================ */
const TOOTH_INFO: Record<number, { fdi: number; name: string; type: 'molar' | 'premolar' | 'canine' | 'incisor' }> = {
  1:  { fdi: 18, name: '3er Molar Sup. Der.', type: 'molar' },
  2:  { fdi: 17, name: '2do Molar Sup. Der.', type: 'molar' },
  3:  { fdi: 16, name: '1er Molar Sup. Der.', type: 'molar' },
  4:  { fdi: 15, name: '2do Premolar Sup. Der.', type: 'premolar' },
  5:  { fdi: 14, name: '1er Premolar Sup. Der.', type: 'premolar' },
  6:  { fdi: 13, name: 'Canino Sup. Der.', type: 'canine' },
  7:  { fdi: 12, name: 'Inc. Lat. Sup. Der.', type: 'incisor' },
  8:  { fdi: 11, name: 'Inc. Cent. Sup. Der.', type: 'incisor' },
  9:  { fdi: 21, name: 'Inc. Cent. Sup. Izq.', type: 'incisor' },
  10: { fdi: 22, name: 'Inc. Lat. Sup. Izq.', type: 'incisor' },
  11: { fdi: 23, name: 'Canino Sup. Izq.', type: 'canine' },
  12: { fdi: 24, name: '1er Premolar Sup. Izq.', type: 'premolar' },
  13: { fdi: 25, name: '2do Premolar Sup. Izq.', type: 'premolar' },
  14: { fdi: 26, name: '1er Molar Sup. Izq.', type: 'molar' },
  15: { fdi: 27, name: '2do Molar Sup. Izq.', type: 'molar' },
  16: { fdi: 28, name: '3er Molar Sup. Izq.', type: 'molar' },
  17: { fdi: 38, name: '3er Molar Inf. Izq.', type: 'molar' },
  18: { fdi: 37, name: '2do Molar Inf. Izq.', type: 'molar' },
  19: { fdi: 36, name: '1er Molar Inf. Izq.', type: 'molar' },
  20: { fdi: 35, name: '2do Premolar Inf. Izq.', type: 'premolar' },
  21: { fdi: 34, name: '1er Premolar Inf. Izq.', type: 'premolar' },
  22: { fdi: 33, name: 'Canino Inf. Izq.', type: 'canine' },
  23: { fdi: 32, name: 'Inc. Lat. Inf. Izq.', type: 'incisor' },
  24: { fdi: 31, name: 'Inc. Cent. Inf. Izq.', type: 'incisor' },
  25: { fdi: 41, name: 'Inc. Cent. Inf. Der.', type: 'incisor' },
  26: { fdi: 42, name: 'Inc. Lat. Inf. Der.', type: 'incisor' },
  27: { fdi: 43, name: 'Canino Inf. Der.', type: 'canine' },
  28: { fdi: 44, name: '1er Premolar Inf. Der.', type: 'premolar' },
  29: { fdi: 45, name: '2do Premolar Inf. Der.', type: 'premolar' },
  30: { fdi: 46, name: '1er Molar Inf. Der.', type: 'molar' },
  31: { fdi: 47, name: '2do Molar Inf. Der.', type: 'molar' },
  32: { fdi: 48, name: '3er Molar Inf. Der.', type: 'molar' },
};

const UPPER_TEETH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const LOWER_TEETH = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

const TOOTH_OUTLINES: Record<string, string> = {
  molar:    'M15 30C15 15 30 8 50 8C70 8 85 15 85 30C85 50 80 80 75 110C70 125 60 130 50 130C40 130 30 125 25 110C20 80 15 50 15 30Z',
  premolar: 'M22 28C22 16 35 10 50 10C65 10 78 16 78 28C78 48 74 80 68 112C62 126 50 130 50 130C50 130 38 126 32 112C26 80 22 48 22 28Z',
  canine:   'M28 28C28 18 40 12 50 12C60 12 72 18 72 28C72 48 68 82 62 112C58 128 50 132 42 128C32 112 28 48 28 28Z',
  incisor:  'M25 22C25 14 35 10 50 10C65 10 75 14 75 22C75 42 72 82 65 112C60 126 50 130 40 124C30 108 25 42 25 22Z',
};

/* ================================================================
   COLOR HELPERS
   ================================================================ */
const getDepthColor = (mm: number) => {
  if (mm <= 0) return '#CBD5E1';
  if (mm <= 3) return '#22C55E';
  if (mm <= 5) return '#F59E0B';
  return '#EF4444';
};

const getDepthLabel = (mm: number) => {
  if (mm <= 0) return 'Sin medir';
  if (mm <= 3) return 'Sano';
  if (mm <= 5) return 'Moderado';
  return 'Severo';
};

/* ================================================================
   SINGLE TOOTH PROBE — The visual probing interface per tooth
   Drag the probe line up/down to set depth
   ================================================================ */
const PROBE_ZONE_H = 120;
const MAX_MM = 10;

interface ToothProbeProps {
  toothData: PerioToothData;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateDepth: (depth: number) => void;
  currentDepth: number;  // the "main" depth to show (buccal center)
}

const ToothProbe: React.FC<ToothProbeProps> = ({ toothData, isSelected, onSelect, onUpdateDepth, currentDepth }) => {
  const info = TOOTH_INFO[toothData.toothId];
  const toothType = info?.type || 'incisor';
  const outlinePath = TOOTH_OUTLINES[toothType];
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const [dragDepth, setDragDepth] = useState<number | null>(null);
  const activeDepth = dragDepth !== null ? dragDepth : currentDepth;

  const depthPct = Math.min(activeDepth / MAX_MM, 1);
  const probeY = depthPct * PROBE_ZONE_H;
  const color = getDepthColor(activeDepth);
  const hasAnyBleeding = [...toothData.buccal, ...toothData.lingual].some(s => s.bleeding);

  const handlePointerEvent = useCallback((clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relY = clientY - rect.top;
    const clamped = Math.max(0, Math.min(PROBE_ZONE_H, relY));
    // Calculate mm with 0.5 precision
    const mm = Math.round((clamped / PROBE_ZONE_H) * MAX_MM * 2) / 2;
    setDragDepth(mm);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    onSelect();
    handlePointerEvent(e.clientY);
  }, [onSelect, handlePointerEvent]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    handlePointerEvent(e.clientY);
  }, [handlePointerEvent]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    if (dragDepth !== null) {
      onUpdateDepth(dragDepth);
      setDragDepth(null);
    }
  }, [dragDepth, onUpdateDepth]);

  return (
    <div
      className={cn(
        'flex flex-col items-center flex-shrink-0 group select-none transition-all',
        isSelected ? 'scale-110 z-10' : ''
      )}
      style={{ width: 52 }}
    >
      {/* Tooth SVG */}
      <div
        className="relative flex items-center justify-center mb-1 cursor-pointer"
        onClick={onSelect}
        style={{ width: 36, height: 48 }}
      >
        <svg viewBox="0 0 100 140" className="w-full h-full drop-shadow-sm">
          <path
            d={outlinePath}
            fill={activeDepth > 0 ? (activeDepth <= 3 ? '#F0FDF4' : activeDepth <= 5 ? '#FFFBEB' : '#FEF2F2') : 'white'}
            stroke={isSelected ? '#3B82F6' : '#E2E8F0'}
            strokeWidth={isSelected ? 4 : 2.5}
            className="transition-all"
          />
          <path d="M38 20 Q50 15 62 20" stroke="white" strokeWidth="3.5" strokeOpacity="0.5" fill="none" />
        </svg>
        {/* FDI number inside tooth */}
        <span className={cn(
          'absolute text-[9px] font-black tabular-nums',
          isSelected ? 'text-blue-600' : 'text-slate-300'
        )}>
          {info?.fdi}
        </span>
        {/* Bleeding dot */}
        {hasAnyBleeding && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
        )}
      </div>

      {/* Probe zone — drag here to set depth */}
      <div
        ref={containerRef}
        className={cn(
          'relative w-full rounded-2xl overflow-hidden cursor-ns-resize transition-all',
          isSelected ? 'ring-2 ring-blue-400 ring-offset-1 shadow-lg' : 'shadow-inner',
        )}
        style={{ height: PROBE_ZONE_H, background: '#F8FAFC' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Gum line background (top = gum, below = pocket) */}
        <div
          className="absolute left-0 right-0 top-0 transition-all duration-200 ease-out"
          style={{ height: probeY, background: `linear-gradient(to bottom, ${color}18, ${color}30)` }}
        />

        {/* Reference lines at 3mm and 5mm */}
        <div
          className="absolute left-0 right-0 border-t border-dashed pointer-events-none"
          style={{
            top: (3 / MAX_MM) * PROBE_ZONE_H,
            borderColor: '#86EFAC66',
          }}
        />
        <div
          className="absolute left-0 right-0 border-t border-dashed pointer-events-none"
          style={{
            top: (5 / MAX_MM) * PROBE_ZONE_H,
            borderColor: '#FCD34D66',
          }}
        />

        {/* Probe line (the draggable indicator) */}
        <div
          className="absolute left-1 right-1 flex items-center justify-center pointer-events-none transition-all duration-75"
          style={{ top: probeY - 2 }}
        >
          <div
            className="w-full h-[3px] rounded-full shadow-md"
            style={{ backgroundColor: color }}
          />
        </div>

        {/* Probe needle visual */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-[2px] top-0 pointer-events-none origin-top transition-all duration-75"
          style={{ height: probeY, backgroundColor: `${color}80` }}
        />

        {/* Mm label */}
        <div className="absolute bottom-1.5 left-0 right-0 text-center pointer-events-none">
          <span
            className="text-[11px] font-black tabular-nums px-1.5 py-0.5 rounded-md transition-all"
            style={{
              color: activeDepth > 0 ? color : '#94A3B8',
              backgroundColor: activeDepth > 5 ? '#FEF2F2' : 'transparent',
              transform: dragDepth !== null ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            {activeDepth > 0 ? `${activeDepth}mm` : '–'}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ================================================================
   DETAIL PANEL — Expanded view for 6-site editing + extras
   ================================================================ */
interface DetailPanelProps {
  tooth: PerioToothData;
  data: PeriodontogramData;
  onUpdate: (data: PeriodontogramData) => void;
  onPrev: () => void;
  onNext: () => void;
}

const SITE_NAMES = ['Mesial', 'Central', 'Distal'];

const DetailPanel: React.FC<DetailPanelProps> = ({ tooth, data, onUpdate, onPrev, onNext }) => {
  const info = TOOTH_INFO[tooth.toothId];
  const isMolar = info?.type === 'molar';

  const updateSite = useCallback((face: 'buccal' | 'lingual', idx: number, updates: Partial<PerioSite>) => {
    onUpdate({
      ...data,
      teeth: data.teeth.map(t => {
        if (t.toothId !== tooth.toothId) return t;
        const newT = { ...t };
        const newSites = [...newT[face]] as [PerioSite, PerioSite, PerioSite];
        newSites[idx] = { ...newSites[idx], ...updates };
        newT[face] = newSites;
        return newT;
      }),
    });
  }, [data, tooth.toothId, onUpdate]);

  const updateToothField = useCallback((field: 'mobility' | 'furcation', value: 0 | 1 | 2 | 3) => {
    onUpdate({
      ...data,
      teeth: data.teeth.map(t => t.toothId !== tooth.toothId ? t : { ...t, [field]: value }),
    });
  }, [data, tooth.toothId, onUpdate]);

  const renderFace = (face: 'buccal' | 'lingual', label: string) => {
    const sites = face === 'buccal' ? tooth.buccal : tooth.lingual;
    return (
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
        <div className="grid grid-cols-3 gap-2">
          {sites.map((site, idx) => (
            <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[9px] font-bold text-slate-400 mb-1.5">{SITE_NAMES[idx]}</p>
              {/* Depth */}
              <div className="flex items-center gap-1 mb-2">
                <button
                  onClick={() => updateSite(face, idx, { depth: Math.max(0, site.depth - 0.5) })}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 active:scale-90 text-sm font-bold"
                >
                  −
                </button>
                <div
                  className="flex-1 h-7 rounded-lg flex items-center justify-center font-black text-sm tabular-nums"
                  style={{ color: getDepthColor(site.depth), background: `${getDepthColor(site.depth)}10` }}
                >
                  {site.depth}
                </div>
                <button
                  onClick={() => updateSite(face, idx, { depth: Math.min(15, site.depth + 0.5) })}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 active:scale-90 text-sm font-bold"
                >
                  +
                </button>
              </div>
              {/* BOP toggle */}
              <button
                onClick={() => updateSite(face, idx, { bleeding: !site.bleeding })}
                className={cn(
                  'w-full h-7 rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold transition-all active:scale-95',
                  site.bleeding
                    ? 'bg-red-50 text-red-500 border border-red-200'
                    : 'bg-white text-slate-300 border border-slate-200 hover:text-red-300'
                )}
              >
                <Droplets size={10} />
                {site.bleeding ? 'BOP ✓' : 'BOP'}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.15 }}
      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-lg"
    >
      {/* Header with navigation */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onPrev} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 active:scale-90 transition-all">
          <ChevronLeft size={16} className="text-slate-500" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-black text-blue-600 tabular-nums">{info?.fdi}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{info?.name}</p>
              <p className="text-[10px] text-slate-400">Pieza {tooth.toothId} | {getDepthLabel(tooth.buccal[1].depth)}</p>
            </div>
          </div>
        </div>
        <button onClick={onNext} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 active:scale-90 transition-all">
          <ChevronRight size={16} className="text-slate-500" />
        </button>
      </div>

      {/* 6-site grids */}
      <div className="space-y-4">
        {renderFace('buccal', 'Vestibular')}
        {renderFace('lingual', tooth.toothId <= 16 ? 'Palatino' : 'Lingual')}
      </div>

      {/* Mobility & Furcation */}
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Movilidad</span>
          {([0, 1, 2, 3] as const).map(v => (
            <button
              key={v}
              onClick={() => updateToothField('mobility', v)}
              className={cn(
                'w-8 h-8 rounded-lg text-xs font-bold transition-all active:scale-90',
                tooth.mobility === v
                  ? (v === 0 ? 'bg-slate-200 text-slate-700' : v <= 1 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')
                  : 'bg-slate-50 text-slate-300 hover:bg-slate-100'
              )}
            >
              {v}
            </button>
          ))}
        </div>
        {isMolar && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Furca</span>
            {([0, 1, 2, 3] as const).map(v => (
              <button
                key={v}
                onClick={() => updateToothField('furcation', v)}
                className={cn(
                  'w-8 h-8 rounded-lg text-xs font-bold transition-all active:scale-90',
                  tooth.furcation === v
                    ? (v === 0 ? 'bg-slate-200 text-slate-700' : v <= 1 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')
                    : 'bg-slate-50 text-slate-300 hover:bg-slate-100'
                )}
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ================================================================
   SUMMARY STATS
   ================================================================ */
const SummaryStats: React.FC<{ data: PeriodontogramData }> = React.memo(({ data }) => {
  const stats = useMemo(() => {
    let filled = 0, total = 0, depthSum = 0;
    let ge4 = 0, ge6 = 0, bop = 0, maxD = 0;
    let mobilityCount = 0, furcaCount = 0;

    data.teeth.forEach(t => {
      if (t.mobility > 0) mobilityCount++;
      if (t.furcation > 0) furcaCount++;
      for (const face of ['buccal', 'lingual'] as const) {
        const sites = t[face];
        sites.forEach(s => {
          total++;
          if (s.depth > 0) { filled++; depthSum += s.depth; }
          if (s.depth >= 4) ge4++;
          if (s.depth >= 6) ge6++;
          if (s.bleeding) bop++;
          if (s.depth > maxD) maxD = s.depth;
        });
      }
    });

    const avg = filled > 0 ? depthSum / filled : 0;
    const bopPct = filled > 0 ? (bop / filled) * 100 : 0;
    return { filled, total, avg, ge4, ge6, bop, bopPct, maxD, mobilityCount, furcaCount };
  }, [data]);

  if (stats.filled === 0) return null;

  return (
    <div className="mt-8 space-y-4">
      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Resumen</h4>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 rounded-2xl p-4 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent" />
          <div className="relative">
            <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mb-1">Bolsas ≥4mm</p>
            <p className="text-2xl font-black tabular-nums text-amber-400">{stats.ge4}</p>
          </div>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
          <p className="text-[9px] font-bold uppercase text-red-400 tracking-widest mb-1">Bolsas ≥6mm</p>
          <p className="text-2xl font-black text-red-600 tabular-nums">{stats.ge6}</p>
          {stats.ge6 > 0 && <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1 font-semibold"><AlertTriangle size={10} /> Atención</p>}
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
          <p className="text-[9px] font-bold uppercase text-blue-400 tracking-widest mb-1">Sangrado (BOP)</p>
          <p className="text-2xl font-black text-blue-700 tabular-nums">{stats.bopPct.toFixed(0)}<span className="text-sm text-blue-400 ml-0.5">%</span></p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
          <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mb-1">Promedio</p>
          <p className="text-2xl font-black text-slate-900 tabular-nums">{stats.avg.toFixed(1)}<span className="text-sm text-slate-400 ml-0.5">mm</span></p>
        </div>
      </div>

      {(stats.mobilityCount > 0 || stats.furcaCount > 0) && (
        <div className="flex flex-wrap gap-2">
          {stats.mobilityCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-xl border border-amber-100">
              <Activity size={14} className="text-amber-500" />
              <span className="text-xs font-bold text-amber-700">{stats.mobilityCount} con movilidad</span>
            </div>
          )}
          {stats.furcaCount > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-xl border border-orange-100">
              <AlertTriangle size={14} className="text-orange-500" />
              <span className="text-xs font-bold text-orange-700">{stats.furcaCount} con furca</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

import { sileo } from 'sileo';

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
interface PeriodontogramProps {
  data: PeriodontogramData;
  onUpdate: (data: PeriodontogramData) => void;
}

const Periodontogram: React.FC<PeriodontogramProps> = ({ data: rawData, onUpdate }) => {
  // Ref to debounced save or just track updates
  const lastUpdateRef = useRef<number>(0);

  const handleUpdateWithToast = useCallback((newData: PeriodontogramData) => {
    onUpdate(newData);
    const now = Date.now();
    // Only show toast every 3 seconds to avoid spam
    if (now - lastUpdateRef.current > 3000) {
      sileo.success({ title: 'Periodontograma guardado', description: 'Los cambios se han sincronizado con el expediente.' });
      lastUpdateRef.current = now;
    }
  }, [onUpdate]);

  const data = rawData && rawData.teeth ? rawData : createDefaultPeriodontogramData();
  const [selectedToothId, setSelectedToothId] = useState<number | null>(null);
  const [viewArch, setViewArch] = useState<'upper' | 'lower'>('upper');

  const selectedTooth = useMemo(
    () => selectedToothId !== null ? data.teeth.find(t => t.toothId === selectedToothId) : null,
    [data.teeth, selectedToothId]
  );

  const currentArch = viewArch === 'upper' ? UPPER_TEETH : LOWER_TEETH;

  /** Update the vestibular center depth for a tooth (quick visual mode) */
  const handleQuickDepth = useCallback((toothId: number, depth: number) => {
    handleUpdateWithToast({
      ...data,
      teeth: data.teeth.map(t => {
        if (t.toothId !== toothId) return t;
        // Update all 3 buccal sites to spread the probe value (simpler mental model)
        const newBuccal = t.buccal.map(s => ({ ...s, depth })) as [PerioSite, PerioSite, PerioSite];
        return { ...t, buccal: newBuccal };
      }),
    });
  }, [data, handleUpdateWithToast]);

  const handleSelectTooth = useCallback((toothId: number) => {
    setSelectedToothId(prev => prev === toothId ? null : toothId);
  }, []);

  const navigateTooth = useCallback((dir: -1 | 1) => {
    if (selectedToothId === null) return;
    const allTeeth = [...UPPER_TEETH, ...LOWER_TEETH];
    const idx = allTeeth.indexOf(selectedToothId);
    const next = allTeeth[idx + dir];
    if (next !== undefined) {
      setSelectedToothId(next);
      // Switch arch view if needed
      if (next <= 16) setViewArch('upper');
      else setViewArch('lower');
    }
  }, [selectedToothId]);

  const resetAll = useCallback(() => {
    if (!window.confirm('¿Reiniciar todos los datos del periodontograma?')) return;
    onUpdate(createDefaultPeriodontogramData());
    setSelectedToothId(null);
  }, [onUpdate]);

  return (
    <div className="bg-white p-5 lg:p-8 rounded-2xl select-none border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="flex flex-col xl:flex-row items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold">Evaluación Periodontal</span>
          </div>
          <h3 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight mb-1">Periodontograma</h3>
          <p className="text-slate-400 text-sm">
            <span className="text-blue-500 font-semibold">Arrastre la sonda</span> verticalmente sobre cada diente para registrar la profundidad.
            Toque un diente para ver detalles.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={resetAll}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 border border-slate-200 transition-all active:scale-95"
          >
            <RotateCcw size={14} />
            Reiniciar
          </button>
        </div>
      </div>

      {/* Arch toggle */}
      <div className="flex items-center gap-4 mb-5">
        <div className="flex bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setViewArch('upper')}
            className={cn(
              'px-5 py-2.5 rounded-lg text-xs font-bold transition-all',
              viewArch === 'upper' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            Arcada Superior
          </button>
          <button
            onClick={() => setViewArch('lower')}
            className={cn(
              'px-5 py-2.5 rounded-lg text-xs font-bold transition-all',
              viewArch === 'lower' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            Arcada Inferior
          </button>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="text-[9px] font-bold text-slate-400">≤3mm Sano</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-amber-500 rounded-full" />
            <span className="text-[9px] font-bold text-slate-400">4-5mm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="text-[9px] font-bold text-slate-400">≥6mm</span>
          </div>
        </div>
      </div>

      {/* Teeth row with probes */}
      <div className="overflow-x-auto hide-scrollbar -mx-4 px-4 pb-4">
        <div className="flex gap-1.5 min-w-max">
          {currentArch.map((tid, i) => {
            const tooth = data.teeth.find(t => t.toothId === tid);
            if (!tooth) return null;
            const mainDepth = tooth.buccal[1].depth; // center buccal as "main" depth
            return (
              <motion.div
                key={tid}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <ToothProbe
                  toothData={tooth}
                  isSelected={selectedToothId === tid}
                  onSelect={() => handleSelectTooth(tid)}
                  onUpdateDepth={(d) => handleQuickDepth(tid, d)}
                  currentDepth={mainDepth}
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      <AnimatePresence mode="wait">
        {selectedTooth && (
          <div className="mt-4">
            <DetailPanel
              key={selectedTooth.toothId}
              tooth={selectedTooth}
              data={data}
              onUpdate={handleUpdateWithToast}
              onPrev={() => navigateTooth(-1)}
              onNext={() => navigateTooth(1)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <SummaryStats data={data} />
    </div>
  );
};

export default Periodontogram;
