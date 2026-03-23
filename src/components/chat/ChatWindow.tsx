import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '@/types';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MessageBubble } from './MessageBubble';
import { Send, Loader2, ArrowLeft, Image as ImageIcon, X, Paperclip } from 'lucide-react';
import { uploadMedia } from '@/lib/uploadMedia'; // Assuming this exists or I'll create it

interface ChatWindowProps {
    chatId: string;
    currentUser: User;
    otherUser: { name: string; profilePic: string; uid: string } | null;
    onBack?: () => void;
}

export function ChatWindow({ chatId, currentUser, otherUser, onBack }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Fetch messages & Mark as read
    useEffect(() => {
        if (!chatId || !currentUser.uid) return;

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

            // Mark unread messages as read
            const unreadMessages = fetchedMessages.filter(
                msg => msg.senderId !== currentUser.uid && !msg.readBy?.includes(currentUser.uid)
            );

            unreadMessages.forEach(async (msg) => {
                const msgRef = doc(db, 'chats', chatId, 'messages', msg.id);
                await updateDoc(msgRef, {
                    readBy: arrayUnion(currentUser.uid),
                    isRead: true // for backward compatibility or simple checks
                });
            });

            // Reset unread count in parent chat doc
            if (unreadMessages.length > 0) {
                const chatRef = doc(db, 'chats', chatId);
                updateDoc(chatRef, {
                    [`unreadCount.${currentUser.uid}`]: 0
                }).catch(console.error);
            }

        }, (error) => {
            console.error('Error fetching messages:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [chatId, currentUser.uid]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setFilePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && !selectedFile) || !otherUser || !chatId) return;

        setSending(true);
        const text = newMessage.trim();
        const replyInfo = replyingTo ? {
            id: replyingTo.id,
            text: replyingTo.text,
            senderName: replyingTo.senderName || 'User'
        } : null;

        setNewMessage('');
        setReplyingTo(null);
        setSelectedFile(null);
        setFilePreview(null);

        try {
            let mediaUrl = '';
            let mediaType: 'image' | 'video' | undefined;

            if (selectedFile) {
                setUploading(true);
                mediaUrl = await uploadMedia(selectedFile, `chats/${chatId}`);
                mediaType = selectedFile.type.startsWith('video/') ? 'video' : 'image';
                setUploading(false);
            }

            const messageData = {
                text,
                senderId: currentUser.uid,
                senderName: currentUser.name,
                senderProfilePic: currentUser.profilePic || null,
                createdAt: serverTimestamp(),
                readBy: [currentUser.uid],
                isRead: false,
                replyTo: replyInfo,
                mediaUrl: mediaUrl || null,
                mediaType: mediaType || null
            };

            await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);

            // Update parent chat doc
            const chatRef = doc(db, 'chats', chatId);
            await setDoc(chatRef, {
                lastMessage: mediaUrl ? (mediaType === 'image' ? '📷 Photo' : '🎥 Video') : text,
                lastMessageAt: serverTimestamp(),
                [`unreadCount.${otherUser.uid}`]: (messages.length > 0 ? 1 : 1) // Simplistic: increment unread for other
            }, { merge: true });

        } catch (error) {
            console.error('Error sending message:', error);
            setNewMessage(text); // Restore text on error
        } finally {
            setSending(false);
            setUploading(false);
        }
    };

    if (!otherUser) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-500 p-8 text-center">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <Send className="w-10 h-10 text-blue-200 ml-1" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-gray-800 mb-2">Your Conversations</h3>
                <p className="max-w-xs mx-auto">Select a chat from the left to start a conversation with fellow alumni.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-white relative">
            {/* Chat Header */}
            <div className="flex items-center p-4 bg-white border-b z-10 sticky top-0">
                {onBack && (
                    <button onClick={onBack} className="md:hidden mr-3 text-gray-600 hover:text-gray-900 p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}
                <div className="flex items-center gap-3">
                    <img
                        src={otherUser.profilePic || `https://placehold.co/100x100/EFEFEFF/003366?text=${otherUser.name.substring(0, 1)}`}
                        alt={otherUser.name}
                        className="w-10 h-10 rounded-full object-cover shadow-sm ring-1 ring-gray-100"
                    />
                    <div>
                        <h3 className="font-bold text-gray-900 leading-tight">{otherUser.name}</h3>
                        <p className="text-[10px] text-green-500 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Active Now
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f0f2f5] scrollbar-hide">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 opacity-50" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4 max-w-sm mx-auto text-center px-4">
                        <img
                            src={otherUser.profilePic || `https://placehold.co/100x100/EFEFEFF/003366?text=${otherUser.name.substring(0, 1)}`}
                            alt={otherUser.name}
                            className="w-24 h-24 rounded-full object-cover shadow-md opacity-50 ring-4 ring-white"
                        />
                        <div>
                            <p className="font-serif italic text-lg text-gray-700 mb-1">Say hello to {otherUser.name}!</p>
                            <p className="text-xs">Start your conversation with this alumni.</p>
                        </div>
                    </div>
                ) : (
                    messages.map((message) => (
                        <div key={message.id} className="relative group/msg">
                            <MessageBubble
                                message={message}
                                isOwnMessage={message.senderId === currentUser.uid}
                            />
                            <button 
                                onClick={() => setReplyingTo(message)}
                                className={`absolute top-0 p-1.5 bg-white shadow-sm rounded-full text-gray-400 hover:text-blue-600 opacity-0 group-hover/msg:opacity-100 transition-opacity z-10 ${message.senderId === currentUser.uid ? '-left-8' : '-right-8'}`}
                            >
                                <Paperclip className="w-3.5 h-3.5 -rotate-45" />
                            </button>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
                {/* Reply Preview */}
                {replyingTo && (
                    <div className="mb-3 p-3 bg-gray-50 rounded-xl border-l-4 border-l-blue-500 flex items-start justify-between animate-in slide-in-from-bottom-2 duration-200">
                        <div className="flex-1 min-w-0 pr-4">
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1 block">Replying to {replyingTo.senderName}</span>
                            <p className="text-sm text-gray-600 truncate italic">"{replyingTo.text || (replyingTo.mediaUrl ? 'Media' : 'Post')}"</p>
                        </div>
                        <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* File Preview */}
                {filePreview && (
                    <div className="mb-3 relative inline-block animate-in zoom-in-95 duration-200">
                        {selectedFile?.type.startsWith('image/') ? (
                            <img src={filePreview} alt="Preview" className="h-32 w-auto rounded-xl shadow-md border-2 border-white" />
                        ) : (
                            <div className="h-32 w-48 bg-gray-900 rounded-xl flex items-center justify-center text-white border-2 border-white shadow-md">
                                <ImageIcon className="w-8 h-8 opacity-50" />
                                <span className="text-[10px] ml-2 font-bold uppercase">Video Preview</span>
                            </div>
                        )}
                        <button 
                            onClick={() => { setSelectedFile(null); setFilePreview(null); }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                        {uploading && (
                            <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                                <Loader2 className="w-6 h-6 text-white animate-spin" />
                            </div>
                        )}
                    </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileSelect} 
                        accept="image/*,video/*" 
                        className="hidden" 
                    />
                    <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all flex-shrink-0 border border-transparent hover:border-blue-100"
                    >
                        <ImageIcon className="w-5 h-5" />
                    </button>
                    
                    <div className="flex-1 relative">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                            placeholder="Type your message..."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none text-sm transition-all resize-none max-h-32 min-h-[44px]"
                            rows={1}
                            disabled={sending}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={(!newMessage.trim() && !selectedFile) || sending}
                        className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center flex-shrink-0"
                    >
                        {sending || uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </form>
            </div>
        </div>
    );
}
