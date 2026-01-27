
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface PeriodontogramProps {
  depths: number[];
  onUpdate: (depths: number[]) => void;
}

const ToothProbe: React.FC<{ index: number; value: number; onChange: (val: number) => void }> = ({ index, value, onChange }) => {
  // Mapeo de mm a colores
  const getColor = (mm: number) => {
    if (mm <= 3) return 'bg-emerald-500';
    if (mm <= 5) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const isMolar = [0, 1, 2, 13, 14, 15].includes(index);

  return (
    <div className="flex flex-col items-center flex-shrink-0 w-12 group select-none">
      {/* Visualización del Diente (Simplificada) */}
      <div className="w-10 h-12 relative flex items-center justify-center mb-2">
        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-sm filter">
          <path
            d={isMolar ? "M20 40 Q20 20 50 20 Q80 20 80 40 Q80 70 70 100 Q50 110 30 100 Z" : "M30 30 Q30 15 50 15 Q70 15 70 30 Q70 60 60 100 Q50 110 40 100 Z"}
            fill="white"
            stroke="#E2E8F0"
            strokeWidth="2"
          />
          <path d="M40 25 Q50 20 60 25" stroke="white" strokeWidth="3" strokeOpacity="0.5" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-300">
          {index + 1}
        </span>
      </div>

      {/* Zona Reactiva de Arrastre */}
      <div className="relative w-full h-32 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col items-center justify-start py-2 overflow-hidden shadow-inner">
        {/* Barra de Profundidad */}
        <motion.div
          layout
          initial={{ height: 0 }}
          animate={{ height: `${value * 10}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={cn("w-1.5 rounded-full shadow-lg transition-colors duration-300", getColor(value))}
        />

        {/* Indicador Numérico */}
        <div className={cn(
          "mt-2 text-[11px] font-black px-1.5 py-0.5 rounded-md transition-all",
          value > 5 ? "bg-rose-100 text-rose-600 scale-110" : "text-slate-400"
        )}>
          {value}mm
        </div>

        {/* Capa de Control Invisible para Gestos */}
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.05}
          onDrag={(_, info) => {
            // Sensibilidad: 8px por mm
            const deltaMm = Math.round(info.offset.y / 8);
            const newValue = Math.min(10, Math.max(1, value + deltaMm));
            if (newValue !== value) onChange(newValue);
          }}
          className="absolute inset-0 cursor-ns-resize z-20 active:bg-blue-50/20"
        />
      </div>
    </div>
  );
};

const Periodontogram: React.FC<PeriodontogramProps> = ({ depths, onUpdate }) => {

  const handleUpdateDepth = (idx: number, val: number) => {
    const next = [...depths];
    next[idx] = val;
    onUpdate(next);
  };

  return (
    <div className="glass-panel p-8 rounded-[48px] shadow-2xl border-white/60">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Sondaje Periodontal</h3>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mt-1">Desliza verticalmente para medir</p>
        </div>

        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">Sano</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-rose-500 rounded-full" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">Bolsa</span>
          </div>
        </div>
      </div>

      {/* Contenedor Scrollable de Dientes */}
      <div className="overflow-x-auto hide-scrollbar pb-6 -mx-4 px-4">
        <div className="flex gap-2 min-w-max px-2">
          {depths.map((d, i) => (
            <ToothProbe
              key={i}
              index={i}
              value={depths[i] || 1}
              onChange={(val) => handleUpdateDepth(i, val)}
            />
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 p-6 rounded-[32px] text-white relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-1">Resumen Clínico</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black">
                {depths.filter(d => d >= 4).length}
              </span>
              <span className="text-xs font-bold text-slate-400 mb-1">puntos con riesgo (≥4mm)</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
        </div>

        <div className="glass-panel p-6 rounded-[32px] border-white/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Promedio</p>
            <p className="text-2xl font-black text-slate-900">
              {(depths.reduce((a, b) => a + b, 0) / 16).toFixed(1)}mm
            </p>
          </div>
          <button className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-slate-100 hover:scale-110 active:scale-95 transition-all text-blue-600">
            <Save size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Periodontogram;
