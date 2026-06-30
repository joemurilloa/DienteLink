import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { Calendar } from 'lucide-react';

interface DateInputProps {
    value: string; // YYYY-MM-DD
    onChange: (val: string) => void;
    error?: string;
    required?: boolean;
    label?: string;
}

const DateInput: React.FC<DateInputProps> = ({ value, onChange, error, required, label = "Fecha de Nacimiento" }) => {
    // Parse initial value (YYYY-MM-DD)
    const [year, month, day] = value ? value.split('-') : ['', '', ''];
    
    const [d, setD] = useState(day);
    const [m, setM] = useState(month);
    const [y, setY] = useState(year);

    const dRef = useRef<HTMLInputElement>(null);
    const mRef = useRef<HTMLInputElement>(null);
    const yRef = useRef<HTMLInputElement>(null);

    // Helper: emit to parent immediately if all fields are complete
    const emitIfComplete = (newD: string, newM: string, newY: string) => {
        if (newD.length === 2 && newM.length === 2 && newY.length === 4) {
            const dateStr = `${newY}-${newM}-${newD}`;
            if (dateStr !== value) onChange(dateStr);
        } else if (!newD && !newM && !newY && value !== '') {
            onChange('');
        }
    };

    // Handle initial value updates from props
    useEffect(() => {
        if (value) {
            const [ny, nm, nd] = value.split('-');
            if (nd !== d) setD(nd);
            if (nm !== m) setM(nm);
            if (ny !== y) setY(ny);
        }
    }, [value]);

    const handleDTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '').substring(0, 2);
        if (val.length === 2) {
            if (parseInt(val) > 31) val = '31';
            if (parseInt(val) === 0) val = '01';
        }
        setD(val);
        emitIfComplete(val, m, y);
        if (val.length === 2) {
            mRef.current?.focus();
            mRef.current?.select();
        }
    };

    const handleMTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '').substring(0, 2);
        if (val.length === 2) {
            if (parseInt(val) > 12) val = '12';
            if (parseInt(val) === 0) val = '01';
        }
        setM(val);
        emitIfComplete(d, val, y);
        if (val.length === 2) {
            yRef.current?.focus();
            yRef.current?.select();
        }
    };

    const handleYTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '').substring(0, 4);
        setY(val);
        emitIfComplete(d, m, val);
    };

    // Handle backspace navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: 'd' | 'm' | 'y') => {
        if (e.key === 'Backspace') {
            if (field === 'y' && y === '') mRef.current?.focus();
            if (field === 'm' && m === '') dRef.current?.focus();
        }
    };

    return (
        <div className="space-y-2 group">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1 group-focus-within:text-blue-500 transition-colors">
                {label} {required && <span className="text-red-400">*</span>}
            </label>
            
            <div className={cn(
                "flex items-center gap-2 p-1.5 bg-slate-50 border rounded-xl transition-all",
                error ? "border-red-300 bg-red-50/50" : "border-slate-300 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10"
            )}>
                <div className="pl-3 pr-1 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Calendar size={16} strokeWidth={2} />
                </div>
                
                <div className="flex items-center flex-1 gap-1">
                    <input
                        ref={dRef}
                        type="text"
                        inputMode="numeric"
                        placeholder="DD"
                        value={d}
                        onChange={handleDTyping}
                        onKeyDown={e => handleKeyDown(e, 'd')}
                        className="w-10 text-center bg-transparent outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-medium"
                    />
                    <span className="text-slate-400 font-light">/</span>
                    <input
                        ref={mRef}
                        type="text"
                        inputMode="numeric"
                        placeholder="MM"
                        value={m}
                        onChange={handleMTyping}
                        onKeyDown={e => handleKeyDown(e, 'm')}
                        className="w-10 text-center bg-transparent outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-medium"
                    />
                    <span className="text-slate-400 font-light">/</span>
                    <input
                        ref={yRef}
                        type="text"
                        inputMode="numeric"
                        placeholder="AAAA"
                        value={y}
                        onChange={handleYTyping}
                        onKeyDown={e => handleKeyDown(e, 'y')}
                        className="w-16 text-center bg-transparent outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-medium"
                    />
                </div>
            </div>
            {error && <p className="text-sm text-red-500 font-medium ml-1">{error}</p>}
        </div>
    );
};

export default DateInput;
