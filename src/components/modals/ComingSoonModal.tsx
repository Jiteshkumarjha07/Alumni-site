'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Store, Clock } from 'lucide-react';
import { Portal } from '../ui/Portal';

interface ComingSoonModalProps {
    isOpen: boolean;
    onClose: () => void;
    featureName: string;
}

export const ComingSoonModal: React.FC<ComingSoonModalProps> = ({ isOpen, onClose, featureName }) => {
    if (!isOpen) return null;

    return (
        <Portal>
            <div className="fixed inset-0 bg-brand-ebony/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-[300] p-4">
                <div className="card-premium max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-300 border-brand-burgundy/10 overflow-hidden text-center p-12">
                     <div className="w-20 h-20 bg-gradient-indigo rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-500/20">
                        <Store className="w-10 h-10 text-white" />
                    </div>
                    
                    <div className="space-y-4">
                        <h2 className="text-3xl font-serif font-extrabold text-brand-ebony flex items-center justify-center gap-2">
                             {featureName}
                             <Sparkles className="w-5 h-5 text-brand-gold" />
                        </h2>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-ebony/5 rounded-full">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            <p className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-[0.2em]">In Development</p>
                        </div>
                        <p className="text-sm font-medium text-brand-ebony/60 leading-relaxed italic">
                            Our team is currently orchestrating a premiere experience for the {featureName.toLowerCase()} portal.
                        </p>
                    </div>

                    <button 
                        onClick={onClose}
                        className="mt-10 w-full py-4 bg-brand-burgundy text-white rounded-2xl font-extrabold uppercase tracking-[0.2em] text-[10px] hover:shadow-lg hover:shadow-brand-burgundy/20 hover:brightness-110 transition-all active:scale-[0.98] outline-none focus:ring-4 focus:ring-brand-burgundy/20"
                    >
                        Acknowledge
                    </button>
                </div>
            </div>
        </Portal>
    );
};
