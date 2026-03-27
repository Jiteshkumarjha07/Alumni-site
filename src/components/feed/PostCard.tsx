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
}

export const PostCard: React.FC<PostCardProps> = ({
    post,
    currentUser,
    onLike,
    onComment,
    onEdit,
    onDelete,
    onShare,
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const isLiked = post.likes?.includes(currentUser.uid) || false;
    const isOwnPost = post.authorUid === currentUser.uid;

    // Handle outside click to close menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    const formatTimestamp = (timestamp: unknown) => {
        if (!timestamp) return 'Just now';
        const date = (timestamp as { toDate?: () => Date }).toDate ? (timestamp as { toDate: () => Date }).toDate() : new Date(timestamp as string | number | Date);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInMins = Math.floor(diffInMs / 60000);
        const diffInHours = Math.floor(diffInMs / 3600000);
        const diffInDays = Math.floor(diffInMs / 86400000);

        if (diffInMins < 1) return 'Just now';
        if (diffInMins < 60) return `${diffInMins}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays < 7) return `${diffInDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="bg-brand-parchment/60 rounded-2xl shadow-sm border border-brand-ebony/10 p-5 transition-all hover:shadow-md backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <Link href={`/profile/${post.authorUid}`} className="flex items-center gap-3 hover:opacity-80 transition cursor-pointer group">
                    <img
                        src={post.authorProfilePic || `https://placehold.co/40x40/EFEFEFF/003366?text=${post.authorName.substring(0, 1)}`}
                        alt={post.authorName}
                        className="w-10 h-10 rounded-full"
                    />
                    <div className="flex flex-col">
                        <h3 className="font-serif font-bold text-lg text-brand-ebony leading-none mb-1 group-hover:text-brand-burgundy transition-colors">{post.authorName}</h3>
                        <p className="text-xs font-medium text-brand-ebony/50 uppercase tracking-widest">
                            Class of {post.authorBatch} • {formatTimestamp(post.createdAt)}
                        </p>
                    </div>
                </Link>

                {isOwnPost && (
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 hover:bg-brand-ebony/5 rounded-full transition"
                        >
                            <MoreHorizontal className="w-5 h-5 text-brand-ebony/60" />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-brand-parchment rounded-lg shadow-lg border border-brand-ebony/10 py-1 z-10">
                                {onEdit && (
                                    <button
                                        onClick={() => {
                                            onEdit();
                                            setShowMenu(false);
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-brand-ebony/5 flex items-center gap-2 text-brand-ebony"
                                    >
                                        <Pencil className="w-4 h-4" />
                                        Edit Post
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={() => {
                                            onDelete();
                                            setShowMenu(false);
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-brand-ebony/5 flex items-center gap-2 text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete Post
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Content */}
            <p className="text-brand-ebony mb-3 whitespace-pre-wrap font-sans">{post.content}</p>

            {/* Image */}
            {post.imageUrl && (
                <img
                    src={post.imageUrl}
                    alt="Post"
                    className="w-full rounded-lg mb-3"
                />
            )}


            {/* Actions */}
            <div className="flex items-center gap-3 pt-3 border-t border-brand-ebony/10">
                <button
                    onClick={() => onLike(isLiked)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition ${isLiked
                        ? 'text-brand-burgundy bg-brand-burgundy/10 font-bold'
                        : 'text-brand-ebony/60 hover:bg-brand-burgundy/5 hover:text-brand-burgundy font-semibold text-sm'
                        }`}
                >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                    <span className="whitespace-nowrap tracking-tight">{isLiked ? 'Liked' : 'Like'} <span className="text-[10px] opacity-70 ml-0.5">{post.likes?.length || 0}</span></span>
                </button>

                <button
                    onClick={onComment}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-brand-ebony/60 hover:bg-brand-burgundy/5 hover:text-brand-burgundy transition font-semibold text-sm"
                >
                    <MessageCircle className="w-4 h-4" />
                    <span className="whitespace-nowrap tracking-tight">Comment <span className="text-[10px] opacity-70 ml-0.5">{post.comments?.length || 0}</span></span>
                </button>

                <button
                    onClick={onShare}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-brand-ebony/60 hover:bg-brand-burgundy/5 hover:text-brand-burgundy transition font-semibold text-sm"
                >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                </button>
            </div>
        </div>
    );
};
