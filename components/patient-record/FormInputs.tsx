import React from 'react';
import { cn } from '../../lib/utils';
import { Check, Loader2 } from 'lucide-react';

// ─── AutoSaveIndicator ───
// Shows a subtle "Guardado ✓" flash after each debounced save
export const AutoSaveIndicator: React.FC<{ saving: boolean; saved: boolean }> = ({ saving, saved }) => {
    if (!saving && !saved) return null;
    return (
        <span className={cn(
            "inline-flex items-center gap-1 text-[11px] font-semibold transition-all duration-300",
            saving ? "text-slate-400" : "text-emerald-500"
        )}>
            {saving
                ? <><Loader2 size={11} className="animate-spin" /> Guardando...</>
                : <><Check size={11} /> Guardado</>
            }
        </span>
    );
};

// ─── DebouncedTextarea — with autosave signal ───
export const DebouncedTextarea: React.FC<{
    value: string;
    onChange: (val: string) => void;
    className?: string;
    placeholder?: string;
    showAutoSave?: boolean;
}> = ({ value, onChange, className, placeholder, showAutoSave = false }) => {
    const [localValue, setLocalValue] = React.useState(value);
    const [saving, setSaving] = React.useState(false);
    const [saved, setSaved] = React.useState(false);
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const savedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => { setLocalValue(value); }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const v = e.target.value;
        setLocalValue(v);
        setSaved(false);
        setSaving(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            onChange(v);
            setSaving(false);
            setSaved(true);
            if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
            savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
        }, 600);
    };
    const handleBlur = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (localValue !== value) {
            onChange(localValue);
            setSaving(false);
            setSaved(true);
            if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
            savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
        }
    };

    return (
        <div className="relative">
            <textarea className={className} placeholder={placeholder} value={localValue} onChange={handleChange} onBlur={handleBlur} />
            {showAutoSave && (
                <div className="absolute bottom-2 right-3 pointer-events-none">
                    <AutoSaveIndicator saving={saving} saved={saved} />
                </div>
            )}
        </div>
    );
};

// ─── InputGroup (debounced input with autosave signal) ───
export const InputGroup: React.FC<{
    label: string;
    value: string;
    onChange: (val: string) => void;
    icon?: any;
    placeholder?: string;
    type?: string;
    showAutoSave?: boolean;
}> = ({ label, value, onChange, icon: Icon, placeholder, type = "text", showAutoSave = false }) => {
    const [localValue, setLocalValue] = React.useState(value);
    const [saving, setSaving] = React.useState(false);
    const [saved, setSaved] = React.useState(false);
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const savedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => { setLocalValue(value); }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setLocalValue(v);
        setSaved(false);
        setSaving(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            onChange(v);
            setSaving(false);
            setSaved(true);
            if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
            savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
        }, 600);
    };

    const handleBlur = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (localValue !== value) {
            onChange(localValue);
            setSaving(false);
            setSaved(true);
            if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
            savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
        }
    };

    return (
        <div className="space-y-2 group">
            <div className="flex items-center justify-between ml-1 h-4">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-focus-within:text-blue-500 transition-colors">{label}</label>
                {showAutoSave && <AutoSaveIndicator saving={saving} saved={saved} />}
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
                    value={localValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
};
