'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post } from '@/types';
import { PostCard } from '@/components/feed/PostCard';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { SharePostModal } from '@/components/modals/SharePostModal';

export default function PostDetailPage() {
    const { userData, loading: authLoading } = useAuth();
    const params = useParams();
    const postId = params.postId as string;
    const router = useRouter();

    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [sharingPost, setSharingPost] = useState<Post | null>(null);

    useEffect(() => {
        if (!authLoading && !userData) {
            router.push('/login');
            return;
        }

        const fetchPost = async () => {
            if (!postId) return;
            try {
                const postDoc = await getDoc(doc(db, 'posts', postId));
                if (postDoc.exists()) {
                    setPost({ id: postDoc.id, ...postDoc.data() } as Post);
                }
            } catch (error) {
                console.error('Error fetching post:', error);
            } finally {
                setLoading(false);
            }
        };

        if (userData) {
            fetchPost();
        }
    }, [postId, userData, authLoading, router]);

    const handleLike = async (isLiked: boolean) => {
        if (!userData || !post) return;
        const postRef = doc(db, 'posts', post.id);
        await updateDoc(postRef, {
            likes: isLiked ? arrayUnion(userData.uid) : arrayRemove(userData.uid)
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
                <p className="text-brand-ebony/60 mb-8">The post you're looking for might have been deleted or moved.</p>
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
                onComment={() => { /* Comment focus logic could go here */ }}
                onShare={() => setSharingPost(post)}
            />

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
