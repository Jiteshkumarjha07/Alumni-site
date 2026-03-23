import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '@/types';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MessageBubble } from './MessageBubble';
import { Send, Loader2, ArrowLeft, X, CheckCheck } from 'lucide-react';

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
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
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

            // Mark messages as read
            const unreadMessages = fetchedMessages.filter(msg => 
                msg.senderId !== currentUser.uid && !msg.isRead
            );

            if (unreadMessages.length > 0) {
                unreadMessages.forEach(msg => {
                    const msgRef = doc(db, 'chats', chatId, 'messages', msg.id);
                    updateDoc(msgRef, { isRead: true });
                });
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
        setNewMessage(''); 
        setSending(true);

        try {
            if (editingMessage) {
                // Update existing message
                const msgRef = doc(db, 'chats', chatId, 'messages', editingMessage.id);
                await updateDoc(msgRef, {
                    text: messageText,
                    isEdited: true
                });
                setEditingMessage(null);
            } else {
                // Add new message
                const messageData = {
                    text: messageText,
                    senderId: currentUser.uid,
                    senderName: currentUser.name,
                    senderProfilePic: currentUser.profilePic || null,
                    createdAt: serverTimestamp(),
                    isRead: false
                };

                await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);

                // Update parent chat doc
                const chatRef = doc(db, 'chats', chatId);
                await setDoc(chatRef, {
                    participants: [currentUser.uid, otherUser.uid],
                    lastMessage: messageText,
                    lastMessageAt: serverTimestamp(),
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
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setNewMessage(messageText);
        } finally {
            setSending(false);
        }
    };

    const handleEditInitiate = (message: Message) => {
        setEditingMessage(message);
        setNewMessage(message.text);
    };

    const handleUnsendMessage = async (message: Message) => {
        if (!chatId) return;
        try {
            const msgRef = doc(db, 'chats', chatId, 'messages', message.id);
            await updateDoc(msgRef, {
                text: '🚫 This message was unsent',
                isDeleted: true
            });
        } catch (error) {
            console.error('Error unsending message:', error);
        }
    };

    if (!otherUser) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-brand-cream/30 text-brand-ebony/50">
                <div className="w-24 h-24 bg-brand-parchment/50 rounded-full flex items-center justify-center mb-4 border border-brand-ebony/10 shadow-inner">
                    <Send className="w-10 h-10 text-brand-burgundy/40 ml-1" />
                </div>
                <h3 className="text-xl font-serif font-bold text-brand-ebony">Your Messages</h3>
                <p className="text-sm italic">Select a chat or search for an alumni to start talking.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-brand-cream/30">
            {/* Chat Header */}
            <div className="flex items-center p-4 bg-brand-parchment/90 border-b border-brand-ebony/10 shadow-sm z-10 backdrop-blur-md">
                {onBack && (
                    <button onClick={onBack} className="md:hidden mr-3 text-brand-ebony hover:text-brand-burgundy transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                )}
                <img
                    src={otherUser.profilePic || `https://placehold.co/100x100/EFEFEFF/3D2B27?text=${otherUser.name.substring(0, 1)}`}
                    alt={otherUser.name}
                    className="w-10 h-10 rounded-full mr-3 object-cover border border-white shadow-sm"
                />
                <div>
                    <h3 className="font-serif font-bold text-brand-ebony text-lg">{otherUser.name}</h3>
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
                            onEdit={handleEditInitiate}
                            onUnsend={handleUnsendMessage}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white/90 border-t border-brand-ebony/10 backdrop-blur-md">
                {editingMessage && (
                    <div className="flex items-center justify-between mb-2 px-4 py-1.5 bg-brand-burgundy/5 rounded-lg border border-brand-burgundy/10">
                        <p className="text-xs text-brand-burgundy font-medium italic">Editing message...</p>
                        <button 
                            onClick={() => {
                                setEditingMessage(null);
                                setNewMessage('');
                            }}
                            className="text-brand-burgundy hover:text-brand-ebony transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={editingMessage ? "Edit message..." : "Type a message..."}
                        className="flex-1 px-5 py-3.5 bg-brand-parchment/30 border border-brand-ebony/10 rounded-2xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy outline-none transition-all placeholder:text-brand-ebony/30"
                        disabled={sending}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="p-3.5 bg-brand-burgundy text-white rounded-2xl hover:bg-[#5a2427] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-brand-burgundy/20 flex items-center justify-center min-w-[50px]"
                    >
                        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            editingMessage ? <CheckCheck className="w-5 h-5" /> : <Send className="w-5 h-5 ml-0.5" />
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
