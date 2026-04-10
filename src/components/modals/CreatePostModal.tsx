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
            <div className="fixed inset-0 bg-brand-cream/60 dark:bg-black/80 backdrop-blur-xl flex items-start sm:items-center justify-center z-[100] sm:p-6 animate-in fade-in duration-500">
                <div className="card-premium sm:max-w-2xl w-full h-full sm:h-auto sm:max-h-[95vh] flex flex-col shadow-focus-premium overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] border-brand-burgundy/10">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 sm:p-8 border-b border-brand-ebony/5 relative z-10 bg-white/60 dark:bg-brand-parchment/60 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                            <div className="w-2 h-8 bg-brand-burgundy rounded-full glow-sm"></div>
                            <div>
                                <h2 className="text-3xl font-serif font-bold text-brand-ebony tracking-tight flex items-center gap-2">
                                    Compose
                                    <Sparkles className="w-5 h-5 text-brand-gold animate-pulse" />
                                </h2>
                                <p className="text-[10px] font-bold text-brand-ebony/30 uppercase tracking-[0.2em] mt-1">Share your legacy with the network</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="p-3 hover:bg-brand-burgundy/5 text-brand-ebony/30 hover:text-brand-burgundy rounded-2xl transition-all disabled:opacity-50 group/close"
                        >
                            <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                        {/* User Info */}
                        <div className="p-6 sm:p-8 flex items-center gap-5">
                            <div className="relative shrink-0 group/avatar">
                                <img
                                    src={currentUser.profilePic || `https://placehold.co/48x48/4f46e5/ffffff?text=${currentUser.name.substring(0, 1)}`}
                                    alt={currentUser.name}
                                    className="w-12 h-12 rounded-full object-cover ring-4 ring-brand-burgundy/5 group-hover/avatar:ring-brand-burgundy/20 transition-all shadow-md"
                                />
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                            </div>
                            <div>
                                <p className="font-bold text-brand-ebony text-lg leading-tight tracking-tight">{currentUser.name}</p>
                                <p className="text-[10px] font-bold text-brand-ebony/30 uppercase tracking-widest mt-1">Public Post • Institute Network</p>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="px-6 sm:px-8 pb-8">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="What's on your mind? Share an update, a milestone, or start a discussion..."
                                className="w-full min-h-[220px] p-0 bg-transparent border-none focus:ring-0 outline-none resize-none text-brand-ebony placeholder-brand-ebony/20 transition-all font-sans text-xl leading-[1.6] tracking-tight"
                                disabled={loading}
                                autoFocus
                            />

                            {/* Image Preview Area */}
                            {imagePreview && (
                                <div className="mt-6 relative rounded-[2rem] overflow-hidden border border-brand-ebony/5 shadow-premium group/img max-h-[450px]">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full h-full object-cover group-hover/img:scale-[1.02] transition-transform duration-700 ease-out"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-500"></div>
                                    <button
                                        onClick={handleRemoveImage}
                                        disabled={loading}
                                        className="absolute top-6 right-6 p-3 bg-black/60 hover:bg-red-500 text-white rounded-2xl transition-all disabled:opacity-50 shadow-2xl backdrop-blur-md active:scale-90"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            )}

                            {/* Image Upload Hint if no image */}
                            {!imagePreview && (
                                <div className="mt-8 flex flex-wrap items-center gap-6">
                                     <label className="flex items-center gap-3 px-6 py-3.5 bg-brand-burgundy/5 text-brand-burgundy hover:bg-brand-burgundy/10 rounded-2xl cursor-pointer transition-all border border-brand-burgundy/10 group/btn active:scale-95">
                                        <ImageIcon className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                                        <span className="text-[11px] font-bold uppercase tracking-widest">Incorporate Media</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="hidden"
                                            disabled={loading}
                                        />
                                    </label>
                                    <p className="text-[10px] text-brand-ebony/25 font-bold uppercase tracking-widest max-w-[150px] leading-relaxed">
                                        High-fidelity assets only • Up to 5MB
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="p-6 sm:p-8 border-t border-brand-ebony/5 bg-white/60 dark:bg-brand-parchment/60 backdrop-blur-md flex items-center justify-between mt-auto">
                         <div className="hidden sm:block">
                             <div className="flex items-center gap-3">
                                 <div className={`h-1.5 w-24 rounded-full overflow-hidden bg-brand-ebony/5`}>
                                     <div 
                                        className={`h-full transition-all duration-300 ${content.length > 2000 ? 'bg-red-500' : 'bg-brand-burgundy'}`}
                                        style={{ width: `${Math.min((content.length / 2000) * 100, 100)}%` }}
                                     ></div>
                                 </div>
                                 <p className={`text-[10px] font-bold uppercase tracking-widest ${content.length > 2000 ? 'text-red-500' : 'text-brand-ebony/30'}`}>
                                    {content.length} / 2000
                                 </p>
                             </div>
                         </div>
                         
                         <div className="flex items-center gap-4 w-full sm:w-auto">
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 sm:flex-none px-8 py-4 text-brand-ebony/40 hover:text-brand-ebony font-bold text-[11px] tracking-[0.15em] uppercase transition-all disabled:opacity-50"
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || (!content.trim() && !imageFile)}
                                className="flex-1 sm:flex-none px-10 py-4 bg-brand-burgundy text-white rounded-2xl font-bold text-[11px] tracking-[0.25em] uppercase shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-20 disabled:cursor-not-allowed group relative overflow-hidden active:scale-[0.97]"
                            >
                                <div className="relative z-10 flex items-center justify-center gap-3">
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                                    ) : (
                                        <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    )}
                                    <span>{loading ? 'Transmitting...' : 'Release Post'}</span>
                                </div>
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </button>
                         </div>
                    </div>
                </div>
            </div>
        </Portal>
    );
};
