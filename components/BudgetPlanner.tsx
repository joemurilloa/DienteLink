
import React, { useState } from 'react';
import { DndContext, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { Stethoscope, ShieldCheck, Eraser, Syringe, Sparkles, Trash2, PlusCircle } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { Treatment, BudgetItem } from '../types';

const AVAILABLE_TREATMENTS: Treatment[] = [
  { id: 'limpieza', name: 'Limpieza Pro', price: 60, color: 'bg-emerald-500', description: 'Profilaxis completa' },
  { id: 'implante', name: 'Implante Titanio', price: 850, color: 'bg-blue-600', description: 'Pieza de alta gama' },
  { id: 'corona', name: 'Corona Circonio', price: 350, color: 'bg-purple-500', description: 'Estética natural' },
  { id: 'endodoncia', name: 'Endodoncia', price: 180, color: 'bg-amber-500', description: 'Tratamiento conducto' },
  { id: 'extraccion', name: 'Extracción', price: 90, color: 'bg-rose-500', description: 'Cirugía simple' },
];

const DraggableTreatmentItem: React.FC<{ treatment: Treatment }> = ({ treatment }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `treatment-${treatment.id}`,
    data: treatment,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-white shadow-sm cursor-grab active:cursor-grabbing transition-all hover:shadow-md",
        isDragging && "opacity-50 scale-105 shadow-2xl z-50 ring-2 ring-blue-500/20"
      )}
    >
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg", treatment.color)}>
        {treatment.id === 'limpieza' && <Sparkles size={20} />}
        {treatment.id === 'implante' && <PlusCircle size={20} />}
        {treatment.id === 'corona' && <ShieldCheck size={20} />}
        {treatment.id === 'endodoncia' && <Syringe size={20} />}
        {treatment.id === 'extraccion' && <Trash2 size={20} />}
      </div>
      <div className="flex-1 text-left">
        <h5 className="font-bold text-slate-800 text-sm tracking-tight">{treatment.name}</h5>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{formatCurrency(treatment.price)}</p>
      </div>
    </div>
  );
};

const DroppableTooth: React.FC<{ id: number; assignedTreatments: BudgetItem[]; onRemove: (toothId: number, treatmentId: string) => void }> = ({ id, assignedTreatments, onRemove }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `tooth-${id}`,
  });

  const myTreatments = assignedTreatments.filter(t => t.toothId === id);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex flex-col items-center group transition-all duration-300",
        isOver ? "scale-110 translate-z-10" : ""
      )}
    >
      <div className={cn(
        "w-12 h-16 rounded-t-2xl rounded-b-lg border-2 flex items-center justify-center transition-all shadow-sm",
        isOver ? "bg-blue-50 border-blue-500 ring-4 ring-blue-500/10" : "bg-white border-slate-100",
        myTreatments.length > 0 ? "border-blue-200" : ""
      )}>
        <span className="text-[10px] font-black text-slate-300">{id}</span>
        
        {/* Marcadores de tratamientos aplicados */}
        <div className="absolute -top-1 right-0 flex -space-x-1">
          {myTreatments.map((t, i) => (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              key={`${id}-${t.treatment.id}-${i}`}
              className={cn("w-3 h-3 rounded-full border border-white", t.treatment.color)}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {myTreatments.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full mt-2 hidden group-hover:block z-30"
          >
            <div className="glass-panel p-2 rounded-xl shadow-2xl border-slate-200 min-w-[120px]">
              {myTreatments.map(t => (
                <div key={t.treatment.id} className="flex items-center justify-between gap-2 p-1 border-b border-slate-100 last:border-0">
                  <span className="text-[9px] font-bold text-slate-700 truncate">{t.treatment.name}</span>
                  <button 
                    onClick={() => onRemove(id, t.treatment.id)}
                    className="p-1 hover:text-rose-500 transition-colors"
                  >
                    <Eraser size={10} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BudgetPlanner: React.FC = () => {
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;
    if (over && active.data.current) {
      const treatment = active.data.current as Treatment;
      const toothId = parseInt(over.id.toString().replace('tooth-', ''));
      
      // No repetir el mismo tratamiento en el mismo diente
      if (!budgetItems.find(i => i.toothId === toothId && i.treatment.id === treatment.id)) {
        setBudgetItems(prev => [...prev, { toothId, treatment }]);
      }
    }
  };

  const removeTreatment = (toothId: number, treatmentId: string) => {
    setBudgetItems(prev => prev.filter(i => !(i.toothId === toothId && i.treatment.id === treatmentId)));
  };

  const totalPrice = budgetItems.reduce((acc, item) => acc + item.treatment.price, 0);

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
        {/* Izquierda: Odontograma para Presupuesto */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          <div className="glass-panel p-8 rounded-[48px] border-white/60 shadow-xl overflow-hidden">
            <div className="mb-10 text-center sm:text-left">
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Planificador de Presupuesto</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Arrastre un tratamiento al diente correspondiente</p>
            </div>

            <div className="space-y-16 py-8">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-6">Arcada Superior</span>
                <div className="grid grid-cols-8 gap-3 sm:gap-4">
                  {Array.from({ length: 16 }, (_, i) => (
                    <DroppableTooth key={i+1} id={i+1} assignedTreatments={budgetItems} onRemove={removeTreatment} />
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="grid grid-cols-8 gap-3 sm:gap-4">
                  {Array.from({ length: 16 }, (_, i) => (
                    <DroppableTooth key={32-i} id={32-i} assignedTreatments={budgetItems} onRemove={removeTreatment} />
                  ))}
                </div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-6">Arcada Inferior</span>
              </div>
            </div>
          </div>
        </div>

        {/* Derecha: Catálogo y Resumen */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-[36px] border-white/60 shadow-lg">
            <h4 className="font-black text-slate-800 mb-6 flex items-center gap-2">
              <Stethoscope size={18} className="text-blue-600" />
              Tratamientos
            </h4>
            <div className="space-y-3">
              {AVAILABLE_TREATMENTS.map(t => (
                <DraggableTreatmentItem key={t.id} treatment={t} />
              ))}
            </div>
          </div>

          <div className="mt-auto bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group transition-all hover:scale-[1.02]">
            <div className="relative z-10">
              <p className="text-[11px] font-black uppercase text-blue-400 tracking-[3px] mb-2">Total Estimado</p>
              <div className="flex items-baseline gap-2">
                <h2 className="text-5xl font-black tracking-tighter">{formatCurrency(totalPrice)}</h2>
                <span className="text-blue-400 font-bold text-xs">USD</span>
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Tratamientos aplicados:</span>
                  <span className="text-white">{budgetItems.length}</span>
                </div>
                <button 
                  disabled={budgetItems.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:grayscale"
                >
                  GENERAR PRESUPUESTO PDF
                </button>
              </div>
            </div>
            
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl group-hover:bg-blue-600/20 transition-all" />
          </div>
        </div>
      </div>
    </DndContext>
  );
};

export default BudgetPlanner;
