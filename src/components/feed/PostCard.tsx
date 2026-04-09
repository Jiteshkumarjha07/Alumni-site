'use client';

import { Post, User } from '@/types';
import { Heart, MessageCircle, Share2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
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
    const menuRef = useRef<HTMLDivElement>(null);
    const isLiked = post.likes?.includes(currentUser.uid) || false;
    const isOwnPost = post.authorUid === currentUser.uid;

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
        setTimeout(() => setLikeAnimation(false), 400);
        onLike(isLiked);
    };

    const formatTimestamp = (timestamp: unknown) => {
        if (!timestamp) return 'Just now';
        const date = (timestamp as { toDate?: () => Date }).toDate
            ? (timestamp as { toDate: () => Date }).toDate()
            : new Date(timestamp as string | number | Date);
        const now = new Date();
        const diffMs   = now.getTime() - date.getTime();
        const diffMins  = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays  = Math.floor(diffMs / 86400000);
        if (diffMins < 1)  return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7)  return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div
            className={`card-premium transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden ${
                highlighted
                    ? 'ring-2 ring-brand-burgundy/40 animate-pulse-subtle'
                    : 'hover:shadow-[0_8px_30px_rgba(79,70,229,0.10)]'
            }`}
        >
            {/* Highlighted left bar */}
            {highlighted && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-burgundy to-transparent rounded-l-2xl" />
            )}

            {/* Subtle top gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-burgundy/20 to-transparent" />

            <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <Link href={`/profile/${post.authorUid}`} className="flex items-center gap-3 group">
                        <div className="relative">
                            <img
                                src={post.authorProfilePic || `https://placehold.co/40x40/4f46e5/ffffff?text=${post.authorName.substring(0, 1)}`}
                                alt={post.authorName}
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-brand-parchment shadow-sm group-hover:ring-brand-burgundy/50 transition-all duration-200"
                            />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm text-brand-ebony group-hover:text-brand-burgundy transition-colors leading-tight">
                                {post.authorName}
                            </h3>
                            <p className="text-[11px] text-brand-ebony/45 font-medium mt-0.5 flex items-center gap-1">
                                <span className="uppercase tracking-wider">Batch {post.authorBatch}</span>
                                <span className="text-brand-gold">·</span>
                                <span>{formatTimestamp(post.createdAt)}</span>
                            </p>
                        </div>
                    </Link>

                    {isOwnPost && (
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-1.5 text-brand-ebony/30 hover:text-brand-ebony/60 hover:bg-brand-parchment dark:hover:bg-white/6 rounded-lg transition-all"
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {showMenu && (
                                <div className="absolute right-0 mt-1.5 w-44 card-premium py-1.5 z-20 shadow-xl animate-fade-up">
                                    {onEdit && (
                                        <button
                                            onClick={() => { onEdit?.(); setShowMenu(false); }}
                                            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2.5 text-brand-ebony/70 hover:text-brand-ebony hover:bg-brand-parchment dark:hover:bg-white/6 transition-colors"
                                        >
                                            <Pencil className="w-3.5 h-3.5 text-brand-burgundy" />
                                            Edit Post
                                        </button>
                                    )}
                                    {onDelete && (
                                        <button
                                            onClick={() => { onDelete?.(); setShowMenu(false); }}
                                            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
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

                {/* Content */}
                <p className="text-brand-ebony/85 text-sm leading-relaxed whitespace-pre-wrap mb-3 font-sans">
                    {post.content}
                </p>

                {/* Image */}
                {post.imageUrl && (
                    <div className="rounded-xl overflow-hidden mb-4 border border-brand-ebony/8">
                        <img
                            src={post.imageUrl}
                            alt="Post"
                            className="w-full object-cover hover:scale-[1.01] transition-transform duration-300"
                        />
                    </div>
                )}

                {/* Stats row */}
                {((post.likes?.length ?? 0) > 0 || (post.comments?.length ?? 0) > 0) && (
                    <div className="flex items-center gap-3 mb-3 text-[11px] text-brand-ebony/40 font-medium">
                        {(post.likes?.length ?? 0) > 0 && (
                            <span className="flex items-center gap-1">
                                <span className="text-red-500">♥</span>
                                {post.likes?.length} {post.likes?.length === 1 ? 'like' : 'likes'}
                            </span>
                        )}
                        {(post.likes?.length ?? 0) > 0 && (post.comments?.length ?? 0) > 0 && <span>·</span>}
                        {(post.comments?.length ?? 0) > 0 && (
                            <span>{(post.comments?.length ?? 0)} {(post.comments?.length ?? 0) === 1 ? 'comment' : 'comments'}</span>
                        )}
                    </div>
                )}

                {/* Action bar */}
                <div className="flex items-center gap-1 pt-3 border-t border-brand-ebony/6">
                    {/* Like */}
                    <button
                        onClick={handleLike}
                        className={`flex flex-1 items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                            isLiked
                                ? 'text-red-500 bg-red-50 dark:bg-red-500/10'
                                : 'text-brand-ebony/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                        }`}
                    >
                        <Heart
                            className={`w-4 h-4 transition-all duration-200 ${isLiked ? 'fill-current' : ''} ${likeAnimation ? 'scale-125' : 'scale-100'}`}
                        />
                        <span>{isLiked ? 'Liked' : 'Like'}</span>
                    </button>

                    {/* Comment */}
                    <button
                        onClick={onComment}
                        className="flex flex-1 items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-brand-ebony/50 hover:text-brand-burgundy hover:bg-brand-burgundy/8 transition-all duration-200"
                    >
                        <MessageCircle className="w-4 h-4" />
                        <span>Comment</span>
                    </button>

                    {/* Share */}
                    <button
                        onClick={onShare}
                        className="flex flex-1 items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-brand-ebony/50 hover:text-brand-gold hover:bg-brand-gold/8 transition-all duration-200"
                    >
                        <Share2 className="w-4 h-4" />
                        <span>Share</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
