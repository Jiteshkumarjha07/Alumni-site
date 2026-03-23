'use client';

import { useState } from 'react';
import { X, Send, Trash2 } from 'lucide-react';
import { Comment as AppComment } from '@/types';

interface CommentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (text: string) => Promise<void>;
    onDelete?: (comment: AppComment) => Promise<void>;
    comments: AppComment[];
    postAuthor: string;
    currentUserUid?: string;
}

export const CommentModal: React.FC<CommentModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    onDelete,
    comments,
    postAuthor,
    currentUserUid,
}) => {
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!commentText.trim()) return;

        setLoading(true);
        try {
            await onSubmit(commentText);
            setCommentText('');
        } catch (error) {
            console.error('Error adding comment:', error);
            alert('Failed to add comment. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date: unknown) => {
        if ((date as { toDate?: () => Date })?.toDate) {
            return (date as { toDate: () => Date }).toDate().toLocaleDateString();
        }
        return new Date(date as string | number | Date).toLocaleDateString();
    };

    return (
        <div className="fixed inset-0 bg-brand-ebony/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-brand-parchment rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col border border-brand-ebony/10 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-brand-ebony/10">
                    <h2 className="text-xl font-serif font-bold text-brand-ebony">Comments</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-brand-burgundy/5 text-brand-ebony/60 rounded-full transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {comments.length > 0 ? (
                        comments.map((comment, index) => (
                            <div key={index} className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand-burgundy/10 flex items-center justify-center flex-shrink-0">
                                    <span className="text-sm font-bold text-brand-burgundy">
                                        {comment.authorName.substring(0, 1)}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <div className="bg-brand-ebony/5 rounded-2xl px-4 py-2 relative group/comment">
                                        <p className="font-bold text-xs text-brand-burgundy mb-0.5">{comment.authorName}</p>
                                        <p className="text-brand-ebony leading-relaxed">{comment.text}</p>
                                        
                                        {onDelete && currentUserUid === comment.authorUid && (
                                            <button
                                                onClick={() => onDelete(comment)}
                                                className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/comment:opacity-100"
                                                title="Delete comment"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-bold text-brand-ebony/30 uppercase tracking-widest mt-1 px-1">
                                        {formatDate(comment.createdAt)}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-8">No comments yet. Be the first to comment!</p>
                    )}
                </div>

                {/* Comment Input */}
                <div className="p-4 border-t border-brand-ebony/10 bg-brand-ebony/5">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                            placeholder="Write a comment..."
                            className="flex-1 px-4 py-3 bg-brand-parchment border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy transition outline-none text-brand-ebony"
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={!commentText.trim() || loading}
                            className="p-3 bg-brand-burgundy text-white rounded-full hover:bg-[#5a2427] transition shadow-md shadow-brand-burgundy/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
