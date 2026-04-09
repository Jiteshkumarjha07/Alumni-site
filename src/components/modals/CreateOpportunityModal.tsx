'use client';

import { useState } from 'react';
import { X, Briefcase, MapPin, Calendar, Clock, Sparkles, Send, Loader2, Check } from 'lucide-react';
import { Portal } from '../ui/Portal';

interface CreateOpportunityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: OpportunityFormData) => Promise<void>;
}

export interface OpportunityFormData {
    title: string;
    company: string;
    type: 'Full-time' | 'Part-time' | 'Freelance/Contract' | 'Internship';
    location: string;
    description: string;
    contact: string;
    expiryDate?: string;
    isPermanent: boolean;
}

export const CreateOpportunityModal: React.FC<CreateOpportunityModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
}) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<OpportunityFormData>({
        title: '',
        company: '',
        type: 'Full-time',
        location: '',
        description: '',
        contact: '',
        expiryDate: '',
        isPermanent: false,
    });

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!formData.title || !formData.company || !formData.description) {
            alert('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            await onSubmit(formData);
            setFormData({
                title: '',
                company: '',
                type: 'Full-time',
                location: '',
                description: '',
                contact: '',
                expiryDate: '',
                isPermanent: false,
            });
            onClose();
        } catch (error) {
            console.error('Error creating opportunity:', error);
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
                                <Briefcase className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-serif font-extrabold text-brand-ebony flex items-center gap-2">
                                    Project Portal
                                    <Sparkles className="w-4 h-4 text-brand-gold" />
                                </h2>
                                <p className="text-[10px] font-extrabold text-brand-ebony/30 uppercase tracking-[0.2em] mt-1">Deploy new professional paths</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-brand-ebony/5 rounded-full transition-all text-brand-ebony/30">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Form Content */}
                    <div className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className={labelClass}>Venture Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className={inputClass}
                                    placeholder="e.g. Lead Dev Architect"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className={labelClass}>Organization</label>
                                <input
                                    type="text"
                                    value={formData.company}
                                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                    className={inputClass}
                                    placeholder="e.g. Global Tech Collective"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className={labelClass}>Engagement Type</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                    className={`${inputClass} appearance-none cursor-pointer`}
                                >
                                    <option value="Full-time">Full-time Deployment</option>
                                    <option value="Part-time">Part-time Engagement</option>
                                    <option value="Freelance/Contract">Contract Collaboration</option>
                                    <option value="Internship">Developmental Residency</option>
                                </select>
                            </div>

                            <div className="space-y-3">
                                <label className={labelClass}>Headquarters / Remote</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className={inputClass}
                                        placeholder="Global / City, Nation"
                                    />
                                    <MapPin className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ebony/20" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className={labelClass}>Mission Briefing & Requirements</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className={`${inputClass} min-h-[160px] resize-none leading-relaxed pt-5`}
                                placeholder="Detail the core objectives and the expertise required for this legacy path..."
                            />
                        </div>

                        <div className="space-y-3">
                            <label className={labelClass}>Relay Protocol (Contact)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={formData.contact}
                                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                    className={inputClass}
                                    placeholder="Email address or secure application portal"
                                />
                                <Send className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ebony/20" />
                            </div>
                        </div>

                        {/* Expiry / Status */}
                        <div className="p-8 bg-brand-burgundy/5 rounded-[2.5rem] border border-brand-burgundy/10 shadow-inner">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-8">
                                <label className="flex items-center gap-4 cursor-pointer group">
                                    <div className="relative h-6 w-6">
                                        <input
                                            type="checkbox"
                                            checked={formData.isPermanent}
                                            onChange={(e) => setFormData({ ...formData, isPermanent: e.target.checked })}
                                            className="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border-2 border-brand-burgundy/30 transition-all checked:bg-brand-burgundy"
                                        />
                                        <Check className="pointer-events-none absolute left-1 top-1 h-4 w-4 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                                    </div>
                                    <span className="text-[11px] font-extrabold text-brand-ebony/60 uppercase tracking-widest group-hover:text-brand-burgundy transition-colors">Perpetual Listing</span>
                                </label>

                                {!formData.isPermanent && (
                                    <div className="flex-1 space-y-2 animate-in slide-in-from-left-4">
                                        <label className="flex items-center gap-2 text-[9px] font-extrabold text-brand-ebony/30 uppercase tracking-[0.2em] mb-1">
                                            <Clock className="w-3 h-3" /> Expiry Deadline
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.expiryDate}
                                            onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                            className={`${inputClass} py-3 text-xs`}
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
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
                                    Establish Opportunity
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
