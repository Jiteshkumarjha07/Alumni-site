'use client';

import { useState, useEffect } from 'react';
import { X, Upload, Camera, Sparkles, MapPin, Briefcase, User as UserIcon, Check } from 'lucide-react';
import { Portal } from '../ui/Portal';

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

// Inline spinner — avoids extra imports
const Spinner = () => (
    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
);

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
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5 MB'); return; }
        if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
        setProfilePicFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setRemovePic(false);
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

    const field = (
        id: string,
        label: string,
        Icon: React.ElementType,
        value: string,
        onChange: (v: string) => void,
        placeholder: string
    ) => (
        <div className="flex flex-col gap-2">
            <label htmlFor={id} className="flex items-center gap-2 text-[10px] font-black text-brand-ebony/40 uppercase tracking-[0.18em]">
                <Icon className="w-3 h-3 text-indigo-500 shrink-0" />
                {label}
            </label>
            <input
                id={id}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={loading}
                className="w-full px-5 py-3.5 bg-brand-ebony/[0.04] border border-brand-ebony/[0.08] rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-semibold text-sm text-brand-ebony placeholder:text-brand-ebony/25 transition-all disabled:opacity-60"
            />
        </div>
    );

    return (
        <Portal>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-brand-ebony/60 dark:bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
                onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            >
                {/* Modal card */}
                <div className="bg-white dark:bg-[#12111a] w-full max-w-lg rounded-[2rem] shadow-2xl border border-brand-ebony/8 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">

                    {/* ── Header ─────────────────────────────────────────── */}
                    <div className="flex items-center justify-between px-8 pt-8 pb-6 border-b border-brand-ebony/6 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-gradient-indigo rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
                                <UserIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-serif font-extrabold text-brand-ebony flex items-center gap-2 leading-tight">
                                    Edit Profile
                                    <Sparkles className="w-4 h-4 text-brand-gold" />
                                </h2>
                                <p className="text-[10px] font-black text-brand-ebony/30 uppercase tracking-[0.18em] mt-0.5">
                                    Refine your public identity
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={loading}
                            aria-label="Close"
                            className="p-2 hover:bg-brand-ebony/6 text-brand-ebony/30 hover:text-brand-ebony rounded-full transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* ── Scrollable body ─────────────────────────────────── */}
                    <div className="flex-1 overflow-y-auto px-8 py-7 space-y-8">

                        {/* Photo section */}
                        <div className="flex gap-6 items-start p-5 bg-brand-ebony/[0.025] rounded-2xl border border-brand-ebony/6">
                            {/* Avatar preview */}
                            <div className="relative group shrink-0">
                                <div className="w-24 h-24 rounded-[1.25rem] overflow-hidden bg-brand-ebony/5 border-4 border-white dark:border-white/10 shadow-lg transition-transform duration-300 group-hover:scale-[1.03]">
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-brand-ebony/15">
                                            <Camera className="w-10 h-10" />
                                        </div>
                                    )}
                                </div>
                                {/* Hover overlay */}
                                <label className="absolute inset-0 flex items-center justify-center bg-indigo-900/55 rounded-[1.25rem] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]">
                                    <Upload className="w-6 h-6 text-white" />
                                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                </label>
                            </div>

                            {/* Photo controls */}
                            <div className="flex-1 flex flex-col justify-center gap-3 pt-1">
                                <p className="text-sm font-bold text-brand-ebony leading-snug">Profile Photo</p>
                                <p className="text-[11px] text-brand-ebony/40 font-medium leading-tight">
                                    JPG, PNG or WebP — max 5 MB.<br />Click the photo to change it.
                                </p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    <label className="cursor-pointer px-4 py-2 bg-gradient-indigo text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-indigo-500/20 hover:brightness-110 active:scale-95 transition-all">
                                        Upload
                                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                    </label>
                                    {previewUrl && (
                                        <button
                                            type="button"
                                            onClick={handleRemovePic}
                                            className="px-4 py-2 text-red-500 border border-red-200 dark:border-red-900/30 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Form fields */}
                        <div className="space-y-5">
                            {field(
                                'edit-name', 'Full Name', UserIcon,
                                formData.name,
                                (v) => setFormData({ ...formData, name: v }),
                                'Your full name'
                            )}
                            {field(
                                'edit-profession', 'Profession', Briefcase,
                                formData.profession,
                                (v) => setFormData({ ...formData, profession: v }),
                                'e.g. Senior Software Engineer'
                            )}
                            {field(
                                'edit-location', 'Location', MapPin,
                                formData.location,
                                (v) => setFormData({ ...formData, location: v }),
                                'e.g. Mumbai, India'
                            )}
                        </div>
                    </div>

                    {/* ── Footer actions ──────────────────────────────────── */}
                    <div className="flex items-center justify-end gap-3 px-8 py-6 border-t border-brand-ebony/6 bg-brand-ebony/[0.018] shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-6 py-3 text-xs font-black text-brand-ebony/40 uppercase tracking-widest hover:text-brand-ebony transition-all rounded-2xl hover:bg-brand-ebony/5 disabled:opacity-50"
                        >
                            Discard
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading || !formData.name.trim() || !formData.profession.trim() || !formData.location.trim()}
                            className="flex items-center gap-2 px-8 py-3 bg-gradient-indigo text-white rounded-2xl font-black uppercase tracking-wider text-xs shadow-xl shadow-indigo-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed min-w-[160px] justify-center"
                        >
                            {loading ? (
                                <><Spinner /> Saving…</>
                            ) : (
                                <><Check className="w-4 h-4" /> Save Changes</>
                            )}
                        </button>
                    </div>

                </div>
            </div>
        </Portal>
    );
};
