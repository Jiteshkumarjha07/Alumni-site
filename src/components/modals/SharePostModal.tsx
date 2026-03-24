'use client';

import React, { useState, useEffect } from 'react';
import { Post, User } from '@/types';
import { X, Search, Send, Loader2, CheckCircle2 } from 'lucide-react';
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
            // Firestore 'in' query is limited to 10 items, but for now we'll just fetch all and filter or do batch
            // For simplicity in this prototype, we'll fetch connections by their UIDs
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
            // 1. Find or create chat
            const chatsRef = collection(db, 'chats');
            const q = query(chatsRef, where('participants', 'array-contains', currentUser.uid));
            const snapshot = await getDocs(q);
            
            let chatId = '';
            const existingChat = snapshot.docs.find(doc => {
                const data = doc.data();
                return data.participants.includes(targetUser.uid);
            });

            if (existingChat) {
                chatId = existingChat.id;
            } else {
                // Create new chat
                const combinedId = [currentUser.uid, targetUser.uid].sort().join('_');
                chatId = combinedId;
                await setDoc(doc(db, 'chats', chatId), {
                    participants: [currentUser.uid, targetUser.uid],
                    lastMessage: `Shared a post by ${post.authorName}`,
                    lastMessageAt: serverTimestamp(),
                    participantDetails: {
                        [currentUser.uid]: {
                            name: currentUser.name,
                            profilePic: currentUser.profilePic || null
                        },
                        [targetUser.uid]: {
                            name: targetUser.name,
                            profilePic: targetUser.profilePic || null
                        }
                    }
                });
            }

            // 2. Send message with shared post data
            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                text: `Check out this post by ${post.authorName}`,
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

            // 3. Update chat last message
            await setDoc(doc(db, 'chats', chatId), {
                lastMessage: `Shared a post by ${post.authorName}`,
                lastMessageAt: serverTimestamp()
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-brand-ebony/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-brand-ebony/10 overflow-hidden">
                <div className="p-6 border-b border-brand-ebony/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-serif font-bold text-brand-ebony">Share Post</h2>
                        <p className="text-xs text-brand-ebony/50 font-medium uppercase tracking-widest mt-1">Select connection</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-brand-burgundy/5 rounded-full transition-colors text-brand-ebony/40 hover:text-brand-burgundy">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 bg-brand-parchment/30">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ebony/30" />
                        <input
                            type="text"
                            placeholder="Search connections..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-brand-ebony/10 rounded-xl text-sm focus:ring-2 focus:ring-brand-burgundy/20 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="max-h-[300px] overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10">
                            <Loader2 className="w-8 h-8 animate-spin text-brand-burgundy/40" />
                            <p className="text-sm font-serif italic mt-2 text-brand-ebony/60">Finding your tribe...</p>
                        </div>
                    ) : filteredConnections.length > 0 ? (
                        filteredConnections.map((connection) => (
                            <div key={connection.uid} className="flex items-center justify-between p-3 hover:bg-brand-burgundy/5 rounded-2xl transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="relative w-10 h-10 rounded-full overflow-hidden border border-brand-ebony/5">
                                        <Image
                                            src={connection.profilePic || `https://placehold.co/100x100/EFEFEFF/3D2B27?text=${connection.name.substring(0, 1)}`}
                                            alt={connection.name}
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    </div>
                                    <div>
                                        <p className="font-bold text-brand-ebony text-sm">{connection.name}</p>
                                        <p className="text-[10px] text-brand-ebony/50 font-medium">Class of {connection.batch}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleShare(connection)}
                                    disabled={sharedStatus[connection.uid] || sharingWith === connection.uid}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                                        sharedStatus[connection.uid]
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-brand-burgundy text-white hover:bg-[#5a2427] shadow-sm'
                                    } disabled:opacity-70`}
                                >
                                    {sharingWith === connection.uid ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : sharedStatus[connection.uid] ? (
                                        <>
                                            <CheckCircle2 className="w-3 h-3" />
                                            Shared
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-3 h-3" />
                                            Share
                                        </>
                                    )}
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-brand-ebony/40 text-sm font-medium">No connections found.</p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-brand-parchment/20 border-t border-brand-ebony/5">
                    <div className="flex items-center gap-3 p-3 bg-white/60 rounded-2xl border border-brand-ebony/5">
                        <div className="w-12 h-12 bg-brand-ebony/5 rounded-lg overflow-hidden flex-shrink-0">
                            {post.imageUrl ? (
                                <Image 
                                    src={post.imageUrl} 
                                    alt={post.authorName} 
                                    fill 
                                    className="object-cover" 
                                    unoptimized
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-brand-ebony/20">
                                    <Send className="w-5 h-5" />
                                </div>
                            )}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-[10px] font-bold text-brand-burgundy uppercase tracking-widest mb-0.5">Sharing Post by {post.authorName}</p>
                            <p className="text-xs text-brand-ebony/70 line-clamp-1">{post.content}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
