'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Message } from '@/types';
import { format } from 'date-fns';
import { Share2, Check, CheckCheck, FileText, MoreVertical, Pencil, Trash2, Paperclip, BarChart2, Circle, CheckCircle2 } from 'lucide-react';
import { decryptMessage } from '@/lib/encryption';
import Link from 'next/link';

interface MessageBubbleProps {
    message: Message;
    isOwnMessage: boolean;
    onEdit?: (message: Message) => void;
    onUnsend?: (message: Message) => void;
    onReply?: (message: Message) => void;
    onForward?: (message: Message) => void;
    sharedSecret: string;
    showSenderName?: boolean;
    onVote?: (messageId: string, optionId: string) => void;
    currentUserId: string;
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onSelect?: (id: string) => void;
}

export function MessageBubble({ 
    message, isOwnMessage, onEdit, onUnsend, onReply, onForward, 
    sharedSecret, showSenderName = false, onVote, currentUserId,
    isSelectionMode = false, isSelected = false, onSelect
}: MessageBubbleProps) {
    const [showMenu, setShowMenu] = useState(false);

    const decryptedText = useMemo(() => decryptMessage(message.text, sharedSecret), [message.text, sharedSecret]);
    const decryptedReplyText = useMemo(() => 
        message.replyToText ? decryptMessage(message.replyToText, sharedSecret) : null
    , [message.replyToText, sharedSecret]);
    const decryptedImageUrl = useMemo(() => 
        message.imageUrl ? decryptMessage(message.imageUrl, sharedSecret) : null
    , [message.imageUrl, sharedSecret]);
    const decryptedVideoUrl = useMemo(() => 
        message.videoUrl ? decryptMessage(message.videoUrl, sharedSecret) : null
    , [message.videoUrl, sharedSecret]);
    const decryptedFileUrl = useMemo(() => 
        message.fileUrl ? decryptMessage(message.fileUrl, sharedSecret) : null
    , [message.fileUrl, sharedSecret]);
    const decryptedAudioUrl = useMemo(() => 
        message.audioUrl ? decryptMessage(message.audioUrl, sharedSecret) : null
    , [message.audioUrl, sharedSecret]);

    const timeString = message.createdAt
        ? format(message.createdAt.toDate(), 'h:mm a')
        : '';

    const isRead = message.isRead || (message.readBy && message.readBy.length > 1);

    const [statusKey, setStatusKey] = useState(0);
    const [showStatus, setShowStatus] = useState(false);

    React.useEffect(() => {
        if (isOwnMessage) setStatusKey(prev => prev + 1);
    }, [isRead, message.isDelivered, isOwnMessage]);

    React.useEffect(() => {
        if (!isOwnMessage || statusKey === 0) return;
        setShowStatus(true);
        const timer = setTimeout(() => setShowStatus(false), 3000);
        return () => clearTimeout(timer);
    }, [statusKey, isOwnMessage]);

    const senderColor = useMemo(() => {
        if (isOwnMessage || !message.senderId) return 'text-brand-burgundy';
        const colors = [
            'text-indigo-500', 'text-amber-500', 'text-emerald-500', 
            'text-rose-500', 'text-sky-500', 'text-violet-500', 
            'text-orange-500', 'text-teal-500'
        ];
        let hash = 0;
        for (let i = 0; i < message.senderId.length; i++) {
            hash = message.senderId.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }, [message.senderId, isOwnMessage]);

    const [canAction, setCanAction] = useState(false);

    useEffect(() => {
        if (!message.createdAt) {
            setCanAction(false);
            return;
        }
        try {
            const timePassed = Date.now() - message.createdAt.toMillis();
            setCanAction(timePassed < 10 * 60 * 1000);
        } catch (e) {
            setCanAction(false);
        }
    }, [message.createdAt]);

    const handleCopy = () => {
        const textToCopy = decryptedText;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(textToCopy).catch(console.error);
        }
        setShowMenu(false);
    };

    return (
        <div 
            className={`flex w-full mb-4 group ${isOwnMessage ? 'justify-end' : 'justify-start'} transition-all`}
            onClick={() => {
                if (isSelectionMode) onSelect?.(message.id);
                else if (isOwnMessage) setStatusKey(prev => prev + 1);
            }}
        >
            <div className={`flex max-w-[92%] sm:max-w-[75%] md:max-w-[70%] items-end gap-3 ${isSelectionMode ? (isSelected ? 'opacity-100' : 'opacity-40') : ''}`}>
                {isSelectionMode && (
                    <div className="flex items-center justify-center p-2 mb-2">
                        {isSelected ? (
                            <CheckCircle2 className="w-5 h-5 text-brand-burgundy animate-in zoom-in" />
                        ) : (
                            <Circle className="w-5 h-5 text-brand-ebony/20" />
                        )}
                    </div>
                )}
                
                {!isOwnMessage && message.senderProfilePic && (
                    <Link href={`/profile/${message.senderId}`} className="relative flex-shrink-0 mb-1 block group/avatar">
                         <img
                            src={message.senderProfilePic}
                            alt={message.senderName || 'Sender'}
                            className="w-8 h-8 rounded-full object-cover border-2 border-white dark:border-brand-parchment shadow-sm group-hover/avatar:scale-125 group-hover/avatar:-rotate-6 group-active/avatar:scale-95 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ring-0 group-hover/avatar:ring-4 group-hover/avatar:ring-brand-burgundy/20"
                        />
                    </Link>
                )}
                
                <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                    {showSenderName && !isOwnMessage && (
                        <span className={`text-[10px] font-extrabold uppercase tracking-[0.2em] mb-1.5 ml-1 ${senderColor}`}>
                            {message.senderName}
                        </span>
                    )}
                    
                    <div className="relative group max-w-full">
                        <div
                            className={`px-5 py-3.5 relative shadow-premium max-w-full w-fit transition-all duration-300 ${isOwnMessage
                                ? 'bg-gradient-to-br from-brand-burgundy to-[#4a1c1f] text-white rounded-[1.5rem] rounded-tr-sm border border-white/5'
                                : 'bg-white/90 dark:bg-brand-parchment/10 backdrop-blur-md text-brand-ebony border border-white dark:border-white/5 rounded-[1.5rem] rounded-tl-sm ring-1 ring-brand-ebony/5'
                            }`}
                        >
                            {/* Reply Context */}
                            {decryptedReplyText && (
                                <div className={`mb-3 p-3 rounded-xl border-l-4 text-[11px] leading-relaxed ${
                                    isOwnMessage 
                                        ? 'bg-white/10 border-white/40 text-white/80' 
                                        : 'bg-brand-ebony/5 border-brand-burgundy/20 text-brand-ebony/60'
                                }`}>
                                    <p className="font-extrabold mb-1 opacity-60 uppercase tracking-widest text-[9px]">{message.replyToSenderName || 'Original'}</p>
                                    <p className="line-clamp-2 italic">"{decryptedReplyText}"</p>
                                </div>
                            )}

                            {/* Shared Post UI */}
                            {message.sharedPostId && (
                                <Link href={`/posts/${message.sharedPostId}`} className="block mb-3">
                                    <div className={`p-4 rounded-2xl border transition-all hover:brightness-105 ${isOwnMessage ? 'bg-white/10 border-white/20' : 'bg-brand-ebony/5 border-brand-ebony/5'}`}>
                                        <div className="flex items-center gap-2 mb-3 opacity-60">
                                            <Share2 className="w-3.5 h-3.5" />
                                            <span className="text-[9px] font-extrabold uppercase tracking-widest">Shared Memory</span>
                                        </div>
                                        <p className="text-[11px] font-extrabold mb-2 font-serif italic opacity-80">By {message.sharedPostAuthor}</p>
                                        {message.sharedPostImage && (
                                            <img src={message.sharedPostImage} alt="Shared" className="w-full h-32 object-cover rounded-xl mb-3 shadow-md" />
                                        )}
                                        <p className="text-xs line-clamp-3 leading-relaxed opacity-90">{message.sharedPostContent}</p>
                                    </div>
                                </Link>
                            )}

                            {/* Media UI */}
                            {decryptedImageUrl && !message.isDeleted && (
                                <div className="mb-3 rounded-xl overflow-hidden shadow-lg border border-black/5">
                                    <img 
                                        src={decryptedImageUrl} 
                                        className="w-full h-auto max-h-[400px] object-cover hover:scale-[1.02] transition-transform duration-500"
                                        onClick={() => window.open(decryptedImageUrl, '_blank')}
                                    />
                                </div>
                            )}

                            {/* Poll UI */}
                            {message.poll && !message.isDeleted && (
                                <div className={`mb-3 p-5 rounded-2xl border shadow-inner ${isOwnMessage ? 'bg-white/10 border-white/10' : 'bg-brand-ebony/5 border-brand-ebony/5'}`}>
                                    <h4 className="font-serif font-extrabold text-sm mb-5 flex items-center gap-2.5">
                                        <BarChart2 className="w-4.5 h-4.5 text-brand-gold" />
                                        {message.poll.question}
                                    </h4>
                                    <div className="space-y-3.5">
                                        {message.poll.options.map((option) => {
                                            const voteCount = option.votes?.length || 0;
                                            const percentage = message.poll!.totalVotes > 0 ? (voteCount / message.poll!.totalVotes) * 100 : 0;
                                            const hasVoted = option.votes?.includes(currentUserId);
                                            
                                            return (
                                                <button
                                                    key={option.id}
                                                    onClick={() => onVote?.(message.id, option.id)}
                                                    className={`w-full relative overflow-hidden rounded-xl border transition-all h-10 ${hasVoted ? 'border-brand-gold shadow-md' : 'border-transparent'}`}
                                                    style={{ backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                                                >
                                                    <div 
                                                        className={`absolute inset-0 transition-all duration-1000 ${isOwnMessage ? 'bg-white/20' : 'bg-brand-burgundy/10'}`}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                    <div className="relative px-4 h-full flex items-center justify-between text-[11px] font-extrabold">
                                                        <span className="truncate pr-4">{option.text}</span>
                                                        <span className="opacity-60">{Math.round(percentage)}%</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Message Body */}
                            <div className="flex flex-col">
                                {decryptedText && (
                                    <p className={`text-[15px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] break-words ${
                                        decryptedText.length < 50 && !decryptedImageUrl && !decryptedVideoUrl && !message.sharedPostId ? 'text-lg font-bold tracking-tight' : 'font-medium opacity-90'
                                    }`}>
                                        {decryptedText}
                                    </p>
                                )}
                                <div className={`flex items-center gap-2 mt-2 self-end opacity-40 text-[9px] font-extrabold uppercase tracking-tighter ${isOwnMessage ? 'text-white' : 'text-brand-ebony'}`}>
                                    {message.isEdited && <span className="italic">edited</span>}
                                    <span>{timeString}</span>
                                    {isOwnMessage && (isRead ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />)}
                                </div>
                            </div>
                        </div>

                        {/* Status Reveal (Legacy) - Kept mostly same but indigo-ified */}
                        {isOwnMessage && showStatus && (
                            <div className="text-right mt-1.5 mr-1 animate-in fade-in slide-in-from-top-1 duration-300">
                                <span className="text-[9px] font-extrabold uppercase tracking-widest text-brand-burgundy/60 transition-all">
                                    {isRead ? 'Seen' : message.isDelivered ? 'Delivered' : 'Sent'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
