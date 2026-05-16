'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Trash2, Loader2, Reply, Smile, Sparkles, Hash, MessageCircle, Pencil } from 'lucide-react';
import { EmojiPicker } from '../ui/EmojiPicker';
import { Comment as AppComment } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { Portal } from '../ui/Portal';
import { EmojiRenderer } from '../ui/EmojiRenderer';

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
            <EmojiRenderer key={i} text={part} />
        )
    );
}

const timeAgo = (date: any) => {
  if (!date) return '';
  return formatDistanceToNow(date instanceof Date ? date : date.toDate(), { addSuffix: true });
};

const CommentEditUI = ({ editText, setEditText, onCancel, onSave }: any) => (
  <div className="mt-1 space-y-2">
    <div className="relative group">
      <div className="w-full min-h-[60px] p-3 bg-white/50 border border-violet-100 rounded-lg focus-within:border-violet-300 transition-all relative overflow-hidden">
        <div className="absolute inset-0 p-3 text-xs leading-relaxed whitespace-pre-wrap break-words pointer-events-none select-none overflow-hidden" aria-hidden="true">
          <EmojiRenderer text={editText || ' '} />
        </div>
        <textarea 
          value={editText} 
          onChange={e => setEditText(e.target.value)}
          className="w-full bg-transparent border-none outline-none focus:ring-0 p-0 text-xs leading-relaxed resize-none relative z-10 text-transparent caret-violet-500 overflow-hidden"
                        rows={2}
                      />
                    </div>
                    <div className="absolute right-2 bottom-2 z-20">
                      <EmojiPicker onEmojiSelect={(emoji) => setEditText((prev: string) => prev + emoji)} />
                    </div>
                 </div>
                 <div className="flex justify-end gap-2">
                   <button onClick={onCancel} className="text-[10px] font-bold text-brand-ebony/40 uppercase">Cancel</button>
                   <button onClick={onSave} className="text-[10px] font-bold text-violet-600 uppercase">Save</button>
                 </div>
              </div>
);

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
    onDelete?: () => void;
    onEdit?: (newText: string) => void;
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
    onEdit,
    currentUserUid,
    showEmojiPicker,
    setShowEmojiPicker,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(comment.text);

    const handleSave = () => {
        if (!editText.trim()) return;
        onEdit?.(editText.trim());
        setIsEditing(false);
    };

    return (
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
                    <p className="font-extrabold text-[11px] text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                        {comment.authorName}
                        {comment.isEdited && <span className="text-[8px] text-brand-ebony/20 font-bold uppercase">(Edited)</span>}
                    </p>
                    {currentUserUid === comment.authorUid && (
                        <div className="flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                            {onEdit && (
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="p-1.5 text-brand-ebony/20 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all"
                                >
                                    <Pencil className="w-3 h-3" />
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    type="button"
                                    onClick={onDelete}
                                    className="p-1.5 text-brand-ebony/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {isEditing ? (
                    <CommentEditUI 
                        editText={editText} 
                        setEditText={setEditText} 
                        onCancel={() => setIsEditing(false)} 
                        onSave={handleSave} 
                    />
                ) : (
                    <p className="text-brand-ebony leading-relaxed text-sm font-medium whitespace-pre-wrap flex flex-wrap items-center gap-1">
                        {isReply && comment.replyToAuthor && (
                            <span className="text-indigo-500 font-extrabold">
                                @{comment.replyToAuthor}
                            </span>
                        )}
                        <EmojiRenderer text={comment.text} />
                    </p>
                )}

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
                                <span><EmojiRenderer text={emoji} /></span>
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
                        <div className="absolute left-0 bottom-full mb-3 bg-white dark:bg-brand-cream rounded-2xl shadow-2xl border border-brand-ebony/10 dark:border-white/10 p-2 flex gap-1 z-50 animate-in fade-in zoom-in slide-in-from-bottom-2 duration-200">
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
};

// ── CommentModal ─────────────────────────────────────────────────────────────

