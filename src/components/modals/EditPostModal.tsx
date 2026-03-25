'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface EditPostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (postId: string, newContent: string) => Promise<void>;
    post: {
        id: string;
        content: string;
    };
}

export const EditPostModal: React.FC<EditPostModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    post,
}) => {
    const [content, setContent] = useState(post.content);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setContent(post.content);
    }, [post.content]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!content.trim()) return;

        setLoading(true);
        try {
            await onSubmit(post.id, content);
            onClose();
        } catch (error) {
            console.error('Error updating post:', error);
            alert('Failed to update post. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-brand-ebony/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-brand-parchment rounded-2xl max-w-2xl w-full shadow-2xl border border-brand-ebony/20 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-brand-ebony/10 bg-brand-parchment/95 backdrop-blur-md">
                    <h2 className="text-xl font-serif font-bold text-brand-ebony">Edit Post</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-brand-burgundy/10 text-brand-ebony/40 hover:text-brand-burgundy rounded-full transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full min-h-[150px] p-4 bg-white/50 border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy focus:border-transparent resize-none text-brand-ebony font-sans transition-all"
                    />

                    <div className="flex items-center justify-end gap-4 mt-6">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 text-brand-ebony/60 hover:text-brand-ebony font-bold text-sm tracking-wider uppercase hover:bg-brand-ebony/5 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!content.trim() || loading}
                            className="px-8 py-2.5 bg-brand-burgundy text-white rounded-xl font-bold text-sm tracking-wider uppercase hover:bg-[#5a2427] transition-all shadow-md shadow-brand-burgundy/20 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
