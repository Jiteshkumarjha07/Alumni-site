'use client';

import React, { useState, useEffect } from 'react';
import { Message, User } from '@/types';
import { X, Search, Send, Loader2, CheckCircle2, Lock } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { encryptMessage, decryptMessage, getSharedSecret } from '@/lib/encryption';

interface ForwardMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    message: Message;
    currentUser: User;
    originSharedSecret: string;
}

export function ForwardMessageModal({ isOpen, onClose, message, currentUser, originSharedSecret }: ForwardMessageModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [connections, setConnections] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [forwardingWith, setForwardingWith] = useState<string | null>(null);
    const [forwardStatus, setForwardStatus] = useState<{[key: string]: boolean}>({});

    const decryptedOriginalText = React.useMemo(() => 
        decryptMessage(message.text, originSharedSecret)
    , [message.text, originSharedSecret]);

    useEffect(() => {
        if (isOpen && currentUser.connections && currentUser.connections.length > 0) {
            fetchConnections();
        }
    }, [isOpen, currentUser.connections]);

    const fetchConnections = async () => {
        setLoading(true);
        try {
            const usersRef = collection(db, 'users');
            // For now, fetch matching connection details (up to 10 for prototype simplicity)
            const q = query(usersRef, where('uid', 'in', currentUser.connections!.slice(0, 10)));
            const snapshot = await getDocs(q);
            const fetchedConnections = snapshot.docs.map(doc => doc.data() as User);
            setConnections(fetchedConnections);
        } catch (error) {
            console.error('Error fetching connections:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleForward = async (targetUser: User) => {
        if (forwardingWith) return;
        setForwardingWith(targetUser.uid);

        try {
            const targetSharedSecret = getSharedSecret(currentUser.uid, targetUser.uid);
            const encryptedForTarget = encryptMessage(decryptedOriginalText, targetSharedSecret);

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
                    lastMessage: decryptedOriginalText, // Plaintext preview? 
                    // To follow the ChatWindow logic, we could encrypt this too, but let's be consistent.
                    // If we want total E2EE, lastMessage should also be encrypted.
                    // But then ChatList needs to calculate secrets for everyone.
                    // For now, let's keep it consistent with what I did in ChatWindow (plaintext lastMessage).
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

            // 2. Send forwarded message
            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                text: encryptedForTarget,
                senderId: currentUser.uid,
                senderName: currentUser.name,
                senderProfilePic: currentUser.profilePic || null,
                createdAt: serverTimestamp(),
                isRead: false,
                isForwarded: true
            });

            // 3. Update chat last message
            await setDoc(doc(db, 'chats', chatId), {
                lastMessage: decryptedOriginalText,
                lastMessageAt: serverTimestamp()
            }, { merge: true });

            setForwardStatus(prev => ({ ...prev, [targetUser.uid]: true }));
        } catch (error) {
            console.error('Error forwarding message:', error);
        } finally {
            setForwardingWith(null);
        }
    };

    if (!isOpen) return null;

    const filteredConnections = connections.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-brand-cream/60 backdrop-blur-sm">
            <div className="bg-brand-parchment rounded-3xl w-full max-w-md shadow-2xl border border-brand-ebony/10 overflow-hidden">
                <div className="p-6 border-b border-brand-ebony/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-serif font-bold text-brand-ebony">Forward Message</h2>
                        <div className="flex items-center gap-1 mt-1">
                            <Lock className="w-3 h-3 text-green-600" />
                            <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest">End-to-End Encrypted</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-brand-burgundy/5 rounded-full transition-colors text-brand-ebony/40 hover:text-brand-burgundy">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 bg-brand-cream/30">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ebony/30" />
                        <input
                            type="text"
                            placeholder="Search connections..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-brand-cream border border-brand-ebony/10 rounded-xl text-sm focus:ring-2 focus:ring-brand-burgundy/20 outline-none transition-all text-brand-ebony"
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
                                    <img
                                        src={connection.profilePic || `https://placehold.co/100x100/1e293b/f8fafc?text=${connection.name.substring(0, 1)}`}
                                        alt={connection.name}
                                        className="w-10 h-10 rounded-full border border-brand-ebony/5"
                                    />
                                    <div>
                                        <p className="font-bold text-brand-ebony text-sm">{connection.name}</p>
                                        <p className="text-[10px] text-brand-ebony/50 font-medium">Class of {connection.batch}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleForward(connection)}
                                    disabled={forwardStatus[connection.uid] || forwardingWith === connection.uid}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                                        forwardStatus[connection.uid]
                                            ? 'bg-green-600/10 text-green-600'
                                            : 'bg-brand-burgundy text-white hover:opacity-90 shadow-sm'
                                    } disabled:opacity-70`}
                                >
                                    {forwardingWith === connection.uid ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : forwardStatus[connection.uid] ? (
                                        <>
                                            <CheckCircle2 className="w-3 h-3" />
                                            Forwarded
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-3 h-3" />
                                            Forward
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

                <div className="p-6 bg-brand-cream/20 border-t border-brand-ebony/5">
                    <div className="flex flex-col p-3 bg-brand-cream/60 rounded-2xl border border-brand-ebony/5">
                        <p className="text-[10px] font-bold text-brand-burgundy uppercase tracking-widest mb-1 opacity-70 italic">Forwarding Message</p>
                        <p className="text-xs text-brand-ebony/70 line-clamp-2 italic">"{decryptedOriginalText}"</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
