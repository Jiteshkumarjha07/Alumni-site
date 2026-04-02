'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, Trash2, Loader2, Reply, Smile, Heart } from 'lucide-react';
import { Comment as AppComment } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { Portal } from '../ui/Portal';

interface CommentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (text: string, replyToId?: string) => Promise<void>;
    onDelete?: (comment: AppComment) => Promise<void>;
    onReact?: (comment: AppComment, emoji: string) => Promise<void>;
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
    onReact,
    comments,
    postAuthor,
    currentUserUid,
    currentUserName,
}) => {
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(false);
    const [displayComments, setDisplayComments] = useState<AppComment[]>(comments);
    const [replyingTo, setReplyingTo] = useState<AppComment | null>(null);
    const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);
    
    // Mobile dismissal states
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchTranslate, setTouchTranslate] = useState(0);

    const highlightMentions = (text: string) => {
        const parts = text.split(/(@\w+)/g);
        return parts.map((part, i) => 
            part.startsWith('@') ? (
                <span key={i} className="text-brand-burgundy font-bold hover:underline cursor-pointer">
                    {part}
                </span>
            ) : part
        );
    };

    // Sync displayComments with props when they change (from server)
    useEffect(() => {
        setDisplayComments(comments);
    }, [comments]);

    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    // Back button support
    useEffect(() => {
        if (isOpen) {
            window.history.pushState({ modal: 'comments' }, '');
            
            const handlePopState = () => {
                onCloseRef.current();
            };

            window.addEventListener('popstate', handlePopState);
            return () => {
                window.removeEventListener('popstate', handlePopState);
                if (window.history.state?.modal === 'comments') {
                    window.history.back();
                }
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleTouchStart = (e: React.TouchEvent) => {
        const scrollContainer = document.getElementById('comments-scroll-container');
        if (scrollContainer && scrollContainer.scrollTop > 0) {
            setTouchStart(null);
            return;
        }
        setTouchStart(e.targetTouches[0].clientY);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStart === null) return;
        const currentY = e.targetTouches[0].clientY;
        const diff = currentY - touchStart;
        if (diff > 0) {
            setTouchTranslate(diff);
        }
    };

    const handleTouchEnd = () => {
        if (touchTranslate > 100) {
            onClose();
        }
        setTouchStart(null);
        setTouchTranslate(0);
    };

    const handleSubmit = async () => {
        if (!commentText.trim() || !currentUserUid) return;

        const originalText = commentText;
        const currentReplyToId = replyingTo?.id;
        const optimisticComment: AppComment = {
            id: Math.random().toString(36).substr(2, 9),
            authorUid: currentUserUid,
            authorName: currentUserName || 'You',
            text: commentText.trim(),
            createdAt: new Date(),
            replyToId: currentReplyToId,
        };

        // Optimistic update: show comment instantly
        setDisplayComments(prev => [...prev, optimisticComment]);
        setCommentText('');
        setReplyingTo(null);
        setLoading(true);

        try {
            await onSubmit(originalText, currentReplyToId);
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
        try {
            if ((date as { toDate?: () => Date })?.toDate) {
                return formatDistanceToNow((date as { toDate: () => Date }).toDate(), { addSuffix: true });
            }
            return formatDistanceToNow(new Date(date as string | number | Date), { addSuffix: true });
        } catch (e) {
            return 'just now';
        }
    };

    const CommentItem = ({ 
        comment, 
        isReply, 
        onReply, 
        onReact, 
        onDelete, 
        currentUserUid,
        showEmojiPicker,
        setShowEmojiPicker
    }: {
        comment: AppComment;
        isReply: boolean;
        onReply: () => void;
        onReact: (emoji: string) => void;
        onDelete: () => void;
        currentUserUid?: string;
        showEmojiPicker: boolean;
        setShowEmojiPicker: (show: boolean) => void;
    }) => (
        <div className="flex gap-3">
            <div className={`w-8 h-8 rounded-full bg-brand-burgundy/10 flex items-center justify-center flex-shrink-0 ${isReply ? 'w-7 h-7' : ''}`}>
                <span className={`${isReply ? 'text-xs' : 'text-sm'} font-bold text-brand-burgundy`}>
                    {comment.authorName.substring(0, 1)}
                </span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="bg-brand-ebony/5 rounded-2xl px-4 py-2 relative group/comment">
                    <div className="flex justify-between items-start gap-2">
                        <p className="font-bold text-xs text-brand-burgundy mb-0.5">{comment.authorName}</p>
                        {onDelete && currentUserUid === comment.authorUid && (
                            <button
                                onClick={onDelete}
                                className="opacity-100 sm:opacity-0 sm:group-hover/comment:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete comment"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <p className="text-brand-ebony leading-relaxed text-sm">
                        {highlightMentions(comment.text)}
                    </p>

                    {/* Reactions Display */}
                    {comment.reactions && Object.entries(comment.reactions).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(comment.reactions).map(([emoji, uids]) => (
                                <button
                                    key={emoji}
                                    onClick={() => onReact(emoji)}
                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                                        uids.includes(currentUserUid || '')
                                            ? 'bg-brand-burgundy/10 border-brand-burgundy/20 text-brand-burgundy'
                                            : 'bg-white border-brand-ebony/10 text-brand-ebony/60'
                                    }`}
                                >
                                    <span>{emoji}</span>
                                    <span>{uids.length}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 mt-1.5 px-1">
                    <p className="text-[10px] font-bold text-brand-ebony/30 uppercase tracking-widest">
                        {formatDate(comment.createdAt)}
                    </p>
                    <button 
                        onClick={onReply}
                        className="text-[10px] font-bold text-brand-ebony/40 hover:text-brand-burgundy uppercase tracking-widest transition-colors flex items-center gap-1"
                    >
                        <Reply className="w-3 h-3" />
                        Reply
                    </button>
                    <div className="relative">
                        <button 
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="text-[10px] font-bold text-brand-ebony/40 hover:text-brand-burgundy uppercase tracking-widest transition-colors flex items-center gap-1"
                        >
                            <Smile className="w-3 h-3" />
                            React
                        </button>
                        
                        {showEmojiPicker && (
                            <>
                                <div 
                                    className="fixed inset-0 z-40 cursor-default" 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowEmojiPicker(false);
                                    }}
                                ></div>
                                <div className="absolute right-0 sm:right-auto sm:left-0 bottom-full mb-2 bg-white rounded-xl shadow-2xl border border-brand-ebony/10 p-2 flex gap-1 z-50 animate-in fade-in zoom-in slide-in-from-bottom-2">
                                    {['👍', '❤️', '😂', '🔥', '👏'].map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={(e) => { 
                                                e.stopPropagation();
                                                onReact(emoji); 
                                                setShowEmojiPicker(false); 
                                            }}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-brand-burgundy/10 rounded-lg transition text-lg"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <Portal>
            <div 
                className="fixed inset-0 bg-brand-ebony/60 dark:bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-[100] sm:p-4 overscroll-none"
                onClick={(e) => {
                    if (window.innerWidth >= 640 && e.target === e.currentTarget) {
                        onClose();
                    }
                }}
            >
                <div 
                    className={`bg-brand-parchment sm:rounded-2xl max-w-2xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col border border-brand-ebony/10 shadow-2xl ${touchTranslate > 0 ? '' : 'transition-transform duration-200'} slide-up-animation`}
                    style={{ transform: `translateY(${touchTranslate}px)` }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Mobile Drag Handle */}
                    <div className="w-full flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
                        <div className="w-12 h-1.5 bg-brand-ebony/10 rounded-full" />
                    </div>
    
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-brand-ebony/10 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-4">
                        <h2 className="text-xl font-serif font-bold text-brand-ebony">Comments</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-brand-burgundy/5 text-brand-ebony/60 rounded-full transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                {/* Comments List */}
                <div id="comments-scroll-container" className="flex-1 overflow-y-auto p-4 space-y-6 overscroll-contain">
                    {displayComments.length > 0 ? (
                        // Grouping comments by parent (flat list with nesting logic)
                        displayComments
                            .filter(c => !c.replyToId)
                            .map((parentComment) => (
                                <div key={parentComment.id} className="space-y-4">
                                    <CommentItem 
                                        comment={parentComment} 
                                        isReply={false}
                                        onReply={() => setReplyingTo(parentComment)}
                                        onReact={(emoji) => onReact?.(parentComment, emoji)}
                                        onDelete={() => handleDelete(parentComment)}
                                        currentUserUid={currentUserUid}
                                        showEmojiPicker={showEmojiPickerFor === parentComment.id}
                                        setShowEmojiPicker={(show) => setShowEmojiPickerFor(show ? parentComment.id : null)}
                                    />
                                    
                                    {/* Sub-comments (Replies) */}
                                    {displayComments
                                        .filter(c => c.replyToId === parentComment.id)
                                        .map((reply) => (
                                            <div key={reply.id} className="ml-10">
                                                <CommentItem 
                                                    comment={reply} 
                                                    isReply={true}
                                                    onReply={() => setReplyingTo(parentComment)} // Reply to parent thread
                                                    onReact={(emoji) => onReact?.(reply, emoji)}
                                                    onDelete={() => handleDelete(reply)}
                                                    currentUserUid={currentUserUid}
                                                    showEmojiPicker={showEmojiPickerFor === reply.id}
                                                    setShowEmojiPicker={(show) => setShowEmojiPickerFor(show ? reply.id : null)}
                                                />
                                            </div>
                                        ))
                                    }
                                </div>
                            ))
                    ) : (
                        <p className="text-center text-gray-500 py-8">No comments yet. Be the first to comment!</p>
                    )}
                </div>

                {/* Reply Indicator */}
                {replyingTo && (
                    <div className="px-4 py-2 bg-brand-burgundy/5 flex items-center justify-between border-t border-brand-burgundy/10">
                        <p className="text-xs text-brand-burgundy font-semibold">
                            Replying to <span className="font-bold">{replyingTo.authorName}</span>
                        </p>
                        <button onClick={() => setReplyingTo(null)} className="text-[10px] uppercase font-bold text-gray-400 hover:text-gray-600">
                            Cancel
                        </button>
                    </div>
                )}

                {/* Comment Input */}
                <div className="p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-4 border-t border-brand-ebony/10 bg-brand-ebony/5 flex-shrink-0">
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
    </Portal>
    );
};
