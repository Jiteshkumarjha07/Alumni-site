'use client';

import { useState, useEffect } from 'react';
import { X, Send, Trash2, Loader2 } from 'lucide-react';
import { Comment } from '@/types';

interface CommentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (text: string) => Promise<void>;
    comments: Comment[];
    postAuthor: string;
    currentUserUid?: string;
    currentUserName?: string;
    onDelete?: (comment: Comment) => void;
}

export const CommentModal: React.FC<CommentModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    comments,
    postAuthor,
    currentUserUid,
    currentUserName,
    onDelete,
}) => {
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(false);
    const [displayComments, setDisplayComments] = useState<Comment[]>(comments);

    // Sync displayComments with props when they change (from server)
    useEffect(() => {
        setDisplayComments(comments);
    }, [comments]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!commentText.trim() || !currentUserUid) return;

        const originalText = commentText;
        const optimisticComment: Comment = {
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

    const handleDelete = async (comment: Comment) => {
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-semibold">Comments</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {displayComments.length > 0 ? (
                        displayComments.map((comment, index) => (
                            <div key={`${comment.authorUid}-${index}`} className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-sm font-semibold text-blue-600">
                                        {comment.authorName.substring(0, 1)}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <div className="bg-gray-100 rounded-lg p-3 relative group">
                                        <div className="flex justify-between items-start gap-2">
                                            <p className="font-semibold text-sm">{comment.authorName}</p>
                                            {currentUserUid === comment.authorUid && onDelete && (
                                                <button
                                                    onClick={() => handleDelete(comment)}
                                                    className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all rounded"
                                                    title="Delete comment"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-gray-800 mt-0.5 text-sm">{comment.text}</p>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1 pl-1">
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
                <div className="p-4 border-t">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                            placeholder="Write a comment..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={!commentText.trim() || loading}
                            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
