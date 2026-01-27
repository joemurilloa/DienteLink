
import React, { useState, useEffect } from 'react';
import { ToothData, ToothStatus } from '../types';
import { dentalService } from '../services/dentalService';
import { cn } from '../lib/utils';

interface OdontogramProps {
  patientId: string;
}

const statusThemes: Record<ToothStatus, { gradient: string; border: string; label: string; dot: string; fill: string; shadow: string }> = {
  healthy: { 
    gradient: 'from-white to-slate-100', 
    border: 'border-slate-200', 
    label: 'Sano', 
    dot: 'bg-slate-300', 
    fill: '#f8fafc',
    shadow: 'rgba(203, 213, 225, 0.4)'
  },
  caries: { 
    gradient: 'from-rose-400 to-rose-600', 
    border: 'border-rose-700', 
    label: 'Caries', 
    dot: 'bg-rose-500', 
    fill: '#e11d48',
    shadow: 'rgba(225, 29, 72, 0.4)'
  },
  missing: { 
    gradient: 'from-slate-200 to-slate-300', 
    border: 'border-slate-400', 
    label: 'Ausente', 
    dot: 'bg-slate-400', 
    fill: '#94a3b8',
    shadow: 'rgba(148, 163, 184, 0.2)'
  },
  treated: { 
    gradient: 'from-blue-400 to-blue-600', 
    border: 'border-blue-700', 
    label: 'Tratado', 
    dot: 'bg-blue-50', 
    fill: '#2563eb',
    shadow: 'rgba(37, 99, 235, 0.4)'
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
      style={{ filter: status !== 'healthy' ? `drop-shadow(0 10px 15px ${theme.shadow})` : 'none' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`tooth-grad-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={status === 'healthy' ? '#FFFFFF' : theme.fill} stopOpacity="1" />
          <stop offset="60%" stopColor={status === 'healthy' ? '#F8FAFC' : theme.fill} stopOpacity="0.9" />
          <stop offset="100%" stopColor={status === 'healthy' ? '#E2E8F0' : theme.fill} stopOpacity="0.8" />
        </linearGradient>
        <filter id="inner-shadow">
          <feOffset dx="0" dy="2" />
          <feGaussianBlur stdDeviation="2" result="offset-blur" />
          <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
          <feFlood floodColor="black" floodOpacity="0.1" result="color" />
          <feComposite operator="in" in="color" in2="inverse" result="shadow" />
          <feComposite operator="over" in="shadow" in2="SourceGraphic" />
        </filter>
      </defs>

      <g transform={!isUpper ? "rotate(180 50 70)" : ""}>
        {isMolar && (
          // Forma de Molar: Ancha con cúspides
          <path 
            d="M15 40C15 25 25 20 50 20C75 20 85 25 85 40C85 60 80 80 70 110C65 125 55 130 50 130C45 130 35 125 30 110C20 80 15 60 15 40Z" 
            fill={`url(#tooth-grad-${id})`}
            stroke={status === 'healthy' ? '#CBD5E1' : theme.fill}
            strokeWidth="2"
            filter="url(#inner-shadow)"
          />
        )}
        {isPremolar && (
          // Forma de Premolar: Medianamente ancha
          <path 
            d="M22 35C22 22 35 18 50 18C65 18 78 22 78 35C78 55 75 80 68 110C64 125 56 128 50 128C44 128 36 125 32 110C25 80 22 55 22 35Z" 
            fill={`url(#tooth-grad-${id})`}
            stroke={status === 'healthy' ? '#CBD5E1' : theme.fill}
            strokeWidth="2"
            filter="url(#inner-shadow)"
          />
        )}
        {isCanine && (
          // Forma de Canino: Puntiaguda
          <path 
            d="M28 30C28 20 40 15 50 15C60 15 72 20 72 30C72 50 68 85 62 115C58 130 50 135 42 130C32 115 28 50 28 30Z" 
            fill={`url(#tooth-grad-${id})`}
            stroke={status === 'healthy' ? '#CBD5E1' : theme.fill}
            strokeWidth="2"
            filter="url(#inner-shadow)"
          />
        )}
        {isIncisor && (
          // Forma de Incisivo: Plana y rectangular
          <path 
            d="M25 25C25 18 35 15 50 15C65 15 75 18 75 25C75 45 72 85 65 115C60 128 50 132 40 125C30 110 25 45 25 25Z" 
            fill={`url(#tooth-grad-${id})`}
            stroke={status === 'healthy' ? '#CBD5E1' : theme.fill}
            strokeWidth="2"
            filter="url(#inner-shadow)"
          />
        )}

        {/* Detalles de oclusión para molares y premolares */}
        {(isMolar || isPremolar) && status === 'healthy' && (
          <path 
            d="M35 35Q50 45 65 35M50 30V50" 
            stroke="#E2E8F0" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            fill="none"
          />
        )}

        {/* Brillo de superficie (Esmalte) */}
        <path 
          d="M40 25C40 22 45 20 50 20C55 20 60 22 60 25" 
          stroke="white" 
          strokeWidth="4" 
          strokeLinecap="round" 
          strokeOpacity="0.5"
          fill="none"
        />
      </g>
    </svg>
  );
};

const ToothIcon: React.FC<{ status: ToothStatus; onClick: () => void; id: number }> = ({ status, onClick, id }) => {
  const isUpper = id <= 16;
  
  return (
    <div 
      onClick={onClick}
      className="flex flex-col items-center cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 group"
    >
      <div className="w-12 h-16 md:w-16 md:h-20 relative flex items-center justify-center">
        <ToothSVG status={status} id={id} />
        
        <span className={cn(
          "absolute text-[10px] font-black z-10 select-none transition-all duration-300",
          isUpper ? "top-4" : "bottom-4",
          status === 'healthy' ? 'text-slate-400 opacity-60' : 'text-white'
        )}>
          {id}
        </span>

        {/* Hotspot para Caries */}
        {status === 'caries' && (
          <div className="absolute w-2 h-2 bg-black/30 rounded-full blur-[2px] animate-pulse" />
        )}

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
      </div>
    </div>
  );
};

const Odontogram: React.FC<OdontogramProps> = ({ patientId }) => {
  const [teeth, setTeeth] = useState<ToothData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<ToothStatus>('caries');

  useEffect(() => {
    dentalService.getPatientOdontogram(patientId).then(data => {
      setTeeth(data);
      setLoading(false);
    });
  }, [patientId]);

  const handleToothClick = async (id: number) => {
    const tooth = teeth.find(t => t.id === id);
    if (!tooth) return;
    const newStatus = tooth.status === selectedStatus ? 'healthy' : selectedStatus;
    setTeeth(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    await dentalService.updateToothStatus(patientId, id, newStatus);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <div className="w-12 h-12 border-[4px] border-blue-600 border-t-transparent rounded-full animate-spin shadow-lg"></div>
      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Cargando Biometría...</p>
    </div>
  );

  return (
    <div className="glass-panel p-10 rounded-[56px] select-none border-white/60 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] overflow-hidden">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-20">
        <div className="text-center md:text-left">
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none mb-2">Exploración Anatómica</h3>
          <p className="text-blue-500 text-xs font-black uppercase tracking-[2px]">Paciente: Sarah Jenkins • ID: {patientId}</p>
        </div>
        
        <div className="flex bg-slate-100/60 p-1.5 rounded-[28px] border border-slate-200/50 backdrop-blur-2xl shadow-inner">
          {(Object.keys(statusThemes) as ToothStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={cn(
                "px-5 py-3 rounded-[24px] text-[10px] font-black transition-all uppercase tracking-[1px] flex items-center gap-2",
                selectedStatus === status 
                  ? "bg-white text-slate-900 shadow-xl shadow-slate-200 scale-105" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <div className={cn("w-2 h-2 rounded-full", statusThemes[status].dot)} />
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
