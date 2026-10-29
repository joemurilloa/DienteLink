/**
 * Odontogram.tsx — Orchestrator component (~200 lines).
 *
 * All heavy sub-components and data have been extracted to:
 *   components/odontogram/
 *     ├── odontogramData.ts      — TOOTH_INFO, conditionThemes, SVG paths, pure utils
 *     ├── ToothDiagram.tsx       — Interactive 5-surface SVG tooth
 *     ├── ConditionPanel.tsx     — Sidebar / mobile bottom-sheet picker
 *     ├── ClinicalSummaryPanel.tsx — Stats + clipboard export
 *     └── SnapshotHistory.tsx    — Historical state selector + compare mode
 *
 * This file owns only: state management, event handlers, and layout assembly.
 * Previously: 1,503 lines. Now: ~200 lines.
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { ToothData, ToothSurface, ClinicalCondition, OdontogramSnapshot } from '../types';
import { cn, ensureOdontogram } from '../lib/utils';
import { sileo } from 'sileo';
import 'sileo/styles.css';
import {
  Clock, Info,
  Eye, Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react';
import ToothDetailModal from './ToothDetailModal';
import { usePriceCatalog, suggestBudgetItem } from '../lib/priceCatalog';

// Sub-components
import { ToothDiagram }          from './odontogram/ToothDiagram';
import { ConditionPanel }        from './odontogram/ConditionPanel';
import { ClinicalSummaryPanel }  from './odontogram/ClinicalSummaryPanel';
import { SnapshotHistory }       from './odontogram/SnapshotHistory';

// Data utilities
import {
  TOOTH_INFO,
  conditionThemes,
  getWholeToothCondition,
  getSurfaceDisplayName,
} from './odontogram/odontogramData';

// ArchFit: scales the dental arch to the available container width
const ARCH_NATURAL_WIDTH = 1180;
const ARCH_MOBILE_WIDTH  = 505;
const ArchFit: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const mobile = typeof window !== 'undefined' && window.innerWidth < 768;

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const calc = () => {
      if (window.innerWidth < 768) return setScale(Math.min(1, Math.max(0.3, (window.innerWidth - 80) / ARCH_MOBILE_WIDTH)));
      setScale(Math.min(1, Math.max(0.5, el.clientWidth / ARCH_NATURAL_WIDTH)));
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="overflow-x-auto custom-scrollbar pb-8 min-w-0 max-w-full -mx-6 px-6 lg:mx-0 lg:px-0">
      <div className="mx-auto" style={{ minWidth: scale < 1 ? undefined : 850, width: mobile ? ARCH_MOBILE_WIDTH : undefined, zoom: scale }}>
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// Props
// ============================================================================

interface OdontogramProps {
  patientId: string;
  teeth: ToothData[];
  onUpdate: (teeth: ToothData[]) => void | Promise<void>;
  snapshots?: OdontogramSnapshot[];
  onSaveSnapshot?: () => void | Promise<void>;
  readOnly?: boolean;
  onAddToBudget?: (toothId: number, suggestion: { treatment: string; cost: string }) => void;
}

// ============================================================================
// Main component
// ============================================================================

const Odontogram: React.FC<OdontogramProps> = ({
  patientId, teeth: teethProp, onUpdate, snapshots = [], onSaveSnapshot, onAddToBudget, readOnly = false,
}) => {
  const teeth = ensureOdontogram(teethProp);
  const { catalog } = usePriceCatalog();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedCondition, setSelectedCondition]       = useState<ClinicalCondition | null>(null);
  const [interactionMode, setInteractionMode]           = useState<'guided' | 'rapid'>('guided');
  const [saveStatus, setSaveStatus]                     = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [viewingSnapshotId, setViewingSnapshotId]       = useState<string | null>(null);
  const [compareMode, setCompareMode]                   = useState(false);
  const [compareA, setCompareA]                         = useState<string>('current');
  const [compareB, setCompareB]                         = useState<string>(snapshots[0]?.id || '');
  const [selectedToothForDetail, setSelectedToothForDetail] = useState<number | null>(null);
  const saveSequence = useRef(0);

  // ── Derived state ─────────────────────────────────────────────────────────
  const displayTeeth = useMemo(() => {
    if (!viewingSnapshotId) return teeth;
    return snapshots.find(s => s.id === viewingSnapshotId)?.teeth || teeth;
  }, [viewingSnapshotId, teeth, snapshots]);

  const isReadOnly = readOnly || viewingSnapshotId !== null;

  const changedTeeth = useMemo(() => {
    if (!compareMode) return new Set<number>();
    const get = (id: string): ToothData[] =>
      id === 'current' ? teeth : (snapshots.find(s => s.id === id)?.teeth || []);
    const teethA = get(compareA);
    const teethB = get(compareB);
    const changed = new Set<number>();
    for (let i = 0; i < 32; i++) {
      const a = teethA[i], b = teethB[i];
      if (!a || !b) continue;
      const sort = (ss: typeof a.surfaces) => [...ss].sort((x, y) => x.surface.localeCompare(y.surface));
      if (JSON.stringify(sort(a.surfaces)) !== JSON.stringify(sort(b.surfaces))) changed.add(a.id);
    }
    return changed;
  }, [compareMode, compareA, compareB, teeth, snapshots]);

  // ── Core save helper ──────────────────────────────────────────────────────
  const commitTeeth = useCallback((updated: ToothData[], previous: ToothData[], message: string) => {
    const sequence = ++saveSequence.current;
    setSaveStatus('saving');
    void (async () => {
      try {
        await onUpdate(updated);
        if (sequence === saveSequence.current) setSaveStatus('saved');
        sileo.success({
          title: message,
          description: 'Cambio guardado en el expediente',
          button: {
            title: 'Deshacer',
            onClick: () => {
              const undoSeq = ++saveSequence.current;
              setSaveStatus('saving');
              void Promise.resolve(onUpdate(previous))
                .then(() => { if (undoSeq === saveSequence.current) setSaveStatus('saved'); sileo.info({ title: 'Cambio deshecho' }); })
                .catch(() => { if (undoSeq === saveSequence.current) setSaveStatus('error'); sileo.error({ title: 'No se pudo deshacer' }); });
            },
          },
        });
      } catch {
        if (sequence === saveSequence.current) setSaveStatus('error');
        sileo.error({ title: 'No se pudo guardar el odontograma', description: 'Inténtalo nuevamente.' });
      }
    })();
  }, [onUpdate]);

  // ── Event handlers ────────────────────────────────────────────────────────
  const handleSurfaceClick = useCallback((toothId: number, surface: ToothSurface) => {
    if (!selectedCondition || isReadOnly) return;
    const theme    = conditionThemes[selectedCondition];
    const toothInfo = TOOTH_INFO[toothId];

    const updatedTeeth = teeth.map(t => {
      if (t.id !== toothId) return t;
      const existingWhole = getWholeToothCondition(t.surfaces);
      const newSurfaces   = existingWhole && !theme.wholeToothOnly && selectedCondition !== 'healthy' ? [] : [...t.surfaces];

      if (theme.wholeToothOnly || selectedCondition === 'healthy') {
        if (selectedCondition === 'healthy') return { ...t, surfaces: [] };
        const existing = newSurfaces.find(s => s.condition === selectedCondition);
        if (existing) return { ...t, surfaces: [] };
        return { ...t, surfaces: [{ surface: 'oclusal' as ToothSurface, condition: selectedCondition }] };
      }

      const idx = newSurfaces.findIndex(s => s.surface === surface);
      if (idx !== -1) {
        if (newSurfaces[idx].condition === selectedCondition) newSurfaces.splice(idx, 1);
        else newSurfaces[idx] = { surface, condition: selectedCondition };
      } else {
        newSurfaces.push({ surface, condition: selectedCondition });
      }
      return { ...t, surfaces: newSurfaces };
    });

    const scope = theme.wholeToothOnly ? 'pieza completa' : getSurfaceDisplayName(surface, toothId);
    commitTeeth(updatedTeeth, teeth, `${theme.label} · FDI ${toothInfo.fdi} · ${scope}`);
  }, [teeth, selectedCondition, isReadOnly, commitTeeth]);

  const handleClearSurface = useCallback((toothId: number, surface: ToothSurface) => {
    const toothBefore = teeth.find(t => t.id === toothId);
    if (!toothBefore) return;
    const wholeCond   = getWholeToothCondition(toothBefore.surfaces);
    const updatedTeeth = teeth.map(t => {
      if (t.id !== toothId) return t;
      if (wholeCond) return { ...t, surfaces: [] };
      return { ...t, surfaces: t.surfaces.filter(s => s.surface !== surface) };
    });
    commitTeeth(updatedTeeth, teeth, `Superficie limpiada · FDI ${TOOTH_INFO[toothId]?.fdi || toothId}`);
  }, [teeth, commitTeeth]);

  const handleClearWholeTooth = useCallback((toothId: number) => {
    const updated = teeth.map(t => t.id === toothId ? { ...t, surfaces: [] } : t);
    commitTeeth(updated, teeth, `${TOOTH_INFO[toothId]?.name || 'Pieza'} marcada como sana`);
  }, [teeth, commitTeeth]);

  const handleSetWholeToothCondition = useCallback((toothId: number, condition: ClinicalCondition) => {
    const updated = teeth.map(t =>
      t.id !== toothId ? t : { ...t, surfaces: [{ surface: 'oclusal' as ToothSurface, condition }] },
    );
    commitTeeth(updated, teeth, `${conditionThemes[condition]?.label || condition} · FDI ${TOOTH_INFO[toothId]?.fdi || toothId}`);
  }, [teeth, commitTeeth]);

  const handleToggleCompare = useCallback(() => {
    setCompareMode(prev => {
      if (!prev && snapshots.length > 0) { setCompareA('current'); setCompareB(snapshots[0].id); }
      return !prev;
    });
  }, [snapshots]);

  const handleOpenToothDetail = useCallback((toothId: number) => {
    if (interactionMode === 'guided') setSelectedCondition(null);
    setSelectedToothForDetail(toothId);
  }, [interactionMode]);

  const handleSaveSnapshot = useCallback(async () => {
    if (!onSaveSnapshot) return;
    try {
      await onSaveSnapshot();
      sileo.success({ title: 'Estado guardado', description: 'Puedes comparar este odontograma más adelante.' });
    } catch {
      sileo.error({ title: 'No se pudo guardar el estado', description: 'Inténtalo de nuevo.' });
    }
  }, [onSaveSnapshot]);

  const upper = displayTeeth.slice(0, 16);
  const lower = displayTeeth.slice(16, 32);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white p-4 lg:p-6 rounded-2xl select-none border border-slate-300 shadow-sm transition-all duration-500">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight leading-tight mb-1">Odontograma</h3>
          <p className="text-slate-500 text-sm max-w-md leading-relaxed">
            Selecciona una pieza para registrar hallazgos. Solo se pedirá una superficie cuando sea necesaria.
          </p>
        </div>
        <div className="mr-14 lg:mr-16 flex items-center gap-2">
          {onSaveSnapshot && !isReadOnly && (
            <button type="button" onClick={() => void handleSaveSnapshot()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Clock size={12} /> Guardar estado
            </button>
          )}
          <div className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border',
            isReadOnly ? 'bg-slate-50 border-slate-200 text-slate-600'
              : saveStatus === 'error'   ? 'bg-red-50 border-red-200 text-red-700'
              : saveStatus === 'saving'  ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700',
          )} role="status" aria-live="polite">
            {isReadOnly ? <Eye size={12} /> : saveStatus === 'saving' ? <Loader2 size={12} className="animate-spin" /> : saveStatus === 'error' ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
            {isReadOnly ? 'Solo lectura' : saveStatus === 'saving' ? 'Guardando…' : saveStatus === 'error' ? 'Error al guardar' : saveStatus === 'saved' ? 'Guardado' : 'Autoguardado activo'}
          </div>
        </div>
      </div>

      {/* Mobile tip */}
      <div className="md:hidden mb-4 p-3 bg-blue-50/80 border border-blue-200/50 rounded-xl flex items-center gap-2.5">
        <Info size={16} className="text-blue-500 flex-shrink-0" />
        <p className="text-xs font-medium text-blue-800 leading-snug">
          Toca una pieza para abrir su detalle. Primero eliges la condición y después la cara, si corresponde.
        </p>
      </div>

      {/* Read-only banner */}
      {isReadOnly && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-amber-600" />
            <span className="text-xs font-bold text-amber-700">Visualizando versión histórica — solo lectura</span>
          </div>
          <button onClick={() => setViewingSnapshotId(null)}
            className="px-3 py-1.5 bg-amber-200 text-amber-800 rounded-lg text-xs font-black hover:bg-amber-300 transition-colors"
          >
            Volver al actual
          </button>
        </div>
      )}

      {/* Main layout */}
      <div className="flex gap-6">
        {!isReadOnly && (
          <ConditionPanel
            selected={selectedCondition}
            onSelect={setSelectedCondition}
            mode={interactionMode}
            onModeChange={mode => { setInteractionMode(mode); if (mode === 'guided') setSelectedCondition(null); }}
          />
        )}

        <div className={cn('flex-1 space-y-2 relative pb-20 xl:pb-0')}>
          <ArchFit>
            <div className="relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 z-0 hidden md:block" />
              <div className="absolute inset-0 pointer-events-none z-0 hidden md:block">
                <span className="absolute top-0 left-1/4 -translate-x-1/2 text-[40px] font-black text-slate-50 opacity-[0.03]">1</span>
                <span className="absolute top-0 right-1/4 translate-x-1/2 text-[40px] font-black text-slate-50 opacity-[0.03]">2</span>
                <span className="absolute bottom-20 left-1/4 -translate-x-1/2 text-[40px] font-black text-slate-50 opacity-[0.03]">4</span>
                <span className="absolute bottom-20 right-1/4 translate-x-1/2 text-[40px] font-black text-slate-50 opacity-[0.03]">3</span>
                <span className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-black text-slate-400 uppercase tracking-widest">Derecho</span>
                <span className="absolute right-0 top-1/2 -translate-y-1/2 rotate-90 text-xs font-black text-slate-400 uppercase tracking-widest">Izquierdo</span>
              </div>

              {/* Upper arch */}
              <div className="flex flex-col items-center relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px w-12 bg-gradient-to-r from-transparent to-slate-200" />
                  <span className="text-xs font-black uppercase text-slate-500 tracking-[3px]">Arcada Superior</span>
                  <div className="h-px w-12 bg-gradient-to-l from-transparent to-slate-200" />
                </div>
                <div className="flex flex-wrap justify-center gap-x-1 md:gap-x-3 gap-y-6">
                  {upper.map(tooth => (
                    <ToothDiagram key={tooth.id} tooth={tooth} selectedCondition={selectedCondition}
                      onSurfaceClick={interactionMode === 'guided' ? handleOpenToothDetail : handleSurfaceClick}
                      onClearSurface={handleClearSurface} onToothClick={handleOpenToothDetail}
                      highlight={compareMode && changedTeeth.has(tooth.id)} readOnly={isReadOnly}
                    />
                  ))}
                </div>
              </div>

              {/* Midline */}
              <div className="flex items-center justify-center py-8 relative z-10">
                <div className="h-px w-full max-w-4xl bg-slate-300" />
              </div>

              {/* Lower arch */}
              <div className="flex flex-col items-center relative z-10">
                <div className="flex flex-wrap justify-center gap-x-1 md:gap-x-3 gap-y-6">
                  {[32, 31, 30, 29, 28, 27, 26, 25].map(id => {
                    const tooth = lower.find(t => t.id === id);
                    if (!tooth) return null;
                    return (
                      <ToothDiagram key={tooth.id} tooth={tooth} selectedCondition={selectedCondition}
                        onSurfaceClick={interactionMode === 'guided' ? handleOpenToothDetail : handleSurfaceClick}
                        onClearSurface={handleClearSurface} onToothClick={handleOpenToothDetail}
                        highlight={compareMode && changedTeeth.has(tooth.id)} readOnly={isReadOnly}
                      />
                    );
                  })}
                  <div className="w-1 hidden md:block" />
                  {[24, 23, 22, 21, 20, 19, 18, 17].map(id => {
                    const tooth = lower.find(t => t.id === id);
                    if (!tooth) return null;
                    return (
                      <ToothDiagram key={tooth.id} tooth={tooth} selectedCondition={selectedCondition}
                        onSurfaceClick={interactionMode === 'guided' ? handleOpenToothDetail : handleSurfaceClick}
                        onClearSurface={handleClearSurface} onToothClick={handleOpenToothDetail}
                        highlight={compareMode && changedTeeth.has(tooth.id)} readOnly={isReadOnly}
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
          </ArchFit>

          <ClinicalSummaryPanel teeth={displayTeeth} />

          {snapshots.length > 0 && (
            <SnapshotHistory
              snapshots={snapshots} currentTeeth={teeth}
              compareMode={compareMode} onToggleCompare={handleToggleCompare}
              compareA={compareA} compareB={compareB}
              onSetCompareA={setCompareA} onSetCompareB={setCompareB}
              changedTeeth={changedTeeth}
              viewingSnapshotId={viewingSnapshotId} onViewSnapshot={setViewingSnapshotId}
            />
          )}
        </div>
      </div>

      {/* Tooth Detail Modal */}
      {selectedToothForDetail !== null && (
        <ToothDetailModal
          isOpen={true}
          onClose={() => setSelectedToothForDetail(null)}
          toothId={selectedToothForDetail}
          teeth={displayTeeth}
          selectedCondition={selectedCondition}
          onSelectCondition={setSelectedCondition}
          onSurfaceClick={handleSurfaceClick}
          onClearSurface={handleClearSurface}
          onClearWholeTooth={handleClearWholeTooth}
          onSetWholeToothCondition={handleSetWholeToothCondition}
          onNavigateTooth={nextId => setSelectedToothForDetail(nextId)}
          readOnly={isReadOnly}
          onAddToBudget={onAddToBudget && !isReadOnly ? id => {
            onAddToBudget(id, suggestBudgetItem(displayTeeth.find(t => t.id === id), catalog));
            setSelectedToothForDetail(null);
          } : undefined}
        />
      )}
    </div>
  );
};

export default Odontogram;
