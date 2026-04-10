'use client';

import { Post, User } from '@/types';
import { Heart, MessageCircle, Share2, MoreHorizontal, Pencil, Trash2, Sparkles, Bookmark } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface PostCardProps {
    post: Post;
    currentUser: User;
    onLike: (isLiked: boolean) => void;
    onComment: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onShare?: () => void;
    highlighted?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
    post,
    currentUser,
    onLike,
    onComment,
    onEdit,
    onDelete,
    onShare,
    highlighted = false,
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const [likeAnimation, setLikeAnimation] = useState(false);
    const [bookmarked, setBookmarked] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const isLiked = post.likes?.includes(currentUser.uid) || false;
    const isOwnPost = post.authorUid === currentUser.uid;
    const likeCount = post.likes?.length ?? 0;
    const commentCount = post.comments?.length ?? 0;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        if (showMenu) document.addEventListener('mousedown', handleClickOutside);
        else document.removeEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    const handleLike = () => {
        setLikeAnimation(true);
        setTimeout(() => setLikeAnimation(false), 600);
        onLike(isLiked);
    };

    const formatTimestamp = (timestamp: unknown) => {
        if (!timestamp) return 'Just now';
        const date = (timestamp as { toDate?: () => Date }).toDate
            ? (timestamp as { toDate: () => Date }).toDate()
            : new Date(timestamp as string | number | Date);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const previewComments = post.comments?.slice(-2) || [];

    return (
        <div
            className={`group relative bg-white/70 dark:bg-brand-parchment/10 backdrop-blur-sm rounded-[1.75rem] border transition-all duration-500 overflow-hidden ${
                highlighted
                    ? 'border-brand-burgundy/40 shadow-[0_0_0_3px_rgba(139,21,56,0.08),0_8px_32px_rgba(139,21,56,0.12)]'
                    : 'border-brand-ebony/6 hover:border-brand-burgundy/20 hover:shadow-[0_8px_40px_rgba(79,70,229,0.12)] hover:-translate-y-0.5'
            }`}
        >
            {/* Animated top gradient line */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-burgundy/40 to-transparent transition-opacity duration-500 ${highlighted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />

            {/* Ambient background glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-transparent to-brand-burgundy/0 group-hover:from-indigo-500/[0.02] group-hover:to-brand-burgundy/[0.02] transition-all duration-700 pointer-events-none rounded-[1.75rem]" />

            <div className="relative p-5 md:p-6">
                {/* ── Header ── */}
                <div className="flex items-start justify-between mb-5">
                    <Link href={`/profile/${post.authorUid}`} className="flex items-center gap-3.5 group/author">
                        <div className="relative shrink-0">
                            <div className="absolute -inset-0.5 bg-gradient-to-br from-brand-burgundy to-indigo-500 rounded-full opacity-0 group-hover/author:opacity-60 transition-opacity duration-300 blur-[2px]" />
                            <img
                                src={post.authorProfilePic || `https://placehold.co/48x48/4f46e5/ffffff?text=${post.authorName.substring(0, 1)}`}
                                alt={post.authorName}
                                className="relative w-11 h-11 rounded-full object-cover ring-2 ring-white dark:ring-brand-ebony shadow-md"
                            />
                            <div className="absolute -bottom-1 -right-1 w-[18px] h-[18px] bg-gradient-to-br from-amber-400 to-brand-gold rounded-full flex items-center justify-center border-2 border-white dark:border-brand-ebony shadow-sm">
                                <Sparkles className="w-2.5 h-2.5 text-white" />
                            </div>
                        </div>
                        <div>
                            <h3 className="font-serif font-bold text-[15px] text-brand-ebony group-hover/author:text-brand-burgundy transition-colors leading-tight">
                                {post.authorName}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[10px] font-extrabold text-brand-ebony/50 uppercase tracking-[0.15em]">
                                    {post.authorProfession || `Batch of ${post.authorBatch}`}
                                </p>
                                <span className="w-1 h-1 rounded-full bg-brand-ebony/20" />
                                <p className="text-[10px] text-brand-ebony/35 font-semibold">
                                    {formatTimestamp(post.createdAt)}
                                </p>
                            </div>
                        </div>
                    </Link>

                    <div className="flex items-center gap-1.5">
                        {/* Bookmark */}
                        <button
                            onClick={() => setBookmarked(b => !b)}
                            className={`p-2 rounded-xl transition-all duration-300 ${bookmarked ? 'text-brand-burgundy bg-brand-burgundy/10' : 'text-brand-ebony/25 hover:text-brand-burgundy hover:bg-brand-burgundy/5'}`}
                        >
                            <Bookmark className={`w-4 h-4 transition-all ${bookmarked ? 'fill-current scale-110' : ''}`} />
                        </button>

                        {isOwnPost && (
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    className="p-2 text-brand-ebony/25 hover:text-brand-ebony hover:bg-brand-parchment dark:hover:bg-white/6 rounded-xl transition-all"
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                                {showMenu && (
                                    <div className="absolute right-0 mt-1.5 w-44 bg-white/95 dark:bg-brand-ebony/95 backdrop-blur-xl rounded-2xl py-1.5 z-20 shadow-2xl border border-brand-ebony/8 animate-in fade-in slide-in-from-top-2 duration-150">
                                        {onEdit && (
                                            <button
                                                onClick={() => { onEdit?.(); setShowMenu(false); }}
                                                className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 text-brand-ebony/70 hover:text-brand-ebony hover:bg-brand-parchment/50 transition-colors"
                                            >
                                                <Pencil className="w-3.5 h-3.5 text-indigo-500" />
                                                Edit Post
                                            </button>
                                        )}
                                        {onDelete && (
                                            <button
                                                onClick={() => { onDelete?.(); setShowMenu(false); }}
                                                className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Delete Post
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Content ── */}
                <p className="text-brand-ebony/85 text-[14.5px] leading-[1.7] whitespace-pre-wrap mb-4 font-sans tracking-tight">
                    {post.content}
                </p>

                {/* ── Image ── */}
                {post.imageUrl && (
                    <div className="rounded-2xl overflow-hidden mb-5 relative group/img shadow-sm hover:shadow-lg transition-all duration-500 -mx-1">
                        <img
                            src={post.imageUrl}
                            alt="Post"
                            className="w-full object-cover group-hover/img:scale-[1.02] transition-transform duration-700 ease-out max-h-[480px]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-500" />
                    </div>
                )}

                {/* ── Comment Previews ── */}
                {previewComments.length > 0 && (
                    <div className="mb-4 space-y-2">
                        {previewComments.map((c, i) => (
                            <div key={i} className="flex items-start gap-2.5 px-4 py-2.5 bg-brand-parchment/40 dark:bg-white/5 rounded-2xl">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-brand-burgundy flex items-center justify-center text-white text-[9px] font-extrabold shrink-0 mt-0.5">
                                    {c.authorName.substring(0, 1)}
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[11px] font-extrabold text-brand-ebony mr-1.5">{c.authorName}</span>
                                    <span className="text-[12px] text-brand-ebony/65">{c.text}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Stats Bar ── */}
                {(likeCount > 0 || commentCount > 0) && (
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            {likeCount > 0 && (
                                <button onClick={handleLike} className="flex items-center gap-1.5 group/stat">
                                    <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-white flex items-center justify-center">
                                        <Heart className="w-2.5 h-2.5 text-white fill-current" />
                                    </div>
                                    <span className="text-[11px] font-bold text-brand-ebony/50 group-hover/stat:text-brand-ebony transition-colors">
                                        {likeCount} {likeCount === 1 ? 'like' : 'likes'}
                                    </span>
                                </button>
                            )}
                        </div>
                        {commentCount > 0 && (
                            <button onClick={onComment} className="text-[11px] font-bold text-brand-ebony/40 hover:text-brand-burgundy transition-colors">
                                {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
                            </button>
                        )}
                    </div>
                )}

                {/* ── Action Bar ── */}
                <div className="flex items-center gap-1 pt-3 border-t border-brand-ebony/5">
                    {/* Like */}
                    <button
                        onClick={handleLike}
                        className={`relative flex flex-1 items-center justify-center gap-2 py-2.5 rounded-2xl text-[11px] font-extrabold uppercase tracking-wider transition-all duration-300 overflow-hidden ${
                            isLiked
                                ? 'text-red-500 bg-red-500/8'
                                : 'text-brand-ebony/40 hover:text-red-500 hover:bg-red-500/6'
                        }`}
                    >
                        {likeAnimation && (
                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                {['❤️', '❤️', '❤️'].map((e, i) => (
                                    <span
                                        key={i}
                                        className="absolute text-sm animate-ping opacity-0"
                                        style={{ animationDelay: `${i * 80}ms`, left: `${30 + i * 20}%` }}
                                    >{e}</span>
                                ))}
                            </span>
                        )}
                        <Heart className={`w-4 h-4 transition-all duration-300 ${isLiked ? 'fill-current' : ''} ${likeAnimation ? 'scale-150' : 'scale-100'}`} />
                        <span>{isLiked ? 'Liked' : 'Like'}</span>
                    </button>

                    {/* Comment */}
                    <button
                        onClick={onComment}
                        className="flex flex-1 items-center justify-center gap-2 py-2.5 rounded-2xl text-[11px] font-extrabold uppercase tracking-wider text-brand-ebony/40 hover:text-indigo-500 hover:bg-indigo-500/6 transition-all duration-300"
                    >
                        <MessageCircle className="w-4 h-4" />
                        <span>Comment</span>
                    </button>

                    {/* Share */}
                    <button
                        onClick={onShare}
                        className="flex flex-1 items-center justify-center gap-2 py-2.5 rounded-2xl text-[11px] font-extrabold uppercase tracking-wider text-brand-ebony/40 hover:text-brand-gold hover:bg-brand-gold/6 transition-all duration-300"
                    >
                        <Share2 className="w-4 h-4" />
                        <span>Share</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
