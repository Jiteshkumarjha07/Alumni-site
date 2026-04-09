'use client';

import { useState, useEffect } from 'react';
import { X, Upload, Camera, Sparkles, MapPin, Briefcase, User as UserIcon } from 'lucide-react';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ProfileFormData, profilePicFile?: File | null, isRemovingPic?: boolean) => Promise<void>;
    currentUser: {
        name: string;
        profession: string;
        location: string;
        profilePic?: string;
    };
}

export interface ProfileFormData {
    name: string;
    profession: string;
    location: string;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    currentUser,
}) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<ProfileFormData>({
        name: currentUser.name,
        profession: currentUser.profession,
        location: currentUser.location,
    });
    const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>(currentUser.profilePic || '');
    const [removePic, setRemovePic] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: currentUser.name,
                profession: currentUser.profession,
                location: currentUser.location,
            });
            setPreviewUrl(currentUser.profilePic || '');
            setProfilePicFile(null);
            setRemovePic(false);
        }
    }, [isOpen, currentUser]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                return;
            }
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }
            setProfilePicFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setRemovePic(false);
        }
    };

    const handleRemovePic = () => {
        setProfilePicFile(null);
        setPreviewUrl('');
        setRemovePic(true);
    };

    const handleSubmit = async () => {
        if (!formData.name.trim() || !formData.profession.trim() || !formData.location.trim()) {
            alert('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            await onSubmit(formData, profilePicFile, removePic);
            onClose();
        } catch (error) {
            console.error('Error updating profile:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-brand-ebony/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-[200] p-4">
            <div className="card-premium max-w-lg w-full max-h-[90vh] overflow-y-auto border-brand-burgundy/10 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-8 border-b border-brand-ebony/5 sticky top-0 bg-white dark:bg-brand-parchment/10 backdrop-blur-xl z-20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-indigo rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <UserIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-serif font-extrabold text-brand-ebony flex items-center gap-2">
                                Edit Identity
                                <Sparkles className="w-4 h-4 text-brand-gold" />
                            </h2>
                            <p className="text-[10px] font-extrabold text-brand-ebony/30 uppercase tracking-[0.2em] mt-1">Refine your public appearance</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="p-2.5 hover:bg-brand-ebony/5 text-brand-ebony/30 rounded-full transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden bg-brand-ebony/5 border-4 border-white dark:border-brand-parchment shadow-xl transition-all group-hover:scale-105">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-brand-ebony/10">
                                        <Camera className="w-12 h-12" />
                                    </div>
                                )}
                            </div>
                            {/* Overlay */}
                            <label className="absolute inset-0 flex items-center justify-center bg-indigo-900/60 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-[2px]">
                                <Upload className="w-8 h-8 text-white animate-bounce" />
                                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                            </label>
                        </div>

                        <div className="flex gap-4 mt-6">
                            <label className="cursor-pointer px-6 py-2.5 bg-gradient-indigo text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:brightness-110 active:scale-95 transition-all">
                                Update Photo
                                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                            </label>
                            {previewUrl && (
                                <button
                                    onClick={handleRemovePic}
                                    className="px-6 py-2.5 bg-white dark:bg-brand-ebony/10 text-red-500 border border-red-100 dark:border-red-900/20 rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-red-50 transition-all"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                        <p className="text-[9px] text-brand-ebony/20 mt-4 uppercase tracking-[0.2em] font-extrabold font-sans">Premium format • Max 5MB</p>
                    </div>

                    <div className="grid gap-6">
                        {/* Name */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-extrabold text-brand-ebony/40 uppercase tracking-[0.2em] px-1">
                                <UserIcon className="w-3 h-3 text-indigo-500" />
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Enter your full name"
                                className="w-full px-6 py-4 bg-brand-ebony/5 border border-brand-ebony/5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold text-sm text-brand-ebony"
                            />
                        </div>

                        {/* Profession */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-extrabold text-brand-ebony/40 uppercase tracking-[0.2em] px-1">
                                <Briefcase className="w-3 h-3 text-indigo-500" />
                                Current Profession
                            </label>
                            <input
                                type="text"
                                value={formData.profession}
                                onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                                placeholder="e.g. Senior Software Architect"
                                className="w-full px-6 py-4 bg-brand-ebony/5 border border-brand-ebony/5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold text-sm text-brand-ebony"
                            />
                        </div>

                        {/* Location */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-extrabold text-brand-ebony/40 uppercase tracking-[0.2em] px-1">
                                <MapPin className="w-3 h-3 text-indigo-500" />
                                Base Location
                            </label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="e.g. London, United Kingdom"
                                className="w-full px-6 py-4 bg-brand-ebony/5 border border-brand-ebony/5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold text-sm text-brand-ebony"
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-5 p-8 border-t border-brand-ebony/5">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-8 py-3.5 text-xs font-extrabold text-brand-ebony/40 uppercase tracking-widest hover:text-brand-ebony transition-all"
                    >
                        Discard
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-10 py-3.5 bg-gradient-indigo text-white rounded-2xl font-extrabold uppercase tracking-[0.2em] text-xs shadow-xl shadow-indigo-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px] flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Commit Changes
                            </>
                        ) : (
                            <>
                                Finalize Changes
                                <Check className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper components for consistency
const Loader2 = ({ className }: { className?: string }) => (
    <div className={`w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ${className}`} />
);

const Check = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 6 9 17l-5-5"/></svg>
);
