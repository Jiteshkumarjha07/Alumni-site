'use client';

import { X, ShieldAlert, AlertTriangle, Info } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

const StatusIcon = ({ variant }: { variant: 'danger' | 'warning' | 'info' }) => {
    if (variant === 'danger') return <ShieldAlert className="w-5 h-5 text-red-500" />;
    if (variant === 'warning') return <AlertTriangle className="w-5 h-5 text-brand-gold" />;
    return <Info className="w-5 h-5 text-brand-burgundy" />;
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
}) => {
    if (!isOpen) return null;

    const variantStyles = {
        danger: 'bg-red-500 hover:bg-red-600 shadow-red-500/20',
        warning: 'bg-brand-gold hover:bg-amber-500 shadow-brand-gold/20',
        info: 'bg-gradient-indigo hover:shadow-indigo-500/20',
    };

    return (
        <div className="fixed inset-0 bg-brand-ebony/60 dark:bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
            <div className="card-premium max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 border-brand-burgundy/10 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-brand-ebony/5 bg-white/40 dark:bg-brand-parchment/40 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                         <StatusIcon variant={variant} />
                         <h2 className="text-xl font-serif font-extrabold text-brand-ebony tracking-tight">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-brand-ebony/5 text-brand-ebony/40 rounded-xl transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-8 py-10 text-center">
                    <p className="text-brand-ebony/70 leading-relaxed font-medium">{message}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 px-6 py-5 border-t border-brand-ebony/5 bg-white/40 dark:bg-brand-parchment/40 backdrop-blur-sm">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 border border-brand-ebony/10 rounded-xl font-bold text-brand-ebony/40 hover:bg-brand-ebony/5 transition-all uppercase tracking-widest text-[10px]"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 px-6 py-3 text-white rounded-xl font-bold transition-all shadow-lg uppercase tracking-widest text-[10px] active:scale-95 ${variantStyles[variant]}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
