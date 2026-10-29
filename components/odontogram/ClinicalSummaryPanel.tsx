/**
 * ClinicalSummaryPanel.tsx — Collapsible panel showing dental integrity
 * statistics and a clipboard-exportable text summary.
 *
 * Extracted from the 1,503-line Odontogram.tsx monolith.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Crosshair, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { ToothData, ClinicalCondition } from '../../types';
import { cn } from '../../lib/utils';
import { conditionThemes, getWholeToothCondition, getSurfaceDisplayName, TOOTH_INFO } from './odontogramData';

interface ClinicalSummaryPanelProps {
  teeth: ToothData[];
}

export const ClinicalSummaryPanel: React.FC<ClinicalSummaryPanelProps> = React.memo(({ teeth }: ClinicalSummaryPanelProps) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied]     = useState(false);

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

    const healthyCount  = 32 - totalAffected;
    const integrity     = Math.round((healthyCount / 32) * 100);
    const treatmentTeeth = teeth.filter(t =>
      t.surfaces.some(s => conditionThemes[s.condition]?.group === 'tratamiento'),
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
        `${getSurfaceDisplayName(s.surface, t.id)} ${conditionThemes[s.condition].label.toLowerCase()}`,
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
        <div className="border-t border-slate-300 overflow-hidden animate-in slide-in-from-top-2 duration-300">
          <div className="p-5 space-y-5">
            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Integridad', value: `${stats.integrity}%`, color: 'text-slate-900', bar: stats.integrity },
                { label: 'Sanos',      value: stats.healthyCount,    color: 'text-blue-600'  },
                { label: 'Afectados',  value: stats.totalAffected,   color: 'text-rose-500'  },
                { label: 'Condiciones',value: condEntries.length,    color: 'text-blue-600'  },
              ].map(({ label, value, color, bar }) => (
                <div key={label} className="p-3 bg-slate-50 rounded-xl text-center">
                  <p className="text-[9px] font-black uppercase tracking-[1px] text-slate-500 mb-1">{label}</p>
                  <div className={cn('text-2xl font-black tabular-nums', color)}>{value}</div>
                  {bar !== undefined && (
                    <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          backgroundColor: bar > 70 ? '#3b82f6' : bar > 40 ? '#F59E0B' : '#EF4444',
                          width: `${bar}%`,
                        }}
                      />
                    </div>
                  )}
                  {bar === undefined && <p className="text-[9px] text-slate-500">de 32</p>}
                </div>
              ))}
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
                    const info     = TOOTH_INFO[t.id];
                    const treatments = t.surfaces.filter(s => conditionThemes[s.condition]?.group === 'tratamiento');
                    return (
                      <div key={t.id} className="flex items-center gap-2 p-2.5 bg-orange-50 rounded-xl">
                        <span className="text-xs font-black text-slate-700 flex-shrink-0">Pieza {info?.fdi}</span>
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
                'flex items-center justify-center gap-2 w-full py-3 rounded-xl text-xs font-black uppercase tracking-[1px] transition-all border',
                copied
                  ? 'bg-blue-100 text-blue-700 border-blue-200'
                  : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200',
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

ClinicalSummaryPanel.displayName = 'ClinicalSummaryPanel';
