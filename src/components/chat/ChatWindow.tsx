'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Message, Group, Poll } from '@/types';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MessageBubble } from './MessageBubble';
import { ForwardMessageModal } from './ForwardMessageModal';
import { PollModal } from '../modals/PollModal';
import { Send, Loader2, ArrowLeft, X, CheckCheck, ShieldCheck, Lock, Image as ImageIcon, Video as VideoIcon, Plus, Users, Phone, Video, Mic, Paperclip, FileText, BarChart2, Download, Smile, LogOut, ListChecks, CheckCircle2, Trash2 } from 'lucide-react';
import { encryptMessage, decryptMessage, getSharedSecret } from '@/lib/encryption';
import { uploadMedia, uploadVideo, uploadFile } from '@/lib/media';

interface ChatWindowProps {
    chatId: string;
    currentUser: User;
    otherUser: { name: string; profilePic: string; uid: string } | null;
    isGroup?: boolean;
    groupData?: Group | null;
    onBack?: () => void;
}

const COMMON_EMOJIS = ['😊', '😂', '🥰', '👍', '🙌', '🙏', '❤️', '🔥', '✨', '🤔', '😎', '😢', '👏', '🎉', '💡', '🚀', '💯', '✅', '❌', '⭐'];

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
    const [mediaPreview, setMediaPreview] = useState<{ url: string; type: 'image' | 'video' | 'file'; file: File; name?: string; size?: number } | null>(null);
    const [showCallMenu, setShowCallMenu] = useState(false);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [showPollModal, setShowPollModal] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

    const encryptionSecret = isGroup 
        ? (groupData?.groupSecret || chatId) 
        : (otherUser ? getSharedSecret(currentUser.uid, otherUser.uid) : '');

    const [otherUserStatus, setOtherUserStatus] = useState<{ isOnline: boolean; lastSeen?: any } | null>(null);

    const isUserOnline = useMemo(() => {
        if (!otherUserStatus) return false;
        if (!otherUserStatus.isOnline) return false;
        if (!otherUserStatus.lastSeen) return false;
        
        try {
            const lastSeenMillis = otherUserStatus.lastSeen.toMillis();
            const now = Date.now();
            return (now - lastSeenMillis) < 60000; // 60 second threshold
        } catch (e) {
            return otherUserStatus.isOnline;
        }
    }, [otherUserStatus]);

    // Listen to other user's status
    useEffect(() => {
        if (isGroup || !otherUser?.uid) return;
        const unsubscribe = onSnapshot(doc(db, 'users', otherUser.uid), (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                setOtherUserStatus({
                    isOnline: data.isOnline || false,
                    lastSeen: data.lastSeen
                });
            }
        });
        return () => unsubscribe();
    }, [otherUser?.uid, isGroup]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Fetch messages & Mark as read
    useEffect(() => {
        if (!chatId) return;
        if (isGroup && !groupData) return;

        setLoading(true);
        const collectionPath = isGroup ? 'groups' : 'chats';
        const messagesRef = collection(db, collectionPath, chatId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data({ serverTimestamps: 'estimate' })
            })) as Message[];

            // Filter out messages hidden by current user
            const visibleMessages = fetchedMessages
                .filter(msg => !msg.hiddenBy?.includes(currentUser.uid));

            setMessages(visibleMessages);
            setLoading(false);

            // Mark unread messages as read
            const unreadMessages = fetchedMessages.filter(
                msg => msg.senderId !== currentUser.uid && (!msg.readBy || !msg.readBy.includes(currentUser.uid))
            );

            if (unreadMessages.length > 0) {
                unreadMessages.forEach(async (msg) => {
                    const msgRef = doc(db, collectionPath, chatId, 'messages', msg.id);
                    await updateDoc(msgRef, {
                        readBy: arrayUnion(currentUser.uid),
                        isRead: true,
                        isDelivered: true
                    });
                });

                // Reset unread count in parent doc (for private chats)
                if (!isGroup) {
                    const chatRef = doc(db, 'chats', chatId);
                    updateDoc(chatRef, {
                        [`unreadCount.${currentUser.uid}`]: 0
                    }).catch(console.error);
                }
            }

            // Mark undelivered messages as delivered (even if not read yet)
            const undeliveredMessages = fetchedMessages.filter(
                msg => msg.senderId !== currentUser.uid && !msg.isDelivered && (!msg.readBy || !msg.readBy.includes(currentUser.uid))
            );

            if (undeliveredMessages.length > 0) {
                undeliveredMessages.forEach(async (msg) => {
                    const msgRef = doc(db, collectionPath, chatId, 'messages', msg.id);
                    await updateDoc(msgRef, {
                        isDelivered: true
                    });
                });
            }
        }, (error) => {
            console.error('Error fetching messages:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [chatId, currentUser.uid, isGroup, groupData]);
    
    // Handle clicking outside to close all menus
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            // Don't close if clicking inside a menu or on a button that opens a menu
            if (target.closest('.menu-container')) return;
            
            setShowCallMenu(false);
            setShowAttachmentMenu(false);
            setShowEmojiPicker(false);
            setContextMenu(null);
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowCallMenu(false);
                setShowAttachmentMenu(false);
                setShowEmojiPicker(false);
                setContextMenu(null);
                if (isSelectionMode) setIsSelectionMode(false);
            }
        };

        if (showCallMenu || showAttachmentMenu || showEmojiPicker || contextMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showCallMenu, showAttachmentMenu, showEmojiPicker, contextMenu, isSelectionMode]);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
        setShowCallMenu(false);
        setShowAttachmentMenu(false);
        setShowEmojiPicker(false);
    };

    const handleToggleSelection = (messageId: string) => {
        setSelectedMessageIds(prev => 
            prev.includes(messageId) 
                ? prev.filter(id => id !== messageId) 
                : [...prev, messageId]
        );
    };
    
    const clearSelection = () => {
        setSelectedMessageIds([]);
        setIsSelectionMode(false);
    };

    const selectAllMessages = () => {
        setSelectedMessageIds(messages.map(m => m.id));
    };

    const handleBulkDelete = async () => {
        if (selectedMessageIds.length === 0) return;
        if (!window.confirm(`Delete ${selectedMessageIds.length} messages?`)) return;

        try {
            const collectionPath = isGroup ? 'groups' : 'chats';
            const promises = selectedMessageIds.map(id => {
                const msgRef = doc(db, collectionPath, chatId, 'messages', id);
                return updateDoc(msgRef, {
                    hiddenBy: arrayUnion(currentUser.uid)
                });
            });
            await Promise.all(promises);
            clearSelection();
        } catch (error) {
            console.error('Error in bulk delete:', error);
            alert('Could not delete some messages.');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'file') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (type === 'video' && file.size > 20 * 1024 * 1024) {
            alert('Video file is too large. Please select a video under 20MB.');
            return;
        }

        if (type === 'file' && file.size > 10 * 1024 * 1024) {
            alert('File is too large. Please select a file under 10MB.');
            return;
        }

        const url = URL.createObjectURL(file);
        setMediaPreview({ url, type, file, name: file.name, size: file.size });
        setShowAttachmentMenu(false);
        
        // Focus input
        const input = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (input) input.focus();
    };

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
                } else if (currentMedia.type === 'video') {
                    const videoPath = isGroup ? `groups/${chatId}/videos` : `chats/${chatId}/videos`;
                    videoUrl = await uploadVideo(currentMedia.file, videoPath) || '';
                } else {
                    const filePath = isGroup ? `groups/${chatId}/files` : `chats/${chatId}/files`;
                    imageUrl = await uploadFile(currentMedia.file, filePath) || '';
                }
            }

            const encryptedText = messageText ? encryptMessage(messageText, encryptionSecret) : '';
            const encryptedImageUrl = imageUrl ? encryptMessage(imageUrl, encryptionSecret) : '';
            const encryptedVideoUrl = videoUrl ? encryptMessage(videoUrl, encryptionSecret) : '';

            const collectionPath = isGroup ? 'groups' : 'chats';

            if (editingMessage) {
                const msgRef = doc(db, collectionPath, chatId, 'messages', editingMessage.id);
                await updateDoc(msgRef, {
                    text: encryptedText,
                    isEdited: true
                });
            } else {
                const messageData: any = {
                    text: encryptedText,
                    senderId: currentUser.uid,
                    senderName: currentUser.name,
                    senderProfilePic: currentUser.profilePic || null,
                    createdAt: serverTimestamp(),
                    isRead: false,
                    isDelivered: false,
                    readBy: [currentUser.uid],
                    receiverId: isGroup ? null : otherUser?.uid || null
                };

                if (encryptedImageUrl) {
                    if (currentMedia?.type === 'file') {
                        messageData.fileUrl = encryptedImageUrl;
                        messageData.fileName = currentMedia.name;
                        messageData.fileSize = currentMedia.size;
                        messageData.fileType = currentMedia.file.type;
                    } else {
                        messageData.imageUrl = encryptedImageUrl;
                    }
                }
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
                        lastMessage: messageText || (imageUrl ? (currentMedia?.type === 'file' ? '📄 File' : '📷 Photo') : '🎥 Video'),
                        lastMessageAt: serverTimestamp(),
                        [`unreadCount.${otherUser.uid}`]: 1, // Simple increment or set
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
                        lastMessage: messageText || (imageUrl ? '📷 Photo' : '🎥 Video'),
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

    const handleCreatePoll = async (pollData: { question: string; options: string[] }) => {
        if (!chatId || (!otherUser && !isGroup)) return;

        setSending(true);
        try {
            const collectionPath = isGroup ? 'groups' : 'chats';
            const poll: Poll = {
                question: pollData.question,
                options: pollData.options.map((opt, i) => ({
                    id: `opt-${i}-${Date.now()}`,
                    text: opt,
                    votes: []
                })),
                totalVotes: 0
            };

            const messageData: any = {
                text: encryptMessage('📊 Poll: ' + poll.question, encryptionSecret),
                senderId: currentUser.uid,
                senderName: currentUser.name,
                senderProfilePic: currentUser.profilePic || null,
                createdAt: serverTimestamp(),
                isRead: false,
                isDelivered: false,
                readBy: [currentUser.uid],
                poll: poll,
                receiverId: isGroup ? null : otherUser?.uid || null
            };

            await addDoc(collection(db, collectionPath, chatId, 'messages'), messageData);

            // Update last message pointer
            if (!isGroup && otherUser) {
                const chatRef = doc(db, 'chats', chatId);
                await updateDoc(chatRef, {
                    lastMessage: '📊 Poll: ' + poll.question,
                    lastMessageAt: serverTimestamp(),
                });
            } else if (isGroup) {
                const groupRef = doc(db, 'groups', chatId);
                await updateDoc(groupRef, {
                    lastMessage: '📊 Poll: ' + poll.question,
                    lastMessageAt: serverTimestamp(),
                    lastSenderName: currentUser.name
                });
            }
        } catch (error) {
            console.error('Error creating poll:', error);
        } finally {
            setSending(false);
        }
    };

    const handleVote = async (messageId: string, optionId: string) => {
        if (!chatId) return;
        const collectionPath = isGroup ? 'groups' : 'chats';
        const msgRef = doc(db, collectionPath, chatId, 'messages', messageId);
        
        try {
            const msg = messages.find(m => m.id === messageId);
            if (!msg || !msg.poll) return;

            const newOptions = msg.poll.options.map(opt => {
                const votes = opt.votes || [];
                const hasVoted = votes.includes(currentUser.uid);
                
                if (opt.id === optionId) {
                    return {
                        ...opt,
                        votes: hasVoted 
                            ? votes.filter(uid => uid !== currentUser.uid) 
                            : [...votes, currentUser.uid]
                    };
                } else if (!msg.poll?.allowMultiple && hasVoted) {
                    // Remove vote from other option if multiple votes not allowed
                    return {
                        ...opt,
                        votes: votes.filter(uid => uid !== currentUser.uid)
                    };
                }
                return opt;
            });

            const totalVotes = newOptions.reduce((acc, opt) => acc + (opt.votes?.length || 0), 0);

            await updateDoc(msgRef, {
                'poll.options': newOptions,
                'poll.totalVotes': totalVotes
            });
        } catch (error) {
            console.error('Error voting:', error);
        }
    };

    const handleEditInitiate = (message: Message) => {
        setEditingMessage(message);
        setReplyingToMessage(null);
        setNewMessage(message.text);
    };

    const handleReplyInitiate = (message: Message) => {
        setReplyingToMessage(message);
        setEditingMessage(null);
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
                await updateDoc(msgRef, {
                    hiddenBy: arrayUnion(currentUser.uid)
                });
            }
            setUnsendingMessage(null);
        } catch (error) {
            console.error('Error unsending message:', error);
        }
    };

    if (!otherUser && !isGroup) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-brand-cream/30 text-brand-ebony/50 p-8 text-center">
                <div className="w-24 h-24 bg-brand-parchment/50 rounded-full flex items-center justify-center mb-6 border border-brand-ebony/10 shadow-inner">
                    <Send className="w-10 h-10 text-brand-burgundy/40 ml-1" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-brand-ebony mb-2">Your Messages</h3>
                <p className="max-w-xs mx-auto text-sm italic">Select a chat or search for an alumni to start talking.</p>
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
    const profilePic = isGroup 
        ? null 
        : (otherUser?.profilePic || `https://placehold.co/100x100/1e293b/f8fafc?text=${otherUser?.name.substring(0, 1)}`);

    return (
        <div className="flex-1 flex flex-col h-full bg-brand-cream relative overflow-hidden" 
             style={{backgroundImage: 'url(https://www.transparenttextures.com/patterns/linen.png)'}}>
            
            {/* Context Menu */}
            {contextMenu && (
                <div 
                    className="fixed z-[250] w-48 bg-brand-cream rounded-xl shadow-2xl border border-brand-ebony/10 overflow-hidden animate-in fade-in zoom-in-95 duration-100 menu-container"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <div className="p-1.5">
                        <button 
                            onClick={() => { onBack?.(); setContextMenu(null); }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-brand-ebony hover:bg-brand-parchment/50 rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4 text-brand-burgundy" />
                            Close Chat
                        </button>
                        <button 
                            onClick={() => { setIsSelectionMode(true); setContextMenu(null); }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-brand-ebony hover:bg-brand-parchment/50 rounded-lg transition-colors"
                        >
                            <ListChecks className="w-4 h-4 text-brand-burgundy" />
                            Select Messages
                        </button>
                    </div>
                </div>
            )}

            {/* Selection Mode Header */}
            {isSelectionMode && (
                <div className="absolute top-0 left-0 right-0 z-[150] p-4 bg-brand-burgundy text-white flex items-center justify-between animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-4">
                        <button onClick={clearSelection} className="p-1 hover:bg-white/10 rounded-full">
                            <X className="w-6 h-6" />
                        </button>
                        <span className="font-bold">{selectedMessageIds.length} selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={selectAllMessages} className="px-4 py-2 hover:bg-white/10 rounded-xl text-sm font-bold">
                            Select All
                        </button>
                        {selectedMessageIds.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handleBulkDelete}
                                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                                <button 
                                    onClick={() => { alert(`${selectedMessageIds.length} messages selected`); }}
                                    className="px-4 py-2 bg-white text-brand-burgundy rounded-xl text-sm font-bold shadow-lg"
                                >
                                    More
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 bg-brand-cream/95 border-b border-brand-ebony/5 shadow-sm z-20 backdrop-blur-md sticky top-0">
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
                        <div className="relative">
                            <img
                                src={profilePic!}
                                alt={title!}
                                className="w-10 h-10 rounded-full mr-3 object-cover border border-brand-ebony/10 shadow-sm"
                            />
                            {isUserOnline && (
                                <div className="absolute bottom-0 right-2.5 w-3 h-3 bg-green-500 rounded-full border-2 border-brand-cream shadow-sm"></div>
                            )}
                        </div>
                    )}
                    <div>
                        <h3 className="font-serif font-bold text-brand-ebony text-lg leading-tight">{title}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                            {isGroup ? (
                                <span className="text-[10px] text-brand-ebony/50 font-bold uppercase tracking-wider">{groupData?.members.length} Members</span>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${isUserOnline ? 'bg-green-500' : 'bg-brand-ebony/30'}`}></div>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isUserOnline ? 'text-green-600/80' : 'text-brand-ebony/40'}`}>
                                        {isUserOnline ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-brand-burgundy/5 border border-brand-burgundy/10 rounded-full">
                        <ShieldCheck className="w-3.5 h-3.5 text-brand-burgundy/70" />
                        <span className="text-[10px] text-brand-burgundy/70 font-medium whitespace-nowrap uppercase tracking-tighter">Secured by AlumNest E2EE</span>
                    </div>

                    <div className="relative">
                        <button 
                            onClick={() => {
                                setShowCallMenu(!showCallMenu);
                                if (!showCallMenu) setShowAttachmentMenu(false);
                            }}
                            className={`p-2.5 rounded-full transition-all flex items-center justify-center shadow-sm ${showCallMenu ? 'bg-brand-burgundy text-white' : 'bg-brand-cream text-brand-burgundy hover:bg-brand-burgundy/10 border border-brand-burgundy/20'}`}
                        >
                            <Phone className="w-4 h-4 fill-current" />
                        </button>

                        {showCallMenu && (
                            <>
                                <div className="fixed inset-0 z-[100]" onClick={() => setShowCallMenu(false)}></div>
                                <div 
                                    className="absolute right-0 top-full mt-2 w-48 bg-brand-cream rounded-2xl shadow-xl border border-brand-ebony/10 overflow-hidden z-[110] animate-in fade-in slide-in-from-top-2 duration-200"
                                >
                                    <div className="p-2 space-y-1">
                                        <button 
                                            onClick={() => { setShowCallMenu(false); alert('Voice Call feature coming soon!'); }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-brand-parchment/50 rounded-xl transition-colors text-left group"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100">
                                                <Phone className="w-4 h-4" />
                                            </div>
                                            <p className="text-sm font-bold text-brand-ebony">Voice Call</p>
                                        </button>
                                        <button 
                                            onClick={() => { setShowCallMenu(false); alert('Video Call feature coming soon!'); }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-brand-parchment/50 rounded-xl transition-colors text-left group"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-100">
                                                <Video className="w-4 h-4" />
                                            </div>
                                            <p className="text-sm font-bold text-brand-ebony">Video Call</p>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div 
                className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-brand-cream/20 relative"
                onContextMenu={handleContextMenu}
            >
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-burgundy opacity-50" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-brand-ebony/40 space-y-4 max-w-sm mx-auto text-center">
                        {!isGroup && otherUser && (
                            <img
                                src={profilePic!}
                                alt={title!}
                                className="w-24 h-24 rounded-full object-cover shadow-lg opacity-60 ring-4 ring-brand-ebony/10"
                            />
                        )}
                        {isGroup && (
                            <div className="w-24 h-24 bg-brand-burgundy/10 rounded-full flex items-center justify-center ring-4 ring-brand-ebony/10 shadow-lg">
                                <Users className="w-10 h-10 text-brand-burgundy/40" />
                            </div>
                        )}
                        <div>
                            <p className="text-lg font-serif italic text-brand-ebony/60 mb-2">This is the start of your journey with <strong className="text-brand-burgundy">{title}</strong>.</p>
                            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-parchment rounded-2xl border border-brand-burgundy/10 shadow-sm backdrop-blur-sm">
                                <Lock className="w-3 h-3 text-green-600" />
                                <p className="text-[10px] text-brand-ebony/60 italic uppercase tracking-tighter">Messages are end-to-end encrypted</p>
                            </div>
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
                            onVote={handleVote}
                            currentUserId={currentUser.uid}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedMessageIds.includes(message.id)}
                            onSelect={handleToggleSelection}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 pb-8 sm:pb-4 bg-brand-parchment/90 border-t border-brand-ebony/10 backdrop-blur-md relative z-20">
                {editingMessage && (
                    <div className="flex items-center justify-between mb-2 px-4 py-2 bg-brand-burgundy/10 rounded-xl border border-brand-burgundy/20 animate-in slide-in-from-bottom-2 duration-200">
                        <div className="flex items-center gap-2">
                            <CheckCheck className="w-3.5 h-3.5 text-brand-burgundy" />
                            <p className="text-xs text-brand-burgundy font-bold italic uppercase tracking-wider">Editing message...</p>
                        </div>
                        <button onClick={() => { setEditingMessage(null); setNewMessage(''); }} className="text-brand-burgundy hover:text-brand-ebony transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                {replyingToMessage && (
                    <div className="flex items-center justify-between mb-2 px-4 py-2 bg-brand-ebony/5 rounded-xl border-l-4 border-brand-burgundy animate-in slide-in-from-bottom-2 duration-200 shadow-sm">
                        <div className="overflow-hidden">
                            <p className="text-[10px] text-brand-burgundy font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                <Paperclip className="w-2.5 h-2.5" /> Replying to {replyingToMessage.senderName}
                            </p>
                            <p className="text-xs text-brand-ebony/60 italic truncate">"{replyingToMessage.text}"</p>
                        </div>
                        <button onClick={() => setReplyingToMessage(null)} className="p-1 text-brand-ebony/40 hover:text-brand-burgundy transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                
                {mediaPreview && (
                    <div className="mb-3 relative group w-fit animate-in zoom-in-95 duration-200">
                        {mediaPreview.type === 'image' ? (
                            <img src={mediaPreview.url} alt="Preview" className="h-32 w-auto rounded-xl border-2 border-brand-ebony/20 object-cover shadow-lg ring-1 ring-brand-ebony/5" />
                        ) : mediaPreview.type === 'video' ? (
                            <video src={mediaPreview.url} className="h-32 w-auto rounded-xl border-2 border-brand-ebony/20 shadow-lg ring-1 ring-brand-ebony/5" muted />
                        ) : (
                            <div className="h-32 w-48 bg-brand-cream border-2 border-brand-ebony/20 rounded-xl flex flex-col items-center justify-center p-3 shadow-lg gap-2">
                                <FileText className="w-8 h-8 text-brand-burgundy/60" />
                                <p className="text-[10px] text-brand-ebony font-bold truncate w-full text-center px-2">{mediaPreview.name}</p>
                                <p className="text-[8px] text-brand-ebony/40 uppercase tracking-widest">{(mediaPreview.size! / 1024).toFixed(1)} KB</p>
                            </div>
                        )}
                        <button 
                            onClick={() => setMediaPreview(null)}
                            className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors z-30"
                        >
                            <X className="w-3 h-3" />
                        </button>
                        {uploadingMedia && (
                            <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center z-10 backdrop-blur-[1px]">
                                <Loader2 className="w-8 h-8 animate-spin text-white" />
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-3">
                    <div className="relative menu-container">
                        <button
                            type="button"
                            onClick={() => {
                                setShowAttachmentMenu(!showAttachmentMenu);
                                if (!showAttachmentMenu) setShowCallMenu(false);
                                setShowEmojiPicker(false);
                            }}
                            className={`p-3 rounded-full transition-all border shadow-sm flex items-center justify-center ${showAttachmentMenu ? 'bg-brand-burgundy text-white' : 'bg-brand-cream text-brand-burgundy hover:bg-brand-burgundy/10 border-brand-burgundy/20'}`}
                        >
                            <Plus className={`w-5 h-5 transition-transform duration-300 ${showAttachmentMenu ? 'rotate-45' : 'rotate-0'}`} />
                        </button>

                        {showAttachmentMenu && (
                            <div className="absolute left-0 bottom-full mb-3 w-56 bg-brand-cream rounded-2xl shadow-2xl border border-brand-ebony/10 overflow-hidden z-[110] animate-in fade-in slide-in-from-bottom-4 duration-200">
                                <div className="p-2 space-y-1">
                                    <button 
                                        onClick={() => { fileInputRef.current?.click(); }}
                                        className="w-full flex items-center gap-3 px-3 py-3 hover:bg-brand-parchment/50 rounded-xl transition-all group text-left"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                            <ImageIcon className="w-4.5 h-4.5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-brand-ebony">Image</p>
                                            <p className="text-[10px] text-brand-ebony/40">Share photos</p>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={() => { videoInputRef.current?.click(); }}
                                        className="w-full flex items-center gap-3 px-3 py-3 hover:bg-brand-parchment/50 rounded-xl transition-all group text-left"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                                            <VideoIcon className="w-4.5 h-4.5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-brand-ebony">Video</p>
                                            <p className="text-[10px] text-brand-ebony/40">Share clips (max 20MB)</p>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={() => { docInputRef.current?.click(); }}
                                        className="w-full flex items-center gap-3 px-3 py-3 hover:bg-brand-parchment/50 rounded-xl transition-all group text-left"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                                            <FileText className="w-4.5 h-4.5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-brand-ebony">Document</p>
                                            <p className="text-[10px] text-brand-ebony/40">PDF, Word, etc.</p>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={() => { setShowAttachmentMenu(false); setShowPollModal(true); }}
                                        className="w-full flex items-center gap-3 px-3 py-3 hover:bg-brand-parchment/50 rounded-xl transition-all group text-left"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                                            <BarChart2 className="w-4.5 h-4.5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-brand-ebony">Create Poll</p>
                                            <p className="text-[10px] text-brand-ebony/40">Ask a question</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}

                        <input type="file" ref={fileInputRef} onChange={(e) => handleFileSelect(e, 'image')} accept="image/*" className="hidden" />
                        <input type="file" ref={videoInputRef} onChange={(e) => handleFileSelect(e, 'video')} accept="video/*" className="hidden" />
                        <input type="file" ref={docInputRef} onChange={(e) => handleFileSelect(e, 'file')} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" className="hidden" />
                    </div>
                    
                    <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-3">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={editingMessage ? "Edit message..." : (replyingToMessage ? "Type a reply..." : "Type a message...")}
                                className="w-full px-5 py-3.5 pr-12 bg-brand-cream border border-brand-ebony/10 rounded-2xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy outline-none transition-all placeholder:text-brand-ebony/30 text-brand-ebony shadow-inner text-sm"
                                disabled={sending}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 menu-container">
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className={`p-1.5 rounded-full transition-colors ${showEmojiPicker ? 'bg-brand-burgundy/10 text-brand-burgundy' : 'text-brand-ebony/30 hover:text-brand-burgundy'}`}
                                >
                                    <Smile className="w-5 h-5" />
                                </button>
                                
                                {showEmojiPicker && (
                                    <div className="absolute bottom-full right-0 mb-4 p-3 bg-brand-cream rounded-2xl shadow-2xl border border-brand-ebony/10 z-[120] w-64 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="grid grid-cols-5 gap-2">
                                            {COMMON_EMOJIS.map(emoji => (
                                                <button
                                                    key={emoji}
                                                    type="button"
                                                    onClick={() => {
                                                        setNewMessage(prev => prev + emoji);
                                                        // Keep picker open or close based on preference? Usually keep open for multiple.
                                                    }}
                                                    className="text-xl p-2 hover:bg-brand-parchment rounded-xl transition-colors"
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={(!newMessage.trim() && !mediaPreview) || sending}
                            className="p-3.5 bg-brand-burgundy text-white rounded-2xl hover:bg-[#5a2427] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-burgundy/20 flex items-center justify-center"
                        >
                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                editingMessage ? <CheckCheck className="w-5 h-5" /> : <Send className="w-5 h-5" />
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {forwardingMessage && (
                <ForwardMessageModal
                    isOpen={!!forwardingMessage}
                    onClose={() => setForwardingMessage(null)}
                    message={forwardingMessage!}
                    currentUser={currentUser}
                    originSharedSecret={encryptionSecret}
                />
            )}

            {unsendingMessage && (
                <div className="fixed inset-0 bg-brand-ebony/40 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
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
                                onClick={() => handleUnsendMessage(unsendingMessage!, 'me')}
                                className="w-full py-3 px-4 bg-brand-parchment hover:bg-brand-parchment/80 text-brand-ebony rounded-xl font-bold transition-colors flex items-center justify-center gap-2 border border-brand-ebony/10 shadow-sm"
                            >
                                {unsendingMessage.senderId === currentUser.uid ? 'Unsend for me' : 'Delete for me'}
                            </button>
                            {unsendingMessage.senderId === currentUser.uid && !unsendingMessage.isDeleted && (
                                Math.floor((Date.now() - (unsendingMessage.createdAt?.toMillis() || 0)) / 60000) < 10
                            ) && (
                                <button 
                                    onClick={() => handleUnsendMessage(unsendingMessage!, 'everyone')}
                                    className="w-full py-3 px-4 bg-brand-burgundy hover:bg-[#5a2427] text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-md shadow-brand-burgundy/20"
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

            <PollModal
                isOpen={showPollModal}
                onClose={() => setShowPollModal(false)}
                onSubmit={handleCreatePoll}
            />
        </div>
    );
}
