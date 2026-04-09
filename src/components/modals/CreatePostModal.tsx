'use client';

import { useState } from 'react';
import { X, Image as ImageIcon, Loader2, Send, Sparkles } from 'lucide-react';
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
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                return;
            }
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
            return;
        }

        setLoading(true);
        try {
            let imageUrl: string | undefined = undefined;
            if (imageFile) {
                imageUrl = await uploadMedia(imageFile) || undefined;
            }

            await onSubmit(content.trim(), imageUrl);
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
            <div className="fixed inset-0 bg-brand-cream/40 dark:bg-black/60 backdrop-blur-md flex items-start sm:items-center justify-center z-[100] sm:p-4 animate-in fade-in duration-300">
                <div className="card-premium sm:max-w-xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-400 ease-out border-brand-burgundy/10">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 sm:p-6 border-b border-brand-ebony/5 relative z-10 bg-white/40 dark:bg-brand-parchment/40 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-gradient-indigo rounded-full"></div>
                            <h2 className="text-2xl font-serif font-extrabold text-brand-ebony tracking-tight flex items-center gap-2">
                                Create Post
                                <Sparkles className="w-4 h-4 text-brand-gold animate-pulse" />
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="p-2 hover:bg-brand-burgundy/10 text-brand-ebony/40 hover:text-brand-burgundy rounded-xl transition-all disabled:opacity-50"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                        {/* User Info */}
                        <div className="p-5 sm:p-6 flex items-center gap-4">
                            <div className="relative shrink-0">
                                <img
                                    src={currentUser.profilePic || `https://placehold.co/48x48/4f46e5/ffffff?text=${currentUser.name.substring(0, 1)}`}
                                    alt={currentUser.name}
                                    className="w-11 h-11 rounded-full object-cover ring-2 ring-brand-burgundy/10 shadow-sm"
                                />
                            </div>
                            <div>
                                <p className="font-bold text-brand-ebony text-md leading-none mb-1">{currentUser.name}</p>
                                <p className="text-[10px] font-bold text-brand-ebony/40 uppercase tracking-[0.2em]">Sharing with the community</p>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="px-5 sm:px-6 pb-6">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Share your story, updates, or news..."
                                className="w-full min-h-[180px] p-0 bg-transparent border-none focus:ring-0 outline-none resize-none text-brand-ebony placeholder-brand-ebony/20 transition-all font-sans text-lg leading-relaxed"
                                disabled={loading}
                                autoFocus
                            />

                            {/* Image Preview Area */}
                            {imagePreview && (
                                <div className="mt-4 relative rounded-2xl overflow-hidden border border-brand-ebony/10 shadow-xl group">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full max-h-[400px] object-cover group-hover:scale-[1.02] transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <button
                                        onClick={handleRemoveImage}
                                        disabled={loading}
                                        className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black text-white rounded-xl transition-all disabled:opacity-50 shadow-lg backdrop-blur-md"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            )}

                            {/* Image Upload Hint if no image */}
                            {!imagePreview && (
                                <div className="mt-6 flex items-center gap-4">
                                     <label className="flex items-center gap-2.5 px-5 py-2.5 bg-brand-burgundy/5 text-brand-burgundy hover:bg-brand-burgundy/10 rounded-xl cursor-pointer transition-all border border-brand-burgundy/10 group">
                                        <ImageIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                        <span className="text-xs font-bold uppercase tracking-widest">Add Photo</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="hidden"
                                            disabled={loading}
                                        />
                                    </label>
                                    <p className="text-[10px] text-brand-ebony/30 font-bold uppercase tracking-widest">Max 5MB • High Quality preferred</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="p-5 sm:p-6 border-t border-brand-ebony/5 bg-white/40 dark:bg-brand-parchment/40 backdrop-blur-sm flex items-center justify-between">
                         <div className="hidden sm:block">
                             <p className={`text-[10px] font-bold uppercase tracking-widest ${content.length > 2000 ? 'text-red-500' : 'text-brand-ebony/20'}`}>
                                {content.length} / 2000
                             </p>
                         </div>
                         
                         <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 sm:flex-none px-6 py-3 text-brand-ebony/50 hover:text-brand-ebony font-bold text-xs tracking-widest uppercase transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || (!content.trim() && !imageFile)}
                                className="flex-1 sm:flex-none px-8 py-3 bg-gradient-indigo text-white rounded-xl font-bold text-xs tracking-[0.2em] uppercase hover:shadow-[0_4px_15px_rgba(99,102,241,0.4)] transition-all disabled:opacity-30 disabled:cursor-not-allowed group relative overflow-hidden active:scale-95"
                            >
                                <div className="relative z-10 flex items-center justify-center gap-2">
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    )}
                                    <span>{loading ? 'Posting...' : 'Share Post'}</span>
                                </div>
                                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                            </button>
                         </div>
                    </div>
                </div>
            </div>
        </Portal>
    );
};
