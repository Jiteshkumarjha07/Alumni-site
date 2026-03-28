'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

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
            // Reset form
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
            alert('Failed to create opportunity. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-brand-ebony/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
            <div className="bg-brand-cream rounded-2xl max-w-2xl w-full max-h-[85dvh] flex flex-col shadow-2xl border border-brand-gold/20 overflow-hidden">
                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-brand-gold/10 bg-brand-parchment/30">
                    <h2 className="text-2xl font-serif font-bold text-brand-ebony underline decoration-brand-gold/30 underline-offset-8">Post an Opportunity</h2>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="p-2 hover:bg-brand-burgundy/10 rounded-full transition text-brand-ebony/40 hover:text-brand-burgundy"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-brand-ebony/70 uppercase tracking-widest mb-2">
                            Job Title *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 border border-brand-gold/20 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy outline-none transition text-brand-ebony placeholder-brand-ebony/30"
                            placeholder="e.g., Senior Software Engineer"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-brand-ebony/70 uppercase tracking-widest mb-2">
                            Company *
                        </label>
                        <input
                            type="text"
                            value={formData.company}
                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                            className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 border border-brand-gold/20 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy outline-none transition text-brand-ebony placeholder-brand-ebony/30"
                            placeholder="e.g., Tech Corp"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-brand-ebony/70 uppercase tracking-widest mb-2">
                                Job Type *
                            </label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 dark:bg-brand-ebony/5 border border-brand-gold/20 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy outline-none transition text-brand-ebony"
                            >
                                <option value="Full-time" className="bg-brand-cream text-brand-ebony">Full-time</option>
                                <option value="Part-time" className="bg-brand-cream text-brand-ebony">Part-time</option>
                                <option value="Freelance/Contract" className="bg-brand-cream text-brand-ebony">Freelance/Contract</option>
                                <option value="Internship" className="bg-brand-cream text-brand-ebony">Internship</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-brand-ebony/70 uppercase tracking-widest mb-2">
                                Location
                            </label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 border border-brand-gold/20 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy outline-none transition text-brand-ebony placeholder-brand-ebony/30"
                                placeholder="e.g., Remote, New York, NY"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-brand-ebony/70 uppercase tracking-widest mb-2">
                            Description *
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 border border-brand-gold/20 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy outline-none transition text-brand-ebony placeholder-brand-ebony/30 resize-none"
                            rows={4}
                            placeholder="Job description, requirements, etc."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-brand-ebony/70 uppercase tracking-widest mb-2">
                            Contact Information
                        </label>
                        <input
                            type="text"
                            value={formData.contact}
                            onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                            className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 border border-brand-gold/20 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy outline-none transition text-brand-ebony placeholder-brand-ebony/30"
                            placeholder="Email or application link"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-4 bg-brand-gold/5 rounded-xl border border-brand-gold/10">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={formData.isPermanent}
                                onChange={(e) => setFormData({ ...formData, isPermanent: e.target.checked })}
                                className="w-5 h-5 text-brand-burgundy border-brand-gold/30 rounded focus:ring-brand-burgundy transition-all"
                            />
                            <span className="text-sm font-bold text-brand-ebony/80 uppercase tracking-widest group-hover:text-brand-burgundy transition-colors">No expiry date</span>
                        </label>

                        {!formData.isPermanent && (
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-brand-ebony/50 uppercase tracking-widest mb-1 ml-1">
                                    Expiry Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.expiryDate}
                                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/50 dark:bg-black/20 border border-brand-gold/20 rounded-lg focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy outline-none transition text-brand-ebony"
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex justify-end gap-3 p-4 sm:p-6 border-t border-brand-gold/10 bg-brand-cream">
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
                        {loading ? 'Posting...' : 'Post Opportunity'}
                    </button>
                </div>
            </div>
        </div>
    );
};
