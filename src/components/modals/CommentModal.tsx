'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Trash2, Loader2, Reply, Smile, Sparkles, Hash, MessageCircle } from 'lucide-react';
import { Comment as AppComment } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { Portal } from '../ui/Portal';

// ── Helpers (module-level so they're stable references) ─────────────────────

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🔥', '👏'];

function highlightMentions(text: string) {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) =>
        part.startsWith('@') ? (
            <span key={i} className="text-indigo-500 font-extrabold hover:underline cursor-pointer">
                {part}
            </span>
        ) : (
            part
        )
    );
}

function formatCommentDate(date: unknown): string {
    try {
        if ((date as { toDate?: () => Date })?.toDate) {
            return formatDistanceToNow((date as { toDate: () => Date }).toDate(), { addSuffix: false });
        }
        return formatDistanceToNow(new Date(date as string | number | Date), { addSuffix: false });
    } catch {
        return 'now';
    }
}

// ── CommentItem — defined OUTSIDE CommentModal so React never remounts it ────
interface CommentItemProps {
    comment: AppComment;
    isReply: boolean;
    onReply: () => void;
    onReact: (emoji: string) => void;
    onDelete: () => void;
    currentUserUid?: string;
    showEmojiPicker: boolean;
    setShowEmojiPicker: (show: boolean) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
    comment,
    isReply,
    onReply,
    onReact,
    onDelete,
    currentUserUid,
    showEmojiPicker,
    setShowEmojiPicker,
}) => (
    <div className="flex gap-4 group/item animate-in fade-in slide-in-from-left-2 duration-300">
        <div
            className={`shrink-0 ${isReply ? 'w-8 h-8' : 'w-10 h-10'} rounded-2xl bg-brand-ebony/5 flex items-center justify-center border border-brand-ebony/5 shadow-sm overflow-hidden`}
        >
            <span className={`${isReply ? 'text-[10px]' : 'text-xs'} font-extrabold text-brand-ebony/40`}>
                {comment.authorName.substring(0, 1)}
            </span>
        </div>

        <div className="flex-1 min-w-0">
            <div
                className={`px-5 py-3 rounded-2xl relative group/comment transition-all ${
                    isReply
                        ? 'bg-brand-ebony/5'
                        : 'bg-white dark:bg-brand-parchment/10 border border-brand-ebony/5 shadow-sm'
                }`}
            >
                <div className="flex justify-between items-center mb-1">
                    <p className="font-extrabold text-[11px] text-indigo-500 uppercase tracking-widest">
                        {comment.authorName}
                    </p>
                    {onDelete && currentUserUid === comment.authorUid && (
                        <button
                            type="button"
                            onClick={onDelete}
                            className="opacity-0 group-hover/comment:opacity-100 p-1.5 text-brand-ebony/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                <p className="text-brand-ebony leading-relaxed text-sm font-medium">
                    {highlightMentions(comment.text)}
                </p>

                {comment.reactions && Object.entries(comment.reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {Object.entries(comment.reactions).map(([emoji, uids]) => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => onReact(emoji)}
                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold border transition-all ${
                                    uids.includes(currentUserUid || '')
                                        ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'
                                        : 'bg-white/50 border-brand-ebony/5 text-brand-ebony/40'
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
            <div className="flex items-center gap-6 mt-2 px-1">
                <p className="text-[9px] font-extrabold text-brand-ebony/20 uppercase tracking-widest">
                    {formatCommentDate(comment.createdAt)}
                </p>

                <button
                    type="button"
                    onClick={onReply}
                    className="text-[9px] font-extrabold text-brand-ebony/30 hover:text-indigo-500 uppercase tracking-widest transition-colors flex items-center gap-1.5"
                >
                    <Reply className="w-3 h-3" />
                    Reply
                </button>

                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="text-[9px] font-extrabold text-brand-ebony/30 hover:text-indigo-500 uppercase tracking-widest transition-colors flex items-center gap-1.5"
                    >
                        <Smile className="w-3 h-3" />
                        React
                    </button>

                    {showEmojiPicker && (
                        <div className="absolute left-0 bottom-full mb-3 bg-white dark:bg-brand-ebony rounded-2xl shadow-2xl border border-brand-ebony/10 p-2 flex gap-1 z-50 animate-in fade-in zoom-in slide-in-from-bottom-2 duration-200">
                            {REACTION_EMOJIS.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => {
                                        onReact(emoji);
                                        setShowEmojiPicker(false);
                                    }}
                                    className="w-9 h-9 flex items-center justify-center hover:bg-indigo-500/10 rounded-xl transition text-lg"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
);

// ── CommentModal ─────────────────────────────────────────────────────────────

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
    const inputRef = useRef<HTMLInputElement>(null);

    // Mobile dismissal
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchTranslate, setTouchTranslate] = useState(0);

    // Keep displayComments in sync with parent prop
    useEffect(() => {
        setDisplayComments(comments);
    }, [comments]);

    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    // Back-button dismissal on mobile
    useEffect(() => {
        if (isOpen) {
            window.history.pushState({ modal: 'comments' }, '');
            const handlePopState = () => onCloseRef.current();
            window.addEventListener('popstate', handlePopState);
            return () => {
                window.removeEventListener('popstate', handlePopState);
            };
        }
    }, [isOpen]);

    // Focus input and set replying state
    const handleSetReplyingTo = useCallback((comment: AppComment | null) => {
        setReplyingTo(comment);
        // Close any open emoji picker
        setShowEmojiPickerFor(null);
        if (comment) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, []);

    if (!isOpen) return null;

    // ── Touch handlers ────────────────────────────────────────────────────────
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
        const diff = e.targetTouches[0].clientY - touchStart;
        if (diff > 0) setTouchTranslate(diff);
    };

    const handleTouchEnd = () => {
        if (touchTranslate > 100) onClose();
        setTouchStart(null);
        setTouchTranslate(0);
    };

    // ── Submit comment ────────────────────────────────────────────────────────
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

        setDisplayComments((prev) => [...prev, optimisticComment]);
        setCommentText('');
        setReplyingTo(null);
        setLoading(true);

        try {
            await onSubmit(originalText, currentReplyToId);
        } catch (error) {
            console.error('Error adding comment:', error);
            setDisplayComments((prev) => prev.filter((c) => c !== optimisticComment));
            setCommentText(originalText);
        } finally {
            setLoading(false);
        }
    };

    // ── Delete comment ────────────────────────────────────────────────────────
    const handleDelete = async (comment: AppComment) => {
        if (!onDelete) return;
        const previousComments = [...displayComments];
        setDisplayComments((prev) => prev.filter((c) => c !== comment));
        try {
            await onDelete(comment);
        } catch {
            setDisplayComments(previousComments);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <Portal>
            <div
                className="fixed inset-0 bg-brand-ebony/70 dark:bg-black/80 backdrop-blur-md flex items-start sm:items-center justify-center z-[200] sm:p-4"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <div
                    className={`bg-white dark:bg-brand-parchment/10 sm:rounded-[2.5rem] max-w-2xl w-full h-full sm:h-auto sm:max-h-[85vh] flex flex-col border border-brand-ebony/5 shadow-2xl overflow-hidden ${
                        touchTranslate > 0 ? '' : 'transition-transform duration-300'
                    } slide-up-animation`}
                    style={{ transform: `translateY(${touchTranslate}px)` }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* ── Header ── */}
                    <div className="flex items-center justify-between p-8 border-b border-brand-ebony/5 bg-white/50 dark:bg-brand-parchment/5 backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-indigo rounded-2xl flex items-center justify-center text-white shadow-lg">
                                <MessageCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-serif font-extrabold text-brand-ebony flex items-center gap-2">
                                    Dialogue
                                    <Sparkles className="w-4 h-4 text-brand-gold" />
                                </h2>
                                <p className="text-[10px] font-extrabold text-brand-ebony/30 uppercase tracking-[0.2em] mt-1">
                                    Shared perspectives • Insights
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-3 hover:bg-brand-ebony/5 text-brand-ebony/30 rounded-full transition-all"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* ── Comments List ── */}
                    <div
                        id="comments-scroll-container"
                        className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide"
                    >
                        {displayComments.length > 0 ? (
                            displayComments
                                .filter((c) => !c.replyToId)
                                .map((parentComment) => (
                                    <div key={parentComment.id} className="space-y-6">
                                        <CommentItem
                                            comment={parentComment}
                                            isReply={false}
                                            onReply={() => handleSetReplyingTo(parentComment)}
                                            onReact={(emoji) => onReact?.(parentComment, emoji)}
                                            onDelete={() => handleDelete(parentComment)}
                                            currentUserUid={currentUserUid}
                                            showEmojiPicker={showEmojiPickerFor === parentComment.id}
                                            setShowEmojiPicker={(show) =>
                                                setShowEmojiPickerFor(show ? (parentComment.id ?? null) : null)
                                            }
                                        />

                                        {displayComments
                                            .filter((c) => c.replyToId === parentComment.id)
                                            .map((reply) => (
                                                <div key={reply.id} className="ml-14">
                                                    <CommentItem
                                                        comment={reply}
                                                        isReply={true}
                                                        onReply={() => handleSetReplyingTo(parentComment)}
                                                        onReact={(emoji) => onReact?.(reply, emoji)}
                                                        onDelete={() => handleDelete(reply)}
                                                        currentUserUid={currentUserUid}
                                                        showEmojiPicker={showEmojiPickerFor === reply.id}
                                                        setShowEmojiPicker={(show) =>
                                                            setShowEmojiPickerFor(show ? (reply.id ?? null) : null)
                                                        }
                                                    />
                                                </div>
                                            ))}
                                    </div>
                                ))
                        ) : (
                            <div className="text-center py-20 flex flex-col items-center justify-center">
                                <div className="w-20 h-20 bg-brand-ebony/5 rounded-[2rem] flex items-center justify-center mb-6 text-brand-ebony/10">
                                    <Hash className="w-10 h-10" />
                                </div>
                                <p className="text-lg font-serif italic text-brand-ebony/40 mb-2">
                                    The conversation begins with you.
                                </p>
                                <p className="text-[10px] font-extrabold uppercase tracking-widest text-brand-ebony/20">
                                    Be the first to share an insight
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ── Input Footer ── */}
                    <div className="p-8 border-t border-brand-ebony/5 bg-white/50 dark:bg-brand-parchment/10 backdrop-blur-3xl">
                        {replyingTo && (
                            <div className="mb-4 px-5 py-3 bg-indigo-500/5 flex items-center justify-between rounded-xl border border-indigo-500/10 animate-in slide-in-from-bottom-2">
                                <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                    <Reply className="w-3 h-3" /> Responding to {replyingTo.authorName}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => handleSetReplyingTo(null)}
                                    className="text-[9px] font-extrabold text-indigo-600/40 hover:text-indigo-600 uppercase"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <input
                                ref={inputRef}
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                placeholder={
                                    replyingTo
                                        ? `Reply to ${replyingTo.authorName}...`
                                        : 'Express your perspective...'
                                }
                                className="flex-1 px-6 py-4 bg-brand-ebony/5 border border-brand-ebony/5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold text-sm text-brand-ebony placeholder:text-brand-ebony/25 shadow-inner"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={!commentText.trim() || loading || !currentUserUid}
                                className="w-14 h-14 bg-gradient-indigo text-white rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-30 flex items-center justify-center"
                            >
                                {loading ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <Send className="w-6 h-6" />
                                )}
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2.5 mt-5 px-1">
                            {['❤️', '👏', '🔥', '💯', '✨', '🙌'].map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setCommentText((prev) => prev + emoji)}
                                    className="w-10 h-10 flex items-center justify-center hover:bg-brand-ebony/5 rounded-xl transition-all hover:scale-125 hover:-translate-y-1"
                                >
                                    <span className="text-xl">{emoji}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Portal>
    );
};
