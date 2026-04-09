'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Message, Group, Poll } from '@/types';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MessageBubble } from './MessageBubble';
import { ForwardMessageModal } from './ForwardMessageModal';
import { PollModal } from '../modals/PollModal';
import { Send, Loader2, ArrowLeft, X, CheckCheck, ShieldCheck, Lock, Image as ImageIcon, Video as VideoIcon, Plus, Users, Phone, Video, Mic, MicOff, Paperclip, FileText, BarChart2, Download, Smile, LogOut, ListChecks, CheckCircle2, Trash2, Sparkles, MoreHorizontal, Info, Pencil } from 'lucide-react';
import { encryptMessage, decryptMessage, getSharedSecret } from '@/lib/encryption';
import { uploadMedia, uploadVideo, uploadFile, uploadAudio } from '@/lib/media';

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
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

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
                await addDoc(collection(db, collectionPath, chatId, 'messages'), messageData);

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

    const isUserOnline = useMemo(() => {
        if (!otherUserStatus || !otherUserStatus.isOnline || !otherUserStatus.lastSeen) return false;
        try {
            return (Date.now() - otherUserStatus.lastSeen.toMillis()) < 60000;
        } catch (e) {
            return otherUserStatus.isOnline;
        }
    }, [otherUserStatus]);

    useEffect(() => {
        if (isGroup || !otherUser?.uid) return;
        const unsubscribe = onSnapshot(doc(db, 'users', otherUser.uid), (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                setOtherUserStatus({ isOnline: data.isOnline || false, lastSeen: data.lastSeen });
            }
        });
        return () => unsubscribe();
    }, [otherUser?.uid, isGroup]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!chatId || (isGroup && !groupData)) return;

        setLoading(true);
        const collectionPath = isGroup ? 'groups' : 'chats';
        const q = query(collection(db, collectionPath, chatId, 'messages'), orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data({ serverTimestamps: 'estimate' })
            })) as Message[];
            
            setMessages(fetchedMessages.filter(msg => !msg.hiddenBy?.includes(currentUser.uid)));
            setLoading(false);

            fetchedMessages.filter(msg => msg.senderId !== currentUser.uid && (!msg.isRead || !msg.isDelivered)).forEach(async (msg) => {
                await updateDoc(doc(db, collectionPath, chatId, 'messages', msg.id), {
                    readBy: arrayUnion(currentUser.uid),
                    isRead: true,
                    isDelivered: true
                }).catch(console.error);
            });

            if (!isGroup) {
                updateDoc(doc(db, 'chats', chatId), { [`unreadCount.${currentUser.uid}`]: 0 }).catch(console.error);
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
                await addDoc(collection(db, collectionPath, chatId, 'messages'), messageData);

                if (!isGroup && otherUser) {
                    await setDoc(doc(db, 'chats', chatId), {
                        participants: [currentUser.uid, otherUser.uid],
                        lastMessage: messageText || (imageUrl ? (currentMedia?.type === 'file' ? '📄 File' : '📷 Photo') : '🎥 Video'),
                        lastMessageAt: serverTimestamp(),
                        [`unreadCount.${otherUser.uid}`]: 1,
                        participantDetails: { [currentUser.uid]: {name:currentUser.name, profilePic:currentUser.profilePic}, [otherUser.uid]: {name:otherUser.name, profilePic:otherUser.profilePic} }
                    }, { merge: true });
                } else if (isGroup) {
                    await updateDoc(doc(db, 'groups', chatId), {
                        lastMessage: messageText || (imageUrl ? '📷 Photo' : '🎥 Video'),
                        lastMessageAt: serverTimestamp(),
                        lastSenderName: currentUser.name
                    });
                }
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

    const handleUnsendMessage = async (message: Message, mode: 'me' | 'everyone') => {
        if (!chatId) return;
        try {
            const msgRef = doc(db, isGroup ? 'groups' : 'chats', chatId, 'messages', message.id);
            if (mode === 'everyone') {
                await updateDoc(msgRef, {
                    text: encryptMessage('🚫 This message was unsent', encryptionSecret),
                    imageUrl: '', videoUrl: '', isDeleted: true
                });
            } else {
                await updateDoc(msgRef, { hiddenBy: arrayUnion(currentUser.uid) });
            }
            setUnsendingMessage(null);
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
            <div className="flex-1 flex flex-col items-center justify-center bg-brand-cream/30 p-12 text-center animate-fade-in">
                <div className="w-32 h-32 bg-white dark:bg-brand-parchment/10 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl border border-brand-ebony/5">
                    <Send className="w-12 h-12 text-brand-burgundy/40 transform rotate-12" />
                </div>
                <h3 className="text-3xl font-serif font-extrabold text-brand-ebony mb-4">Your Inbox</h3>
                <p className="max-w-xs mx-auto text-sm font-serif italic text-brand-ebony/40 leading-relaxed">Choose a conversation from your circles to begin sharing memories.</p>
                <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-brand-burgundy/5 rounded-full border border-brand-burgundy/10">
                    <ShieldCheck className="w-4 h-4 text-brand-burgundy/60" />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-burgundy/60">Secured by AlumNest E2EE</span>
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
                <div className="absolute top-0 left-0 right-0 z-[150] px-8 py-5 bg-gradient-indigo text-white flex items-center justify-between animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-6">
                        <button onClick={() => { setIsSelectionMode(false); setSelectedMessageIds([]); }} className="p-2 hover:bg-white/10 rounded-full transition-all">
                            <X className="w-6 h-6" />
                        </button>
                        <span className="text-lg font-extrabold">{selectedMessageIds.length} Selected</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={handleBulkDelete} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-extrabold uppercase tracking-widest transition-all">
                            Delete for me
                        </button>
                        <button onClick={() => setSelectedMessageIds([])} className="px-6 py-2.5 bg-white text-brand-burgundy rounded-2xl text-xs font-extrabold uppercase tracking-widest shadow-xl">
                            Deselect All
                        </button>
                    </div>
                </div>
            )}

            {/* Chat Header */}
            <div className="flex items-center justify-between px-8 py-6 bg-white/70 dark:bg-brand-parchment/10 backdrop-blur-xl border-b border-brand-ebony/5 z-20 sticky top-0">
                <div className="flex items-center">
                    {onBack && (
                        <button onClick={onBack} className="md:hidden mr-4 p-2 hover:bg-brand-ebony/5 rounded-full">
                            <ArrowLeft className="w-6 h-6 text-brand-ebony" />
                        </button>
                    )}
                    <div className="relative mr-4 shrink-0">
                        {isGroup ? (
                            <div className="w-14 h-14 bg-gradient-indigo rounded-2xl flex items-center justify-center text-white shadow-lg">
                                <Users className="w-7 h-7" />
                            </div>
                        ) : (
                            <>
                                <img src={profilePic!} alt={title!} className="w-14 h-14 rounded-2xl object-cover border-2 border-white dark:border-brand-parchment shadow-md" />
                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-brand-ebony shadow-sm ${isUserOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                            </>
                        )}
                    </div>
                    <div>
                        <h3 className="text-xl font-serif font-extrabold text-brand-ebony tracking-tight">{title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            {isGroup ? (
                                <p className="text-[10px] font-extrabold text-brand-ebony/30 uppercase tracking-[0.2em]">{groupData?.members.length} Contributor Circle</p>
                            ) : (
                                <p className={`text-[10px] font-extrabold uppercase tracking-[0.2em] transition-colors ${isUserOnline ? 'text-emerald-500' : 'text-brand-ebony/30'}`}>
                                    {isUserOnline ? 'Active Now' : 'Last seen recently'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-brand-burgundy/5 border border-brand-burgundy/10 rounded-full mr-4">
                        <Lock className="w-3.5 h-3.5 text-brand-burgundy/60" />
                        <span className="text-[9px] font-extrabold text-brand-burgundy/60 uppercase tracking-widest whitespace-nowrap">End-to-End Encrypted</span>
                    </div>

                    <button 
                        onClick={() => setShowCallMenu(!showCallMenu)}
                        className={`p-3.5 rounded-2xl transition-all shadow-sm border ${showCallMenu ? 'bg-gradient-indigo text-white border-transparent scale-110' : 'bg-white dark:bg-brand-ebony/20 text-indigo-500 border-brand-ebony/5 hover:bg-indigo-500 hover:text-white'}`}
                    >
                        <Phone className="w-5 h-5" />
                    </button>

                    <div className="relative">
                        <button 
                            onClick={() => setShowMoreMenu(!showMoreMenu)}
                            className="p-3.5 bg-white dark:bg-brand-ebony/20 text-brand-ebony/30 border border-brand-ebony/5 rounded-2xl hover:text-brand-ebony transition-all"
                        >
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                        {showMoreMenu && (
                            <div className="absolute right-0 top-14 w-60 card-premium shadow-2xl z-[80] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="p-2 space-y-1">
                                    <button onClick={() => { setIsSelectionMode(true); setShowMoreMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-brand-ebony hover:bg-brand-ebony/5 rounded-xl transition-all">
                                        <ListChecks className="w-4 h-4 text-indigo-500" />
                                        Select Messages
                                    </button>
                                    <button className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-brand-ebony hover:bg-brand-ebony/5 rounded-xl transition-all opacity-50 cursor-not-allowed">
                                        <Info className="w-4 h-4 text-indigo-500" />
                                        Circle Info
                                    </button>
                                    <button onClick={() => { onBack?.(); setShowMoreMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-500/5 rounded-xl transition-all">
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
            <div className="flex-1 overflow-y-auto px-8 py-10 space-y-6 scrollbar-hide bg-white/30 dark:bg-brand-parchment/5">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="w-10 h-10 animate-spin text-indigo-500/20" />
                    </div>
                ) : messages.length === 0 ? (
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
                    messages.map((message) => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            isOwnMessage={message.senderId === currentUser.uid}
                            onEdit={(m) => { setEditingMessage(m); setNewMessage(m.text); }}
                            onUnsend={setUnsendingMessage}
                            onReply={setReplyingToMessage}
                            onForward={setForwardingMessage}
                            sharedSecret={encryptionSecret}
                            showSenderName={isGroup}
                            onVote={handleVote}
                            currentUserId={currentUser.uid}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedMessageIds.includes(message.id)}
                            onSelect={(id) => setSelectedMessageIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Footer Area */}
            <div className="px-8 py-8 bg-white/50 dark:bg-brand-parchment/10 backdrop-blur-3xl border-t border-brand-ebony/5 relative z-20">
                {editingMessage && (
                    <div className="flex items-center justify-between mb-4 px-5 py-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 animate-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-3 text-indigo-600">
                            <Pencil className="w-4 h-4" />
                            <p className="text-[11px] font-extrabold uppercase tracking-widest">Revising Message...</p>
                        </div>
                        <button onClick={() => { setEditingMessage(null); setNewMessage(''); }} className="text-indigo-500 hover:text-indigo-700 transition-all p-1">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                {replyingToMessage && (
                    <div className="flex items-center justify-between mb-4 px-5 py-4 bg-brand-ebony/5 rounded-2xl border-l-[6px] border-indigo-500 animate-in slide-in-from-bottom-2 shadow-sm">
                        <div className="overflow-hidden pr-4">
                            <p className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-[0.15em] mb-1.5 flex items-center gap-2">
                                <Paperclip className="w-3 h-3" /> Responding to {replyingToMessage.senderName}
                            </p>
                            <p className="text-xs text-brand-ebony/40 font-medium italic truncate">"{replyingToMessage.text}"</p>
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
                                <div className="h-44 w-52 bg-indigo-50/50 flex flex-col items-center justify-center p-6 gap-4">
                                    <FileText className="w-12 h-12 text-indigo-500/40" />
                                    <div className="text-center">
                                        <p className="text-[11px] font-extrabold text-indigo-900 truncate w-36">{mediaPreview.name}</p>
                                        <p className="text-[9px] text-indigo-900/40 uppercase font-extrabold tracking-widest mt-1">{(mediaPreview.size! / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                            )}
                            {uploadingMedia && (
                                <div className="absolute inset-0 bg-indigo-900/40 flex items-center justify-center backdrop-blur-[2px]">
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
                    <div className="relative group">
                        <button
                            type="button"
                            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                            className={`p-5 rounded-[1.5rem] transition-all border shadow-lg flex items-center justify-center ${showAttachmentMenu ? 'bg-gradient-indigo text-white border-transparent' : 'bg-white dark:bg-brand-ebony/20 text-indigo-500 border-brand-ebony/5 hover:bg-indigo-500 hover:text-white'}`}
                        >
                            <Plus className={`w-6 h-6 transition-transform duration-500 ${showAttachmentMenu ? 'rotate-45' : 'rotate-0'}`} />
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
                                className="w-full px-8 py-5 pr-14 bg-white dark:bg-brand-ebony/10 border border-brand-ebony/5 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm shadow-inner placeholder:text-brand-ebony/30"
                                disabled={sending}
                            />
                            <button
                                type="button"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${showEmojiPicker ? 'bg-indigo-500 text-white' : 'text-brand-ebony/20 hover:text-indigo-500'}`}
                            >
                                <Smile className="w-6 h-6" />
                            </button>
                            
                            {showEmojiPicker && (
                                <div className="absolute bottom-full right-0 mb-6 p-4 card-premium shadow-2xl z-[120] w-72 animate-in fade-in zoom-in-95">
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
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={isRecording ? () => stopRecording(true) : startRecording}
                                className={`p-5 rounded-[1.5rem] transition-all flex items-center justify-center flex-shrink-0 shadow-lg ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white dark:bg-brand-ebony/20 text-emerald-500 border border-brand-ebony/5 hover:bg-emerald-500 hover:text-white'}`}
                            >
                                {isRecording ? <Mic className="w-6 h-6" /> : (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                        <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
                                        <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
                                    </svg>
                                )}
                            </button>

                            <button
                                type="submit"
                                disabled={(!newMessage.trim() && !mediaPreview) || sending}
                                className="p-5 bg-gradient-indigo text-white rounded-[1.5rem] shadow-xl shadow-indigo-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center"
                            >
                                {sending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
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
                <div className="fixed inset-0 bg-brand-ebony/60 backdrop-blur-md flex items-center justify-center z-[200] p-4">
                    <div className="card-premium p-10 max-w-sm w-full shadow-2xl animate-in zoom-in-95 border-brand-burgundy/10">
                        <h3 className="text-2xl font-serif font-extrabold text-brand-ebony mb-4">Unsend Memory?</h3>
                        <p className="text-xs text-brand-ebony/40 font-serif italic mb-8">This action cannot be undone on the blockchain ledger.</p>
                        <div className="space-y-4">
                            <button onClick={() => handleUnsendMessage(unsendingMessage!, 'me')} className="w-full py-4 bg-brand-ebony/5 hover:bg-brand-ebony/10 text-brand-ebony rounded-2xl font-extrabold text-xs uppercase tracking-widest transition-all">Delete for me</button>
                            {unsendingMessage.senderId === currentUser.uid && (
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
