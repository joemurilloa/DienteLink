import React from 'react';
import { cn } from '../../lib/utils';
import { phaseWhenFlushed } from '../../lib/fieldSave';
import { AlertCircle, Check, Loader2 } from 'lucide-react';

type FieldStatus = 'idle' | 'saving' | 'saved' | 'error';
type FieldChange = (val: string) => void | Promise<unknown>;

// Sube cuando el expediente sí se guardó (también por Reintentar).
export const SaveAckContext = React.createContext(0);

// «Guardado» solo después de que la promesa del guardado se resuelve.
// «No se guardó» se queda hasta el siguiente intento.
export const AutoSaveIndicator: React.FC<{ status: FieldStatus }> = ({ status }) => {
    if (status === 'idle') return null;
    const saving = status === 'saving';
    const failed = status === 'error';
    return (
        <span className={cn(
            "inline-flex items-center gap-1 text-[11px] font-semibold transition-all duration-300",
            saving ? "text-slate-400" : failed ? "text-red-600" : "text-emerald-500"
        )}>
            {saving
                ? <><Loader2 size={11} className="animate-spin" /> Guardando...</>
                : failed
                    ? <><AlertCircle size={11} /> No se guardó</>
                    : <><Check size={11} /> Guardado</>}
        </span>
    );
};

function useDebouncedField(value: string, onChange: FieldChange) {
    const [localValue, setLocalValue] = React.useState(value);
    const [status, setStatus] = React.useState<FieldStatus>('idle');
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const savedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const gen = React.useRef(0);
    const statusRef = React.useRef(status);
    statusRef.current = status;
    const ack = React.useContext(SaveAckContext);

    const markSaved = () => {
        setStatus('saved');
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => {
            setStatus((current) => (current === 'saved' ? 'idle' : current));
        }, 2000);
    };

    React.useEffect(() => {
        if (statusRef.current === 'saving') return;
        setLocalValue(value);
        if (statusRef.current === 'error') setStatus('idle');
    }, [value]);

    React.useEffect(() => {
        if (ack === 0 || statusRef.current !== 'error') return;
        markSaved();
    }, [ack]);

    React.useEffect(() => () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    }, []);

    const commit = (v: string) => {
        const id = ++gen.current;
        setStatus('saving');
        let returned: void | Promise<unknown>;
        try {
            returned = onChange(v);
        } catch {
            if (gen.current === id) setStatus('error');
            return;
        }
        if (phaseWhenFlushed(returned) === 'idle') {
            if (gen.current === id) setStatus('idle');
            return;
        }
        void Promise.resolve(returned).then(
            () => {
                if (gen.current !== id) return;
                markSaved();
            },
            () => {
                if (gen.current === id) setStatus('error');
            },
        );
    };

    const handleChange = (v: string) => {
        setLocalValue(v);
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        setStatus('saving');
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => commit(v), 600);
    };

    const handleBlur = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (localValue !== value) commit(localValue);
    };

    return { localValue, status, handleChange, handleBlur };
}

// ─── DebouncedTextarea — with autosave signal ───
export const DebouncedTextarea: React.FC<{
    value: string;
    onChange: FieldChange;
    className?: string;
    placeholder?: string;
    showAutoSave?: boolean;
}> = ({ value, onChange, className, placeholder, showAutoSave = false }) => {
    const field = useDebouncedField(value, onChange);

    return (
        <div className="relative">
            <textarea
                className={className}
                placeholder={placeholder}
                value={field.localValue}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
            />
            {showAutoSave && (
                <div className="absolute bottom-2 right-3 pointer-events-none">
                    <AutoSaveIndicator status={field.status} />
                </div>
            )}
        </div>
    );
};

// ─── InputGroup (debounced input with autosave signal) ───
export const InputGroup: React.FC<{
    label: string;
    value: string;
    onChange: FieldChange;
    icon?: any;
    placeholder?: string;
    type?: string;
    showAutoSave?: boolean;
}> = ({ label, value, onChange, icon: Icon, placeholder, type = "text", showAutoSave = false }) => {
    const field = useDebouncedField(value, onChange);

    return (
        <div className="space-y-2 group">
            <div className="flex items-center justify-between ml-1 h-4">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-focus-within:text-blue-500 transition-colors">{label}</label>
                {showAutoSave && <AutoSaveIndicator status={field.status} />}
            </div>
            <div className="relative">
                {Icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none">
                        <Icon size={16} />
                    </div>
                )}
                <input
                    type={type}
                    className={cn(
                        "w-full h-11 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all text-slate-800 placeholder:text-slate-400",
                        Icon ? "pl-11 pr-4" : "px-4"
                    )}
                    value={field.localValue}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
};
