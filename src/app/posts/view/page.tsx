'use client';

import { Suspense, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post, Comment as AppComment } from '@/types';
import { PostCard } from '@/components/feed/PostCard';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SharePostModal } from '@/components/modals/SharePostModal';
import { CommentModal } from '@/components/modals/CommentModal';

function PostViewClient() {
    const { userData, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const postId = searchParams.get('id');
    const action = searchParams.get('action');

    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [sharingPost, setSharingPost] = useState<Post | null>(null);
    const [isCommenting, setIsCommenting] = useState(false);
    const [isHighlighted, setIsHighlighted] = useState(false);

    useEffect(() => {
        if (!authLoading && !userData) { router.push('/login'); }
    }, [userData, authLoading, router]);

    useEffect(() => {
        if (!postId || !userData) return;
        const unsubscribe = onSnapshot(doc(db, 'posts', postId), (snap) => {
            setPost(snap.exists() ? { id: snap.id, ...snap.data() } as Post : null);
            setLoading(false);
        }, () => setLoading(false));
        return () => unsubscribe();
    }, [postId, userData]);

    useEffect(() => {
        if (!loading && post && action === 'comment') { setIsCommenting(true); setIsHighlighted(true); }
        else if (!loading && post && action === 'view') { setIsHighlighted(true); }
        if (isHighlighted) { const t = setTimeout(() => setIsHighlighted(false), 3000); return () => clearTimeout(t); }
    }, [loading, post, action]);

    const handleLike = async (isLiked: boolean) => {
        if (!userData || !post) return;
        await updateDoc(doc(db, 'posts', post.id), {
            likes: isLiked ? arrayRemove(userData.uid) : arrayUnion(userData.uid)
        });
    };

    const handleAddComment = async (text: string, replyToId?: string) => {
        if (!userData || !post) return;
        const newComment: AppComment = {
            id: Math.random().toString(36).substr(2, 9),
            authorUid: userData.uid,
            authorName: userData.name,
            text, createdAt: new Date(), reactions: {},
            ...(replyToId ? { replyToId } : {})
        };
        await updateDoc(doc(db, 'posts', post.id), { comments: arrayUnion(newComment) });
    };

    const handleReactComment = async (comment: AppComment, emoji: string) => {
        if (!userData || !post) return;
        const updatedComments = (post.comments || []).map(c => {
            const isMatch = c.id ? c.id === comment.id : (c.text === comment.text && c.authorUid === comment.authorUid);
            if (isMatch) {
                const reactions = { ...(c.reactions || {}) };
                const hasReacted = reactions[emoji]?.includes(userData.uid);
                Object.keys(reactions).forEach(k => {
                    reactions[k] = (reactions[k] || []).filter(id => id !== userData.uid);
                    if (!reactions[k].length) delete reactions[k];
                });
                if (!hasReacted) reactions[emoji] = [...(reactions[emoji] || []), userData.uid];
                return { ...c, reactions };
            }
            return c;
        });
        await updateDoc(doc(db, 'posts', post.id), { comments: updatedComments });
    };

    const handleDeleteComment = async (comment: AppComment) => {
        if (!userData || !post) return;
        await updateDoc(doc(db, 'posts', post.id), { comments: arrayRemove(comment) });
    };

    if (authLoading || loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-12 h-12 animate-spin text-brand-burgundy" />
        </div>
    );

    if (!post) return (
        <div className="max-w-2xl mx-auto pt-20 px-4 text-center">
            <h1 className="text-2xl font-serif font-bold text-brand-ebony mb-4">Post not found</h1>
            <p className="text-brand-ebony/60 mb-8">This post may have been deleted or moved.</p>
            <button onClick={() => router.push('/')} className="text-brand-burgundy font-bold hover:underline">Return to Feed</button>
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto pt-8 px-4">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-brand-ebony/60 hover:text-brand-burgundy transition-colors mb-6 font-medium">
                <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="text-2xl font-serif font-bold text-brand-ebony mb-8">Post Details</h1>
            <PostCard
                post={post} currentUser={userData!}
                onLike={handleLike} onComment={() => setIsCommenting(true)}
                onShare={() => setSharingPost(post)} highlighted={isHighlighted}
            />
            {isCommenting && (
                <CommentModal
                    isOpen onClose={() => setIsCommenting(false)}
                    onSubmit={handleAddComment} onDelete={handleDeleteComment}
                    onReact={handleReactComment} comments={post.comments || []}
                    postAuthor={post.authorName} currentUserUid={userData!.uid} currentUserName={userData!.name}
                />
            )}
            {sharingPost && (
                <SharePostModal isOpen={!!sharingPost} onClose={() => setSharingPost(null)} post={sharingPost} currentUser={userData!} />
            )}
        </div>
    );
}

export default function PostViewPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-12 h-12 animate-spin text-brand-burgundy" /></div>}>
            <PostViewClient />
        </Suspense>
    );
}
