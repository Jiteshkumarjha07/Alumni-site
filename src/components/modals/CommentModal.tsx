'use client';

import { useState, useEffect } from 'react';
import { X, Send, Trash2, Loader2 } from 'lucide-react';
import { Comment as AppComment } from '@/types';

interface CommentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (text: string) => Promise<void>;
    onDelete?: (comment: AppComment) => Promise<void>;
    comments: AppComment[];
    postAuthor: string;
    currentUserUid?: string;
    currentUserName?: string;
}

export const CommentModal: React.FC<CommentModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    onDelete,
    comments,
    postAuthor,
    currentUserUid,
    currentUserName,
}) => {
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(false);
    const [displayComments, setDisplayComments] = useState<AppComment[]>(comments);

    // Sync displayComments with props when they change (from server)
    useEffect(() => {
        setDisplayComments(comments);
    }, [comments]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!commentText.trim() || !currentUserUid) return;

        const originalText = commentText;
        const optimisticComment: AppComment = {
            authorUid: currentUserUid,
            authorName: currentUserName || 'You',
            text: commentText.trim(),
            createdAt: new Date(),
        };

        // Optimistic update: show comment instantly
        setDisplayComments(prev => [...prev, optimisticComment]);
        setCommentText('');
        setLoading(true);

        try {
            await onSubmit(originalText);
        } catch (error) {
            console.error('Error adding comment:', error);
            // Rollback on error
            setDisplayComments(prev => prev.filter(c => c !== optimisticComment));
            setCommentText(originalText);
            alert('Failed to add comment. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (comment: AppComment) => {
        if (!onDelete) return;

        const previousComments = [...displayComments];
        // Optimistic update: remove instantly
        setDisplayComments(prev => prev.filter(c => c !== comment));

        try {
            await onDelete(comment);
        } catch (error) {
            console.error('Error deleting comment:', error);
            // Rollback on error
            setDisplayComments(previousComments);
            alert('Failed to delete comment.');
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
                    {displayComments.length > 0 ? (
                        displayComments.map((comment, index) => (
                            <div key={`${comment.authorUid}-${index}`} className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand-burgundy/10 flex items-center justify-center flex-shrink-0">
                                    <span className="text-sm font-bold text-brand-burgundy">
                                        {comment.authorName.substring(0, 1)}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <div className="bg-brand-ebony/5 rounded-2xl px-4 py-2 relative group/comment">
                                        <div className="flex justify-between items-start gap-2">
                                            <p className="font-bold text-xs text-brand-burgundy mb-0.5">{comment.authorName}</p>
                                            {onDelete && currentUserUid === comment.authorUid && (
                                                <button
                                                    onClick={() => handleDelete(comment)}
                                                    className="opacity-100 sm:opacity-0 sm:group-hover/comment:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete comment"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-brand-ebony leading-relaxed text-sm">{comment.text}</p>
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
                    <div className="flex flex-wrap gap-2 mb-3">
                        {['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🙌', '✨', '💯'].map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => setCommentText(prev => prev + emoji)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-brand-burgundy/10 rounded-lg transition text-xl"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            placeholder="Write a comment..."
                            className="flex-1 px-4 py-3 bg-brand-parchment border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy transition outline-none text-brand-ebony"
                            disabled={loading}
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={!commentText.trim() || loading || !currentUserUid}
                            className="p-3 bg-brand-burgundy text-white rounded-full hover:bg-[#5a2427] transition shadow-md shadow-brand-burgundy/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
