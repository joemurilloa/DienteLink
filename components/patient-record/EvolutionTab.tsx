import React, { useState } from 'react';
import { PatientRecord as PatientRecordType, EvolutionNote } from '../../types';
import {
    ClipboardList,
    Plus,
    Calendar,
    Mic,
    MicOff,
    Settings
} from 'lucide-react';
import { sileo } from 'sileo';
import { getLocalISODate, cn } from '../../lib/utils';

interface Props {
    patient: PatientRecordType;
    onUpdate: (updatedPatient: PatientRecordType) => void;
}

const EvolutionTab: React.FC<Props> = ({ patient, onUpdate }) => {
    const [newNote, setNewNote] = useState({ content: '', procedure: '' });
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = React.useRef<any>(null);

    React.useEffect(() => {
        // @ts-ignore
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'es-HN';

            recognitionRef.current.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript + ' ';
                    }
                }
                if (finalTranscript) {
                    setNewNote(prev => ({ ...prev, content: prev.content + (prev.content && !prev.content.endsWith(' ') ? ' ' : '') + finalTranscript }));
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                if (event.error === 'not-allowed') {
                    sileo.error({ title: 'Sin permisos', description: 'Permite el acceso al micrófono en tu navegador.' });
                } else {
                    sileo.error({ title: 'Error de micrófono', description: 'Hubo un error con el reconocimiento de voz.' });
                }
                setIsRecording(false);
            };

            recognitionRef.current.onend = () => {
                setIsRecording(false);
            };
        }
    }, []);

    const toggleRecording = () => {
        if (!recognitionRef.current) {
            sileo.error({ title: 'No Soportado', description: 'Tu navegador no soporta el dictado por voz. Usa Chrome, Safari o Edge.' });
            return;
        }
        if (isRecording) {
            recognitionRef.current.stop();
            setIsRecording(false);
            sileo.success({ title: 'Dictado pausado', description: 'Puedes seguir editando con el teclado.' });
        } else {
            try {
                recognitionRef.current.start();
                setIsRecording(true);
                sileo.info({ title: 'Micrófono Activo 🎙️', description: 'Comienza a hablar, se escribirá automáticamente.' });
            } catch (e) {
                console.error(e);
                sileo.error({ title: 'Error', description: 'No se pudo iniciar el micrófono.' });
            }
        }
    };

    const handleAddNote = () => {
        if (!newNote.procedure.trim()) {
            sileo.error({ title: 'Falta el procedimiento', description: 'Ingresa el nombre del procedimiento realizado' });
            return;
        }
        if (!newNote.content.trim()) {
            sileo.error({ title: 'Falta la descripción', description: 'Describe la evolución del tratamiento' });
            return;
        }
        const note: EvolutionNote = {
            id: crypto.randomUUID(),
            date: getLocalISODate(new Date()),
            content: newNote.content,
            procedure: newNote.procedure
        };
        onUpdate({ ...patient, evolutionNotes: [note, ...patient.evolutionNotes] });
        setNewNote({ content: '', procedure: '' });
        sileo.success({ title: '¡Nota guardada correctamente! 📝', description: 'Se añadió a la historia clínica del paciente' });
    };

    return (
        <div className="space-y-8 animate-in-up duration-500">
            <div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Evolución</h3>
                <p className="text-slate-500 text-sm mt-1">Bitácora de seguimiento clínico</p>
            </div>

            {/* Add note form */}
            <div className="p-5 bg-slate-50 border border-slate-300 rounded-2xl space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        placeholder="Procedimiento (Ej. Resina, Extracción...)"
                        className="w-full bg-white px-4 py-3 rounded-xl border border-slate-300 outline-none text-sm font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                        value={newNote.procedure}
                        onChange={e => setNewNote(prev => ({ ...prev, procedure: e.target.value }))}
                    />
                    <div className="hidden md:flex items-center gap-2 px-4">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium text-slate-500">Nuevo registro</span>
                    </div>
                </div>
                
                <div className="relative">
                    <textarea
                        placeholder="Describa la evolución del tratamiento en esta sesión... (O usa el dictado por voz)"
                        className={cn(
                            "w-full bg-white px-4 py-4 pr-16 rounded-xl border outline-none text-sm text-slate-700 min-h-[120px] resize-none transition-all placeholder:text-slate-400",
                            isRecording ? "border-violet-400 ring-4 ring-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.1)]" : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                        )}
                        value={newNote.content}
                        onChange={e => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                    />
                    <button
                        onClick={toggleRecording}
                        className={cn(
                            "absolute right-3 bottom-3 w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-sm",
                            isRecording 
                                ? "bg-red-50 text-red-500 border border-red-200 animate-pulse hover:bg-red-100" 
                                : "bg-violet-50 text-violet-600 border border-violet-100 hover:bg-violet-600 hover:text-white"
                        )}
                        title={isRecording ? "Detener dictado" : "Dictar por voz"}
                    >
                        {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                    {isRecording && (
                        <div className="absolute left-4 bottom-[-24px] text-xs font-bold text-violet-600 flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 bg-violet-600 rounded-full"></span> Escuchando...
                        </div>
                    )}
                </div>

                <div className="pt-2">
                    <button
                    onClick={handleAddNote}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-600/15 active:scale-[0.98]"
                >
                    <Plus size={18} />
                    Guardar Nota Evolutiva
                </button>
            </div>
        </div>

        {/* Notes timeline */}
            <div className="space-y-4">
                {patient.evolutionNotes.map((note, index) => (
                    <div key={note.id} className="relative pl-8 group animate-in-up" style={{ animationDelay: `${index * 60}ms` }}>
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-slate-200 rounded-full" />
                        <div className="absolute left-[-3px] top-5 w-2.5 h-2.5 bg-white border-[3px] border-slate-300 rounded-full group-hover:border-blue-500 transition-all" />
                        <div className="bg-white p-5 rounded-xl border border-slate-300 group-hover:border-blue-100 transition-all hover:shadow-md">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-slate-500" />
                                    <span className="text-sm font-medium text-slate-500">{note.date}</span>
                                </div>
                                <span className="inline-flex px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-semibold w-fit">
                                    {note.procedure}
                                </span>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">{note.content}</p>
                        </div>
                    </div>
                ))}
                {patient.evolutionNotes.length === 0 && (
                    <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <ClipboardList size={28} className="text-slate-400" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-700 mb-1">Sin notas de evolución</h4>
                        <p className="text-slate-500 text-sm max-w-xs mx-auto">Registra el primer seguimiento clínico de este paciente usando el formulario de arriba.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EvolutionTab;
