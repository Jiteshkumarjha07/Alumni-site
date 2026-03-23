'use client';

import { X } from 'lucide-react';

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
        danger: 'bg-red-600 hover:bg-red-700',
        warning: 'bg-yellow-600 hover:bg-yellow-700',
        info: 'bg-brand-burgundy hover:bg-[#5a2427]',
    };

    return (
        <div className="fixed inset-0 bg-brand-ebony/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-brand-parchment rounded-2xl max-w-md w-full border border-brand-ebony/10 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-brand-ebony/10 bg-brand-ebony/5">
                    <h2 className="text-xl font-serif font-bold text-brand-ebony leading-none">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-brand-burgundy/5 text-brand-ebony/60 rounded-full transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-brand-ebony leading-relaxed">{message}</p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 p-5 border-t border-brand-ebony/10 bg-brand-ebony/5">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 border border-brand-ebony/10 rounded-xl font-bold text-brand-ebony/60 hover:bg-white transition uppercase tracking-widest text-sm"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`px-6 py-2.5 text-white rounded-xl font-bold transition shadow-md uppercase tracking-widest text-sm ${variantStyles[variant]}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
