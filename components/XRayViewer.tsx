
import React, { useRef, useState, useEffect } from 'react';
import { Pencil, Circle, Eraser, Trash2, Download, Maximize, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';

type Tool = 'pencil' | 'circle' | 'eraser';

const XRayViewer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [tool, setTool] = useState<Tool>('pencil');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [color, setColor] = useState('#ef4444'); // Red 500
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);

  const sampleXRay = ""; // No sample image - user will upload their own

  // Inicializar canvas al cargar la imagen
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current && imageRef.current) {
        const { width, height } = imageRef.current.getBoundingClientRect();
        canvasRef.current.width = width;
        canvasRef.current.height = height;

        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [color]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getPos(e);
    setIsDrawing(true);
    setStartPos({ x, y });

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    if (tool === 'pencil' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (tool === 'circle') {
      // Guardar estado previo para previsualización del círculo
      setSnapshot(ctx.getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height));
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const { x, y } = getPos(e);

    if (tool === 'pencil') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 20;
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.lineWidth = 3;
    } else if (tool === 'circle' && snapshot) {
      ctx.putImageData(snapshot, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.beginPath();
      const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
      ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.closePath();
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const saveCapture = () => {
    if (!canvasRef.current || !imageRef.current) return;

    // Crear un canvas temporal para combinar imagen + dibujo
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasRef.current.width;
    tempCanvas.height = canvasRef.current.height;
    const tempCtx = tempCanvas.getContext('2d');

    if (tempCtx) {
      tempCtx.drawImage(imageRef.current, 0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(canvasRef.current, 0, 0);

      const link = document.createElement('a');
      link.download = `medpulse-xray-annotation-${Date.now()}.png`;
      link.href = tempCanvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700">
      <div className="bg-white/40 backdrop-blur-3xl p-10 lg:p-14 rounded-[64px] border border-white shadow-2xl relative overflow-hidden group transition-all duration-700">
        <div className="flex flex-col xl:flex-row items-center justify-between gap-10 mb-12">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-slate-900 rounded-[28px] flex items-center justify-center text-white shadow-2xl shadow-slate-900/30 group-hover:rotate-6 transition-transform duration-500">
              <ImageIcon size={32} strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="px-3 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-[2px]">Módulo de Diagnóstico</div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
              <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">Visor de Rayos X</h3>
              <p className="text-slate-400 text-sm font-bold mt-3 uppercase tracking-widest">Anotaciones clínicas de alta precisión</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Herramientas de Dibujo */}
            <div className="flex items-center bg-slate-100/60 backdrop-blur-xl p-2 rounded-[32px] border border-slate-200/50 shadow-inner">
              <button
                onClick={() => setTool('pencil')}
                className={cn(
                  "px-6 py-4 rounded-[24px] flex items-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest",
                  tool === 'pencil' ? "bg-white text-blue-600 shadow-xl scale-[1.05]" : "text-slate-400 hover:text-slate-600 hover:bg-white/40"
                )}
              >
                <Pencil size={16} strokeWidth={2.5} />
                <span>Trazo</span>
              </button>
              <button
                onClick={() => setTool('circle')}
                className={cn(
                  "px-6 py-4 rounded-[24px] flex items-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest",
                  tool === 'circle' ? "bg-white text-blue-600 shadow-xl scale-[1.05]" : "text-slate-400 hover:text-slate-600 hover:bg-white/40"
                )}
              >
                <Circle size={16} strokeWidth={2.5} />
                <span>Área</span>
              </button>
              <button
                onClick={() => setTool('eraser')}
                className={cn(
                  "px-6 py-4 rounded-[24px] flex items-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest",
                  tool === 'eraser' ? "bg-white text-blue-600 shadow-xl scale-[1.05]" : "text-slate-400 hover:text-slate-600 hover:bg-white/40"
                )}
              >
                <Eraser size={16} strokeWidth={2.5} />
                <span>Goma</span>
              </button>
              <div className="w-[1px] h-6 bg-slate-200 mx-3" />
              <button
                onClick={clearCanvas}
                className="w-14 h-14 rounded-[24px] flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-all active:scale-90"
                title="Limpiar Lienzo"
              >
                <Trash2 size={20} />
              </button>
            </div>

            <button
              onClick={saveCapture}
              className="flex items-center gap-4 px-10 py-5 bg-slate-900 text-white rounded-[32px] font-black text-xs uppercase tracking-[3px] shadow-2xl shadow-slate-900/30 hover:bg-blue-600 transition-all active:scale-95 group/save"
            >
              <Download size={20} className="group-hover/save:-translate-y-1 transition-transform" />
              Exportar Reporte
            </button>
          </div>
        </div>

        {/* Contenedor de la Imagen y el Canvas */}
        <div
          ref={containerRef}
          className="relative w-full rounded-[48px] overflow-hidden bg-slate-950 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] group cursor-crosshair touch-none select-none ring-8 ring-slate-900/5"
        >
          <img
            ref={imageRef}
            src={sampleXRay}
            alt="X-Ray View"
            className="w-full h-auto block opacity-80 pointer-events-none transition-opacity group-hover:opacity-100 duration-1000"
            onLoad={() => {
              const event = new Event('resize');
              window.dispatchEvent(event);
            }}
          />
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="absolute top-0 left-0 w-full h-full z-10"
          />

          <div className="absolute top-8 right-8 z-20 flex flex-col gap-3 items-end">
            <div className="px-5 py-2 bg-slate-900/80 backdrop-blur-xl rounded-2xl text-[10px] font-black text-white uppercase tracking-[4px] border border-white/10 shadow-2xl">
              Precision Diagnosis
            </div>
            <div className="px-4 py-1.5 bg-blue-500/20 backdrop-blur-lg rounded-xl text-[8px] font-black text-blue-400 uppercase tracking-widest border border-blue-500/20 animate-pulse">
              Active Session
            </div>
          </div>

          <div className="absolute bottom-8 left-8 z-20">
            <div className="flex bg-black/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 gap-4 px-6 items-center">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500/50" />
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Foco</span>
              </div>
              <div className="w-[1px] h-3 bg-white/10" />
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Tratamiento</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta de Guía Rápida */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { step: "01", text: "Cargue la placa radiográfica de alta resolución desde el historial.", icon: ImageIcon },
          { step: "02", text: "Utilice las herramientas de precisión para demarcar hallazgos.", icon: Pencil },
          { step: "03", text: "Exporte el análisis técnico para adjuntar al informe del paciente.", icon: Download }
        ].map((item, i) => (
          <div key={i} className="bg-white/60 backdrop-blur-xl p-8 rounded-[48px] border border-white shadow-xl flex flex-col gap-6 group hover:bg-slate-900 transition-all duration-500 shadow-slate-200/50">
            <div className="flex items-center justify-between">
              <span className="text-4xl font-black text-blue-600/20 italic group-hover:text-blue-500/40 transition-colors">{item.step}</span>
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                <item.icon size={20} />
              </div>
            </div>
            <p className="text-sm font-bold text-slate-600 group-hover:text-white leading-relaxed transition-colors">
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default XRayViewer;