interface CommentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (text: string, replyToId?: string, replyToAuthor?: string) => Promise<void>;
    onDelete?: (comment: AppComment) => Promise<void>;
    onEdit?: (comment: AppComment, newText: string) => Promise<void>;
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
    onEdit,
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
    const inputRef = useRef<HTMLTextAreaElement>(null);

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
        if (!commentText.trim() || loading || !currentUserUid) return;
        setLoading(true);
        try {
            await onSubmit(commentText.trim(), replyingTo?.id, replyingTo?.authorName);
            setCommentText('');
            setReplyingTo(null);
        } catch (error) {
            console.error('Error submitting comment:', error);
        } finally {
            setLoading(false);
        }
    };

    // ── Delete comment ────────────────────────────────────────────────────────
    const handleDelete = async (comment: AppComment) => {
        if (!onDelete || !window.confirm('Are you sure you want to delete this comment? This will also delete all replies to it.')) return;
        const previousComments = [...displayComments];
        setDisplayComments((prev) => prev.filter((c) => c.id !== comment.id && c.replyToId !== comment.id));
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
                    className={`bg-white dark:bg-brand-parchment/10 sm:rounded-[2.5rem] max-w-2xl w-full h-[90vh] sm:h-auto sm:max-h-[85vh] mt-auto sm:mt-0 flex flex-col border border-brand-ebony/5 shadow-2xl ${
                        touchTranslate > 0 ? '' : 'transition-transform duration-300'
                    } slide-up-animation rounded-t-[2rem] sm:rounded-t-[2.5rem]`}
                    style={{ transform: `translateY(${touchTranslate}px)` }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* ── Header ── */}
                    <div className="flex items-center justify-between p-6 sm:p-8 border-b border-brand-ebony/5 bg-white/50 dark:bg-brand-parchment/5 backdrop-blur-xl shrink-0">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-indigo rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg">
                                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-serif font-extrabold text-brand-ebony flex items-center gap-2">
                                    Dialogue
                                    <Sparkles className="w-4 h-4 text-brand-gold" />
                                </h2>
                                <p className="text-[9px] sm:text-[10px] font-extrabold text-brand-ebony/30 uppercase tracking-[0.2em] mt-0.5 sm:mt-1">
                                    Shared perspectives • Insights
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 sm:p-3 hover:bg-brand-ebony/5 text-brand-ebony/30 rounded-full transition-all"
                        >
                            <X className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>

                    {/* ── Comments List ── */}
                    <div
                        id="comments-scroll-container"
                        className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 sm:space-y-8 scrollbar-hide"
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
                                            onEdit={(newText) => onEdit?.(parentComment, newText)}
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
                                                        onEdit={(newText) => onEdit?.(reply, newText)}
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
                    <div className="p-4 sm:p-8 border-t border-brand-ebony/5 bg-white/50 dark:bg-brand-parchment/10 backdrop-blur-3xl shrink-0 pb-safe">
                        {replyingTo && (
                            <div className="mb-3 px-4 py-2 bg-indigo-500/5 flex items-center justify-between rounded-xl border border-indigo-500/10 animate-in slide-in-from-bottom-2">
                                <p className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                    <Reply className="w-2.5 h-2.5" /> Responding to {replyingTo.authorName}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => handleSetReplyingTo(null)}
                                    className="text-[8px] font-extrabold text-indigo-600/40 hover:text-indigo-600 uppercase"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                        <div className="flex gap-2 sm:gap-4 relative w-full items-end">
                            <div className="flex-1 relative group">
                                <div className="w-full px-4 sm:px-6 py-3 sm:py-4 pr-10 sm:pr-12 bg-brand-ebony/5 border border-brand-ebony/5 rounded-2xl focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all relative overflow-hidden shadow-inner min-h-[48px] sm:min-h-[54px] flex items-center">
                                    {/* Mirroring Layer */}
                                    <div 
                                        className="absolute inset-0 px-4 sm:px-6 py-3 sm:py-4 pr-10 sm:pr-12 text-sm font-bold leading-normal whitespace-pre-wrap break-words pointer-events-none select-none overflow-hidden flex items-center"
                                        aria-hidden="true"
                                    >
                                        <EmojiRenderer text={commentText || ' '} />
                                        {!commentText && <span className="text-brand-ebony/25 text-xs sm:text-sm">{replyingTo ? `Reply to ${replyingTo.authorName}...` : 'Express your perspective...'}</span>}
                                    </div>

                                    <textarea
                                        ref={inputRef}
                                        value={commentText}
                                        onChange={(e) => {
                                            setCommentText(e.target.value);
                                            e.target.style.height = 'auto';
                                            e.target.style.height = `${e.target.scrollHeight}px`;
                                        }}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
                                        className="w-full bg-transparent border-none outline-none focus:ring-0 p-0 text-sm font-bold leading-normal relative z-10 text-transparent caret-indigo-500 resize-none overflow-hidden"
                                        style={{ minHeight: '20px' }}
                                        disabled={loading}
                                        rows={1}
                                    />
                                </div>
                                <div className="absolute right-3 sm:right-4 bottom-2.5 sm:bottom-4 z-20">
                                    <EmojiPicker onEmojiSelect={(emoji) => setCommentText(prev => prev + emoji)} />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={!commentText.trim() || loading || !currentUserUid}
                                className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-indigo text-white rounded-xl sm:rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-30 flex items-center justify-center shrink-0 mb-0.5"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5 sm:w-6 sm:h-6" />
                                )}
                            </button>
                        </div>

                        {/* Removed static emoji bar as picker is now integrated */}
                    </div>
                </div>
            </div>
        </Portal>
    );
};
