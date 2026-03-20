import React, { useState, useRef } from 'react';
import { PatientRecord as PatientRecordType, XRayImage } from '../../types';
import { cn } from '../../lib/utils';
import {
    Image as ImageIcon,
    Upload,
    Calendar,
    X,
    Maximize2,
    Trash2,
    Loader2
} from 'lucide-react';
import { sileo } from 'sileo';

interface Props {
    patient: PatientRecordType;
    onUpdate: (updatedPatient: PatientRecordType) => void;
}

const XraysTab: React.FC<Props> = ({ patient, onUpdate }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<XRayImage | null>(null);

    // Formulario para los metadatos de la nueva imagen
    const [uploadMeta, setUploadMeta] = useState({ title: '', notes: '' });
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith('image/')) {
            sileo.error({ title: 'Archivo inválido', description: 'Por favor selecciona una imagen válida.' });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            sileo.error({ title: 'Imagen muy pesada', description: 'El tamaño máximo es de 5MB.' });
            return;
        }

        setPendingFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        // Pre-llenar título sugerido
        setUploadMeta(prev => ({ ...prev, title: 'Radiografía ' + new Date().toLocaleDateString() }));
    };

    const handleCancelPending = () => {
        setPendingFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setUploadMeta({ title: '', notes: '' });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleConfirmUpload = async () => {
        if (!pendingFile || !previewUrl) return;
        
        if (!uploadMeta.title.trim()) {
            sileo.error({ title: 'Falta información', description: 'Introduce un título para la imagen.' });
            return;
        }

        setIsUploading(true);

        try {
            // TODO: En el Sprint 3.3, aquí subiremos el archivo físico a Supabase Storage:
            // const { data } = await supabase.storage.from('xrays').upload(`${patient.id}/${crypto.randomUUID()}`, pendingFile);
            // const url = supabase.storage.from('xrays').getPublicUrl(data.path).data.publicUrl;
            
            // Por ahora (Sprint 3.2 UI), simularemos que se sube guardando la URL temporal (blob)
            // o un Base64 solo de forma temporal para ver la UI funcionando.
            // Convertimos la imagen a base64 solo para que la UI no se rompa al recargar si no configuramos storage aún.
            const reader = new FileReader();
            reader.readAsDataURL(pendingFile);
            reader.onload = () => {
                const base64Url = reader.result as string;
                const newXray: XRayImage = {
                    id: crypto.randomUUID(),
                    url: base64Url, // Temporal
                    date: new Date().toISOString().split('T')[0],
                    title: uploadMeta.title,
                    notes: uploadMeta.notes,
                    createdAt: new Date().toISOString()
                };

                onUpdate({
                    ...patient,
                    xrays: [newXray, ...(patient.xrays || [])]
                });

                sileo.success({ title: 'Imagen guardada', description: 'Radiografía incorporada al expediente.' });
                handleCancelPending();
                setIsUploading(false);
            };

        } catch (error) {
            sileo.error({ title: 'Error', description: 'No se pudo subir la imagen.' });
            setIsUploading(false);
        }
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdate({
            ...patient,
            xrays: (patient.xrays || []).filter(x => x.id !== id)
        });
        if (selectedImage?.id === id) setSelectedImage(null);
    };

    const xrays = patient.xrays || [];

    return (
        <div className="space-y-8 animate-in-up duration-500">
            <div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Imágenes Clínicas</h3>
                <p className="text-slate-400 text-sm mt-1">Soporte visual y radiográfico ({xrays.length} imágenes)</p>
            </div>

            {/* Zona de Subida (Upload Zone) */}
            {!pendingFile ? (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                        "relative flex justify-center items-center px-6 py-12 border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-200 overflow-hidden group",
                        isDragging ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-400 hover:bg-slate-50"
                    )}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileInput}
                        className="hidden"
                        accept="image/png, image/jpeg, image/jpg"
                    />
                    <div className="text-center">
                        <div className={cn(
                            "w-16 h-16 mx-auto rounded-3xl flex items-center justify-center mb-4 transition-all duration-200",
                            isDragging ? "bg-blue-600 text-white shadow-xl shadow-blue-500/30 scale-110" : "bg-white text-blue-600 shadow-sm group-hover:shadow-md"
                        )}>
                            <Upload size={28} />
                        </div>
                        <h4 className="text-base font-bold text-slate-800 mb-1">Subir nueva radiografía</h4>
                        <p className="text-sm text-slate-500">Arrastra una imagen aquí o haz clic para explorar</p>
                        <p className="text-xs text-slate-400 font-medium mt-3">JPG, PNG (Max 5MB)</p>
                    </div>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center"><ImageIcon size={20} /></div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-sm">Detalles de la Imagen</h4>
                                <p className="text-xs text-slate-500">{pendingFile.name}</p>
                            </div>
                        </div>
                        <button onClick={handleCancelPending} disabled={isUploading} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="relative aspect-video bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
                            {previewUrl && <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />}
                        </div>
                        
                        <div className="flex flex-col justify-between space-y-4">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Título / Tipo de placa</label>
                                    <input 
                                        type="text" 
                                        value={uploadMeta.title}
                                        onChange={e => setUploadMeta(p => ({ ...p, title: e.target.value }))}
                                        placeholder="Ej. Radiografía Panorámica" 
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Notas diagnósticas (Opcional)</label>
                                    <textarea 
                                        value={uploadMeta.notes}
                                        onChange={e => setUploadMeta(p => ({ ...p, notes: e.target.value }))}
                                        placeholder="Observaciones de la imagen..." 
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none h-20"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleConfirmUpload}
                                disabled={isUploading}
                                className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                            >
                                {isUploading && <Loader2 size={18} className="animate-spin" />}
                                {isUploading ? 'Guardando imagen...' : 'Guardar en Expediente'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Galería de Imágenes */}
            {xrays.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-6 flex items-center gap-2">
                        <Calendar size={14} /> Archivo Interactivo
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {xrays.map((xray) => (
                            <div 
                                key={xray.id} 
                                onClick={() => setSelectedImage(xray)}
                                className="group relative aspect-square bg-slate-100 rounded-2xl overflow-hidden cursor-pointer border border-slate-200 hover:border-blue-300 transition-all shadow-sm hover:shadow-md"
                            >
                                <img src={xray.url} alt={xray.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                    <p className="text-white text-xs font-bold truncate mb-1">{xray.title}</p>
                                    <p className="text-white/70 text-[10px] uppercase font-semibold">{xray.date}</p>
                                </div>

                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <button 
                                        className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white hover:text-slate-900 transition-all"
                                        title="Ampliar"
                                    >
                                        <Maximize2 size={14} />
                                    </button>
                                    <button 
                                        onClick={(e) => handleDelete(xray.id, e)}
                                        className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-red-500 transition-all"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal de Visor a Pantalla Completa */}
            {selectedImage && (
                <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex Documentos items-center justify-center p-4 md:p-12 animate-in fade-in duration-200">
                    <button 
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-2xl flex items-center justify-center transition-all"
                    >
                        <X size={24} />
                    </button>
                    
                    <div className="w-full max-w-6xl flex flex-col md:flex-row bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="flex-1 bg-black flex items-center justify-center p-4 min-h-[50vh]">
                            <img src={selectedImage.url} alt={selectedImage.title} className="max-w-full max-h-[80vh] object-contain" />
                        </div>
                        <div className="w-full md:w-80 bg-slate-800 p-8 flex flex-col">
                            <h3 className="text-xl font-bold text-white mb-2">{selectedImage.title}</h3>
                            <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
                                <Calendar size={14} /> {selectedImage.date}
                            </div>
                            
                            {selectedImage.notes ? (
                                <div>
                                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Notas</h4>
                                    <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/50 p-4 rounded-xl">
                                        {selectedImage.notes}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 italic">Sin notas registradas para esta imagen.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default XraysTab;
