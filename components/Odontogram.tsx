
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToothData, ToothStatus } from '../types';
import { dentalService } from '../services/dentalService';
import { cn } from '../lib/utils';

interface OdontogramProps {
  patientId: string;
  teeth: ToothData[];
  onUpdate: (teeth: ToothData[]) => void;
}

const statusThemes: Record<ToothStatus, { gradient: string; border: string; label: string; dot: string; fill: string; shadowColor: string; textColor: string; iconColor: string }> = {
  healthy: {
    gradient: 'from-white to-slate-50',
    border: 'border-slate-200',
    label: 'Sano',
    dot: 'bg-slate-300',
    fill: '#FFFFFF',
    shadowColor: 'rgba(203, 213, 225, 0.2)',
    textColor: 'text-slate-400',
    iconColor: 'bg-slate-100'
  },
  caries: {
    gradient: 'from-rose-500 to-rose-600',
    border: 'border-rose-700',
    label: 'Caries',
    dot: 'bg-rose-500',
    fill: '#F43F5E',
    shadowColor: 'rgba(244, 63, 94, 0.4)',
    textColor: 'text-white',
    iconColor: 'bg-rose-500'
  },
  missing: {
    gradient: 'from-slate-100 to-slate-200',
    border: 'border-slate-300',
    label: 'Ausente',
    dot: 'bg-slate-400',
    fill: '#F1F5F9',
    shadowColor: 'rgba(148, 163, 184, 0.1)',
    textColor: 'text-slate-300',
    iconColor: 'bg-slate-300'
  },
  treated: {
    gradient: 'from-blue-500 to-blue-600',
    border: 'border-blue-700',
    label: 'Tratado',
    dot: 'bg-blue-400',
    fill: '#3B82F6',
    shadowColor: 'rgba(59, 130, 246, 0.3)',
    textColor: 'text-white',
    iconColor: 'bg-blue-500'
  }
};

