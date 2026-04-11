'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Message } from '@/types';
import { encryptMessage, decryptMessage, COMMUNITY_CHAT_SECRET } from '@/lib/encryption';
import { ArrowLeft, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CommunityChatPage() {
    const { userData } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (!userData) return;

        const messagesQuery = query(
            collection(db, 'communityChat'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    text: decryptMessage(data.text, COMMUNITY_CHAT_SECRET)
                };
            }).reverse() as Message[];

            setMessages(fetchedMessages.slice(-50)); // Keep last 50 messages
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userData]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !userData) return;

        const encryptedText = encryptMessage(newMessage.trim(), COMMUNITY_CHAT_SECRET);

        await addDoc(collection(db, 'communityChat'), {
            text: encryptedText,
            senderId: userData.uid,
            senderName: userData.name,
            senderProfilePic: userData.profilePic,
            createdAt: serverTimestamp()
        });

        setNewMessage('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (!userData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-brand-ebony/60">Please log in to access community chat</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-brand-cream dark:bg-brand-cream">
            {/* Header */}
            <div className="sidebar-glass border-b border-brand-ebony/8 px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-brand-ebony/8 dark:hover:bg-white/8 rounded-full transition text-brand-ebony/60 hover:text-brand-ebony"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-burgundy/10 rounded-full flex items-center justify-center">
                        <span className="text-brand-burgundy font-semibold">AL</span>
                    </div>
                    <div>
                        <h2 className="font-semibold text-brand-ebony">Global Community Chat</h2>
                        <p className="text-sm text-brand-ebony/60">For the Tribe</p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-burgundy"></div>
                    </div>
                ) : (
                    <>
                        {messages.map(msg => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.senderId === userData.uid ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[70%] ${msg.senderId === userData.uid ? 'order-2' : 'order-1'}`}>
                                    {msg.senderId !== userData.uid && (
                                        <p className="text-xs text-brand-ebony/50 mb-1 px-3 font-semibold">{msg.senderName}</p>
                                    )}
                                    <div
                                        className={`rounded-2xl px-4 py-2 ${msg.senderId === userData.uid
                                                ? 'bg-brand-burgundy text-white'
                                                : 'bg-white/80 dark:bg-brand-parchment/20 text-brand-ebony border border-brand-ebony/5'
                                            }`}
                                    >
                                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input */}
            <div className="sidebar-glass border-t border-brand-ebony/8 p-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-brand-ebony/10 rounded-full focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy/30 bg-white/60 dark:bg-brand-parchment/15 text-brand-ebony outline-none transition"
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="p-3 bg-brand-burgundy text-white rounded-full hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
