'use client';

import React, { useState, useMemo } from 'react';
import { Message } from '@/types';
import { format } from 'date-fns';
import { Share2, Check, CheckCheck, Play, FileText, MoreVertical, Pencil, Trash2, Paperclip } from 'lucide-react';
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
}

export function MessageBubble({ message, isOwnMessage, onEdit, onUnsend, onReply, onForward, sharedSecret, showSenderName = false }: MessageBubbleProps) {
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

    const timeString = message.createdAt
        ? format(message.createdAt.toDate(), 'h:mm a')
        : '';

    const isRead = message.isRead || (message.readBy && message.readBy.length > 1);

    const senderColor = useMemo(() => {
        if (isOwnMessage || !message.senderId) return 'text-brand-burgundy';
        const colors = [
            'text-blue-600', 'text-green-600', 'text-purple-600', 
            'text-orange-600', 'text-pink-600', 'text-teal-600', 
            'text-indigo-600', 'text-amber-600'
        ];
        let hash = 0;
        for (let i = 0; i < message.senderId.length; i++) {
            hash = message.senderId.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }, [message.senderId, isOwnMessage]);

    const canAction = message.createdAt && (
        (Date.now() - message.createdAt.toMillis()) < 10 * 60 * 1000
    );

    const handleCopy = () => {
        const textToCopy = decryptedText;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy).catch(err => {
                console.error('Clipboard error:', err);
                fallbackCopy(textToCopy);
            });
        } else {
            fallbackCopy(textToCopy);
        }
        setShowMenu(false);
    };

    const fallbackCopy = (text: string) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Fallback copy failed', err);
        }
        document.body.removeChild(textArea);
    };

    return (
        <div className={`flex w-full mb-4 group ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[92%] sm:max-w-[75%] md:max-w-[70%] items-end gap-2`}>
                {!isOwnMessage && message.senderProfilePic && (
                    <div className="relative flex-shrink-0 mb-1">
                         <img
                            src={message.senderProfilePic}
                            alt={message.senderName || 'Sender'}
                            className="w-7 h-7 rounded-full object-cover shadow-sm ring-1 ring-gray-100"
                        />
                    </div>
                )}
                
                <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                    {showSenderName && !isOwnMessage && (
                        <span className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ml-1 drop-shadow-sm ${senderColor}`}>
                            {message.senderName}
                        </span>
                    )}
                    
                    {message.isForwarded && (
                        <div className={`flex items-center gap-1 mb-1 opacity-50`}>
                            <Share2 className="w-2.5 h-2.5" />
                            <span className="text-[9px] uppercase tracking-tighter font-bold italic">Forwarded</span>
                        </div>
                    )}

                    <div className="relative group max-w-full">
                        {/* More Menu Button */}
                        <div className={`absolute -top-1 ${isOwnMessage ? '-left-8' : '-right-8'} transition-opacity z-10 sm:opacity-0 sm:group-hover:opacity-100`}>
                             <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMenu(!showMenu);
                                }}
                                className="p-1.5 rounded-full hover:bg-white/10 text-brand-ebony/40 sm:text-brand-ebony/30 transition-colors"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </button>
                            {showMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                                    <div 
                                        className={`absolute ${isOwnMessage ? 'left-0' : 'right-0'} mt-1 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 py-1.5 min-w-[150px] z-50 animate-in zoom-in-95 duration-100`}
                                    >
                                        <button
                                            onClick={() => { onReply?.(message); setShowMenu(false); }}
                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10 transition-colors"
                                        >
                                            <Paperclip className="w-4 h-4 rotate-180 opacity-60" />
                                            Reply
                                        </button>
                                        <button
                                            onClick={handleCopy}
                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10 transition-colors"
                                        >
                                            <Share2 className="w-4 h-4 opacity-60" />
                                            Copy
                                        </button>
                                        <button
                                            onClick={() => { onForward?.(message); setShowMenu(false); }}
                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10 transition-colors"
                                        >
                                            <Share2 className="w-4 h-4 opacity-60" />
                                            Forward
                                        </button>
                                        <div className="h-px bg-slate-700 my-1.5 mx-2" />
                                        <button
                                            onClick={() => { onUnsend?.(message); setShowMenu(false); }}
                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4 opacity-60" />
                                            {isOwnMessage ? (canAction ? 'Unsend' : 'Delete for me') : 'Delete for me'}
                                        </button>
                                        {isOwnMessage && canAction && (
                                            <button
                                                onClick={() => { onEdit?.(message); setShowMenu(false); }}
                                                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10 transition-colors"
                                            >
                                                <Pencil className="w-4 h-4 opacity-60" />
                                                Edit Message
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <div
                            className={`px-4 py-2.5 relative shadow-sm max-w-[calc(100vw-5rem)] md:max-w-full w-fit transition-all duration-200 ${isOwnMessage
                                ? 'bg-brand-burgundy text-white rounded-2xl rounded-tr-sm select-text'
                                : 'bg-brand-parchment border border-brand-ebony/10 text-brand-ebony rounded-2xl rounded-tl-sm select-text'
                            }`}
                        >
                            {decryptedReplyText && (
                                <div className={`mb-2 p-2 rounded-lg border-l-[3px] text-[10px] leading-relaxed max-w-full overflow-hidden ${
                                    isOwnMessage 
                                        ? 'bg-black/10 border-white/30 text-white/90' 
                                        : 'bg-brand-ebony/5 border-brand-burgundy/30 text-brand-ebony/70'
                                } shadow-sm`}>
                                    <p className="font-bold mb-0.5 opacity-80">{message.replyToSenderName || message.replyTo?.senderName}</p>
                                    <p className="line-clamp-2 italic">"{decryptedReplyText || message.replyTo?.text}"</p>
                                </div>
                            )}

                            {message.sharedPostId && (
                                <Link href={`/posts/${message.sharedPostId}`} className="block focus:outline-none mb-2">
                                    <div className={`p-3 rounded-xl border min-w-0 w-full max-w-[280px] hover:shadow-md transition-all ${isOwnMessage ? 'bg-white/10 border-white/20 text-white' : 'bg-brand-parchment/30 border-brand-ebony/10 text-brand-ebony shadow-inner'}`}>
                                        <div className="flex items-center gap-2 mb-1.5 opacity-70">
                                            <Share2 className="w-3.5 h-3.5" />
                                            <span className="text-[10px] uppercase tracking-widest font-bold">Shared Post</span>
                                        </div>
                                        <p className="text-[11px] font-bold mb-1.5 font-serif italic">By {message.sharedPostAuthor}</p>
                                        {message.sharedPostImage && (
                                            <img src={message.sharedPostImage} alt="Shared" className="w-full h-28 object-cover rounded-lg mb-2 shadow-sm" />
                                        )}
                                        <p className="text-xs line-clamp-2 leading-relaxed opacity-95">{message.sharedPostContent}</p>
                                    </div>
                                </Link>
                            )}

                            {decryptedImageUrl && !message.isDeleted && (
                                <div className="mb-2 max-w-full overflow-hidden rounded-xl shadow-sm border border-black/5">
                                    <img 
                                        src={decryptedImageUrl} 
                                        alt="Message media" 
                                        className="w-full h-auto max-h-[350px] object-cover cursor-pointer hover:opacity-95 transition-all duration-300 active:scale-[0.98]"
                                        onClick={() => window.open(decryptedImageUrl, '_blank')}
                                    />
                                </div>
                            )}

                            {decryptedVideoUrl && !message.isDeleted && (
                                <div className="mb-2 max-w-full overflow-hidden rounded-xl shadow-sm border border-black/5">
                                    <video 
                                        src={decryptedVideoUrl} 
                                        controls 
                                        className="w-full h-auto max-h-[350px] bg-black/5"
                                    />
                                </div>
                            )}

                            <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-x-4 gap-y-1 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                                <div className="flex-1 min-w-0">
                                    {decryptedText && (
                                        <p className={`text-[15px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] break-words text-brand-ebony ${
                                            decryptedText.length < 50 && !decryptedImageUrl && !decryptedVideoUrl && !message.sharedPostId ? 'text-lg font-medium tracking-tight' : ''
                                        }`}>
                                            {decryptedText}
                                        </p>
                                    )}
                                </div>
                                
                                <div className={`flex items-center gap-1.5 shrink-0 select-none pb-0.5 mt-1 sm:mt-0 ${isOwnMessage ? 'text-white/60' : 'text-brand-ebony/30'}`}>
                                    {message.isEdited && <span className="text-[9px] italic font-medium">edited</span>}
                                    <span className="text-[10px] font-bold tracking-tight uppercase whitespace-nowrap">{timeString}</span>
                                    {isOwnMessage && (
                                        <div className="flex items-center" title={isRead ? 'Read' : 'Delivered'}>
                                            {isRead ? (
                                                <CheckCheck className="w-3.5 h-3.5 text-brand-gold drop-shadow-[0_0_2px_rgba(255,215,0,0.5)]" />
                                            ) : (
                                                <Check className="w-3.5 h-3.5 opacity-40" />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
