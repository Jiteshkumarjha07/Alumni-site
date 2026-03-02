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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-semibold">Edit Post</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full min-h-[120px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />

                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!content.trim() || loading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
