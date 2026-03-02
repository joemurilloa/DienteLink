import React from 'react';
import { DndContext, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { Stethoscope, ShieldCheck, Eraser, Syringe, Sparkles, Trash2, PlusCircle, Download, Zap, ChevronRight } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { Treatment, BudgetItem } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface BudgetPlannerProps {
  budget: BudgetItem[];
  onUpdate: (budget: BudgetItem[]) => void;
}

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

const BudgetPlanner: React.FC<BudgetPlannerProps> = ({ budget, onUpdate }) => {

  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;
    if (over && active.data.current) {
      const treatment = active.data.current as Treatment;
      const toothId = parseInt(over.id.toString().replace('tooth-', ''));

      // No repetir el mismo tratamiento en el mismo diente
      if (!budget.find(i => i.toothId === toothId && i.treatment.id === treatment.id)) {
        onUpdate([...budget, { toothId, treatment }]);
      }
    }
  };

  const removeTreatment = (toothId: number, treatmentId: string) => {
    onUpdate(budget.filter(i => !(i.toothId === toothId && i.treatment.id === treatmentId)));
  };

  const totalPrice = budget.reduce((acc, item) => acc + item.treatment.price, 0);

  const handleGeneratePDF = () => {
    const doc = new jsPDF() as any;

    // Header
    doc.setFontSize(24);
    doc.setTextColor(15, 23, 42);
    doc.text("Presupuesto de Tratamiento", 20, 25);

    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text(`DienteLink | Fecha: ${new Date().toLocaleDateString()}`, 20, 33);

    // Group by tooth
    const grouped: Record<number, Treatment[]> = {};
    budget.forEach(item => {
      if (!grouped[item.toothId]) grouped[item.toothId] = [];
      grouped[item.toothId].push(item.treatment);
    });

    // Table data
    const tableData = budget.map(item => [
      `#${item.toothId}`,
      item.treatment.name,
      item.treatment.description,
      formatCurrency(item.treatment.price)
    ]);

    doc.autoTable({
      startY: 45,
      head: [['Pieza', 'Tratamiento', 'Descripción', 'Precio']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 }
    });

    // Total
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Estimado: ${formatCurrency(totalPrice)} USD`, 20, finalY);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Este presupuesto es una estimación. El costo final puede variar según el diagnóstico.", 20, finalY + 8);

    doc.save(`Presupuesto_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 h-full animate-in fade-in duration-700">
        {/* Izquierda: Odontograma para Presupuesto */}
        <div className="xl:col-span-8 flex flex-col gap-10">
          <div className="bg-white/40 backdrop-blur-3xl p-10 lg:p-14 rounded-[64px] border border-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>

            <div className="mb-14 relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-[2px]">Módulo Financiero</div>
                  <div className="px-3 py-1 bg-white/50 text-slate-400 rounded-full text-[9px] font-black uppercase tracking-[2px] border border-slate-100">Planificador Pro</div>
                </div>
                <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">Mapa de Presupuesto</h3>
                <p className="text-slate-400 text-sm font-bold mt-4 uppercase tracking-widest">Arrastre servicios hacia las piezas dentales</p>
              </div>
              <div className="hidden lg:flex items-center gap-2 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100 italic font-black text-[10px] text-slate-400">
                <Zap size={14} className="text-blue-500 animate-pulse" />
                MODO DRAG & DROP ACTIVO
              </div>
            </div>

            <div className="space-y-20 py-8 relative z-10">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-6 mb-12">
                  <div className="h-[1px] w-20 bg-gradient-to-r from-transparent to-slate-200" />
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-[5px] whitespace-nowrap">MAXILAR SUPERIOR</span>
                  <div className="h-[1px] w-20 bg-gradient-to-l from-transparent to-slate-200" />
                </div>
                <div className="grid grid-cols-8 gap-3 sm:gap-6">
                  {Array.from({ length: 16 }, (_, i) => (
                    <DroppableTooth key={i + 1} id={i + 1} assignedTreatments={budget} onRemove={removeTreatment} />
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="grid grid-cols-8 gap-3 sm:gap-6">
                  {Array.from({ length: 16 }, (_, i) => (
                    <DroppableTooth key={32 - i} id={32 - i} assignedTreatments={budget} onRemove={removeTreatment} />
                  ))}
                </div>
                <div className="flex items-center gap-6 mt-12">
                  <div className="h-[1px] w-20 bg-gradient-to-r from-transparent to-slate-200" />
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-[5px] whitespace-nowrap">MANDÍBULA INFERIOR</span>
                  <div className="h-[1px] w-20 bg-gradient-to-l from-transparent to-slate-200" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Derecha: Catálogo y Resumen */}
        <div className="xl:col-span-4 flex flex-col gap-8">
          <div className="bg-white/60 backdrop-blur-2xl p-8 rounded-[48px] border border-white shadow-2xl flex flex-col h-full ring-1 ring-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h4 className="font-black text-slate-900 text-xl tracking-tighter italic flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                  <Stethoscope size={18} />
                </div>
                Catálogo
              </h4>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                {AVAILABLE_TREATMENTS.length} Items
              </div>
            </div>

            <div className="space-y-4 overflow-y-auto pr-2 hide-scrollbar flex-1 max-h-[400px] lg:max-h-none mb-8">
              {AVAILABLE_TREATMENTS.map((t, index) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <DraggableTreatmentItem treatment={t} />
                </motion.div>
              ))}
            </div>

            <div className="mt-auto pt-8 border-t border-slate-100">
              <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group transition-all hover:scale-[1.01] active:scale-[0.99] cursor-default">
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/20 rounded-full blur-[60px] -mr-20 -mt-20 group-hover:bg-blue-500/30 transition-all"></div>

                <div className="relative z-10">
                  <p className="text-[10px] font-black uppercase text-blue-400 tracking-[4px] mb-3 opacity-60">Inversión Estimada</p>
                  <div className="flex items-baseline gap-2 mb-8">
                    <h2 className="text-5xl font-black tracking-tighter italic leading-none">{formatCurrency(totalPrice)}</h2>
                    <span className="text-blue-400 font-black text-xs uppercase tracking-widest italic">USD</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                      <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Items</p>
                      <p className="text-xl font-black">{budget.length}</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                      <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Ahorro</p>
                      <p className="text-xl font-black">$0.00</p>
                    </div>
                  </div>

                  <button
                    onClick={handleGeneratePDF}
                    disabled={budget.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 py-5 rounded-[24px] font-black text-xs uppercase tracking-[3px] transition-all shadow-2xl shadow-blue-500/40 disabled:shadow-none disabled:opacity-50 flex items-center justify-center gap-3 group/btn"
                  >
                    <Download size={18} className="group-hover/btn:-translate-y-1 transition-transform" />
                    Generar Proforma PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  );
};

export default BudgetPlanner;
