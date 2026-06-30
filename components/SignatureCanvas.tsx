
import React, { useState, useRef, useEffect } from 'react';
import { PenTool, RotateCcw, CheckCircle2 } from 'lucide-react';
import { sileo } from 'sileo';

interface SignatureCanvasProps {
    onSave: (dataUrl: string) => void;
    onCancel: () => void;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({ onSave, onCancel }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasContent, setHasContent] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, rect.height - 40);
        ctx.lineTo(rect.width - 20, rect.height - 40);
        ctx.stroke();
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.fillText('Firma del paciente', 20, rect.height - 22);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
    }, []);

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        setIsDrawing(true);
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        if (!isDrawing) return;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        setHasContent(true);
    };

    const endDraw = () => setIsDrawing(false);

    const clear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, rect.height - 40);
        ctx.lineTo(rect.width - 20, rect.height - 40);
        ctx.stroke();
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.fillText('Firma del paciente', 20, rect.height - 22);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        setHasContent(false);
    };

    const handleSave = () => {
        if (!hasContent) {
            sileo.error({ title: 'Firma requerida', description: 'Dibuja tu firma antes de guardar' });
            return;
        }
        const dataUrl = canvasRef.current?.toDataURL('image/png') || '';
        onSave(dataUrl);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <PenTool size={16} className="text-blue-600" />
                    Dibuja tu firma
                </div>
                <button onClick={clear} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-slate-500 hover:text-red-500 bg-slate-50 rounded-lg hover:bg-red-50 transition-all">
                    <RotateCcw size={12} /> Limpiar
                </button>
            </div>
            <canvas
                ref={canvasRef}
                className="w-full h-48 border-2 border-dashed border-slate-300 rounded-xl cursor-crosshair touch-none bg-white"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
            />
            <div className="flex gap-3">
                <button
                    onClick={handleSave}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-600/15 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    <CheckCircle2 size={16} /> Firmar y Guardar
                </button>
                <button
                    onClick={onCancel}
                    className="px-5 py-3 text-slate-500 text-sm font-semibold hover:text-red-500 transition-colors"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
};
