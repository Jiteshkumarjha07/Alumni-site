'use client';

import { useState } from 'react';
import { X, Calendar, MapPin, AlignLeft, Image as ImageIcon } from 'lucide-react';
import { uploadMedia } from '@/lib/media';

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
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
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
            // Reset form
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
            alert('Failed to create event. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-brand-ebony/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-brand-cream rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-brand-gold/20">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-brand-gold/10 bg-brand-parchment/30">
                    <div className="flex items-center gap-3">
                        <div className="bg-brand-burgundy/10 p-2 rounded-lg">
                            <Calendar className="w-5 h-5 text-brand-burgundy" />
                        </div>
                        <h2 className="text-2xl font-serif font-bold text-brand-ebony underline decoration-brand-gold/30 underline-offset-8">Create New Event</h2>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="p-2 hover:bg-brand-burgundy/10 rounded-full transition text-brand-ebony/40 hover:text-brand-burgundy"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-bold text-brand-ebony/70 uppercase tracking-widest mb-2">
                            Event Title *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 border border-brand-gold/20 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy outline-none transition text-brand-ebony placeholder-brand-ebony/30"
                            placeholder="e.g., Annual Alumni Meetup 2026"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Date */}
                        <div>
                            <label className="block text-sm font-bold text-brand-ebony/70 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-brand-burgundy/60" />
                                Date *
                            </label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 border border-brand-gold/20 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy outline-none transition text-brand-ebony"
                            />
                        </div>

                        {/* Location */}
                        <div>
                            <label className="block text-sm font-bold text-brand-ebony/70 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-brand-burgundy/60" />
                                Location *
                            </label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 border border-brand-gold/20 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy outline-none transition text-brand-ebony placeholder-brand-ebony/30"
                                placeholder="e.g., University Grand Hall"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-bold text-brand-ebony/70 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <AlignLeft className="w-4 h-4 text-brand-burgundy/60" />
                            Description *
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 border border-brand-gold/20 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy outline-none transition text-brand-ebony placeholder-brand-ebony/30 resize-none"
                            rows={4}
                            placeholder="Tell everyone about the event..."
                        />
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-bold text-brand-ebony/70 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-brand-burgundy/60" />
                            Event Banner
                        </label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-brand-gold/20 border-dashed rounded-xl hover:border-brand-burgundy/30 transition-colors bg-brand-gold/5">
                            {previewUrl ? (
                                <div className="relative w-full aspect-video rounded-lg overflow-hidden group">
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-brand-ebony/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            onClick={() => {
                                                setPreviewUrl(null);
                                                setFormData({ ...formData, imageFile: null });
                                            }}
                                            className="bg-brand-cream/20 backdrop-blur-md text-brand-cream px-4 py-2 rounded-lg font-bold hover:bg-brand-cream/30 transition border border-brand-cream/30"
                                        >
                                            Change Image
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1 text-center">
                                    <ImageIcon className="mx-auto h-12 w-12 text-brand-ebony/10" />
                                    <div className="flex text-sm text-brand-ebony/60">
                                        <label className="relative cursor-pointer bg-transparent rounded-md font-bold text-brand-burgundy hover:text-[#5a2427] focus-within:outline-none tracking-wide">
                                            <span>Upload a file</span>
                                            <input type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs text-brand-ebony/40 tracking-wider">PNG, JPG, GIF up to 10MB</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 p-6 border-t border-brand-gold/10 bg-brand-parchment/30">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-6 py-2.5 border border-brand-gold/20 rounded-xl font-bold text-brand-ebony/70 hover:bg-brand-gold/5 transition tracking-wide disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-8 py-2.5 bg-brand-burgundy text-white rounded-xl font-bold hover:bg-[#5a2427] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-brand-burgundy/20 tracking-wide"
                    >
                        {loading ? 'Creating...' : 'Create Event'}
                    </button>
                </div>
            </div>
        </div>
    );
};
