import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, User } from 'lucide-react';
import { persistenceService } from '../services/persistenceService';
import { PatientRecord } from '../types';
import { cn } from '../lib/utils';
import { sileo } from 'sileo';
import 'sileo/styles.css';

interface GlobalSearchProps {
    isOpen: boolean;
    onClose: () => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PatientRecord[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            setSelectedIndex(-1);
        }
    }, [isOpen]);

    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            setSelectedIndex(-1);
            return;
        }
        const patients = persistenceService.getPatients();
        const filtered = patients.filter(p =>
            p.identification.fullName.toLowerCase().includes(query.toLowerCase()) ||
            p.identification.phone.includes(query) ||
            p.id.includes(query)
        );
        setResults(filtered.slice(0, 5));
        setSelectedIndex(filtered.length > 0 ? 0 : -1);
        
        // Friendly search feedback
        if (query.length >= 3) {
            if (filtered.length === 0) {
                sileo.warning({ title: 'No encontré a ese paciente 🔍', description: 'Intenta con otro nombre, teléfono o cédula' });
            } else if (filtered.length === 1) {
                sileo.success({ title: '¡Encuentro perfecto!', description: `Encontré a ${filtered[0].identification.fullName}` });
            } else {
                sileo.info({ title: `Encontré ${filtered.length} pacientes`, description: 'Selecciona el que necesitas' });
            }
        }
    }, [query]);

    const handleSelect = (patientId: string) => {
        const patient = results.find(p => p.id === patientId);
        if (patient) {
            sileo.success({ title: `Abriendo expediente de ${patient.identification.fullName}`, description: '¡Listo para la consulta!' });
        }
        navigate(`/patient/${patientId}`);
        onClose();
        setQuery('');
    };

    // Keyboard handlers
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
            }
            if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
                handleSelect(results[selectedIndex].id);
            }
        };
        if (isOpen) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, results, selectedIndex]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] p-6">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

            <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
                <div className="flex items-center gap-4 p-6 border-b border-slate-100">
                    <Search size={20} className="text-slate-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar paciente por nombre, teléfono o ID..."
                        className="flex-1 bg-transparent outline-none text-lg font-medium text-slate-900 placeholder:text-slate-300"
                    />
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                {results.length > 0 && (
                    <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
                        {results.map((patient, index) => (
                            <button
                                key={patient.id}
                                onClick={() => handleSelect(patient.id)}
                                className={cn(
                                    "w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left group",
                                    selectedIndex === index ? "bg-blue-600 shadow-lg shadow-blue-500/20 scale-[1.02]" : "hover:bg-blue-50"
                                )}
                            >
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                                    selectedIndex === index ? "bg-white/20 text-white" : "bg-blue-100 text-blue-600"
                                )}>
                                    <User size={20} />
                                </div>
                                <div className="flex-1">
                                    <h4 className={cn(
                                        "font-bold transition-colors",
                                        selectedIndex === index ? "text-white" : "text-slate-900 group-hover:text-blue-600"
                                    )}>
                                        {patient.identification.fullName}
                                    </h4>
                                    <p className={cn(
                                        "text-[10px] font-bold uppercase tracking-widest transition-colors",
                                        selectedIndex === index ? "text-blue-100" : "text-slate-400"
                                    )}>
                                        ID: {patient.id} • {patient.identification.phone}
                                    </p>
                                </div>
                                <span className={cn(
                                    "text-[10px] font-black uppercase tracking-widest transition-all",
                                    selectedIndex === index ? "text-white opacity-100" : "text-slate-300 opacity-0 group-hover:opacity-100"
                                )}>
                                    {selectedIndex === index ? "ENTER ↵" : "Ver →"}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {query.length >= 2 && results.length === 0 && (
                    <div className="p-8 text-center">
                        <p className="text-slate-400 font-medium">No se encontraron pacientes</p>
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">
                            Intenta buscar por nombre, teléfono o ID
                        </p>
                    </div>
                )}

                {query.length < 2 && (
                    <div className="p-8 text-center">
                        <p className="text-slate-300 font-medium text-sm">
                            Escribe al menos 2 caracteres para buscar
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GlobalSearch;
