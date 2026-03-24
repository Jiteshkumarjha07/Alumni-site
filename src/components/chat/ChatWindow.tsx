'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, Message, Group } from '@/types';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MessageBubble } from './MessageBubble';
import { ForwardMessageModal } from './ForwardMessageModal';
import { Send, Loader2, ArrowLeft, X, CheckCheck, Share2, ShieldCheck, Lock, Image as ImageIcon, Video as VideoIcon, Plus, Trash2, Users } from 'lucide-react';
import { encryptMessage, getSharedSecret } from '@/lib/encryption';
import { uploadMedia, uploadVideo } from '@/lib/media';

interface ChatWindowProps {
    chatId: string;
    currentUser: User;
    otherUser: { name: string; profilePic: string; uid: string } | null;
    isGroup?: boolean;
    groupData?: Group | null;
    onBack?: () => void; // For mobile view
}

export function ChatWindow({ chatId, currentUser, otherUser, isGroup = false, groupData, onBack }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
    const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
    const [unsendingMessage, setUnsendingMessage] = useState<Message | null>(null);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [mediaPreview, setMediaPreview] = useState<{ url: string; type: 'image' | 'video'; file: File } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    const encryptionSecret = isGroup 
        ? (groupData?.groupSecret || chatId) 
        : (otherUser ? getSharedSecret(currentUser.uid, otherUser.uid) : '');

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Fetch messages
    useEffect(() => {
        if (!chatId) return;
        if (isGroup && !groupData) return;

        setLoading(true);
        const collectionPath = isGroup ? 'groups' : 'chats';
        const messagesRef = collection(db, collectionPath, chatId, 'messages');
        const q = query(messagesRef); // Fetch all to avoid excluding pending messages

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data({ serverTimestamps: 'estimate' })
            })) as Message[];

            // Filter out messages hidden by current user
            const visibleMessages = fetchedMessages
                .filter(msg => !msg.hiddenBy?.includes(currentUser.uid))
                .sort((a, b) => {
                    const timeA = a.createdAt?.toMillis() || 0;
                    const timeB = b.createdAt?.toMillis() || 0;
                    return timeA - timeB;
                });

            setMessages(visibleMessages);
            setLoading(false);

            // Mark messages as read (mostly for 1-to-1, group read tracking is more complex)
            if (!isGroup) {
                const unreadMessages = fetchedMessages.filter(msg => 
                    msg.senderId !== currentUser.uid && !msg.isRead
                );

                if (unreadMessages.length > 0) {
                    unreadMessages.forEach(msg => {
                        const msgRef = doc(db, 'chats', chatId, 'messages', msg.id);
                        updateDoc(msgRef, { isRead: true });
                    });
                }
            }

        }, (error) => {
            console.error('Error fetching messages:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [chatId, currentUser.uid, isGroup, groupData]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && !mediaPreview) || (!otherUser && !isGroup) || !chatId) return;

        const messageText = newMessage.trim();
        const currentReply = replyingToMessage;
        const currentMedia = mediaPreview;
        
        setNewMessage(''); 
        setEditingMessage(null);
        setReplyingToMessage(null);
        setMediaPreview(null);
        setSending(true);

        try {
            let imageUrl = '';
            let videoUrl = '';

            if (currentMedia) {
                setUploadingMedia(true);
                if (currentMedia.type === 'image') {
                    imageUrl = await uploadMedia(currentMedia.file) || '';
                } else {
                    const videoPath = isGroup ? `groups/${chatId}/videos` : `chats/${chatId}/videos`;
                    videoUrl = await uploadVideo(currentMedia.file, videoPath) || '';
                }
            }

            const encryptedText = messageText ? encryptMessage(messageText, encryptionSecret) : '';
            const encryptedImageUrl = imageUrl ? encryptMessage(imageUrl, encryptionSecret) : '';
            const encryptedVideoUrl = videoUrl ? encryptMessage(videoUrl, encryptionSecret) : '';

            const collectionPath = isGroup ? 'groups' : 'chats';

            if (editingMessage) {
                // Update existing message (only text editing supported for now)
                const msgRef = doc(db, collectionPath, chatId, 'messages', editingMessage.id);
                await updateDoc(msgRef, {
                    text: encryptedText,
                    isEdited: true
                });
            } else {
                // Add new message
                const messageData: any = {
                    text: encryptedText,
                    senderId: currentUser.uid,
                    senderName: currentUser.name,
                    senderProfilePic: currentUser.profilePic || null,
                    createdAt: serverTimestamp(),
                    isRead: false
                };

                if (encryptedImageUrl) messageData.imageUrl = encryptedImageUrl;
                if (encryptedVideoUrl) messageData.videoUrl = encryptedVideoUrl;

                if (currentReply) {
                    messageData.replyToId = currentReply.id;
                    messageData.replyToText = encryptMessage(currentReply.text, encryptionSecret);
                    messageData.replyToSenderName = currentReply.senderName || 'Unknown';
                }

                await addDoc(collection(db, collectionPath, chatId, 'messages'), messageData);

                // Update last message pointer
                if (!isGroup && otherUser) {
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
                } else if (isGroup) {
                    const groupRef = doc(db, 'groups', chatId);
                    await updateDoc(groupRef, {
                        lastMessage: messageText,
                        lastMessageAt: serverTimestamp(),
                        lastSenderName: currentUser.name
                    });
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setNewMessage(messageText);
            setMediaPreview(currentMedia);
            if (currentReply) setReplyingToMessage(currentReply);
        } finally {
            setSending(false);
            setUploadingMedia(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size (e.g., 20MB limit for video)
        if (type === 'video' && file.size > 20 * 1024 * 1024) {
            alert('Video file is too large. Please select a video under 20MB.');
            return;
        }

        const url = URL.createObjectURL(file);
        setMediaPreview({ url, type, file });
        
        // Focus input
        const input = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (input) input.focus();
    };

    const handleEditInitiate = (message: Message) => {
        setEditingMessage(message);
        setReplyingToMessage(null);
        setNewMessage(message.text);
    };

    const handleReplyInitiate = (message: Message) => {
        setReplyingToMessage(message);
        setEditingMessage(null);
        // Focus input
        const input = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (input) input.focus();
    };

    const handleUnsendMessage = async (message: Message, mode: 'me' | 'everyone') => {
        if (!chatId) return;
        const collectionPath = isGroup ? 'groups' : 'chats';
        try {
            const msgRef = doc(db, collectionPath, chatId, 'messages', message.id);
            if (mode === 'everyone') {
                await updateDoc(msgRef, {
                    text: encryptMessage('🚫 This message was unsent', encryptionSecret),
                    imageUrl: '',
                    videoUrl: '',
                    isDeleted: true
                });
            } else {
                // Unsend for me: add to hiddenBy
                const currentHiddenBy = message.hiddenBy || [];
                if (!currentHiddenBy.includes(currentUser.uid)) {
                    await updateDoc(msgRef, {
                        hiddenBy: [...currentHiddenBy, currentUser.uid]
                    });
                }
            }
            setUnsendingMessage(null);
        } catch (error) {
            console.error('Error unsending message:', error);
        }
    };

    if (!otherUser && !isGroup) {
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

    if (isGroup && !groupData) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-burgundy" />
            </div>
        );
    }

    const title = isGroup ? groupData?.groupName : otherUser?.name;
    const subtitle = isGroup ? `${groupData?.members.length} Members` : 'End-to-End Encrypted';
    const profilePic = isGroup 
        ? null 
        : (otherUser?.profilePic || `https://placehold.co/100x100/EFEFEFF/3D2B27?text=${otherUser?.name.substring(0, 1)}`);

    return (
        <div className="flex-1 flex flex-col h-full" style={{backgroundColor: 'var(--color-brand-cream)', backgroundImage: 'url(https://www.transparenttextures.com/patterns/linen.png)'}}>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 bg-brand-parchment/90 border-b border-brand-ebony/10 shadow-sm z-10 backdrop-blur-md">
                <div className="flex items-center">
                    {onBack && (
                        <button onClick={onBack} className="md:hidden mr-3 text-brand-ebony hover:text-brand-burgundy transition-colors">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                    )}
                    {isGroup ? (
                        <div className="w-10 h-10 bg-brand-burgundy/10 rounded-full flex items-center justify-center mr-3 border border-brand-burgundy/20">
                            <Users className="w-5 h-5 text-brand-burgundy" />
                        </div>
                    ) : (
                        <img
                            src={profilePic!}
                            alt={title!}
                            className="w-10 h-10 rounded-full mr-3 object-cover border border-white shadow-sm"
                        />
                    )}
                    <div>
                        <h3 className="font-serif font-bold text-brand-ebony text-lg leading-tight">{title}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                            {isGroup ? (
                                <span className="text-[10px] text-brand-ebony/50 font-bold uppercase tracking-wider">{subtitle}</span>
                            ) : (
                                <>
                                    <Lock className="w-2.5 h-2.5 text-green-600" />
                                    <span className="text-[9px] text-green-600 font-bold uppercase tracking-widest">{subtitle}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-brand-burgundy/5 border border-brand-burgundy/20 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-burgundy/70" />
                    <span className="text-[10px] text-brand-burgundy/70 font-medium">Secured by AlumNest E2EE</span>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-burgundy" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-brand-ebony/40 space-y-3">
                        {!isGroup && otherUser && (
                            <img
                                src={profilePic!}
                                alt={title!}
                                className="w-20 h-20 rounded-full object-cover shadow-md opacity-60 ring-4 ring-brand-parchment"
                            />
                        )}
                        {isGroup && (
                            <div className="w-20 h-20 bg-brand-burgundy/10 rounded-full flex items-center justify-center ring-4 ring-brand-parchment">
                                <Users className="w-10 h-10 text-brand-burgundy/50" />
                            </div>
                        )}
                        <p className="text-sm font-serif italic">This is the beginning of your conversation in <strong className="font-bold text-brand-ebony/60">{title}</strong>.</p>
                        <div className="flex items-center gap-2 px-4 py-2 bg-brand-parchment/60 rounded-2xl border border-brand-burgundy/10 max-w-[280px] text-center shadow-sm">
                            <Lock className="w-3 h-3 text-brand-burgundy/60 shrink-0" />
                            <p className="text-[10px] text-brand-ebony/40 italic">Messages are end-to-end encrypted. No one outside of this chat can read them.</p>
                        </div>
                    </div>
                ) : (
                    messages.map((message) => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            isOwnMessage={message.senderId === currentUser.uid}
                            onEdit={handleEditInitiate}
                            onUnsend={setUnsendingMessage}
                            onReply={handleReplyInitiate}
                            onForward={setForwardingMessage}
                            sharedSecret={encryptionSecret}
                            showSenderName={isGroup}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 pb-12 sm:pb-4 bg-brand-parchment/80 border-t border-brand-ebony/10 backdrop-blur-md">
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
                {replyingToMessage && (
                    <div className="flex items-center justify-between mb-2 px-4 py-2 bg-brand-ebony/5 rounded-xl border-l-4 border-brand-burgundy animate-in slide-in-from-bottom-2 duration-200">
                        <div className="overflow-hidden">
                            <p className="text-[10px] text-brand-burgundy font-bold uppercase tracking-wider mb-0.5">Replying to {replyingToMessage.senderName}</p>
                            <p className="text-xs text-brand-ebony/60 italic truncate">{replyingToMessage.text}</p>
                        </div>
                        <button 
                            onClick={() => setReplyingToMessage(null)}
                            className="p-1 text-brand-ebony/40 hover:text-brand-burgundy transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                
                {mediaPreview && (
                    <div className="mb-3 relative group w-fit">
                        {mediaPreview.type === 'image' ? (
                            <img src={mediaPreview.url} alt="Preview" className="h-32 w-auto rounded-xl border-2 border-brand-burgundy/20 object-cover shadow-md" />
                        ) : (
                            <video src={mediaPreview.url} className="h-32 w-auto rounded-xl border-2 border-brand-burgundy/20 shadow-md" muted />
                        )}
                        <button 
                            onClick={() => setMediaPreview(null)}
                            className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors z-20"
                        >
                            <X className="w-3 h-3" />
                        </button>
                        {uploadingMedia && (
                            <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center z-10">
                                <Loader2 className="w-6 h-6 animate-spin text-white" />
                            </div>
                        )}
                    </div>
                )}

                <div className="flex overflow-x-auto gap-1 mb-2 pb-1 px-1 no-scrollbar active:cursor-grabbing snap-x border-b border-brand-ebony/5">
                    {['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🙌', '✨', '💯'].map(emoji => (
                        <button
                            key={emoji}
                            type="button"
                            onClick={() => setNewMessage(prev => prev + emoji)}
                            className="w-9 h-9 sm:w-8 sm:h-8 flex-shrink-0 flex items-center justify-center hover:bg-brand-burgundy/5 rounded-lg transition-colors text-lg snap-center"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 text-brand-ebony/40 hover:text-brand-burgundy hover:bg-brand-burgundy/5 rounded-2xl transition-all"
                            title="Send Image"
                        >
                            <ImageIcon className="w-5 h-5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => videoInputRef.current?.click()}
                            className="p-3 text-brand-ebony/40 hover:text-brand-burgundy hover:bg-brand-burgundy/5 rounded-2xl transition-all"
                            title="Send Video"
                        >
                            <VideoIcon className="w-5 h-5" />
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={(e) => handleFileSelect(e, 'image')} 
                            accept="image/*" 
                            className="hidden" 
                        />
                        <input 
                            type="file" 
                            ref={videoInputRef} 
                            onChange={(e) => handleFileSelect(e, 'video')} 
                            accept="video/*" 
                            className="hidden" 
                        />
                    </div>
                    <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={editingMessage ? "Edit message..." : (replyingToMessage ? "Type a reply..." : "Type a message...")}
                            className="flex-1 px-4 sm:px-5 py-3 sm:py-3.5 bg-brand-parchment/30 border border-brand-ebony/10 rounded-2xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy outline-none transition-all placeholder:text-brand-ebony/30 shadow-inner text-base sm:text-sm"
                            disabled={sending}
                        />
                        <button
                            type="submit"
                            disabled={(!newMessage.trim() && !mediaPreview) || sending}
                            className="p-3 bg-brand-burgundy text-white rounded-2xl hover:bg-[#5a2427] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-brand-burgundy/20 flex items-center justify-center min-w-[44px] h-[44px] sm:min-w-[50px] sm:h-[50px]"
                        >
                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                editingMessage ? <CheckCheck className="w-5 h-5" /> : <Send className="w-5 h-5 ml-0.5" />
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {forwardingMessage && (
                <ForwardMessageModal
                    isOpen={!!forwardingMessage}
                    onClose={() => setForwardingMessage(null)}
                    message={forwardingMessage}
                    currentUser={currentUser}
                    originSharedSecret={encryptionSecret}
                />
            )}

            {unsendingMessage && (
                <div className="fixed inset-0 bg-brand-ebony/40 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                    <div className="bg-brand-cream rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-brand-ebony/10">
                        <h3 className="text-lg font-serif font-bold text-brand-ebony mb-2">
                            {unsendingMessage.senderId === currentUser.uid ? 'Unsend Message' : 'Delete Message'}
                        </h3>
                        <p className="text-sm text-brand-ebony/60 mb-6 italic">
                            {unsendingMessage.senderId === currentUser.uid 
                                ? 'Who would you like to unsend this message for?' 
                                : 'Choose how you want to delete this message.'}
                        </p>
                        
                        <div className="space-y-3">
                            <button 
                                onClick={() => handleUnsendMessage(unsendingMessage, 'me')}
                                className="w-full py-3 px-4 bg-brand-parchment hover:bg-brand-parchment/80 text-brand-ebony rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 border border-brand-ebony/10"
                            >
                                {unsendingMessage.senderId === currentUser.uid ? 'Unsend for me' : 'Delete for me'}
                            </button>
                            {unsendingMessage.senderId === currentUser.uid && (
                                <button 
                                    onClick={() => handleUnsendMessage(unsendingMessage, 'everyone')}
                                    className="w-full py-3 px-4 bg-brand-burgundy hover:bg-[#5a2427] text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                                >
                                    Unsend for everyone
                                </button>
                            )}
                            <button 
                                onClick={() => setUnsendingMessage(null)}
                                className="w-full py-3 px-4 bg-transparent text-brand-ebony/40 hover:text-brand-ebony/60 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
