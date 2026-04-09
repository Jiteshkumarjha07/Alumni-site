'use client';

import { useState } from 'react';
import { X, Calendar, MapPin, AlignLeft, Image as ImageIcon, Sparkles, Upload, Loader2, Check } from 'lucide-react';
import { Portal } from '../ui/Portal';

interface CreateEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: EventFormData) => Promise<void>;
}

export interface EventFormData {
    title: string;
    date: string;
    location: string;
    description: string;
    imageFile: File | null;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
}) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<EventFormData>({
        title: '',
        date: '',
        location: '',
        description: '',
        imageFile: null,
    });
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData({ ...formData, imageFile: file });
            const reader = new FileReader();
            reader.onloadend = () => setPreviewUrl(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.date || !formData.location || !formData.description) {
            alert('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            await onSubmit(formData);
            setFormData({
                title: '',
                date: '',
                location: '',
                description: '',
                imageFile: null,
            });
            setPreviewUrl(null);
            onClose();
        } catch (error) {
            console.error('Error creating event:', error);
        } finally {
            setLoading(false);
        }
    };

    const labelClass = "block text-[10px] font-extrabold text-brand-ebony/40 uppercase tracking-[0.2em] mb-2 px-1";
    const inputClass = "w-full px-6 py-4 bg-brand-ebony/5 border border-brand-ebony/5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-sm text-brand-ebony placeholder:text-brand-ebony/25 shadow-inner";

    return (
        <Portal>
            <div className="fixed inset-0 bg-brand-ebony/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-[200] p-4">
                <div className="card-premium w-full max-w-2xl max-h-[90vh] overflow-y-auto border-brand-burgundy/10 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                    {/* Header */}
                    <div className="flex items-center justify-between p-8 border-b border-brand-ebony/5 sticky top-0 bg-white dark:bg-brand-parchment/10 backdrop-blur-xl z-20">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-indigo rounded-2xl flex items-center justify-center text-white shadow-lg">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-serif font-extrabold text-brand-ebony flex items-center gap-2">
                                    Grand Assembly
                                    <Sparkles className="w-4 h-4 text-brand-gold" />
                                </h2>
                                <p className="text-[10px] font-extrabold text-brand-ebony/30 uppercase tracking-[0.2em] mt-1">Orchestrate a new legacy gathering</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-brand-ebony/5 rounded-full transition-all text-brand-ebony/30">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Form Content */}
                    <div className="p-8 space-y-8">
                        {/* Title */}
                        <div className="space-y-3">
                            <label className={labelClass}>Assembly Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className={inputClass}
                                placeholder="e.g. Decade Reunion: Class of 2016"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Date */}
                            <div className="space-y-3">
                                <label className={labelClass}>Solar Date</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className={`${inputClass} appearance-none`}
                                    />
                                    <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ebony/20 pointer-events-none" />
                                </div>
                            </div>

                            {/* Location */}
                            <div className="space-y-3">
                                <label className={labelClass}>Venue / Coordinates</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className={inputClass}
                                        placeholder="Grand Hall / Virtual Hub"
                                    />
                                    <MapPin className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ebony/20" />
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-3">
                            <label className={labelClass}>Assembly Mandate (Description)</label>
                            <div className="relative">
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className={`${inputClass} min-h-[140px] resize-none leading-relaxed pt-5`}
                                    placeholder="Outline the significance and itinerary of this gathering..."
                                />
                                <AlignLeft className="absolute right-5 top-5 w-4 h-4 text-brand-ebony/20" />
                            </div>
                        </div>

                        {/* Banner Upload */}
                        <div className="space-y-3">
                            <label className={labelClass}>Visual Identity (Banner)</label>
                            <div className="relative group/upload h-56 w-full rounded-[2.5rem] overflow-hidden border-2 border-dashed border-brand-ebony/10 hover:border-indigo-500/30 transition-all bg-brand-ebony/5">
                                {previewUrl ? (
                                    <div className="relative w-full h-full group">
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px]">
                                            <label className="bg-white text-indigo-900 px-6 py-2.5 rounded-xl font-extrabold text-[10px] uppercase tracking-widest cursor-pointer hover:scale-105 transition-transform shadow-xl">
                                                Change Banner
                                                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                            </label>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-brand-ebony/10 transition-colors">
                                        <div className="w-16 h-16 bg-white dark:bg-brand-parchment/10 rounded-2xl flex items-center justify-center text-indigo-500/40 shadow-sm mb-4">
                                            <Upload className="w-8 h-8" />
                                        </div>
                                        <p className="text-[10px] font-extrabold text-brand-ebony/40 uppercase tracking-[0.2em]">Upload High-Resolution Banner</p>
                                        <p className="text-[8px] text-brand-ebony/20 font-bold uppercase mt-2">PNG, JPG up to 10MB</p>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-8 border-t border-brand-ebony/5 flex gap-5 bg-white/50 dark:bg-brand-parchment/10">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="px-8 py-4 text-xs font-extrabold text-brand-ebony/40 uppercase tracking-widest hover:text-brand-ebony transition-all"
                        >
                            Retract
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-1 py-4 bg-gradient-indigo text-white rounded-2xl font-extrabold uppercase tracking-[0.2em] text-xs shadow-xl shadow-indigo-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    Establish Assembly
                                    <Check className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
};
