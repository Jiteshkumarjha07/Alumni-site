'use client';

import { useState, useEffect } from 'react';
import { X, Upload, Camera } from 'lucide-react';

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

    // Reset form when modal opens
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
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                return;
            }

            // Validate file type
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
        if (!formData.name.trim()) {
            alert('Please enter your name');
            return;
        }

        if (!formData.profession.trim()) {
            alert('Please enter your profession');
            return;
        }

        if (!formData.location.trim()) {
            alert('Please enter your location');
            return;
        }

        setLoading(true);
        try {
            await onSubmit(formData, profilePicFile, removePic);
            onClose();
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-brand-ebony/60 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-brand-parchment rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-brand-ebony/10 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-brand-ebony/10 sticky top-0 bg-brand-parchment z-10">
                    <h2 className="text-xl font-serif font-bold text-brand-ebony">Edit Profile</h2>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="p-2 hover:bg-brand-burgundy/5 text-brand-ebony/60 rounded-full transition disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-5">
                    {/* Profile Picture */}
                    <div className="flex flex-col items-center">
                        <div className="relative group">
                            <div className="w-28 h-28 rounded-full overflow-hidden bg-brand-ebony/10 border-4 border-brand-parchment shadow-md">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-brand-ebony/20">
                                        <svg className="w-14 h-14" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            {/* Camera overlay */}
                            <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full opacity-0 group-hover:opacity-100 transition cursor-pointer">
                                <Camera className="w-8 h-8 text-white" />
                                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                            </label>
                        </div>

                        <div className="flex gap-3 mt-4">
                            <label className="cursor-pointer px-4 py-2 bg-brand-burgundy/5 text-brand-burgundy hover:bg-brand-burgundy/10 rounded-lg text-sm font-bold transition uppercase tracking-widest border border-brand-burgundy/10">
                                <Upload className="w-4 h-4 inline mr-1" />
                                Upload Photo
                                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                            </label>
                            {previewUrl && (
                                <button
                                    onClick={handleRemovePic}
                                    className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-bold transition uppercase tracking-widest border border-red-100"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                        <p className="text-[10px] text-brand-ebony/40 mt-2 uppercase tracking-widest font-bold">Max size: 5MB</p>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-bold text-brand-ebony/70 mb-2 uppercase tracking-widest">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Enter your full name"
                            className="w-full px-4 py-3 bg-brand-ebony/5 border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy transition outline-none text-brand-ebony"
                        />
                    </div>

                    {/* Profession */}
                    <div>
                        <label className="block text-sm font-bold text-brand-ebony/70 mb-2 uppercase tracking-widest">
                            Profession <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.profession}
                            onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                            placeholder="e.g., Software Engineer"
                            className="w-full px-4 py-3 bg-brand-ebony/5 border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy transition outline-none text-brand-ebony"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-brand-ebony/70 mb-2 uppercase tracking-widest">
                            Location <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            placeholder="e.g., New York, USA"
                            className="w-full px-4 py-3 bg-brand-ebony/5 border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy transition outline-none text-brand-ebony"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 p-4 border-t border-brand-ebony/10 bg-brand-ebony/5 sticky bottom-0">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-6 py-2.5 border border-brand-ebony/10 rounded-xl font-bold text-brand-ebony/60 hover:bg-white transition disabled:opacity-50 uppercase tracking-widest text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2.5 bg-brand-burgundy text-white rounded-xl font-bold hover:bg-[#5a2427] transition-all shadow-md shadow-brand-burgundy/20 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] uppercase tracking-widest text-sm"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Saving...
                            </span>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
