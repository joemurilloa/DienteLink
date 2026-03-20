import React, { useState } from 'react';
import { PatientRecord as PatientRecordType, EvolutionNote } from '../../types';
import {
    ClipboardList,
    Plus,
    Calendar,
} from 'lucide-react';
import { sileo } from 'sileo';
import { getLocalISODate } from '../../lib/utils';

interface Props {
    patient: PatientRecordType;
    onUpdate: (updatedPatient: PatientRecordType) => void;
}

const EvolutionTab: React.FC<Props> = ({ patient, onUpdate }) => {
    const [newNote, setNewNote] = useState({ content: '', procedure: '' });

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
                <p className="text-slate-400 text-sm mt-1">Bitácora de seguimiento clínico</p>
            </div>

            {/* Add note form */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        placeholder="Procedimiento (Ej. Resina, Extracción...)"
                        className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                        value={newNote.procedure}
                        onChange={e => setNewNote(prev => ({ ...prev, procedure: e.target.value }))}
                    />
                    <div className="hidden md:flex items-center gap-2 px-4">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-[11px] font-medium text-slate-400">Nuevo registro</span>
                    </div>
                </div>
                <textarea
                    placeholder="Describa la evolución del tratamiento en esta sesión..."
                    className="w-full bg-white px-4 py-4 rounded-xl border border-slate-200 outline-none text-sm text-slate-700 min-h-[120px] resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                    value={newNote.content}
                    onChange={e => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                />
                <button
                    onClick={handleAddNote}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-600/15 active:scale-[0.98]"
                >
                    <Plus size={18} />
                    Guardar Nota Evolutiva
                </button>
            </div>

            {/* Notes timeline */}
            <div className="space-y-4">
                {patient.evolutionNotes.map((note, index) => (
                    <div key={note.id} className="relative pl-8 group animate-in-up" style={{ animationDelay: `${index * 60}ms` }}>
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-slate-200 rounded-full" />
                        <div className="absolute left-[-3px] top-5 w-2.5 h-2.5 bg-white border-[3px] border-slate-200 rounded-full group-hover:border-blue-500 transition-all" />
                        <div className="bg-white p-5 rounded-xl border border-slate-100 group-hover:border-blue-100 transition-all hover:shadow-md">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-slate-400" />
                                    <span className="text-xs font-medium text-slate-500">{note.date}</span>
                                </div>
                                <span className="inline-flex px-3 py-1 bg-slate-900 text-white rounded-lg text-[11px] font-semibold w-fit">
                                    {note.procedure}
                                </span>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">{note.content}</p>
                        </div>
                    </div>
                ))}
                {patient.evolutionNotes.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <ClipboardList size={32} className="mx-auto mb-3 text-slate-200" />
                        <p className="text-sm font-medium">Aún no hay notas de evolución</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EvolutionTab;
