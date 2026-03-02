import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '@/types';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MessageBubble } from './MessageBubble';
import { Send, Loader2, ArrowLeft } from 'lucide-react';

interface ChatWindowProps {
    chatId: string;
    currentUser: User;
    otherUser: { name: string; profilePic: string; uid: string } | null;
    onBack?: () => void; // For mobile view
}

export function ChatWindow({ chatId, currentUser, otherUser, onBack }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Fetch messages
    useEffect(() => {
        if (!chatId) return;

        setLoading(true);
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Message[];

            setMessages(fetchedMessages);
            setLoading(false);

            // Mark messages as read (optional enhancement: only update if there are unread messages)
            if (fetchedMessages.length > 0 && currentUser.uid) {
                // In a production app, we would update the chat document's unreadCount for the currentUser to 0 here.
            }

        }, (error) => {
            console.error('Error fetching messages:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [chatId, currentUser.uid]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !otherUser || !chatId) return;

        const messageText = newMessage.trim();
        setNewMessage(''); // optimistic UI clear
        setSending(true);

        try {
            // 1. Add the message to the subcollection
            const messageData = {
                text: messageText,
                senderId: currentUser.uid,
                senderName: currentUser.name,
                senderProfilePic: currentUser.profilePic || null,
                createdAt: serverTimestamp(),
                isRead: false
            };

            await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);

            // 2. Update (or create) the parent chat document
            const chatRef = doc(db, 'chats', chatId);

            await setDoc(chatRef, {
                participants: [currentUser.uid, otherUser.uid],
                lastMessage: messageText,
                lastMessageAt: serverTimestamp(),
                // Simplistic unread count logic (just tracking the fact there is a message)
                participantDetails: {
                    [currentUser.uid]: {
                        name: currentUser.name,
                        profilePic: currentUser.profilePic || null
                    },
                    [otherUser.uid]: {
                        name: otherUser.name,
                        profilePic: otherUser.profilePic || null
                    }
                }
            }, { merge: true });

        } catch (error) {
            console.error('Error sending message:', error);
            // Re-set message if failed
            setNewMessage(messageText);
        } finally {
            setSending(false);
        }
    };

    if (!otherUser) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-500">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                    <Send className="w-10 h-10 text-gray-400 ml-1" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700">Your Messages</h3>
                <p>Select a chat or search for an alumni to start talking.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50">
            {/* Chat Header */}
            <div className="flex items-center p-4 bg-white border-b shadow-sm z-10">
                {onBack && (
                    <button onClick={onBack} className="md:hidden mr-3 text-gray-600 hover:text-gray-900">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                )}
                <img
                    src={otherUser.profilePic || `https://placehold.co/100x100/EFEFEFF/003366?text=${otherUser.name.substring(0, 1)}`}
                    alt={otherUser.name}
                    className="w-10 h-10 rounded-full mr-3 object-cover shadow-sm"
                />
                <div>
                    <h3 className="font-semibold text-gray-900">{otherUser.name}</h3>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-3">
                        <img
                            src={otherUser.profilePic || `https://placehold.co/100x100/EFEFEFF/003366?text=${otherUser.name.substring(0, 1)}`}
                            alt={otherUser.name}
                            className="w-20 h-20 rounded-full object-cover shadow-sm opacity-50"
                        />
                        <p>This is the beginning of your conversation with <strong>{otherUser.name}</strong>.</p>
                    </div>
                ) : (
                    messages.map((message) => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            isOwnMessage={message.senderId === currentUser.uid}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50"
                        disabled={sending}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center"
                    >
                        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
                    </button>
                </form>
            </div>
        </div>
    );
}
