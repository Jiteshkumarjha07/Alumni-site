'use client';

import React, { useState, useEffect } from 'react';
import { Post, User } from '@/types';
import { X, Search, Send, Loader2, CheckCircle2, Share2, Sparkles, Lock } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { Portal } from '@/components/ui/Portal';

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
        if (!currentUser.connections || currentUser.connections.length === 0) {
            setConnections([]);
            return;
        }
        setLoading(true);
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('uid', 'in', currentUser.connections.slice(0, 10)));
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
        if (isOpen) {
            fetchConnections();
        }
    }, [isOpen, fetchConnections]);

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
        <Portal>
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-brand-ebony/60 dark:bg-black/80 backdrop-blur-md">
            <div className="card-premium w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-brand-burgundy/10 animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 flex flex-col max-h-[92vh] sm:max-h-[85vh] rounded-t-[2rem] sm:rounded-[1.5rem] overflow-hidden">
                <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-5 sm:p-8 border-b border-brand-ebony/5 dark:border-white/5 flex items-center justify-between bg-white/50 dark:bg-gray-900/80 backdrop-blur-xl flex-shrink-0">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-indigo rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-serif font-extrabold text-brand-ebony flex items-center gap-2">
                                Share Wisdom
                                <Sparkles className="w-4 h-4 text-brand-gold" />
                            </h2>
                            <p className="text-[10px] font-extrabold text-brand-ebony/30 uppercase tracking-[0.2em] mt-1">Distributed across your circle</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 sm:p-3 hover:bg-brand-ebony/5 dark:hover:bg-white/5 rounded-full transition-all text-brand-ebony/40">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body — scrollable */}
                <div className="p-5 sm:p-8 space-y-5 sm:space-y-6 overflow-y-auto flex-1 scrollbar-hide">
                    {/* Search Strip */}
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-ebony/20 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Find a legacy partner..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-6 py-3.5 bg-brand-ebony/5 dark:bg-white/5 border border-brand-ebony/5 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-sm text-brand-ebony placeholder:text-brand-ebony/25"
                        />
                    </div>

                    {/* List Area */}
                    <div className="max-h-[240px] sm:max-h-[300px] overflow-y-auto px-1 space-y-2 scrollbar-hide border-y border-brand-ebony/5 dark:border-white/5 py-3 sm:py-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 sm:py-16">
                                <Loader2 className="w-10 h-10 animate-spin text-indigo-500/20" />
                                <p className="text-xs font-serif italic mt-4 text-brand-ebony/40">Querying your network...</p>
                            </div>
                        ) : filteredConnections.length > 0 ? (
                            filteredConnections.map((connection) => (
                                <div key={connection.uid} className="flex items-center justify-between p-3 sm:p-4 hover:bg-white dark:hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-brand-ebony/5 dark:hover:border-white/10 group">
                                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                        <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-2xl overflow-hidden border-2 border-white dark:border-white/10 shadow-md group-hover:scale-105 transition-transform shrink-0">
                                            <Image
                                                src={connection.profilePic || `https://placehold.co/100x100/4f46e5/ffffff?text=${connection.name.substring(0, 1)}`}
                                                alt={connection.name}
                                                fill
                                                className="object-cover"
                                                unoptimized
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-extrabold text-brand-ebony text-sm truncate">{connection.name}</p>
                                            <p className="text-[10px] text-brand-ebony/40 font-extrabold uppercase tracking-widest mt-0.5 truncate">Contributor • Class of {connection.batch}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleShare(connection)}
                                        disabled={sharedStatus[connection.uid] || sharingWith === connection.uid}
                                        className={`ml-2 px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50 shrink-0 ${
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
                                                Sent
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-3.5 h-3.5" />
                                                Send
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))
                        ) : connections.length === 0 ? (
                            <div className="text-center py-12 space-y-3">
                                <p className="text-sm font-serif italic text-brand-ebony/30 dark:text-brand-ebony/50">No connections yet.</p>
                                <p className="text-[10px] font-black text-brand-ebony/20 uppercase tracking-widest">Connect with alumni to share posts with them.</p>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-sm font-serif italic text-brand-ebony/30 dark:text-brand-ebony/50">No match found in your network.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer Preview */}
                    <div className="pt-1 sm:pt-2">
                        <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 bg-brand-burgundy/5 dark:bg-brand-burgundy/10 rounded-[1.5rem] sm:rounded-[2rem] border border-brand-burgundy/10 dark:border-brand-burgundy/20 shadow-inner group/preview">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white dark:bg-white/10 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 relative border border-brand-burgundy/10">
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
                            <div className="overflow-hidden min-w-0 flex-1">
                                <p className="text-[9px] font-extrabold text-brand-burgundy uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5 opacity-70">
                                    <Sparkles className="w-3 h-3" />
                                    By {post.authorName}
                                </p>
                                <p className="text-xs text-brand-ebony/70 dark:text-brand-ebony/80 line-clamp-2 font-medium italic font-serif leading-relaxed">&ldquo;{post.content.substring(0, 100)}{post.content.length > 100 ? '...' : ''}&rdquo;</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-6 pt-0 flex items-center justify-center flex-shrink-0 border-t border-brand-ebony/5 dark:border-white/5">
                   <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full border border-indigo-500/10 dark:border-indigo-500/20">
                        <Lock className="w-3 h-3 text-indigo-500/50 dark:text-indigo-400/60" />
                        <span className="text-[9px] font-extrabold text-indigo-500/50 dark:text-indigo-400/70 uppercase tracking-widest">Secured Relay Transmission</span>
                   </div>
                </div>
                </div>
            </div>
        </div>
        </Portal>
    );
}
