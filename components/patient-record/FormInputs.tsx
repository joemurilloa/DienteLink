import React from 'react';
import { cn } from '../../lib/utils';

// ─── DebouncedTextarea ───
export const DebouncedTextarea: React.FC<{
    value: string;
    onChange: (val: string) => void;
    className?: string;
    placeholder?: string;
}> = ({ value, onChange, className, placeholder }) => {
    const [localValue, setLocalValue] = React.useState(value);
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    React.useEffect(() => { setLocalValue(value); }, [value]);
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const v = e.target.value;
        setLocalValue(v);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => onChange(v), 400);
    };
    const handleBlur = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (localValue !== value) onChange(localValue);
    };
    return <textarea className={className} placeholder={placeholder} value={localValue} onChange={handleChange} onBlur={handleBlur} />;
};

// ─── InputGroup (debounced input) ───
export const InputGroup: React.FC<{
    label: string;
    value: string;
    onChange: (val: string) => void;
    icon?: any;
    placeholder?: string;
    type?: string;
}> = ({ label, value, onChange, icon: Icon, placeholder, type = "text" }) => {
    const [localValue, setLocalValue] = React.useState(value);
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => { setLocalValue(value); }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setLocalValue(v);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => onChange(v), 400);
    };

    const handleBlur = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (localValue !== value) onChange(localValue);
    };

    return (
        <div className="space-y-2 group">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1 group-focus-within:text-blue-500 transition-colors">{label}</label>
            <div className="relative">
                {Icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <Icon size={16} />
                    </div>
                )}
                <input
                    type={type}
                    className={cn(
                        "w-full py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all text-slate-800 placeholder:text-slate-400",
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
