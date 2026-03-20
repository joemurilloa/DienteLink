
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    /** If set, user must type this exact text to enable the confirm button */
    requireText?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'danger',
    requireText,
}) => {
    const [typedText, setTypedText] = useState('');

    // Reset typed text when modal opens/closes
    useEffect(() => {
        if (!isOpen) setTypedText('');
    }, [isOpen]);

    if (!isOpen) return null;

    const isConfirmEnabled = !requireText || typedText === requireText;

    const iconMap = {
        danger: <Trash2 size={24} />,
        warning: <AlertTriangle size={24} />,
        info: <Info size={24} />,
    };

    const colorMap = {
        danger: {
            iconBg: 'bg-red-100 text-red-600',
            button: 'bg-red-600 hover:bg-red-700 shadow-red-600/20',
        },
        warning: {
            iconBg: 'bg-amber-100 text-amber-600',
            button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20',
        },
        info: {
            iconBg: 'bg-blue-100 text-blue-600',
            button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20',
        },
    };

    const colors = colorMap[variant];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-all"
                >
                    <X size={16} />
                </button>

                <div className="text-center">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4", colors.iconBg)}>
                        {iconMap[variant]}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed mb-4">{description}</p>
                </div>

                {requireText && (
                    <div className="mb-5">
                        <p className="text-xs text-slate-400 text-center mb-2">
                            Escribe <strong className="text-red-600 font-bold">{requireText}</strong> para confirmar
                        </p>
                        <input
                            type="text"
                            value={typedText}
                            onChange={e => setTypedText(e.target.value)}
                            placeholder={requireText}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-center outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 transition-all"
                            autoFocus
                            autoComplete="off"
                            spellCheck={false}
                        />
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-all"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={() => { if (isConfirmEnabled) { onConfirm(); onClose(); } }}
                        disabled={!isConfirmEnabled}
                        className={cn(
                            "flex-1 py-3 text-white rounded-xl font-semibold text-sm transition-all shadow-lg",
                            isConfirmEnabled ? colors.button : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        )}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
