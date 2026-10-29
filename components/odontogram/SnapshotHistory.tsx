/**
 * SnapshotHistory.tsx — Historical state selector, compare mode, and
 * snapshot list for the Odontogram.
 *
 * Extracted from the 1,503-line Odontogram.tsx monolith.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Clock, ArrowLeftRight, ChevronDown, ChevronUp } from 'lucide-react';
import { ToothData, OdontogramSnapshot } from '../../types';
import { cn } from '../../lib/utils';
import { conditionThemes, getWholeToothCondition } from './odontogramData';

export interface SnapshotHistoryProps {
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

export const SnapshotHistory: React.FC<SnapshotHistoryProps> = React.memo(({
  snapshots, currentTeeth,
  compareMode, onToggleCompare, compareA, compareB, onSetCompareA, onSetCompareB,
  changedTeeth, viewingSnapshotId, onViewSnapshot,
}: SnapshotHistoryProps) => {
  const [listExpanded, setListExpanded] = useState(false);

  const options = useMemo(() => [
    { id: 'current', label: 'Estado Actual' },
    ...snapshots.map(s => ({
      id: s.id,
      label: new Date(s.date).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    })),
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
            <p className="text-[9px] text-slate-500 font-bold">
              {snapshots.length} registro{snapshots.length !== 1 ? 's' : ''} guardado{snapshots.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {snapshots.length >= 1 && (
            <button
              onClick={onToggleCompare}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-[1px] transition-all border',
                compareMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200',
              )}
            >
              <ArrowLeftRight size={12} /> Comparar
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
        <div className="border-t border-slate-300 overflow-hidden animate-in slide-in-from-top-2 duration-300">
          <div className="p-5">
            <div className="flex flex-col md:flex-row items-center gap-4">
              {(['A', 'B'] as const).map((label, idx) => {
                const val    = idx === 0 ? compareA : compareB;
                const setter = idx === 0 ? onSetCompareA : onSetCompareB;
                return (
                  <div key={label} className="flex-1 w-full">
                    <label className="text-[9px] font-black uppercase tracking-[2px] text-slate-500 mb-1 block">Fecha {label}</label>
                    <select
                      value={val}
                      onChange={e => setter(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-700"
                    >
                      {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </div>
                );
              })}
              <ArrowLeftRight size={16} className="text-slate-400 flex-shrink-0 mt-4 md:mt-0" />
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
                const label     = options.find(o => o.id === snapId)?.label || '';
                return (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[9px] font-black uppercase tracking-[1px] text-slate-500 mb-2">{label}</p>
                    <div className="flex flex-wrap gap-0.5">
                      {snapTeeth.map(t => {
                        const wholeCond    = getWholeToothCondition(t.surfaces);
                        const isChanged    = changedTeeth.has(t.id);
                        const hasConditions = t.surfaces.length > 0;
                        const color        = hasConditions
                          ? conditionThemes[wholeCond || t.surfaces[0]?.condition]?.color || '#3B82F6'
                          : undefined;
                        return (
                          <div
                            key={t.id}
                            className={cn(
                              'w-5 h-5 rounded-sm flex items-center justify-center text-[6px] font-black',
                              isChanged && 'ring-1 ring-blue-400',
                              !hasConditions && 'bg-white text-slate-400 border border-slate-300',
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
        <div className="border-t border-slate-300 overflow-hidden animate-in slide-in-from-top-2 duration-300">
          <div className="p-5 space-y-2 max-h-48 overflow-y-auto hide-scrollbar">
            {snapshots.map((snap, i) => {
              const date     = new Date(snap.date);
              const affected = snap.teeth.filter(t => t.surfaces && t.surfaces.length > 0).length;
              const isViewing = viewingSnapshotId === snap.id;
              return (
                <button
                  key={snap.id}
                  onClick={() => onViewSnapshot(isViewing ? null : snap.id)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left',
                    isViewing ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 hover:bg-slate-100',
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

SnapshotHistory.displayName = 'SnapshotHistory';
