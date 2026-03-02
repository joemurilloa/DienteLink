
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
    <div className="bg-white/40 backdrop-blur-3xl p-10 lg:p-14 rounded-[64px] select-none border border-white shadow-2xl transition-all duration-700">
      <div className="flex flex-col xl:flex-row items-start justify-between gap-10 mb-16 animate-in-up">
        <div className="max-w-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-[9px] font-black uppercase tracking-[2px]">Evaluación Periodontal</div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/60 text-slate-400 rounded-full text-[9px] font-black uppercase tracking-[2px] border border-slate-100 italic">Sondaje en Vivo</div>
          </div>
          <h3 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter italic leading-none mb-6">Estado del Periodonto</h3>
          <p className="text-slate-400 text-sm font-bold leading-relaxed">
            Registre y monitoree la profundidad de las bolsas periodontales.
            <span className="text-blue-500"> Deslice verticalmente</span> sobre cada sonda para ajustar los valores biométricos.
          </p>
        </div>

        <div className="flex bg-slate-100/40 p-2 rounded-[32px] border border-slate-200/50 backdrop-blur-2xl shadow-inner gap-6 items-center px-8">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/30" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salud (≤3mm)</span>
          </div>
          <div className="w-[1px] h-4 bg-slate-200" />
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-rose-500 rounded-full shadow-lg shadow-rose-500/30 animate-pulse" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bolsa (≥4mm)</span>
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

      <div className="mt-12 grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        <div className="md:col-span-7 bg-slate-900 p-8 rounded-[48px] text-white relative overflow-hidden group shadow-2xl flex flex-col justify-center">
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8">
            <div className="w-24 h-24 bg-white/5 rounded-[36px] flex items-center justify-center border border-white/10 group-hover:rotate-6 transition-transform duration-500">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Riesgo</p>
                <p className="text-4xl font-black text-rose-500">{depths.filter(d => d >= 4).length}</p>
              </div>
            </div>
            <div className="text-center sm:text-left">
              <p className="font-extrabold text-2xl tracking-tighter italic mb-2">Hallazgos Críticos</p>
              <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-sm">
                Se han detectado {depths.filter(d => d >= 4).length} zonas con profundidad de bolsa patológica que requieren atención inmediata.
              </p>
            </div>
          </div>
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-rose-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="md:col-span-5 bg-white/60 backdrop-blur-3xl p-8 rounded-[48px] border border-white shadow-xl flex items-center justify-between group">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[3px]">Promedio Global</p>
            </div>
            <p className="text-5xl font-black text-slate-900 tracking-tighter italic leading-none">
              {(depths.reduce((a, b) => a + b, 0) / depths.length).toFixed(1)}
              <span className="text-xl text-slate-300 ml-2">mm</span>
            </p>
          </div>
          <button
            className="w-20 h-20 bg-slate-900 text-white rounded-[32px] flex items-center justify-center shadow-2xl shadow-slate-900/20 hover:bg-blue-600 transition-all hover:scale-105 active:scale-95 group/btn"
            title="Guardar Mediciones"
          >
            <Save size={28} className="group-hover/btn:rotate-12 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Periodontogram;
