
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

  const sampleXRay = "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=1200";

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
    <div className="flex flex-col gap-6">
      <div className="glass-panel p-6 rounded-[40px] border-white/60 shadow-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <ImageIcon size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Visor Diagnóstico</h3>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Anotaciones en tiempo real</p>
            </div>
          </div>

          {/* Herramientas de Dibujo */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
            <button 
              onClick={() => setTool('pencil')}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                tool === 'pencil' ? "bg-white text-blue-600 shadow-md scale-105" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Pencil size={18} />
            </button>
            <button 
              onClick={() => setTool('circle')}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                tool === 'circle' ? "bg-white text-blue-600 shadow-md scale-105" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Circle size={18} />
            </button>
            <button 
              onClick={() => setTool('eraser')}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                tool === 'eraser' ? "bg-white text-blue-600 shadow-md scale-105" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Eraser size={18} />
            </button>
            <div className="w-[1px] h-6 bg-slate-200 mx-2" />
            <button 
              onClick={clearCanvas}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-all"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <button 
            onClick={saveCapture}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-500 transition-all active:scale-95"
          >
            <Download size={18} />
            Exportar Hallazgos
          </button>
        </div>

        {/* Contenedor de la Imagen y el Canvas */}
        <div 
          ref={containerRef}
          className="relative w-full rounded-[32px] overflow-hidden bg-black shadow-2xl group cursor-crosshair touch-none select-none"
        >
          <img 
            ref={imageRef}
            src={sampleXRay} 
            alt="X-Ray View" 
            className="w-full h-auto block opacity-90 pointer-events-none"
            onLoad={() => {
              // Trigger resize manually on load
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
          
          <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-lg text-[10px] font-bold text-white uppercase tracking-widest border border-white/20">
              HD Precision Mode
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hallazgo Crítico</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zona Tratada</span>
              </div>
           </div>
           <p className="text-[11px] text-slate-400 font-medium italic">
             * Las anotaciones se guardan localmente hasta que exporte el diagnóstico.
           </p>
        </div>
      </div>

      {/* Tarjeta de Guía Rápida */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 rounded-[32px] text-white flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">1</div>
          <p className="text-xs font-semibold">Cargue la radiografía del paciente desde su historial.</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-[32px] text-white flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">2</div>
          <p className="text-xs font-semibold">Use las herramientas para marcar caries, quistes o endodoncias.</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-[32px] text-white flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">3</div>
          <p className="text-xs font-semibold">Guarde la captura para adjuntarla al presupuesto visual.</p>
        </div>
      </div>
    </div>
  );
};

export default XRayViewer;
