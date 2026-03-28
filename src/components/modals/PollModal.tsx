'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, BarChart2 } from 'lucide-react';

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

    return (
        <div className="fixed inset-0 bg-brand-ebony/40 dark:bg-black/40 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-brand-cream rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-brand-ebony/10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-burgundy/10 rounded-full flex items-center justify-center">
                            <BarChart2 className="w-5 h-5 text-brand-burgundy" />
                        </div>
                        <h3 className="text-xl font-serif font-bold text-brand-ebony">Create Poll</h3>
                    </div>
                    <button onClick={onClose} className="text-brand-ebony/40 hover:text-brand-burgundy transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-brand-ebony/60 uppercase tracking-widest mb-1.5 ml-1">Question</label>
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="What would you like to ask?"
                            className="w-full px-4 py-3 bg-brand-parchment/50 border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy outline-none transition-all placeholder:text-brand-ebony/30 text-brand-ebony font-medium"
                            required
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="block text-xs font-bold text-brand-ebony/60 uppercase tracking-widest mb-1.5 ml-1">Options</label>
                        {options.map((option, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                    placeholder={`Option ${index + 1}`}
                                    className="flex-1 px-4 py-3 bg-brand-parchment/50 border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy outline-none transition-all placeholder:text-brand-ebony/30 text-brand-ebony text-sm"
                                    required
                                />
                                {options.length > 2 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveOption(index)}
                                        className="p-3 text-brand-ebony/30 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {options.length < 10 && (
                        <button
                            type="button"
                            onClick={handleAddOption}
                            className="flex items-center gap-2 text-sm font-bold text-brand-burgundy hover:text-brand-burgundy/80 transition-colors ml-1"
                        >
                            <Plus className="w-4 h-4" />
                            Add Option
                        </button>
                    )}

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-brand-parchment hover:bg-brand-parchment/80 text-brand-ebony rounded-xl font-bold transition-colors border border-brand-ebony/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!question.trim() || options.filter(opt => opt.trim() !== '').length < 2}
                            className="flex-1 py-3 px-4 bg-brand-burgundy hover:bg-[#5a2427] text-white rounded-xl font-bold transition-colors shadow-lg shadow-brand-burgundy/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Create Poll
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
