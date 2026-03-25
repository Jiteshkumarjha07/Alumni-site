'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post, Comment as AppComment } from '@/types';
import { PostCard } from '@/components/feed/PostCard';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { SharePostModal } from '@/components/modals/SharePostModal';
import { CommentModal } from '@/components/modals/CommentModal';

export default function PostDetailPage() {
    const { userData, loading: authLoading } = useAuth();
    const params = useParams();
    const postId = params.postId as string;
    const router = useRouter();

    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [sharingPost, setSharingPost] = useState<Post | null>(null);
    const [isCommenting, setIsCommenting] = useState(false);

    useEffect(() => {
        if (!authLoading && !userData) {
            router.push('/login');
            return;
        }

        if (!postId || !userData) return;

        const unsubscribe = onSnapshot(doc(db, 'posts', postId), (doc) => {
            if (doc.exists()) {
                setPost({ id: doc.id, ...doc.data() } as Post);
            } else {
                setPost(null);
            }
            setLoading(false);
        }, (error) => {
            console.error('Error fetching post:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [postId, userData, authLoading, router]);

    const handleLike = async (isLiked: boolean) => {
        if (!userData || !post) return;
        const postRef = doc(db, 'posts', post.id);
        await updateDoc(postRef, {
            likes: isLiked ? arrayRemove(userData.uid) : arrayUnion(userData.uid)
        });
    };

    const handleAddComment = async (text: string, replyToId?: string) => {
        if (!userData || !post) return;
        const postRef = doc(db, 'posts', post.id);
        const newComment: AppComment = {
            id: Math.random().toString(36).substr(2, 9),
            authorUid: userData.uid,
            authorName: userData.name,
            text,
            createdAt: new Date(),
            replyToId: replyToId || null,
            reactions: {}
        };
        await updateDoc(postRef, {
            comments: arrayUnion(newComment)
        });
    };

    const handleReactComment = async (comment: AppComment, emoji: string) => {
        if (!userData || !post) return;
        const postRef = doc(db, 'posts', post.id);
        
        const updatedComments = (post.comments || []).map(c => {
            const isMatch = c.id ? c.id === comment.id : (c.text === comment.text && c.authorUid === comment.authorUid);
            if (isMatch) {
                const reactions = { ...(c.reactions || {}) };
                const uids = [...(reactions[emoji] || [])];
                if (uids.includes(userData.uid)) {
                    reactions[emoji] = uids.filter(id => id !== userData.uid);
                    if (reactions[emoji].length === 0) delete reactions[emoji];
                } else {
                    reactions[emoji] = [...uids, userData.uid];
                }
                return { ...c, reactions };
            }
            return c;
        });

        await updateDoc(postRef, {
            comments: updatedComments
        });
    };

    const handleDeleteComment = async (comment: AppComment) => {
        if (!userData || !post) return;
        const postRef = doc(db, 'posts', post.id);
        await updateDoc(postRef, {
            comments: arrayRemove(comment)
        });
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-12 h-12 animate-spin text-brand-burgundy" />
            </div>
        );
    }

    if (!post) {
        return (
            <div className="max-w-2xl mx-auto pt-20 px-4 text-center">
                <h1 className="text-2xl font-serif font-bold text-brand-ebony mb-4">Post not found</h1>
                <p className="text-brand-ebony/60 mb-8">The post you&apos;re looking for might have been deleted or moved.</p>
                <button
                    onClick={() => router.push('/')}
                    className="text-brand-burgundy font-bold hover:underline"
                >
                    Return to Feed
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto pt-8 px-4 pb-20">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-brand-ebony/60 hover:text-brand-burgundy transition-colors mb-6 font-medium"
            >
                <ArrowLeft className="w-4 h-4" />
                Back
            </button>

            <h1 className="text-2xl font-serif font-bold text-brand-ebony mb-8">Post Details</h1>

            <PostCard
                post={post}
                currentUser={userData!}
                onLike={handleLike}
                onComment={() => setIsCommenting(true)}
                onShare={() => setSharingPost(post)}
            />

            {isCommenting && (
                <CommentModal
                    isOpen={true}
                    onClose={() => setIsCommenting(false)}
                    onSubmit={handleAddComment}
                    onDelete={handleDeleteComment}
                    onReact={handleReactComment}
                    comments={post.comments || []}
                    postAuthor={post.authorName}
                    currentUserUid={userData!.uid}
                    currentUserName={userData!.name}
                />
            )}

            {sharingPost && (
                <SharePostModal
                    isOpen={!!sharingPost}
                    onClose={() => setSharingPost(null)}
                    post={sharingPost}
                    currentUser={userData!}
                />
            )}
        </div>
    );
}
