import React, { useState, useRef } from 'react';
import { PatientRecord as PatientRecordType, XRayImage } from '../../types';
import { cn, getLocalISODate } from '../../lib/utils';
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
import { supabase } from '../../lib/supabase';

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
            const fileExt = pendingFile.name.split('.').pop();
            const fileName = `${crypto.randomUUID()}.${fileExt}`;
            const filePath = `${patient.id}/xrays/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('patients')
                .upload(filePath, pendingFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('patients')
                .getPublicUrl(filePath);
            
            const newXray: XRayImage = {
                id: crypto.randomUUID(),
                url: publicUrl,
                date: getLocalISODate(new Date()),
                title: uploadMeta.title,
                notes: uploadMeta.notes,
                createdAt: new Date().toISOString(),
                storagePath: filePath // Storing path for easier deletion
            };

            onUpdate({
                ...patient,
                xrays: [newXray, ...(patient.xrays || [])]
            });

            sileo.success({ title: 'Imagen guardada', description: 'Radiografía incorporada al expediente.' });
            handleCancelPending();
            setIsUploading(false);

        } catch (error: any) {
            console.error('Upload error:', error);
            sileo.error({ title: 'Error de subida', description: error.message || 'No se pudo subir la imagen a la nube.' });
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent, storagePath?: string) => {
        e.stopPropagation();

        if (storagePath) {
            try {
                await supabase.storage.from('patients').remove([storagePath]);
            } catch (err) {
                console.error('Error deleting from storage:', err);
            }
        }

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

            {/* Zona de Subida (Upload Zone) - Oculta por ahora para mantener costos bajos en Supabase */}
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center animate-in fade-in duration-300">
                <div className="w-16 h-16 mx-auto bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                    <ImageIcon size={28} />
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-2">Módulo de Radiografías</h4>
                <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed">
                    El almacenamiento en la nube para radiografías, fotos intraorales y archivos clínicos estará disponible próximamente en nuestra próxima actualización.
                </p>
                <span className="inline-block mt-4 px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded-full">
                    Próximamente
                </span>
            </div>

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
                                        onClick={(e) => handleDelete(xray.id, e, xray.storagePath)}
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
