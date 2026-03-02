'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Message, User } from '@/types';
import { getChatId, getSharedSecret, encryptMessage, decryptMessage } from '@/lib/encryption';
import { ArrowLeft, Send } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

export default function PersonalChatPage() {
    const { userData } = useAuth();
    const params = useParams();
    const recipientId = params.userId as string;
    const [recipient, setRecipient] = useState<User | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Fetch recipient info
    useEffect(() => {
        if (!recipientId) return;

        const fetchRecipient = async () => {
            const userDoc = await getDoc(doc(db, 'users', recipientId));
            if (userDoc.exists()) {
                setRecipient({ uid: userDoc.id, ...userDoc.data() } as User);
            }
        };

        fetchRecipient();
    }, [recipientId]);

    // Fetch messages
    useEffect(() => {
        if (!userData || !recipientId) return;

        const chatId = getChatId(userData.uid, recipientId);
        const messagesQuery = query(
            collection(db, 'chats', chatId, 'messages'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            const sharedSecret = getSharedSecret(userData.uid, recipientId);
            const fetchedMessages = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    text: decryptMessage(data.text, sharedSecret)
                };
            }) as Message[];

            setMessages(fetchedMessages);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userData, recipientId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !userData || !recipientId) return;

        const chatId = getChatId(userData.uid, recipientId);
        const sharedSecret = getSharedSecret(userData.uid, recipientId);
        const encryptedText = encryptMessage(newMessage.trim(), sharedSecret);

        await addDoc(collection(db, 'chats', chatId, 'messages'), {
            text: encryptedText,
            senderId: userData.uid,
            recipientId: recipientId,
            createdAt: serverTimestamp(),
            read: false
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
                <p className="text-gray-600">Please log in to access chat</p>
            </div>
        );
    }

    if (!recipient) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
                <img
                    src={recipient.profilePic || `https://placehold.co/40x40/EFEFEFF/3B82F6?text=${recipient.name.substring(0, 1)}`}
                    alt={recipient.name}
                    className="w-10 h-10 rounded-full"
                />
                <div>
                    <h2 className="font-semibold">{recipient.name}</h2>
                    <p className="text-sm text-gray-600">Batch of {recipient.batch}</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : messages.length > 0 ? (
                    <>
                        {messages.map(msg => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.senderId === userData.uid ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${msg.senderId === userData.uid
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white text-gray-900'
                                        }`}
                                >
                                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">No messages yet. Start the conversation!</p>
                    </div>
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
