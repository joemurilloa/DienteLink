
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
    if (mm <= 3) return 'bg-blue-500';
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
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-300">
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
          "mt-2 text-[11px] font-bold px-1.5 py-0.5 rounded-md transition-all",
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
    <div className="bg-white p-5 lg:p-8 rounded-2xl select-none border border-slate-200 shadow-sm transition-all duration-500">
      <div className="flex flex-col xl:flex-row items-start justify-between gap-6 mb-8">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-semibold">Evaluación Periodontal</span>
          </div>
          <h3 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight leading-tight mb-2">Periodontograma</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Registre y monitoree la profundidad de las bolsas periodontales.
            <span className="text-blue-500 font-medium"> Deslice verticalmente</span> para ajustar valores.
          </p>
        </div>

        <div className="flex bg-slate-50 p-2 rounded-xl border border-slate-200 gap-4 items-center px-5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
            <span className="text-[10px] font-semibold text-slate-500">Salud (≤3mm)</span>
          </div>
          <div className="w-px h-3 bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
            <span className="text-[10px] font-semibold text-slate-500">Bolsa (≥4mm)</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto hide-scrollbar -mx-6 px-6 pb-12 cursor-grab active:cursor-grabbing">
        <div className="flex gap-4 min-w-max">
          {depths.map((d, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <ToothProbe
                index={i}
                value={depths[i] || 1}
                onChange={(val) => handleUpdateDepth(i, val)}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        <div className="md:col-span-7 bg-slate-900 p-6 rounded-2xl text-white relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-5">
            <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <div className="text-center">
                <p className="text-[9px] font-semibold uppercase text-slate-400 tracking-wider">Riesgo</p>
                <p className="text-2xl font-bold text-rose-400">{depths.filter(d => d >= 4).length}</p>
              </div>
            </div>
            <div>
              <p className="font-bold text-lg mb-1">Hallazgos Críticos</p>
              <p className="text-slate-400 text-sm leading-relaxed">
                {depths.filter(d => d >= 4).length} zonas con bolsa patológica que requieren atención.
              </p>
            </div>
          </div>
        </div>

        <div className="md:col-span-5 bg-slate-50 p-6 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Promedio Global</p>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">
              {(depths.reduce((a, b) => a + b, 0) / depths.length).toFixed(1)}
              <span className="text-base text-slate-400 ml-1.5">mm</span>
            </p>
          </div>
          <button
            className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
            title="Guardar Mediciones"
          >
            <Save size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Periodontogram;
