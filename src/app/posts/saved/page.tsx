'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post } from '@/types';
import { PostCard } from '@/components/feed/PostCard';
import { Bookmark, ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SavedPostsPage() {
    const { userData, loading: authLoading } = useAuth();
    const router = useRouter();
    const [savedPosts, setSavedPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !userData) {
            router.push('/login');
        }
    }, [userData, authLoading, router]);

    useEffect(() => {
        if (!userData || !userData.savedPosts || userData.savedPosts.length === 0) {
            setLoading(false);
            setSavedPosts([]);
            return;
        }

        const fetchSavedPosts = async () => {
            setLoading(true);
            try {
                // Firestore 'in' query supports up to 30 items at once
                const savedIds = userData.savedPosts!.slice(0, 30);
                const q = query(
                    collection(db, 'posts'),
                    where('__name__', 'in', savedIds)
                );
                const snapshot = await getDocs(q);
                const posts = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Post[];
                // Sort by saved order (reverse of savedPosts array — most recently saved first)
                const orderedPosts = savedIds
                    .map(id => posts.find(p => p.id === id))
                    .filter(Boolean) as Post[];
                setSavedPosts(orderedPosts.reverse());
            } catch (err) {
                console.error('Error fetching saved posts:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSavedPosts();
    }, [userData?.savedPosts]);

    if (authLoading || loading) {
        return (
            <div className="max-w-3xl mx-auto px-4 md:px-8 pt-8 pb-12 space-y-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white/60 dark:bg-brand-parchment/10 rounded-[1.75rem] border border-brand-ebony/5 p-6 animate-pulse">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-11 h-11 rounded-full bg-brand-parchment/60" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3.5 bg-brand-parchment/60 rounded-full w-1/3" />
                                <div className="h-2.5 bg-brand-parchment/40 rounded-full w-1/4" />
                            </div>
                        </div>
                        <div className="space-y-2 mb-4">
                            <div className="h-3 bg-brand-parchment/50 rounded-full w-full" />
                            <div className="h-3 bg-brand-parchment/50 rounded-full w-5/6" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!userData) return null;

    return (
        <div className="max-w-3xl mx-auto px-4 md:px-8 pt-8 pb-12 animate-fade-up">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/settings"
                    className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-brand-ebony/60 hover:text-brand-ebony border border-brand-ebony/5 card-premium backdrop-blur-md"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-brand-burgundy to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <Bookmark className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-brand-ebony flex items-center gap-2">
                            Saved Posts
                            <Sparkles className="w-5 h-5 text-brand-gold animate-pulse" />
                        </h1>
                        <p className="text-xs text-brand-ebony/40 font-medium mt-0.5">
                            {savedPosts.length} saved {savedPosts.length === 1 ? 'post' : 'posts'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Posts */}
            {savedPosts.length > 0 ? (
                <div className="space-y-5">
                    {savedPosts.map((post) => (
                        <PostCard
                            key={post.id}
                            post={post}
                            currentUser={userData}
                            onLike={() => {}}
                            onComment={() => {}}
                        />
                    ))}
                </div>
            ) : (
                <div className="relative overflow-hidden rounded-[2rem] border-2 border-dashed border-brand-burgundy/15 bg-white/50 dark:bg-brand-parchment/5 p-16 text-center animate-in fade-in duration-700">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-burgundy/3 to-indigo-500/3 dark:from-brand-burgundy/5 dark:to-indigo-500/5" />
                    <div className="relative">
                        <div className="w-20 h-20 bg-gradient-to-br from-brand-burgundy/10 to-indigo-500/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <Bookmark className="w-9 h-9 text-brand-burgundy/40" />
                        </div>
                        <h3 className="text-2xl font-serif font-bold text-brand-ebony mb-2">No saved posts yet</h3>
                        <p className="text-brand-ebony/40 text-sm mb-8 max-w-xs mx-auto leading-relaxed">
                            Tap the bookmark icon on any post to save it here for later.
                        </p>
                        <Link
                            href="/"
                            className="px-8 py-3 bg-brand-burgundy text-white rounded-2xl font-bold hover:brightness-110 transition-all text-sm tracking-wide shadow-lg shadow-brand-burgundy/20"
                        >
                            Browse the Feed
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
