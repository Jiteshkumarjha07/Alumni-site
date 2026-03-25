'use client';

import { useState } from 'react';
import { X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { uploadMedia } from '@/lib/media';

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
        <div className="fixed inset-0 bg-brand-ebony/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-brand-parchment rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-brand-ebony/20">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-brand-ebony/10 sticky top-0 bg-brand-parchment/95 backdrop-blur-md z-10">
                    <h2 className="text-xl font-serif font-bold text-brand-ebony">Create Post</h2>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="p-2 hover:bg-brand-burgundy/10 text-brand-ebony/40 hover:text-brand-burgundy rounded-full transition disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* User Info */}
                <div className="p-4 flex items-center gap-3">
                    <img
                        src={currentUser.profilePic || `https://placehold.co/48x48/EFEFEFF/3B82F6?text=${currentUser.name.substring(0, 1)}`}
                        alt={currentUser.name}
                        className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex flex-col">
                        <p className="font-bold text-brand-ebony">{currentUser.name}</p>
                        <p className="text-xs font-medium text-brand-ebony/50 uppercase tracking-widest">Posting to alumni network</p>
                    </div>
                </div>

                {/* Content */}
                <div className="px-4 pb-4">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="What's on your mind?"
                        className="w-full min-h-[120px] p-4 bg-white/50 border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy focus:border-transparent resize-none text-brand-ebony placeholder-brand-ebony/30 transition-all font-sans"
                        disabled={loading}
                    />

                    {/* Image Preview */}
                    {imagePreview && (
                        <div className="mt-3 relative">
                            <img
                                src={imagePreview}
                                alt="Preview"
                                className="w-full rounded-lg max-h-96 object-cover"
                            />
                            <button
                                onClick={handleRemoveImage}
                                disabled={loading}
                                className="absolute top-2 right-2 p-2 bg-gray-900 bg-opacity-75 hover:bg-opacity-90 text-white rounded-full transition disabled:opacity-50"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* Image Upload Button */}
                    {!imagePreview && (
                        <label className="mt-3 flex items-center justify-center gap-2 p-6 border-2 border-dashed border-brand-ebony/10 rounded-xl hover:border-brand-burgundy/40 hover:bg-brand-burgundy/5 transition-all cursor-pointer group">
                            <ImageIcon className="w-5 h-5 text-brand-ebony/30 group-hover:text-brand-burgundy transition-colors" />
                            <span className="text-sm font-bold text-brand-ebony/60 group-hover:text-brand-burgundy transition-colors">Add an image</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                                disabled={loading}
                            />
                        </label>
                    )}

                    <p className="text-xs text-gray-500 mt-2">Max image size: 5MB</p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-4 p-4 border-t border-brand-ebony/10 bg-brand-parchment/80 sticky bottom-0 backdrop-blur-sm">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-6 py-2.5 text-brand-ebony/60 hover:text-brand-ebony font-bold text-sm tracking-wider uppercase hover:bg-brand-ebony/5 rounded-xl transition-all disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || (!content.trim() && !imageFile)}
                        className="px-8 py-2.5 bg-brand-burgundy text-white rounded-xl font-bold text-sm tracking-wider uppercase hover:bg-[#5a2427] transition-all shadow-md shadow-brand-burgundy/20 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Posting...</span>
                            </span>
                        ) : (
                            'Post'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
