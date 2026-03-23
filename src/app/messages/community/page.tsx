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
                <p className="text-gray-600">Please log in to access community chat</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 rounded-full transition"
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
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                                        <p className="text-xs text-gray-600 mb-1 px-3">{msg.senderName}</p>
                                    )}
                                    <div
                                        className={`rounded-2xl px-4 py-2 ${msg.senderId === userData.uid
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white text-gray-900'
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
            <div className="bg-white border-t p-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
