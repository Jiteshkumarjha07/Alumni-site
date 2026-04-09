'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, BarChart2, Sparkles, Check } from 'lucide-react';

interface PollModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (pollData: { question: string; options: string[] }) => void;
}

export function PollModal({ isOpen, onClose, onSubmit }: PollModalProps) {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);

    if (!isOpen) return null;

    const handleAddOption = () => {
        if (options.length < 10) {
            setOptions([...options, '']);
        }
    };

    const handleRemoveOption = (index: number) => {
        if (options.length > 2) {
            const newOptions = options.filter((_, i) => i !== index);
            setOptions(newOptions);
        }
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const filteredOptions = options.filter(opt => opt.trim() !== '');
        if (question.trim() && filteredOptions.length >= 2) {
            onSubmit({ question, options: filteredOptions });
            setQuestion('');
            setOptions(['', '']);
            onClose();
        }
    };

    const labelClass = "block text-[10px] font-extrabold text-brand-ebony/40 uppercase tracking-[0.2em] mb-2 px-1";
    const inputClass = "w-full px-6 py-4 bg-brand-ebony/5 border border-brand-ebony/5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-sm text-brand-ebony placeholder:text-brand-ebony/25 shadow-inner";

    return (
        <div className="fixed inset-0 bg-brand-ebony/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-[250] p-4">
            <div className="card-premium max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-300 border-brand-burgundy/10 overflow-hidden">
                {/* Header */}
                <div className="p-8 border-b border-brand-ebony/5 flex items-center justify-between bg-white dark:bg-brand-parchment/10 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-indigo rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <BarChart2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-serif font-extrabold text-brand-ebony flex items-center gap-2">
                                Team Census
                                <Sparkles className="w-4 h-4 text-brand-gold" />
                            </h2>
                            <p className="text-[10px] font-extrabold text-brand-ebony/30 uppercase tracking-[0.2em] mt-1">Gather collective intelligence</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-brand-ebony/5 rounded-full transition-all text-brand-ebony/30">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    <div className="space-y-3">
                        <label className={labelClass}>Inquiry (Question)</label>
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="What insight are you seeking?"
                            className={inputClass}
                            required
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <label className={labelClass}>Response Vectors (Options)</label>
                            <span className="text-[10px] font-extrabold text-brand-ebony/20 uppercase tracking-widest">{options.length}/10</span>
                        </div>
                        <div className="space-y-3 max-h-56 overflow-y-auto pr-2 custom-scrollbar scrollbar-hide">
                            {options.map((option, index) => (
                                <div key={index} className="flex gap-3 group/option animate-in slide-in-from-left-2 duration-200">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={option}
                                            onChange={(e) => handleOptionChange(index, e.target.value)}
                                            placeholder={`Option ${index + 1}`}
                                            className={`${inputClass} !py-3`}
                                            required
                                        />
                                        <div className="absolute left-[-2px] top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-full opacity-0 group-focus-within/option:opacity-100 transition-opacity" />
                                    </div>
                                    {options.length > 2 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveOption(index)}
                                            className="p-3 bg-brand-ebony/5 hover:bg-red-500/10 text-brand-ebony/20 hover:text-red-500 rounded-xl transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {options.length < 10 && (
                            <button
                                type="button"
                                onClick={handleAddOption}
                                className="flex items-center gap-2 px-6 py-2 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-500 rounded-xl transition-all text-[10px] font-extrabold uppercase tracking-widest ml-1"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Extend Response Fields
                            </button>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 text-xs font-extrabold text-brand-ebony/40 uppercase tracking-widest hover:text-brand-ebony transition-all"
                        >
                            Retract
                        </button>
                        <button
                            type="submit"
                            disabled={!question.trim() || options.filter(opt => opt.trim() !== '').length < 2}
                            className="flex-[2] py-4 bg-gradient-indigo text-white rounded-2xl font-extrabold uppercase tracking-[0.2em] text-xs shadow-xl shadow-indigo-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                        >
                            Establish Census
                            <Check className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
