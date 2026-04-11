'use client';

import React, { useState, useEffect } from 'react';
import { Post, User } from '@/types';
import { X, Search, Send, Loader2, CheckCircle2, Share2, Sparkles, Lock } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';

interface SharePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: Post;
    currentUser: User;
}

export function SharePostModal({ isOpen, onClose, post, currentUser }: SharePostModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [connections, setConnections] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [sharingWith, setSharingWith] = useState<string | null>(null);
    const [sharedStatus, setSharedStatus] = useState<{[key: string]: boolean}>({});

    const fetchConnections = React.useCallback(async () => {
        setLoading(true);
        try {
            const usersRef = collection(db, 'users');
            // Simplified fetch for connections
            const q = query(usersRef, where('uid', 'in', currentUser.connections!.slice(0, 10)));
            const snapshot = await getDocs(q);
            const fetchedConnections = snapshot.docs.map(doc => doc.data() as User);
            setConnections(fetchedConnections);
        } catch (error) {
            console.error('Error fetching connections:', error);
        } finally {
            setLoading(false);
        }
    }, [currentUser.connections]);

    useEffect(() => {
        if (isOpen && currentUser.connections && currentUser.connections.length > 0) {
            fetchConnections();
        }
    }, [isOpen, currentUser.connections, fetchConnections]);

    const handleShare = async (targetUser: User) => {
        if (sharingWith) return;
        setSharingWith(targetUser.uid);

        try {
            const combinedId = [currentUser.uid, targetUser.uid].sort().join('_');
            const chatId = combinedId;
            
            // Send the post as a message
            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                text: `Check out this legacy memory by ${post.authorName}`,
                senderId: currentUser.uid,
                senderName: currentUser.name,
                senderProfilePic: currentUser.profilePic || null,
                createdAt: serverTimestamp(),
                isRead: false,
                sharedPostId: post.id,
                sharedPostContent: post.content,
                sharedPostAuthor: post.authorName,
                sharedPostImage: post.imageUrl || null
            });

            // Update chat meta
            await setDoc(doc(db, 'chats', chatId), {
                participants: [currentUser.uid, targetUser.uid],
                lastMessage: `Shared a legacy post by ${post.authorName}`,
                lastMessageAt: serverTimestamp(),
                participantDetails: {
                    [currentUser.uid]: { name: currentUser.name, profilePic: currentUser.profilePic || null },
                    [targetUser.uid]: { name: targetUser.name, profilePic: targetUser.profilePic || null }
                }
            }, { merge: true });

            setSharedStatus(prev => ({ ...prev, [targetUser.uid]: true }));
        } catch (error) {
            console.error('Error sharing post:', error);
        } finally {
            setSharingWith(null);
        }
    };

    if (!isOpen) return null;

    const filteredConnections = connections.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-brand-ebony/60 dark:bg-black/80 backdrop-blur-md">
            <div className="card-premium w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-brand-burgundy/10 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-8 border-b border-brand-ebony/5 flex items-center justify-between bg-white/50 dark:bg-brand-parchment/10 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-indigo rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <Share2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-serif font-extrabold text-brand-ebony flex items-center gap-2">
                                Share Wisdom
                                <Sparkles className="w-4 h-4 text-brand-gold" />
                            </h2>
                            <p className="text-[10px] font-extrabold text-brand-ebony/30 uppercase tracking-[0.2em] mt-1">Distributed across your circle</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-brand-ebony/5 rounded-full transition-all text-brand-ebony/30">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">
                    {/* Search Strip */}
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-ebony/20 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Find a legacy partner..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-brand-ebony/5 border border-brand-ebony/5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-sm text-brand-ebony placeholder:text-brand-ebony/25"
                        />
                    </div>

                    {/* List Area */}
                    <div className="max-h-[350px] overflow-y-auto px-1 space-y-2 scrollbar-hide border-y border-brand-ebony/5 py-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <Loader2 className="w-10 h-10 animate-spin text-indigo-500/20" />
                                <p className="text-xs font-serif italic mt-4 text-brand-ebony/40">Querying your network...</p>
                            </div>
                        ) : filteredConnections.length > 0 ? (
                            filteredConnections.map((connection) => (
                                <div key={connection.uid} className="flex items-center justify-between p-4 hover:bg-white dark:hover:bg-brand-ebony/20 rounded-2xl transition-all border border-transparent hover:border-brand-ebony/5 group">
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-12 h-12 rounded-2xl overflow-hidden border-2 border-white dark:border-brand-parchment shadow-md group-hover:scale-105 transition-transform">
                                            <Image
                                                src={connection.profilePic || `https://placehold.co/100x100/4f46e5/ffffff?text=${connection.name.substring(0, 1)}`}
                                                alt={connection.name}
                                                fill
                                                className="object-cover"
                                                unoptimized
                                            />
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-brand-ebony text-sm">{connection.name}</p>
                                            <p className="text-[10px] text-brand-ebony/30 font-extrabold uppercase tracking-widest mt-0.5">Contributor • Class of {connection.batch}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleShare(connection)}
                                        disabled={sharedStatus[connection.uid] || sharingWith === connection.uid}
                                        className={`px-6 py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 ${
                                            sharedStatus[connection.uid]
                                                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                                                : 'bg-gradient-indigo text-white shadow-indigo-500/20 hover:brightness-110 active:scale-95'
                                        }`}
                                    >
                                        {sharingWith === connection.uid ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : sharedStatus[connection.uid] ? (
                                            <>
                                                <CheckCircle2 className="w-4 h-4" />
                                                Shared
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" />
                                                Relay Wisdom
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-16">
                                <p className="text-sm font-serif italic text-brand-ebony/30">Your legacy spans further in your connections.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer Preview */}
                    <div className="pt-2">
                        <div className="flex items-center gap-4 p-5 bg-brand-burgundy/5 rounded-[2rem] border border-brand-burgundy/10 shadow-inner group/preview">
                            <div className="w-16 h-16 bg-white dark:bg-brand-cream/20 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 relative border border-brand-burgundy/10">
                                {post.imageUrl ? (
                                    <Image 
                                        src={post.imageUrl} 
                                        alt={post.authorName} 
                                        fill 
                                        className="object-cover group-hover/preview:scale-110 transition-transform duration-500" 
                                        unoptimized
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-brand-burgundy/20">
                                        <Share2 className="w-6 h-6" />
                                    </div>
                                )}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[9px] font-extrabold text-brand-burgundy uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5 opacity-60">
                                    <Sparkles className="w-3 h-3" />
                                    Relaying Memory by {post.authorName}
                                </p>
                                <p className="text-xs text-brand-ebony/70 line-clamp-2 font-medium italic font-serif leading-relaxed">"{post.content}"</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 pt-0 flex items-center justify-center">
                   <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/5 rounded-full border border-indigo-500/10">
                        <Lock className="w-3 h-3 text-indigo-500/40" />
                        <span className="text-[9px] font-extrabold text-indigo-500/40 uppercase tracking-widest">Secured Relay Transmission</span>
                   </div>
                </div>
            </div>
        </div>
    );
}