const ToothSVG = ({ status, id }: { status: ToothStatus; id: number }) => {
  // Clasificación anatómica de los dientes (Sistema Universal 1-32)
  const isMolar = [1, 2, 3, 14, 15, 16, 17, 18, 19, 30, 31, 32].includes(id);
  const isPremolar = [4, 5, 12, 13, 20, 21, 28, 29].includes(id);
  const isCanine = [6, 11, 22, 27].includes(id);
  const isIncisor = [7, 8, 9, 10, 23, 24, 25, 26].includes(id);

  const theme = statusThemes[status];
  const isUpper = id <= 16;

  return (
    <svg
      viewBox="0 0 100 140"
      className={cn(
        "w-full h-full transition-all duration-500",
        status === 'missing' ? "opacity-30 grayscale" : "drop-shadow-xl"
      )}
      style={{ filter: status !== 'healthy' ? `drop-shadow(0 10px 15px ${theme.shadowColor})` : 'none' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`tooth-grad-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={status === 'healthy' ? '#FFFFFF' : theme.fill} stopOpacity="1" />
          <stop offset="100%" stopColor={status === 'healthy' ? '#F8FAFC' : theme.fill} stopOpacity="0.9" />
        </linearGradient>
      </defs>

      <g transform={!isUpper ? "rotate(180 50 70)" : ""}>
        {isMolar && (
          <path
            d="M15 40C15 25 25 20 50 20C75 20 85 25 85 40C85 60 80 80 70 110C65 125 55 130 50 130C45 130 35 125 30 110C20 80 15 60 15 40Z"
            fill={`url(#tooth-grad-${id})`}
            stroke={status === 'healthy' ? '#E2E8F0' : theme.fill}
            strokeWidth="2.5"
          />
        )}
        {isPremolar && (
          <path
            d="M22 35C22 22 35 18 50 18C65 18 78 22 78 35C78 55 75 80 68 110C64 125 56 128 50 128C44 128 36 125 32 110C25 80 22 55 22 35Z"
            fill={`url(#tooth-grad-${id})`}
            stroke={status === 'healthy' ? '#E2E8F0' : theme.fill}
            strokeWidth="2.5"
          />
        )}
        {isCanine && (
          <path
            d="M28 30C28 20 40 15 50 15C60 15 72 20 72 30C72 50 68 85 62 115C58 130 50 135 42 130C32 115 28 50 28 30Z"
            fill={`url(#tooth-grad-${id})`}
            stroke={status === 'healthy' ? '#E2E8F0' : theme.fill}
            strokeWidth="2.5"
          />
        )}
        {isIncisor && (
          <path
            d="M25 25C25 18 35 15 50 15C65 15 75 18 75 25C75 45 72 85 65 115C60 128 50 132 40 125C30 110 25 45 25 25Z"
            fill={`url(#tooth-grad-${id})`}
            stroke={status === 'healthy' ? '#E2E8F0' : theme.fill}
            strokeWidth="2.5"
          />
        )}

        {/* Detalles para piezas activas */}
        {status !== 'healthy' && (
          <path
            d="M30 40 L70 40 M50 20 L50 60"
            stroke="black"
            strokeWidth="1"
            strokeOpacity="0.1"
            fill="none"
          />
        )}
      </g>
    </svg>
  );
};

const ToothIcon: React.FC<{ status: ToothStatus; onClick: () => void; id: number }> = ({ status, onClick, id }) => {
  const isUpper = id <= 16;
  const theme = statusThemes[status];

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.15, zIndex: 10 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="flex flex-col items-center cursor-pointer transition-all duration-300 group"
    >
      <motion.div
        initial={false}
        animate={{
          rotateX: status === 'missing' ? 20 : 0,
          opacity: status === 'missing' ? 0.3 : 1
        }}
        className="w-12 h-16 md:w-16 md:h-20 relative flex items-center justify-center"
      >
        <ToothSVG status={status} id={id} />

        <span className={cn(
          "absolute text-[11px] font-black z-10 select-none transition-all duration-300",
          isUpper ? "top-4" : "bottom-4",
          theme.textColor
        )}>
          {id}
        </span>

        {/* Hotspot para Caries */}
        <AnimatePresence>
          {status === 'caries' && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute w-2 h-2 bg-black/30 rounded-full blur-[2px] animate-pulse"
            />
          )}
        </AnimatePresence>

        {/* Tooltip de estado al pasar el ratón */}
        <div className="absolute -top-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 pointer-events-none">
          <div className={cn(
            "px-2 py-1 rounded-lg text-[9px] font-bold text-white shadow-lg whitespace-nowrap",
            statusThemes[status].fill.replace('#', 'bg-[#') + ']'
          )}
            style={{ backgroundColor: statusThemes[status].fill }}
          >
            {statusThemes[status].label}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Odontogram: React.FC<OdontogramProps> = ({ patientId, teeth, onUpdate }) => {
  const [selectedStatus, setSelectedStatus] = useState<ToothStatus>('caries');

  const handleToothClick = (id: number) => {
    const tooth = teeth.find(t => t.id === id);
    if (!tooth) return;
    const newStatus = tooth.status === selectedStatus ? 'healthy' : selectedStatus;
    const updatedTeeth = teeth.map(t => t.id === id ? { ...t, status: newStatus } : t);
    onUpdate(updatedTeeth);
  };

  if (teeth.length === 0) return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <div className="w-12 h-12 border-[4px] border-blue-600 border-t-transparent rounded-full animate-spin shadow-lg"></div>
      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Cargando Biometría...</p>
    </div>
  );

  return (
    <div className="bg-white/40 backdrop-blur-3xl p-10 lg:p-14 rounded-[64px] select-none border border-white shadow-2xl transition-all duration-700">
      <div className="flex flex-col xl:flex-row items-start justify-between gap-10 mb-20 animate-in-up">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-[2px]">Módulo Clínico</div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-[2px]">Biometría Digital</div>
          </div>
          <h3 className="text-5xl font-black text-slate-900 tracking-tighter italic leading-none mb-4">Cartografía Dental</h3>
          <p className="text-slate-400 text-sm font-bold max-w-lg leading-relaxed">Seleccione un estado clínico y haga clic sobre las piezas dentales para actualizar el historial biométrico del paciente.</p>
        </div>

        <div className="flex flex-wrap bg-slate-100/40 p-2 rounded-[32px] border border-slate-200/50 backdrop-blur-2xl shadow-inner gap-1">
          {(Object.keys(statusThemes) as ToothStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={cn(
                "px-7 py-4 rounded-[26px] text-xs font-black transition-all uppercase tracking-[2px] flex items-center gap-3 group relative overflow-hidden",
                selectedStatus === status
                  ? "bg-white text-blue-600 shadow-xl shadow-blue-500/10 scale-[1.02]"
                  : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
              )}
            >
              <div className={cn("w-3 h-3 rounded-full transition-all duration-500", statusThemes[status].dot, selectedStatus === status ? "scale-110 shadow-lg" : "scale-75 opacity-50")} />
              {statusThemes[status].label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-12 md:space-y-24">
        {/* Arcada Superior */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-6 mb-10">
            <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[5px] whitespace-nowrap">Arcada Superior</span>
            <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          </div>
          <div className="grid grid-cols-8 gap-1 md:gap-4">
            {teeth.slice(0, 16).map(tooth => (
              <ToothIcon key={tooth.id} id={tooth.id} status={tooth.status} onClick={() => handleToothClick(tooth.id)} />
            ))}
          </div>
        </div>

        {/* Arcada Inferior */}
        <div className="flex flex-col items-center">
          <div className="grid grid-cols-8 gap-1 md:gap-4">
            {teeth.slice(16, 32).reverse().map(tooth => (
              <ToothIcon key={tooth.id} id={tooth.id} status={tooth.status} onClick={() => handleToothClick(tooth.id)} />
            ))}
          </div>
          <div className="flex items-center gap-6 mt-10">
            <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[5px] whitespace-nowrap">Arcada Inferior</span>
            <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          </div>
        </div>
      </div>

      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden md:col-span-2 group">
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-16 h-16 bg-blue-600 rounded-[24px] flex items-center justify-center text-3xl shadow-[0_0_40px_rgba(59,130,246,0.5)] group-hover:rotate-12 transition-transform duration-500">✨</div>
            <div>
              <p className="font-extrabold text-xl tracking-tight mb-1">Diagnóstico Asistido</p>
              <p className="text-slate-400 text-xs font-medium leading-relaxed">
                El motor de inteligencia clínica ha detectado posibles áreas de riesgo en las piezas posteriores izquierdas. Recomendamos revisión detallada.
              </p>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="glass-panel p-8 rounded-[40px] border-white/40 flex flex-col justify-center text-center">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Integridad Global</p>
          <div className="text-4xl font-black text-slate-900 mb-1">
            {Math.round((teeth.filter(t => t.status === 'healthy').length / 32) * 100)}%
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-4">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-1000"
              style={{ width: `${(teeth.filter(t => t.status === 'healthy').length / 32) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Odontogram;
