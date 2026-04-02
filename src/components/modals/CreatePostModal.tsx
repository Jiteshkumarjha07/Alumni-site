'use client';

import { useState } from 'react';
import { X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { uploadMedia } from '@/lib/media';
import { Portal } from '../ui/Portal';

interface CreatePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (content: string, imageUrl?: string) => Promise<void>;
    currentUser: {
        name: string;
        profilePic?: string;
    };
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    currentUser,
}) => {
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview('');
    };

    const handleSubmit = async () => {
        if (!content.trim() && !imageFile) {
            alert('Please add some content or an image');
            return;
        }

        setLoading(true);
        try {
            let imageUrl: string | undefined = undefined;
            if (imageFile) {
                imageUrl = await uploadMedia(imageFile) || undefined;
            }

            await onSubmit(content.trim(), imageUrl);

            // Reset form
            setContent('');
            setImageFile(null);
            setImagePreview('');
            onClose();
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Failed to create post. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Portal>
            <div className="fixed inset-0 bg-brand-ebony/60 dark:bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-[100] sm:p-4">
                <div className="bg-brand-cream sm:rounded-2xl sm:max-w-lg w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col shadow-2xl border-t sm:border border-brand-gold/20 overflow-hidden slide-up-animation">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 sm:p-6 border-b border-brand-gold/10 sticky top-0 bg-brand-parchment/95 backdrop-blur-md z-10 pt-[max(1rem,env(safe-area-inset-top))]">
                        <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-ebony underline decoration-brand-gold/30 underline-offset-8">Create Post</h2>
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="p-2 hover:bg-brand-burgundy/10 text-brand-ebony/40 hover:text-brand-burgundy rounded-full transition disabled:opacity-50"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {/* User Info */}
                        <div className="p-4 sm:p-6 flex items-center gap-4">
                            <div className="relative">
                                <img
                                    src={currentUser.profilePic || `https://placehold.co/48x48/EFEFEFF/3B82F6?text=${currentUser.name.substring(0, 1)}`}
                                    alt={currentUser.name}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-brand-gold/20 shadow-sm"
                                />
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-brand-cream rounded-full"></div>
                            </div>
                            <div className="flex flex-col">
                                <p className="font-bold text-brand-ebony text-lg leading-tight">{currentUser.name}</p>
                                <p className="text-xs font-bold text-brand-ebony/40 uppercase tracking-widest mt-0.5">Posting to alumni network</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-4 sm:px-6 pb-6">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="What's on your mind?"
                                className="w-full min-h-[160px] p-5 bg-white/50 dark:bg-black/20 border border-brand-gold/20 rounded-2xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy outline-none resize-none text-brand-ebony placeholder-brand-ebony/30 transition-all font-sans text-lg leading-relaxed"
                                disabled={loading}
                            />

                            {/* Image Preview */}
                            {imagePreview && (
                                <div className="mt-4 relative group">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full rounded-xl max-h-96 object-cover border border-brand-gold/20 shadow-lg"
                                    />
                                    <button
                                        onClick={handleRemoveImage}
                                        disabled={loading}
                                        className="absolute top-3 right-3 p-2.5 bg-brand-ebony/80 hover:bg-brand-ebony text-white rounded-full transition-all disabled:opacity-50 shadow-md transform hover:scale-110"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            )}

                            {/* Image Upload Button */}
                            {!imagePreview && (
                                <label className="mt-4 flex items-center justify-center gap-3 p-8 border-2 border-dashed border-brand-gold/20 rounded-2xl hover:border-brand-burgundy/40 hover:bg-brand-burgundy/5 transition-all cursor-pointer group">
                                    <ImageIcon className="w-6 h-6 text-brand-ebony/20 group-hover:text-brand-burgundy transition-colors" />
                                    <span className="text-sm font-bold text-brand-ebony/60 group-hover:text-brand-burgundy transition-colors tracking-wide uppercase">Add a photo to your update</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="hidden"
                                        disabled={loading}
                                    />
                                </label>
                            )}

                            <div className="flex items-center justify-between mt-3 px-1">
                                <p className="text-[10px] text-brand-ebony/40 font-bold uppercase tracking-tighter">Maximum image size: 5MB • PNG, JPG</p>
                                <p className={`text-[10px] font-bold uppercase tracking-widest ${content.length > 2000 ? 'text-red-500' : 'text-brand-ebony/20'}`}>{content.length} characters</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-4 p-4 sm:p-6 border-t border-brand-gold/10 bg-brand-parchment/80 sticky bottom-0 backdrop-blur-sm pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-6 py-2.5 text-brand-ebony/60 hover:text-brand-ebony font-bold text-xs tracking-widest uppercase hover:bg-brand-ebony/5 rounded-xl transition-all disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || (!content.trim() && !imageFile)}
                        className="px-10 py-3 bg-brand-burgundy text-white rounded-xl font-bold text-xs tracking-widest uppercase hover:bg-[#5a2427] transition-all shadow-lg shadow-brand-burgundy/20 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] active:scale-95"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Posting...</span>
                            </span>
                        ) : (
                            'Post Now'
                        )}
                    </button>
                </div>
                </div>
            </div>
        </Portal>
    );
};
