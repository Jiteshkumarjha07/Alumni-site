'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { User, Message, Group, Poll } from '@/types';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc, doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MessageBubble } from './MessageBubble';
import { ForwardMessageModal } from './ForwardMessageModal';
import { PollModal } from '../modals/PollModal';
import { Send, Loader2, ArrowLeft, X, CheckCheck, ShieldCheck, Lock, Image as ImageIcon, Video as VideoIcon, Plus, Users, Phone, Video, Mic, MicOff, Paperclip, FileText, BarChart2, Download, Smile, LogOut, ListChecks, CheckCircle2, Trash2, Sparkles, MoreHorizontal, Info, Pencil } from 'lucide-react';
import { encryptMessage, decryptMessage, getSharedSecret } from '@/lib/encryption';
import { uploadMedia, uploadVideo, uploadFile, uploadAudio } from '@/lib/media';
import { useAuth } from '@/contexts/AuthContext';

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
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showPollModal, setShowPollModal] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
    
    const { suspendedUids } = useAuth();
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
    const attachmentMenuRef = useRef<HTMLDivElement>(null);
    const headerMoreMenuRef = useRef<HTMLDivElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    // Voice message recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null); 
    const isStartingRecordingRef = useRef(false);

    const startRecording = async () => {
        if (isStartingRecordingRef.current || isRecording) return;
        isStartingRecordingRef.current = true;
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];
            
            let options: MediaRecorderOptions | undefined = undefined;
            if (MediaRecorder.isTypeSupported('audio/webm')) {
                options = { mimeType: 'audio/webm' };
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                options = { mimeType: 'audio/mp4' };
            }
            
            const recorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.start(); 
            setIsRecording(true);
            setRecordingSeconds(0);
            recordingTimerRef.current = setInterval(() => {
                setRecordingSeconds(s => s + 1);
            }, 1000);
        } catch (err: any) {
            console.error('Audio setup failed:', err);
            alert('Microphone access denied or not supported.');
        } finally {
            isStartingRecordingRef.current = false;
        }
    };

    const stopRecording = async (send: boolean) => {
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setIsRecording(false);
        const finalDuration = recordingSeconds;
        setRecordingSeconds(0);

        const recorder = mediaRecorderRef.current;
        if (!recorder) return;

        if (!send) {
            try { recorder.stop(); } catch(e) {}
            recorder.stream.getTracks().forEach(t => t.stop());
            return;
        }

        recorder.onstop = async () => {
            recorder.stream.getTracks().forEach(t => t.stop());
            const rawBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
            const buffer = await rawBlob.arrayBuffer();
            const blob = new Blob([buffer], { type: rawBlob.type });
            audioChunksRef.current = [];

            if (blob.size === 0) return;

            setSending(true);
            try {
                const collectionPath = isGroup ? 'groups' : 'chats';
                const audioUrl = await uploadAudio(blob, isGroup ? `groups/${chatId}/audio` : `chats/${chatId}/audio`);
                if (!audioUrl) return;

                const encryptedAudioUrl = encryptMessage(audioUrl, encryptionSecret);
                const messageData: any = {
                    text: encryptMessage('🎙️ Voice message', encryptionSecret),
                    audioUrl: encryptedAudioUrl,
                    audioDuration: finalDuration,
                    senderId: currentUser.uid,
                    senderName: currentUser.name,
                    senderProfilePic: currentUser.profilePic || null,
                    createdAt: serverTimestamp(),
                    isRead: false,
                    isDelivered: false,
                    readBy: [currentUser.uid],
                    receiverId: isGroup ? null : otherUser?.uid || null,
                };
                if (!isGroup && otherUser) {
                    await setDoc(doc(db, 'chats', chatId), {
                        participants: [currentUser.uid, otherUser.uid],
                        lastMessage: '🎙️ Voice message',
                        lastMessageAt: serverTimestamp(),
                        [`unreadCount.${otherUser.uid}`]: 1,
                        participantDetails: {
                            [currentUser.uid]: { name: currentUser.name, profilePic: currentUser.profilePic || null },
                            [otherUser.uid]: { name: otherUser.name, profilePic: otherUser.profilePic || null },
                        },
                    }, { merge: true });
                } else if (isGroup) {
                    await updateDoc(doc(db, 'groups', chatId), {
                        lastMessage: '🎙️ Voice message',
                        lastMessageAt: serverTimestamp(),
                        lastSenderName: currentUser.name,
                    });
                }
                
                await addDoc(collection(db, collectionPath, chatId, 'messages'), messageData);
            } catch (err) {
                console.error('Voice recording failed:', err);
            } finally {
                setSending(false);
            }
        };
        try { if (recorder.state !== 'inactive') recorder.stop(); } catch (err) {}
    };

    const encryptionSecret = isGroup 
        ? (groupData?.groupSecret || chatId) 
        : (otherUser ? getSharedSecret(currentUser.uid, otherUser.uid) : '');

    const [otherUserStatus, setOtherUserStatus] = useState<{ isOnline: boolean; lastSeen?: any } | null>(null);

    const [isUserOnline, setIsUserOnline] = useState(false);

    useEffect(() => {
        if (!otherUserStatus) {
            setIsUserOnline(false);
            return;
        }
        const checkOnline = () => {
            if (!otherUserStatus.isOnline || !otherUserStatus.lastSeen) {
                setIsUserOnline(false);
                return;
            }
            try {
                const diff = Date.now() - otherUserStatus.lastSeen.toMillis();
                setIsUserOnline(diff < 60000);
            } catch (e) {
                setIsUserOnline(otherUserStatus.isOnline);
            }
        };

        checkOnline();
        const interval = setInterval(checkOnline, 5000); // Faster checks for "immediate" updates
        return () => clearInterval(interval);
    }, [otherUserStatus]);

    // Click outside handlers for all pop-ups
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            
            if (showAttachmentMenu && attachmentMenuRef.current && !attachmentMenuRef.current.contains(target)) {
                setShowAttachmentMenu(false);
            }
            if (showMoreMenu && headerMoreMenuRef.current && !headerMoreMenuRef.current.contains(target)) {
                setShowMoreMenu(false);
            }
            if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(target)) {
                setShowEmojiPicker(false);
            }
            if (contextMenu && contextMenuRef.current && !contextMenuRef.current.contains(target)) {
                setContextMenu(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showAttachmentMenu, showMoreMenu, showEmojiPicker, contextMenu]);

    useEffect(() => {
        if (isGroup || !otherUser?.uid) return;
        const unsubscribe = onSnapshot(doc(db, 'users', otherUser.uid), (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                setOtherUserStatus({ isOnline: data.isOnline || false, lastSeen: data.lastSeen });
            }
        }, (err) => {
            console.error('[ChatWindow] Error fetching user status:', err);
        });
        return () => unsubscribe();
    }, [otherUser?.uid, isGroup]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!chatId || (isGroup && !groupData?.id)) return;

        let isMounted = true;
        setLoading(true);
        const collectionPath = isGroup ? 'groups' : 'chats';
        const q = query(collection(db, collectionPath, chatId, 'messages'), orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!isMounted) return;
            const fetchedMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data({ serverTimestamps: 'estimate' })
            })) as Message[];

            setMessages(fetchedMessages.filter(msg => !msg.hiddenBy?.includes(currentUser.uid)));
            setLoading(false);

            fetchedMessages.filter(msg => msg.senderId !== currentUser.uid && (!msg.isRead || !msg.isDelivered)).forEach(async (msg) => {
                if (!isMounted) return;
                await updateDoc(doc(db, collectionPath, chatId, 'messages', msg.id), {
                    readBy: arrayUnion(currentUser.uid),
                    isRead: true,
                    isDelivered: true
                }).catch(err => console.error('[ChatWindow] Error updating read status:', err));
            });

            if (!isGroup && isMounted) {
                updateDoc(doc(db, 'chats', chatId), { [`unreadCount.${currentUser.uid}`]: 0 })
                    .catch(err => console.error('[ChatWindow] Error clearing unread count:', err));
            }
        }, (error) => {
            console.error('Error fetching messages:', error);
            if (isMounted) setLoading(false);
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    // Use groupData?.id (stable string) instead of groupData (object reference)
    // to prevent unnecessary re-mounts that race with cleanup
    }, [chatId, currentUser.uid, isGroup, groupData?.id]);

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
                if (currentMedia.type === 'image') imageUrl = await uploadMedia(currentMedia.file) || '';
                else if (currentMedia.type === 'video') videoUrl = await uploadVideo(currentMedia.file, isGroup ? `groups/${chatId}/videos` : `chats/${chatId}/videos`) || '';
                else imageUrl = await uploadFile(currentMedia.file, isGroup ? `groups/${chatId}/files` : `chats/${chatId}/files`) || '';
            }

            const encryptedText = messageText ? encryptMessage(messageText, encryptionSecret) : '';
            const encryptedImageUrl = imageUrl ? encryptMessage(imageUrl, encryptionSecret) : '';
            const encryptedVideoUrl = videoUrl ? encryptMessage(videoUrl, encryptionSecret) : '';
            const collectionPath = isGroup ? 'groups' : 'chats';

            if (editingMessage) {
                await updateDoc(doc(db, collectionPath, chatId, 'messages', editingMessage.id), {
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
                        messageData.fileUrl = encryptedImageUrl; messageData.fileName = currentMedia.name;
                        messageData.fileSize = currentMedia.size; messageData.fileType = currentMedia.file.type;
                    } else messageData.imageUrl = encryptedImageUrl;
                }
                if (encryptedVideoUrl) messageData.videoUrl = encryptedVideoUrl;
                if (currentReply) {
                    messageData.replyToId = currentReply.id;
                    messageData.replyToText = encryptMessage(currentReply.text, encryptionSecret);
                    messageData.replyToSenderName = currentReply.senderName || 'Unknown';
                }
                if (!isGroup && otherUser) {
                    // First, ensure the chat document exists with participant details.
                    // Also reset deletedBy to [] so the conversation is visible to both
                    // parties even if one previously deleted it.
                    await setDoc(doc(db, 'chats', chatId), {
                        participants: [currentUser.uid, otherUser.uid],
                        lastMessage: messageText || (imageUrl ? (currentMedia?.type === 'file' ? '📄 File' : '📷 Photo') : '🎥 Video'),
                        lastMessageAt: serverTimestamp(),
                        deletedBy: [],   // ← clear any previous deletions so chat reappears
                        participantDetails: { 
                            [currentUser.uid]: {name: currentUser.name, profilePic: currentUser.profilePic || ''}, 
                            [otherUser.uid]: {name: otherUser.name, profilePic: otherUser.profilePic || ''} 
                        }
                    }, { merge: true });

                    // Increment the unread count properly so multiple messages stack up
                    await updateDoc(doc(db, 'chats', chatId), {
                        [`unreadCount.${otherUser.uid}`]: increment(1)
                    });

                    // Send a notification to the receiver so their notification bell lights up
                    await addDoc(collection(db, 'notifications'), {
                        userId: otherUser.uid,
                        type: 'message',
                        sourceUserUid: currentUser.uid,
                        sourceUserName: currentUser.name,
                        sourceUserProfilePic: currentUser.profilePic || '',
                        message: `sent you a message: "${(messageText || '📷 Media').substring(0, 40)}${messageText?.length > 40 ? '...' : ''}"`,
                        link: `/messages`,
                        createdAt: serverTimestamp(),
                        isRead: false,
                    }).catch(() => {}); // Non-blocking — don't fail the message send if notification fails
                } else if (isGroup) {
                    await updateDoc(doc(db, 'groups', chatId), {
                        lastMessage: messageText || (imageUrl ? '📷 Photo' : '🎥 Video'),
                        lastMessageAt: serverTimestamp(),
                        lastSenderName: currentUser.name
                    });
                }

                await addDoc(collection(db, collectionPath, chatId, 'messages'), messageData);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
            setUploadingMedia(false);
        }
    };

    const handleCreatePoll = async (pollData: { question: string; options: string[] }) => {
        if (!chatId || (!otherUser && !isGroup)) return;
        setSending(true);
        try {
            const poll: Poll = {
                question: pollData.question,
                options: pollData.options.map((opt, i) => ({ id: `opt-${i}-${Date.now()}`, text: opt, votes: [] })),
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
            await addDoc(collection(db, isGroup ? 'groups' : 'chats', chatId, 'messages'), messageData);
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
                    return { ...opt, votes: hasVoted ? votes.filter(uid => uid !== currentUser.uid) : [...votes, currentUser.uid] };
                } else if (!msg.poll?.allowMultiple && hasVoted) {
                    return { ...opt, votes: votes.filter(uid => uid !== currentUser.uid) };
                }
                return opt;
            });
            await updateDoc(msgRef, { 'poll.options': newOptions, 'poll.totalVotes': newOptions.reduce((acc, opt) => acc + (opt.votes?.length || 0), 0) });
        } catch (error) {
            console.error('Error voting:', error);
        }
    };

    const handleReact = async (messageId: string, emoji: string) => {
        if (!chatId) return;
        try {
            const msgRef = doc(db, isGroup ? 'groups' : 'chats', chatId, 'messages', messageId);
            const msg = messages.find(m => m.id === messageId);
            if (!msg) return;

            const currentReactions = msg.reactions || {};
            const userHadEmoji = Object.keys(currentReactions).find(key => 
                currentReactions[key].includes(currentUser.uid)
            );

            // Clear current user from all reactions
            const newReactions: Record<string, string[]> = {};
            Object.keys(currentReactions).forEach(key => {
                const filtered = currentReactions[key].filter(uid => uid !== currentUser.uid);
                if (filtered.length > 0) {
                    newReactions[key] = filtered;
                }
            });
            
            // If they clicked a DIFFERENT emoji or had none, add the new one
            if (userHadEmoji !== emoji) {
                newReactions[emoji] = [...(newReactions[emoji] || []), currentUser.uid];
            }

            await updateDoc(msgRef, { reactions: newReactions });
        } catch (error) {
            console.error('Error reacting to message:', error);
        }
    };

    const handleUnsendMessage = async (message: Message, mode: 'me' | 'everyone') => {
        if (!chatId) return;
        try {
            setUnsendingMessage(null);
            const msgRef = doc(db, isGroup ? 'groups' : 'chats', chatId, 'messages', message.id);
            if (mode === 'everyone') {
                await updateDoc(msgRef, {
                    text: encryptMessage('🚫 This message was unsent', encryptionSecret),
                    imageUrl: '', videoUrl: '', isDeleted: true
                });
            } else {
                await updateDoc(msgRef, { hiddenBy: arrayUnion(currentUser.uid) });
            }
        } catch (error) {
            console.error('Error unsending message:', error);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedMessageIds.length === 0) return;
        try {
            const promises = selectedMessageIds.map(id => updateDoc(doc(db, isGroup ? 'groups' : 'chats', chatId, 'messages', id), { hiddenBy: arrayUnion(currentUser.uid) }));
            await Promise.all(promises);
            setSelectedMessageIds([]);
            setIsSelectionMode(false);
        } catch (error) {
            console.error('Error in bulk delete:', error);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'file') => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setMediaPreview({ url, type, file, name: file.name, size: file.size });
        setShowAttachmentMenu(false);
    };

    if (!otherUser && !isGroup) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 text-center bg-white/40 dark:bg-black/5 animate-fade-in gap-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-brand-burgundy/10 rounded-full blur-3xl animate-pulse" />
                    <div className="relative w-20 h-20 md:w-24 md:h-24 bg-white dark:bg-brand-parchment rounded-full flex items-center justify-center shadow-premium transform hover:scale-110 transition-transform duration-700">
                        <div className="absolute inset-2 border-2 border-dashed border-brand-burgundy/20 rounded-full animate-[spin_20s_linear_infinite]" />
                        <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-brand-burgundy underline-offset-8" />
                    </div>
                </div>
                <div className="space-y-3 max-w-sm">
                    <h3 className="text-2xl md:text-3xl font-serif font-black text-brand-ebony tracking-tight">Your Inbox</h3>
                    <p className="text-[14px] md:text-base font-medium text-brand-ebony/40 leading-relaxed italic">
                        Select a connection from your tribe to resume your secure legacy exchange.
                    </p>
                </div>
                <div className="flex items-center gap-3 px-6 py-3 bg-brand-burgundy/5 rounded-2xl border border-brand-burgundy/10 shadow-inner group transition-all hover:bg-brand-burgundy/10">
                    <ShieldCheck className="w-5 h-5 text-brand-burgundy/60 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-brand-burgundy/60">
                        Secured by AlumNest E2EE
                    </span>
                </div>
            </div>
        );
    }

    const title = isGroup ? groupData?.groupName : otherUser?.name;
    const profilePic = isGroup ? null : (otherUser?.profilePic || `https://placehold.co/100x100/4f46e5/ffffff?text=${otherUser?.name.substring(0, 1)}`);

    return (
        <div className="flex-1 flex flex-col h-full bg-white/20 dark:bg-brand-parchment/5 relative overflow-hidden">
            {/* Selection Mode Navbar */}
            {isSelectionMode && (
                <div className="absolute top-0 left-0 right-0 z-[150] px-4 py-3 bg-gradient-indigo text-white flex items-center justify-between animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-3">
                        <button onClick={() => { setIsSelectionMode(false); setSelectedMessageIds([]); }} className="p-2 hover:bg-white/10 rounded-full transition-all shrink-0">
                            <X className="w-5 h-5" />
                        </button>
                        <span className="text-sm font-extrabold">{selectedMessageIds.length} Selected</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <button onClick={handleBulkDelete} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all">
                            Delete
                        </button>
                        <button onClick={() => setSelectedMessageIds([])} className="px-4 py-2 bg-white text-brand-burgundy rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-xl">
                            Deselect
                        </button>
                    </div>
                </div>
            )}

            {/* Chat Header */}
            <div className="flex items-center justify-between px-6 py-2 bg-white dark:bg-brand-cream border-b border-brand-ebony/10 dark:border-white/10 z-30 sticky top-0 shadow-sm">
                <div className="flex items-center flex-1 min-w-0 pr-4">
                    {onBack && (
                        <button onClick={onBack} className="md:hidden -ml-2 mr-2 p-2.5 hover:bg-brand-burgundy/10 active:bg-brand-burgundy/20 text-brand-ebony/80 rounded-xl transition-all shrink-0 active:scale-90 flex items-center justify-center">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <div className="relative mr-4 shrink-0">
                        {isGroup ? (
                            <div className="w-10 h-10 bg-gradient-to-br from-brand-burgundy to-[#4a1c1f] rounded-xl flex items-center justify-center text-white shadow-lg">
                                <Users className="w-5 h-5" />
                            </div>
                        ) : (
                            <div className="relative block group/avatar shrink-0">
                                <img src={profilePic!} alt={title!} className="w-9 h-9 rounded-xl object-cover border-2 border-white dark:border-brand-parchment shadow-md group-hover/avatar:scale-110 group-active/avatar:scale-95 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ring-0 group-hover/avatar:ring-4 group-hover/avatar:ring-brand-burgundy/20" />
                                <div className={`absolute -bottom-1 -right-1 flex h-[10px] w-[10px] items-center justify-center rounded-full border border-white dark:border-brand-ebony transition-transform duration-300 group-hover/avatar:scale-125 ${isUserOnline ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-brand-ebony/30'}`}>
                                    {isUserOnline && <div className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-60" />}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex flex-col justify-center pl-1">
                        {isGroup ? (
                            <h3 className="text-lg md:text-xl font-serif font-black text-black dark:text-white truncate leading-tight tracking-tight">{title}</h3>
                        ) : (
                            <Link href={`/profile/${otherUser?.uid}`}>
                                <h3 className="text-lg md:text-xl font-serif font-black text-black dark:text-white truncate leading-tight tracking-tight hover:text-brand-burgundy transition-colors">{title}</h3>
                            </Link>
                        )}
                        <div className="flex items-center mt-0.5">
                            {isGroup ? (
                                <p className="text-[13px] font-bold text-brand-ebony/60 dark:text-white/60 tracking-widest truncate uppercase">{groupData?.members.length} Contributor Circle</p>
                            ) : (
                                <div className="h-5 overflow-hidden relative w-full translate-z-0">
                                    <div className={`flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isUserOnline ? 'translate-y-0' : '-translate-y-5'}`}>
                                        <div className="h-5 flex items-center gap-2.5 shrink-0">
                                            <div className="relative flex h-2.5 w-2.5">
                                                <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 duration-1000"></div>
                                                <div className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_15px_2px_rgba(16,185,129,0.8)]"></div>
                                            </div>
                                            <p className="text-[12px] font-black tracking-[0.1em] truncate text-emerald-600 dark:text-emerald-400 uppercase">
                                                Online
                                            </p>
                                        </div>
                                        <div className="h-5 flex items-center gap-2.5 shrink-0">
                                            <div className="h-2.5 w-2.5 rounded-full bg-brand-ebony/20 dark:bg-white/10"></div>
                                            <p className="text-[12px] font-bold tracking-[0.1em] truncate text-brand-ebony/40 dark:text-white/30 uppercase">
                                                Away
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                    <div className="hidden lg:flex items-center gap-1.5 px-4 py-2 bg-brand-ebony/[0.03] rounded-full mr-2 ring-1 ring-brand-ebony/5">
                        <Lock className="w-3.5 h-3.5 text-brand-ebony/40" />
                        <span className="text-[9px] font-extrabold text-brand-ebony/40 uppercase tracking-widest whitespace-nowrap">End-to-End Encrypted</span>
                    </div>

                    <button 
                        onClick={() => setShowCallMenu(!showCallMenu)}
                        className={`p-3 rounded-xl transition-all shadow-sm border ${showCallMenu ? 'bg-brand-burgundy text-white border-transparent scale-105' : 'bg-white dark:bg-white/5 text-brand-burgundy border-white hover:bg-brand-burgundy/5 hover:border-brand-burgundy/20'}`}
                    >
                        <Phone className="w-4 h-4" />
                    </button>

                    <div className="relative" ref={headerMoreMenuRef}>
                        <button 
                            onClick={() => setShowMoreMenu(!showMoreMenu)}
                            className={`p-3 rounded-xl transition-all shadow-sm border ${showMoreMenu ? 'bg-brand-burgundy text-white border-brand-burgundy' : 'bg-white dark:bg-white/5 text-brand-burgundy border-white hover:bg-brand-burgundy/5 hover:border-brand-burgundy/20'}`}
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {showMoreMenu && (
                            <div className="absolute right-0 top-14 w-60 card-premium shadow-2xl z-[80] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="p-2 space-y-1">
                                    <button onClick={() => { setIsSelectionMode(true); setShowMoreMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-brand-ebony hover:bg-brand-ebony/5 rounded-xl transition-all">
                                        <ListChecks className="w-4 h-4 text-brand-burgundy" />
                                        Select Messages
                                    </button>
                                    <button className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-brand-ebony hover:bg-brand-ebony/5 rounded-xl transition-all opacity-50 cursor-not-allowed">
                                        <Info className="w-4 h-4 text-brand-burgundy" />
                                        Circle Info
                                    </button>
                                    <button onClick={() => { onBack?.(); setShowMoreMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all">
                                        <LogOut className="w-4 h-4" />
                                        Close Conversation
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div
                className="flex-1 overflow-y-auto px-2 md:px-6 pt-4 pb-[120px] md:pb-24 space-y-2.5 scrollbar-hide bg-white/30 dark:bg-brand-parchment/5"
                style={{ containerType: 'inline-size' }}
                onContextMenu={(e) => {
                    // Disable custom context menu on touch devices to prioritize long-press selection
                    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY });
                }}
                onClick={() => contextMenu && setContextMenu(null)}
            >
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="w-10 h-10 animate-spin text-indigo-500/20" />
                    </div>
                ) : messages.filter(m => !suspendedUids.has(m.senderId)).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-8 animate-fade-in max-w-sm mx-auto">
                         {isGroup ? (
                            <div className="w-24 h-24 bg-indigo-500/10 rounded-[2rem] flex items-center justify-center text-indigo-500 shadow-xl border border-indigo-500/20">
                                <Users className="w-10 h-10" />
                            </div>
                        ) : (
                            <img src={profilePic!} alt={title!} className="w-24 h-24 rounded-[2rem] object-cover shadow-2xl border-4 border-white dark:border-brand-parchment ring-1 ring-brand-ebony/5" />
                        )}
                        <div className="text-center">
                            <p className="text-xl font-serif font-extrabold text-brand-ebony mb-3">Begin your story with {title}</p>
                            <div className="flex items-center justify-center gap-2 text-emerald-500/60 font-extrabold uppercase tracking-widest text-[10px]">
                                <Lock className="w-3.5 h-3.5" />
                                Secured by Deep Encryption
                            </div>
                        </div>
                    </div>
                ) : (
                    messages.filter(m => !suspendedUids.has(m.senderId)).map((message) => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            isOwnMessage={message.senderId === currentUser.uid}
                            onEdit={(m) => { setEditingMessage(m); setNewMessage(decryptMessage(m.text, encryptionSecret)); }}
                            onUnsend={setUnsendingMessage}
                            onReply={setReplyingToMessage}
                            onForward={setForwardingMessage}
                            onReact={handleReact}
                            sharedSecret={encryptionSecret}
                            showSenderName={isGroup}
                            onVote={handleVote}
                            currentUserId={currentUser.uid}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedMessageIds.includes(message.id)}
                            onLongPress={(id) => {
                                if (!isSelectionMode) {
                                    setIsSelectionMode(true);
                                    setSelectedMessageIds([id]);
                                }
                            }}
                            onSelect={(id) => setSelectedMessageIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Right-Click Context Menu */}
            {contextMenu && (
                <>
                    <div
                        className="fixed inset-0 z-[90]"
                        onClick={() => setContextMenu(null)}
                        onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
                    />
                    <div
                        ref={contextMenuRef}
                        className="fixed z-[100] w-56 bg-white/95 dark:bg-brand-parchment/10 backdrop-blur-2xl rounded-2xl border border-brand-ebony/10 dark:border-white/5 shadow-premium overflow-hidden animate-in fade-in zoom-in-95 duration-150 ring-1 ring-brand-ebony/5"
                        style={{ 
                            top: typeof window !== 'undefined' ? Math.min(contextMenu.y, window.innerHeight - 150) : contextMenu.y, 
                            left: typeof window !== 'undefined' ? Math.min(contextMenu.x, window.innerWidth - 240) : contextMenu.x 
                        }}
                    >
                        <div className="p-1.5 space-y-1">
                            <button
                                onClick={() => { setIsSelectionMode(true); setContextMenu(null); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-extrabold text-brand-ebony dark:text-white/90 hover:bg-brand-burgundy/10 hover:text-brand-burgundy rounded-xl transition-all group"
                            >
                                <ListChecks className="w-4 h-4 text-brand-burgundy group-hover:scale-110 transition-transform" />
                                Select Messages
                            </button>
                            <div className="h-px bg-brand-ebony/10 dark:bg-white/10 mx-3" />
                            <button
                                onClick={() => { onBack?.(); setContextMenu(null); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-extrabold text-red-500 hover:bg-red-500/10 rounded-xl transition-all group"
                            >
                                <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                Close Chat
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Input Footer Area */}
            <div className="absolute bottom-0 md:bottom-6 left-0 right-0 md:left-6 md:right-6 z-40 px-2 py-2.5 md:px-3 md:py-3 bg-white/95 dark:bg-brand-parchment/40 backdrop-blur-3xl rounded-none md:rounded-[2rem] shadow-none md:shadow-[0_8px_32px_rgba(0,0,0,0.12)] border-t md:border border-brand-ebony/10 dark:border-brand-ebony/20 pointer-events-auto transition-all duration-300">
                {editingMessage && (
                    <div className="flex items-center justify-between mb-4 px-5 py-3 bg-brand-burgundy/10 rounded-2xl border border-brand-burgundy/20 animate-in slide-in-from-bottom-2 mx-2">
                        <div className="flex items-center gap-3 text-brand-burgundy">
                            <Pencil className="w-4 h-4" />
                            <p className="text-[11px] font-extrabold uppercase tracking-widest">Revising Message...</p>
                        </div>
                        <button onClick={() => { setEditingMessage(null); setNewMessage(''); }} className="text-brand-burgundy hover:text-brand-burgundy/70 transition-all p-1">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                {replyingToMessage && (
                    <div className="flex items-center justify-between mb-4 px-5 py-4 bg-brand-ebony/5 rounded-2xl border-l-[6px] border-brand-burgundy animate-in slide-in-from-bottom-2 shadow-sm mx-2">
                        <div className="overflow-hidden pr-4">
                            <p className="text-[10px] text-brand-burgundy font-extrabold uppercase tracking-[0.15em] mb-1.5 flex items-center gap-2">
                                <Paperclip className="w-3 h-3" /> Responding to {replyingToMessage.senderName}
                            </p>
                            <p className="text-xs text-brand-ebony/40 font-medium italic truncate">"{decryptMessage(replyingToMessage.text, encryptionSecret)}"</p>
                        </div>
                        <button onClick={() => setReplyingToMessage(null)} className="p-2 text-brand-ebony/20 hover:text-red-500 transition-all">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                
                {mediaPreview && (
                    <div className="mb-6 relative group inline-block animate-in zoom-in-95">
                        <div className="relative overflow-hidden rounded-[2rem] border-4 border-white dark:border-brand-parchment shadow-2xl">
                             {mediaPreview.type === 'image' ? (
                                <img src={mediaPreview.url} alt="Preview" className="h-44 w-auto object-cover" />
                            ) : mediaPreview.type === 'video' ? (
                                <video src={mediaPreview.url} className="h-44 w-auto object-cover" muted />
                            ) : (
                                <div className="h-44 w-52 bg-brand-burgundy/5 flex flex-col items-center justify-center p-6 gap-4">
                                    <FileText className="w-12 h-12 text-brand-burgundy/40" />
                                    <div className="text-center">
                                        <p className="text-[11px] font-extrabold text-brand-burgundy truncate w-36">{mediaPreview.name}</p>
                                        <p className="text-[9px] text-brand-burgundy/40 uppercase font-extrabold tracking-widest mt-1">{(mediaPreview.size! / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                            )}
                            {uploadingMedia && (
                                <div className="absolute inset-0 bg-brand-ebony/60 flex items-center justify-center backdrop-blur-[2px]">
                                    <Loader2 className="w-10 h-10 animate-spin text-white" />
                                </div>
                            )}
                        </div>
                        <button onClick={() => setMediaPreview(null)} className="absolute -top-3 -right-3 p-2 bg-red-500 text-white rounded-full shadow-xl hover:bg-red-600 transition-transform hover:scale-110 z-30">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-5">
                    <div className="relative group shrink-0" ref={attachmentMenuRef}>
                        <button
                            type="button"
                            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                            className={`p-2.5 rounded-full transition-all border shadow-md flex items-center justify-center ${showAttachmentMenu ? 'bg-brand-ebony text-white border-transparent scale-105' : 'bg-white dark:bg-white/5 text-brand-burgundy border-white hover:bg-brand-burgundy/5'}`}
                        >
                            <Plus className={`w-4 h-4 transition-transform duration-500 ${showAttachmentMenu ? 'rotate-45' : 'rotate-0'}`} />
                        </button>

                        {showAttachmentMenu && (
                            <div className="absolute left-0 bottom-full mb-6 w-72 card-premium shadow-2xl z-[110] overflow-hidden animate-in fade-in slide-in-from-bottom-6">
                                <div className="p-3 grid grid-cols-2 gap-2">
                                    {[
                                        { icon: ImageIcon, label: 'Visuals', sub: 'Photos & Art', type: 'image', ref: fileInputRef, color: 'text-blue-500', bg: 'bg-blue-50' },
                                        { icon: VideoIcon, label: 'Clips', sub: 'Motion Video', type: 'video', ref: videoInputRef, color: 'text-violet-500', bg: 'bg-violet-50' },
                                        { icon: FileText, label: 'Docs', sub: 'Shared Files', type: 'file', ref: docInputRef, color: 'text-amber-500', bg: 'bg-amber-50' },
                                        { icon: BarChart2, label: 'Polls', sub: 'Team Census', action: () => { setShowAttachmentMenu(false); setShowPollModal(true); }, color: 'text-emerald-500', bg: 'bg-emerald-50' }
                                    ].map((item, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={item.action || (() => item.ref?.current?.click())}
                                            className="flex flex-col items-center gap-3 p-5 hover:bg-brand-ebony/5 rounded-2xl transition-all group"
                                        >
                                            <div className={`w-12 h-12 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
                                                <item.icon className="w-6 h-6" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[11px] font-extrabold text-brand-ebony">{item.label}</p>
                                                <p className="text-[8px] text-brand-ebony/30 font-extrabold uppercase tracking-tighter mt-0.5">{item.sub}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <input type="file" ref={fileInputRef} onChange={(e) => handleFileSelect(e, 'image')} accept="image/*" className="hidden" />
                        <input type="file" ref={videoInputRef} onChange={(e) => handleFileSelect(e, 'video')} accept="video/*" className="hidden" />
                        <input type="file" ref={docInputRef} onChange={(e) => handleFileSelect(e, 'file')} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" className="hidden" />
                    </div>
                    
                    <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-4">
                        <div className="flex-1 relative group">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={editingMessage ? 'Revising message...' : (replyingToMessage ? 'Drafting response...' : 'Share a thought with the circle...')}
                                onFocus={() => {
                                    setTimeout(() => {
                                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                                    }, 100);
                                }}
                                className="w-full px-5 py-2.5 pr-14 bg-white/60 dark:bg-white/5 border border-white dark:border-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy/50 transition-all font-bold text-[13.5px] shadow-inner placeholder:text-brand-ebony/30"
                                disabled={sending}
                            />
                            <button
                                type="button"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${showEmojiPicker ? 'bg-brand-burgundy text-white' : 'text-brand-ebony/20 hover:text-brand-burgundy'}`}
                            >
                                <Smile className="w-5 h-5" />
                            </button>
                            
                            {showEmojiPicker && (
                                <div ref={emojiPickerRef} className="absolute bottom-full right-0 mb-6 p-4 card-premium shadow-2xl z-[120] w-72 animate-in fade-in zoom-in-95">
                                    <div className="grid grid-cols-6 gap-2">
                                        {COMMON_EMOJIS.slice(0, 18).map(emoji => (
                                            <button key={emoji} type="button" onClick={() => { setNewMessage(prev => prev + emoji); setShowEmojiPicker(false); }} className="text-xl p-2 hover:bg-brand-ebony/5 rounded-xl transition-all hover:scale-125">
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mic & Send */}
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={isRecording ? () => stopRecording(true) : startRecording}
                                className={`p-2.5 rounded-full transition-all flex items-center justify-center flex-shrink-0 shadow-lg ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white dark:bg-white/5 text-emerald-500 border border-white hover:bg-emerald-50 hover:border-emerald-100'}`}
                            >
                                {isRecording ? <Mic className="w-4 h-4" /> : (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
                                        <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
                                    </svg>
                                )}
                            </button>

                            <button
                                type="submit"
                                disabled={(!newMessage.trim() && !mediaPreview) || sending}
                                className="p-3 bg-gradient-to-br from-brand-burgundy to-[#4a1c1f] text-white rounded-full shadow-premium hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center shrink-0"
                            >
                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Modals & Dialogs (Kept same logic, but premium styled) */}
            {forwardingMessage && (
                <ForwardMessageModal isOpen={!!forwardingMessage} onClose={() => setForwardingMessage(null)} message={forwardingMessage!} currentUser={currentUser} originSharedSecret={encryptionSecret} />
            )}
            {unsendingMessage && (
                <div className="fixed inset-0 bg-brand-ebony/60 backdrop-blur-md flex items-center justify-center z-[200] p-4" onClick={() => setUnsendingMessage(null)}>
                    <div className="card-premium p-10 max-w-sm w-full shadow-2xl animate-in zoom-in-95 border-brand-burgundy/10" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-2xl font-serif font-extrabold text-brand-ebony mb-4">Unsend Memory?</h3>
                        <p className="text-xs text-brand-ebony/40 font-serif italic mb-8">This action cannot be undone on the blockchain ledger.</p>
                        <div className="space-y-4">
                            <button onClick={() => handleUnsendMessage(unsendingMessage!, 'me')} className="w-full py-4 bg-brand-ebony/5 hover:bg-brand-ebony/10 text-brand-ebony rounded-2xl font-extrabold text-xs uppercase tracking-widest transition-all">Delete for me</button>
                            {unsendingMessage.senderId === currentUser.uid && !unsendingMessage.isDeleted && (
                                <button onClick={() => handleUnsendMessage(unsendingMessage!, 'everyone')} className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-extrabold text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all">Unsend for Everyone</button>
                            )}
                            <button onClick={() => setUnsendingMessage(null)} className="w-full py-3 text-xs font-bold text-brand-ebony/30 hover:text-brand-ebony transition-all">Dismiss</button>
                        </div>
                    </div>
                </div>
            )}
            <PollModal isOpen={showPollModal} onClose={() => setShowPollModal(false)} onSubmit={handleCreatePoll} />
        </div>
    );
}
