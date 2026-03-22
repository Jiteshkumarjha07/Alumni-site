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
                    {comments.length > 0 ? (
                        comments.map((comment, index) => (
                            <div key={index} className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-sm font-semibold text-blue-600">
                                        {comment.authorName.substring(0, 1)}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <div className="bg-gray-100 rounded-lg p-3 relative group/comment">
                                        <p className="font-semibold text-sm">{comment.authorName}</p>
                                        <p className="text-gray-800 mt-1">{comment.text}</p>
                                        
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
                                    <p className="text-xs text-gray-500 mt-1">
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
