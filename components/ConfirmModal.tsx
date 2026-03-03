
import React from 'react';
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
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'danger'
}) => {
    if (!isOpen) return null;

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
                    <p className="text-sm text-slate-500 leading-relaxed mb-6">{description}</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-all"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className={cn("flex-1 py-3 text-white rounded-xl font-semibold text-sm transition-all shadow-lg", colors.button)}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
