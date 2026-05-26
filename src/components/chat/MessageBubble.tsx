'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Message } from '@/types';
import { format } from 'date-fns';
import { Share2, Check, CheckCheck, FileText, MoreVertical, Pencil, Trash2, Paperclip, BarChart2, Circle, CheckCircle2, CornerUpLeft, CornerUpRight, SmilePlus, Plus, Mic, Play, Pause, Download } from 'lucide-react';
import { decryptMessage } from '@/lib/encryption';

const REACTION_EMOJIS = ['❤️', '👍', '😂', '🎉', '😮', '😢', '🔥', '✨', '🤔', '😎', '👏', '💡', '🚀', '💯', '✅', '❌', '⭐', '🌈'];
import Link from 'next/link';
import { EmojiRenderer } from '../ui/EmojiRenderer';

// Voice note player sub-component
function VoiceNotePlayer({ audioUrl, isOwnMessage, audioDuration }: { audioUrl: string; isOwnMessage: boolean; audioDuration?: number }) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(audioDuration || 0);
    const animationRef = useRef<number | null>(null);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const updateTime = useCallback(() => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            if (!audioRef.current.paused) {
                animationRef.current = requestAnimationFrame(updateTime);
            }
        }
    }, []);

    useEffect(() => {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        const onLoadedMetadata = () => {
            if (audio.duration && isFinite(audio.duration)) {
                setDuration(audio.duration);
            }
        };

        const onEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };

        const onError = (e: Event) => {
            console.error('Audio load error:', e);
        };

        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);

        return () => {
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onError);
            audio.pause();
            audio.src = '';
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [audioUrl]);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        } else {
            audio.play().then(() => {
                setIsPlaying(true);
                animationRef.current = requestAnimationFrame(updateTime);
            }).catch(console.error);
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        const audio = audioRef.current;
        if (!audio || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audio.currentTime = ratio * duration;
        setCurrentTime(audio.currentTime);
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    // Generate pseudo-random waveform bars (deterministic per audioUrl)
    const waveformBars = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < audioUrl.length; i++) {
            hash = ((hash << 5) - hash) + audioUrl.charCodeAt(i);
            hash |= 0;
        }
        return Array.from({ length: 22 }, (_, i) => {
            const seed = Math.abs(hash * (i + 1) * 2654435761) % 100;
            return 30 + (seed % 70);
        });
    }, [audioUrl]);

    return (
        <div className="flex items-center gap-3 py-1 px-1 min-w-[200px] max-w-[260px]">
            {/* Play/Pause button */}
            <button
                onClick={togglePlay}
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 shadow-sm ${
                    isOwnMessage
                        ? 'bg-white/20 hover:bg-white/30 text-white'
                        : 'bg-brand-burgundy/10 hover:bg-brand-burgundy/20 text-brand-burgundy'
                }`}
            >
                {isPlaying ? (
                    <Pause className="w-3.5 h-3.5" />
                ) : (
                    <Play className="w-3.5 h-3.5 ml-0.5" />
                )}
            </button>

            {/* Waveform */}
            <div
                className="flex-1 h-5 flex items-center gap-[1.5px] cursor-pointer"
                onClick={handleSeek}
            >
                {waveformBars.map((height, i) => {
                    const barPosition = (i / waveformBars.length) * 100;
                    const isPast = barPosition < progress;
                    return (
                        <div
                            key={i}
                            className={`flex-1 rounded-full transition-all duration-150 ${
                                isPast
                                    ? (isOwnMessage ? 'bg-white' : 'bg-brand-burgundy')
                                    : (isOwnMessage ? 'bg-white/30' : 'bg-brand-burgundy/20')
                            } ${isPlaying && isPast ? 'animate-pulse' : ''}`}
                            style={{
                                height: `${height}%`,
                                minHeight: '3px',
                            }}
                        />
                    );
                })}
            </div>

            {/* Time display */}
            <div className={`shrink-0 text-[10px] font-bold tabular-nums opacity-90 ${
                isOwnMessage ? 'text-white/80' : 'text-brand-ebony/60'
            }`}>
                {formatTime(isPlaying || currentTime > 0 ? currentTime : duration)}
            </div>
        </div>
    );
}

interface MessageBubbleProps {
    message: Message;
    isOwnMessage: boolean;
    onEdit?: (message: Message) => void;
    onUnsend?: (message: Message) => void;
    onReply?: (message: Message) => void;
    onForward?: (message: Message) => void;
    onReact?: (messageId: string, emoji: string) => void;
    sharedSecret: string;
    showSenderName?: boolean;
    onVote?: (messageId: string, optionId: string) => void;
    currentUserId: string;
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onSelect?: (id: string) => void;
    onLongPress?: (id: string) => void;
    onJumpToMessage?: (id: string) => void;
}

export const MessageBubble = React.memo(function MessageBubble({ 
    message, isOwnMessage, onEdit, onUnsend, onReply, onForward, onReact, 
    sharedSecret, showSenderName = false, onVote, currentUserId,
    isSelectionMode = false, isSelected = false, onSelect, onLongPress, onJumpToMessage
}: MessageBubbleProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [menuDirection, setMenuDirection] = useState<'up' | 'down'>('up');
    const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);
    const isLongPressActive = React.useRef(false);

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
    const [showAllEmojis, setShowAllEmojis] = useState(false);

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
            navigator.clipboard.writeText(textToCopy).catch(() => {
                // Fallback for non-secure contexts
                fallbackCopy(textToCopy);
            });
        } else {
            fallbackCopy(textToCopy);
        }
        setShowMenu(false);
    };

    const fallbackCopy = (text: string) => {
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        } catch (e) {
            console.error('Fallback copy failed:', e);
        }
    };

    const handleTouchStart = () => {
        isLongPressActive.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPressActive.current = true;
            onLongPress?.(message.id);
            if (navigator.vibrate) navigator.vibrate(50);
        }, 600);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        if (isLongPressActive.current) {
            e.preventDefault();
            e.stopPropagation();
        }
    };
    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.message-actions-menu')) {
                setShowMenu(false);
            }
        };
        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    const renderActionMenu = () => {
        if (!showMenu) return null;
        return (
            <div className={`message-actions-menu absolute ${menuDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} ${isOwnMessage ? 'right-0' : 'left-0'} w-48 bg-white dark:bg-[#1a1423] rounded-2xl shadow-premium border border-brand-ebony/5 dark:border-white/5 py-1.5 z-[60] animate-in zoom-in-95 duration-200 max-h-[70vh] overflow-y-auto`}>
                {!message.isDeleted && (
                    <>
                        <button onClick={() => { setShowMenu(false); onReply?.(message); }} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-brand-ebony/5 transition-colors text-xs font-semibold text-brand-ebony/70 hover:text-brand-burgundy dark:text-white/70">
                            <CornerUpLeft className="w-3.5 h-3.5" /> Reply
                        </button>
                        <button onClick={() => { setShowMenu(false); onForward?.(message); }} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-brand-ebony/5 transition-colors text-xs font-semibold text-brand-ebony/70 hover:text-brand-burgundy dark:text-white/70">
                            <CornerUpRight className="w-3.5 h-3.5" /> Forward
                        </button>
                        
                        {isOwnMessage && canAction && (
                            <button onClick={() => { setShowMenu(false); onEdit?.(message); }} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-brand-ebony/5 transition-colors text-xs font-semibold text-brand-ebony/70 hover:text-brand-burgundy dark:text-white/70 border-t border-brand-ebony/5 dark:border-white/5">
                                <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>
                        )}
                    </>
                )}
                
                <button onClick={() => { setShowMenu(false); onUnsend?.(message); }} className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-xs font-semibold text-red-500 ${!message.isDeleted ? 'border-t border-brand-ebony/5 dark:border-white/5' : ''}`}>
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>

                {!message.isDeleted && (
                    <div className="px-2 py-1.5 border-t border-brand-ebony/5 dark:border-white/5 flex flex-wrap items-center justify-start gap-1 max-w-full overflow-hidden">
                        {(showAllEmojis ? REACTION_EMOJIS : REACTION_EMOJIS.slice(0, 5)).map(emoji => (
                            <button 
                                key={emoji} 
                                onClick={() => { setShowMenu(false); setShowAllEmojis(false); onReact?.(message.id, emoji); }}
                                className={`p-1 w-8 h-8 flex items-center justify-center hover:bg-brand-ebony/5 rounded-lg transition-all active:scale-90 text-base ${(message.reactions?.[emoji]?.includes(currentUserId)) ? 'bg-brand-burgundy/10 rounded-lg' : ''}`}
                            >
                                {emoji}
                            </button>
                        ))}
                        {!showAllEmojis && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowAllEmojis(true); }}
                                className="p-1 w-8 h-8 flex items-center justify-center hover:bg-brand-ebony/5 rounded-lg transition-all text-brand-ebony/40"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const isOnlyAudio = !!decryptedAudioUrl && !message.isDeleted && !message.replyToId && (!message.reactions || Object.keys(message.reactions).length === 0) && !decryptedImageUrl && !decryptedVideoUrl && !message.fileUrl && !message.poll && !message.sharedPostId;

    return (
        <div 
            id={message.id}
            className={`flex w-full min-w-0 mb-3 group ${isOwnMessage ? 'justify-end' : 'justify-start'} transition-all`}
            onClick={() => {
                if (isLongPressActive.current) return;
                if (isSelectionMode) onSelect?.(message.id);
                else if (isOwnMessage) setStatusKey(prev => prev + 1);
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={() => {
                if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                }
            }}
        >
            <div className={`flex flex-1 min-w-0 max-w-[88%] sm:max-w-[85%] md:max-w-[75%] items-end gap-2.5 ${isSelectionMode ? (isSelected ? 'opacity-100' : 'opacity-40') : ''} ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
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
                    <div className="relative flex-shrink-0 mb-1 block">
                         <img
                            src={message.senderProfilePic}
                            alt={message.senderName || 'Sender'}
                            className="w-7 h-7 rounded-lg object-cover border border-white dark:border-brand-parchment shadow-sm"
                        />
                    </div>
                )}
                
                <div className={`flex flex-col min-w-0 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                    {showSenderName && !isOwnMessage && (
                        <span className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-1 ml-1 ${senderColor}`}>
                            {message.senderName}
                        </span>
                    )}
                    
                    <div className="flex items-end gap-1.5 max-w-full">
                        {/* Sender's 3-dot overlay logic (placed before the message bubble if own message) */}
                        {isOwnMessage && !isSelectionMode && (
                            <div className="relative mb-2">
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setMenuDirection(rect.top < 300 ? 'down' : 'up');
                                        setShowMenu(!showMenu); 
                                    }} 
                                    className="p-1.5 rounded-full text-brand-ebony/30 hover:bg-brand-ebony/5 hover:text-brand-ebony dark:text-white/40 dark:hover:text-white dark:hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 [@media(hover:none)]:opacity-100"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                                {renderActionMenu()}
                            </div>
                        )}

                        <div
                            className={`${isOnlyAudio ? 'p-1.5 pb-1' : 'px-4 py-2.5'} relative shadow-premium max-w-full w-fit transition-all duration-300 ${isOwnMessage
                                ? 'bg-gradient-to-br from-brand-burgundy to-[#4a1c1f] text-white rounded-[1.25rem] rounded-tr-[4px] border border-white/10'
                                : 'bg-white dark:bg-[#1a1423] text-brand-ebony dark:text-white border border-brand-ebony/[0.06] dark:border-white/10 rounded-[1.25rem] rounded-tl-[4px]'
                            }`}
                        >
                            {/* Reply Context */}
                            {decryptedReplyText && (
                                <div 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (message.replyToId) onJumpToMessage?.(message.replyToId);
                                    }}
                                    className={`px-3 py-2 mb-2 rounded-xl text-[11px] border-l-[3px] border-brand-burgundy transition-all cursor-pointer hover:bg-brand-burgundy/10 active:scale-[0.98] ${
                                        isOwnMessage 
                                            ? 'bg-white/10 border-white/30 text-white' 
                                            : 'bg-brand-ebony/[0.03] border-brand-burgundy/20 text-brand-ebony/60'
                                    }`}
                                >
                                    <p className="font-bold mb-0.5 opacity-60 uppercase tracking-wider text-[9px]">{message.replyToSenderName || 'Original'}</p>
                                    <p className="line-clamp-2 italic">"<EmojiRenderer text={decryptedReplyText} />"</p>
                                </div>
                            )}

                            {/* Shared Post UI */}
                            {message.sharedPostId && (
                                <Link href={`/posts/view?id=${message.sharedPostId}`} className="block mb-3">
                                    <div className={`p-4 rounded-2xl border transition-all hover:brightness-105 ${isOwnMessage ? 'bg-white/10 border-white/20' : 'bg-brand-ebony/[0.03] border-brand-ebony/5'}`}>
                                        <div className="flex items-center gap-2 mb-3 opacity-60">
                                            <Share2 className="w-3.5 h-3.5" />
                                            <span className="text-[9px] font-bold uppercase tracking-widest">Shared Post</span>
                                        </div>
                                        <p className="text-[11px] font-bold mb-2 font-serif italic opacity-80">By {message.sharedPostAuthor}</p>
                                        {message.sharedPostImage && (
                                            <img src={message.sharedPostImage} alt="Shared" className="w-full h-32 object-cover rounded-xl mb-3 shadow-md" />
                                        )}
                                        <p className="text-xs line-clamp-3 leading-relaxed opacity-90">{message.sharedPostContent}</p>
                                    </div>
                                </Link>
                            )}

                            {/* Image UI */}
                            {decryptedImageUrl && !message.isDeleted && (
                                <div className="mb-2.5 rounded-xl overflow-hidden border border-black/5">
                                    <img 
                                        src={decryptedImageUrl} 
                                        alt="Shared image"
                                        className="w-full h-auto max-h-[400px] object-cover hover:scale-[1.02] transition-transform duration-500 cursor-pointer"
                                        onClick={() => window.open(decryptedImageUrl, '_blank')}
                                    />
                                </div>
                            )}

                            {/* Video UI */}
                            {decryptedVideoUrl && !message.isDeleted && (
                                <div className="mb-2.5 rounded-xl overflow-hidden border border-black/5">
                                    <video
                                        src={decryptedVideoUrl}
                                        controls
                                        playsInline
                                        preload="metadata"
                                        className="w-full max-h-[400px] rounded-xl"
                                    />
                                </div>
                            )}

                            {/* File Attachment UI */}
                            {decryptedFileUrl && !message.isDeleted && (
                                <a
                                    href={decryptedFileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className={`flex items-center gap-3 mb-2.5 p-3 rounded-xl border transition-all hover:brightness-105 ${
                                        isOwnMessage
                                            ? 'bg-white/10 border-white/15 hover:bg-white/15'
                                            : 'bg-brand-ebony/[0.03] border-brand-ebony/5 hover:bg-brand-ebony/[0.06]'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                                        isOwnMessage ? 'bg-white/15' : 'bg-brand-burgundy/10'
                                    }`}>
                                        <FileText className={`w-5 h-5 ${isOwnMessage ? 'text-white/80' : 'text-brand-burgundy'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-semibold truncate ${isOwnMessage ? 'text-white' : 'text-brand-ebony'}`}>
                                            {message.fileName || 'File'}
                                        </p>
                                        {message.fileSize && (
                                            <p className={`text-[10px] mt-0.5 ${isOwnMessage ? 'text-white/50' : 'text-brand-ebony/40'}`}>
                                                {(message.fileSize / 1024).toFixed(1)} KB
                                            </p>
                                        )}
                                    </div>
                                    <Download className={`w-4 h-4 shrink-0 ${isOwnMessage ? 'text-white/50' : 'text-brand-ebony/30'}`} />
                                </a>
                            )}

                            {/* Voice Note UI */}
                            {decryptedAudioUrl && !message.isDeleted && (
                                <div className={isOnlyAudio ? "mb-0" : "mb-2"}>
                                    <VoiceNotePlayer 
                                        audioUrl={decryptedAudioUrl} 
                                        isOwnMessage={isOwnMessage} 
                                        audioDuration={message.audioDuration}
                                    />
                                </div>
                            )}

                            {/* Poll UI */}
                            {message.poll && !message.isDeleted && (
                                <div className={`mb-3 p-4 rounded-2xl border ${isOwnMessage ? 'bg-white/10 border-white/10' : 'bg-brand-ebony/[0.03] border-brand-ebony/5'}`}>
                                    <h4 className="font-serif font-bold text-sm mb-4 flex items-center gap-2.5">
                                        <BarChart2 className="w-4.5 h-4.5 text-brand-gold" />
                                        {message.poll.question}
                                    </h4>
                                    <div className="space-y-3">
                                        {message.poll.options.map((option) => {
                                            const voteCount = option.votes?.length || 0;
                                            const percentage = message.poll!.totalVotes > 0 ? (voteCount / message.poll!.totalVotes) * 100 : 0;
                                            const hasVoted = option.votes?.includes(currentUserId);
                                            
                                            return (
                                                <button
                                                    key={option.id}
                                                    onClick={() => onVote?.(message.id, option.id)}
                                                    className={`w-full relative overflow-hidden rounded-xl border transition-all h-10 ${hasVoted ? 'border-brand-gold shadow-sm' : 'border-transparent'}`}
                                                    style={{ backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                                                >
                                                    <div 
                                                        className={`absolute inset-0 transition-all duration-1000 ${isOwnMessage ? 'bg-white/20' : 'bg-brand-burgundy/10'}`}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                    <div className="relative px-4 h-full flex items-center justify-between text-[11px] font-semibold">
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
                                {decryptedText && !decryptedAudioUrl && (
                                    <p 
                                        className={`leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
                                            decryptedText.length < 50 && !decryptedImageUrl && !decryptedVideoUrl && !message.sharedPostId ? 'font-semibold' : 'font-normal'
                                        }`}
                                        style={{ 
                                            fontSize: (decryptedText.length < 50 && !decryptedImageUrl && !decryptedVideoUrl && !message.sharedPostId) 
                                                ? '15px' 
                                                : '14px' 
                                        }}
                                    >
                                        <EmojiRenderer text={decryptedText} />
                                    </p>
                                )}
                                
                                {/* Reactions UI */}
                                {message.reactions && Object.keys(message.reactions).length > 0 && !message.isDeleted && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {Object.entries(message.reactions).map(([emoji, uids]) => (
                                            uids && uids.length > 0 && (
                                                <button
                                                    key={emoji}
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        if (!isSelectionMode) onReact?.(message.id, emoji); 
                                                    }}
                                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${
                                                        uids.includes(currentUserId) 
                                                            ? 'bg-brand-burgundy/10 border-brand-burgundy/30 text-brand-burgundy' 
                                                            : 'bg-white/50 dark:bg-black/20 border-black/5 dark:border-white/5 text-brand-ebony dark:text-white/60 hover:border-brand-burgundy/30'
                                                    } ${isSelectionMode ? 'cursor-default pointer-events-none' : ''}`}
                                                >
                                                    <EmojiRenderer text={emoji} />
                                                    <span>{uids.length}</span>
                                                </button>
                                            )
                                        ))}
                                    </div>
                                )}

                                <div className={`flex items-center gap-1.5 mt-1.5 self-end text-[10px] font-medium ${isOwnMessage ? 'text-white/40' : 'text-brand-ebony/30'}`}>
                                    {message.isEdited && <span className="italic">edited</span>}
                                    <span>{timeString}</span>
                                    {isOwnMessage && (
                                        isRead 
                                            ? <CheckCheck className="w-3.5 h-3.5 text-blue-400" /> 
                                            : (message.isDelivered ? <CheckCheck className="w-3.5 h-3.5 opacity-50" /> : <Check className="w-3.5 h-3.5 opacity-50" />)
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Receiver's 3-dot overlay logic (placed after the message bubble if not own message) */}
                        {!isOwnMessage && !isSelectionMode && (
                            <div className="relative mb-2">
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setMenuDirection(rect.top < 300 ? 'down' : 'up');
                                        setShowMenu(!showMenu); 
                                    }} 
                                    className="p-1.5 rounded-full text-brand-ebony/30 hover:bg-brand-ebony/5 hover:text-brand-ebony dark:text-white/40 dark:hover:text-white dark:hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 [@media(hover:none)]:opacity-100"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                                {renderActionMenu()}
                            </div>
                        )}
                    </div>
                    
                    {/* Status Reveal */}
                    {isOwnMessage && showStatus && (
                        <div className="text-right mt-1 mr-1 animate-in fade-in slide-in-from-top-1 duration-300">
                            <span className="text-[10px] font-semibold text-brand-burgundy/50 transition-all">
                                {isRead ? 'Seen' : message.isDelivered ? 'Delivered' : 'Sent'}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
