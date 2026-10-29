/**
 * ConditionPanel.tsx — Sidebar (desktop) / Bottom Sheet (mobile) for
 * selecting the clinical condition to apply to odontogram surfaces.
 *
 * Extracted from the 1,503-line Odontogram.tsx monolith.
 */

import React, { useState } from 'react';
import { MousePointer2, Paintbrush, Info, Check } from 'lucide-react';
import { ClinicalCondition } from '../../types';
import { cn } from '../../lib/utils';
import { conditionThemes, CONDITION_GROUPS } from './odontogramData';
import { ChevronUp } from 'lucide-react';

export interface ConditionPanelProps {
  selected: ClinicalCondition | null;
  onSelect: (c: ClinicalCondition) => void;
  mode: 'guided' | 'rapid';
  onModeChange: (mode: 'guided' | 'rapid') => void;
}

export const ConditionPanel: React.FC<ConditionPanelProps> = React.memo(
  ({ selected, onSelect, mode, onModeChange }: ConditionPanelProps) => {
    const [mobileOpen, setMobileOpen] = useState(false);

    const panelContent = (
      <div className="space-y-5">
        {/* Interaction mode toggle */}
        <div className="p-1 bg-slate-100 border border-slate-200 rounded-xl grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => onModeChange('guided')}
            className={cn(
              'flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-black transition-all',
              mode === 'guided' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            <MousePointer2 size={12} /> Enfocado
          </button>
          <button
            type="button"
            onClick={() => onModeChange('rapid')}
            className={cn(
              'flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-black transition-all',
              mode === 'rapid' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            <Paintbrush size={12} /> Registro rápido
          </button>
        </div>

        {/* Instructions / active tool */}
        <div className={cn('p-3 rounded-xl border', mode === 'guided' ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200')}>
          <div className="flex items-start gap-2">
            <Info size={14} className={cn('mt-0.5 flex-shrink-0', mode === 'guided' ? 'text-blue-500' : 'text-amber-600')} />
            <div className={cn('text-xs font-bold leading-relaxed', mode === 'guided' ? 'text-blue-700' : 'text-amber-800')}>
              {mode === 'guided' ? (
                <>
                  <p>1. Selecciona una pieza</p>
                  <p>2. Elige la condición en la lupa</p>
                  <p>3. Marca una cara solo si corresponde</p>
                </>
              ) : selected ? (
                <>
                  <p className="text-[10px] uppercase tracking-wider opacity-70">Herramienta activa</p>
                  <p className="text-sm text-slate-900">{conditionThemes[selected].label}</p>
                  <p className="mt-1 opacity-75">
                    {conditionThemes[selected].wholeToothOnly
                      ? 'Toca cualquier cara para aplicar a la pieza completa'
                      : 'Toca las caras que deseas registrar'}
                  </p>
                </>
              ) : (
                <p>Selecciona una condición para comenzar el registro rápido.</p>
              )}
            </div>
          </div>
        </div>

        {/* Condition groups (rapid mode only) */}
        {mode === 'rapid' && CONDITION_GROUPS.map(group => (
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
                      'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border text-left',
                      isActive
                        ? 'bg-blue-50 border-blue-400 text-slate-900 shadow-sm'
                        : `${theme.bg} ${theme.border} text-slate-600 hover:shadow-sm`,
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
                style={{ backgroundColor: selected ? conditionThemes[selected].color : '#94A3B8' }}
              >
                {selected
                  ? React.createElement(conditionThemes[selected].icon, { size: 12, className: 'text-white' })
                  : <MousePointer2 size={12} className="text-white" />}
              </div>
              <span className="text-sm font-black text-slate-700">
                {mode === 'guided' ? 'Modo enfocado' : selected ? conditionThemes[selected].label : 'Elige una condición'}
              </span>
              <span className="text-[9px] text-slate-500 font-bold">— toca para opciones</span>
            </div>
            <ChevronUp size={16} className={cn('text-slate-500 transition-transform', mobileOpen && 'rotate-180')} />
          </button>

          {mobileOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/20 z-[-1] animate-in fade-in duration-200"
                onClick={() => setMobileOpen(false)}
              />
              <div className="overflow-hidden bg-white border-t border-slate-300 animate-in slide-in-from-bottom-2 duration-300">
                <div className="max-h-[50vh] overflow-y-auto p-4 pb-6">
                  {panelContent}
                </div>
              </div>
            </>
          )}
        </div>
      </>
    );
  },
);

ConditionPanel.displayName = 'ConditionPanel';
