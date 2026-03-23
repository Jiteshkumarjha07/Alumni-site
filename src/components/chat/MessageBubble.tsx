'use client';

import React from 'react';
import { Message } from '@/types';
import { format } from 'date-fns';
import { Share2, CheckCheck, MoreVertical, Pencil, Trash2, Lock } from 'lucide-react';
import { useState, useMemo } from 'react';
import { decryptMessage } from '@/lib/encryption';

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
            <div className={`flex max-w-[85%] sm:max-w-[75%] md:max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                {!isOwnMessage && message.senderProfilePic && (
                    <img
                        src={message.senderProfilePic}
                        alt={message.senderName || 'Sender'}
                        className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                )}
                <div className="flex flex-col">
                    {showSenderName && !isOwnMessage && (
                        <span className="text-[10px] font-bold text-brand-ebony/40 uppercase tracking-widest mb-1 ml-1">
                            {message.senderName}
                        </span>
                    )}
                    {message.isForwarded && (
                        <div className={`flex items-center gap-1 mb-1 opacity-50 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                            <Share2 className="w-2.5 h-2.5" />
                            <span className="text-[9px] uppercase tracking-tighter font-bold italic">Forwarded</span>
                        </div>
                    )}
                    <div
                        className={`px-4 py-2 rounded-2xl relative shadow-sm ${isOwnMessage
                                ? 'bg-brand-burgundy text-white rounded-br-none'
                                : 'bg-white border border-brand-ebony/10 text-brand-ebony rounded-bl-none'
                            }`}
                    >
                        <div className="absolute -top-3 -right-1 sm:-top-2 sm:-right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10 shadow-lg sm:shadow-none">
                            <div className="relative">
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    className={`p-2 sm:p-1.5 rounded-full shadow-md border border-brand-ebony/10 transition-colors ${
                                        isOwnMessage ? 'bg-white text-brand-burgundy hover:bg-brand-cream' : 'bg-brand-burgundy text-white hover:bg-brand-burgundy/90'
                                    }`}
                                >
                                    <MoreVertical className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                                </button>
                                {showMenu && (
                                    <div className={`absolute ${isOwnMessage ? 'right-0' : 'left-0'} mt-1 bg-white rounded-lg shadow-xl border border-brand-ebony/10 py-1 min-w-[140px] z-20`}>
                                        <button
                                            onClick={() => {
                                                onReply?.(message);
                                                setShowMenu(false);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-ebony hover:bg-brand-parchment/30 transition-colors"
                                        >
                                            <Share2 className="w-3.5 h-3.5 rotate-180" />
                                            Reply
                                        </button>
                                        <button
                                            onClick={handleCopy}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-ebony hover:bg-brand-parchment/30 transition-colors"
                                        >
                                            <Share2 className="w-3.5 h-3.5" />
                                            Copy
                                        </button>
                                        <button
                                            onClick={() => {
                                                onForward?.(message);
                                                setShowMenu(false);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-ebony hover:bg-brand-parchment/30 transition-colors"
                                        >
                                            <Share2 className="w-3.5 h-3.5" />
                                            Forward
                                        </button>
                                        <div className="h-px bg-brand-ebony/5 my-1" />
                                        <button
                                            onClick={() => {
                                                onUnsend?.(message);
                                                setShowMenu(false);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            {isOwnMessage ? 'Unsend' : 'Delete'}
                                        </button>
                                        {isOwnMessage && canAction && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        onEdit?.(message);
                                                        setShowMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-ebony hover:bg-brand-parchment/30 transition-colors"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                    Edit
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {decryptedReplyText && (
                            <div className={`mb-2 p-2 rounded-lg border-l-4 text-[11px] leading-tight max-w-full truncate ${
                                isOwnMessage 
                                    ? 'bg-white/10 border-white/40 text-white/80' 
                                    : 'bg-brand-ebony/5 border-brand-burgundy/40 text-brand-ebony/60'
                            }`}>
                                <p className="font-bold mb-0.5 opacity-80">{message.replyToSenderName}</p>
                                <p className="truncate italic">{decryptedReplyText}</p>
                            </div>
                        )}

                        {message.sharedPostId && (
                            <div className={`mb-2 p-3 rounded-xl border ${isOwnMessage ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-50 border-gray-100 text-gray-800'}`}>
                                <div className="flex items-center gap-2 mb-1 opacity-70">
                                    <Share2 className="w-3 h-3" />
                                    <span className="text-[10px] uppercase tracking-wider font-bold">Shared Post</span>
                                </div>
                                <p className="text-xs font-bold mb-1 font-serif italic">By {message.sharedPostAuthor}</p>
                                {message.sharedPostImage && (
                                    <img src={message.sharedPostImage} alt="Shared" className="w-full h-24 object-cover rounded-lg mb-2" />
                                )}
                                <p className="text-xs line-clamp-2 opacity-90">{message.sharedPostContent}</p>
                            </div>
                        )}

                        {decryptedImageUrl && !message.isDeleted && (
                            <div className="mb-2 max-w-full overflow-hidden rounded-xl">
                                <img 
                                    src={decryptedImageUrl} 
                                    alt="Message media" 
                                    className="w-full h-auto max-h-[300px] object-cover cursor-pointer hover:opacity-95 transition-opacity rounded-lg"
                                    onClick={() => window.open(decryptedImageUrl, '_blank')}
                                />
                            </div>
                        )}

                        {decryptedVideoUrl && !message.isDeleted && (
                            <div className="mb-2 max-w-full overflow-hidden rounded-xl">
                                <video 
                                    src={decryptedVideoUrl} 
                                    controls 
                                    className="w-full h-auto max-h-[300px] rounded-lg shadow-sm"
                                />
                            </div>
                        )}

                        {decryptedText && (
                            <p className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere] break-words">
                                {decryptedText}
                            </p>
                        )}
                        <div className={`text-[10px] flex items-center gap-1 mt-1 ${isOwnMessage ? 'text-white/60 justify-end' : 'text-brand-ebony/40 justify-start'}`}>
                            {message.isEdited && <span className="italic mr-1">(edited)</span>}
                            <span>{timeString}</span>
                            {isOwnMessage && (
                                <CheckCheck className={`w-3 h-3 ${message.isRead ? 'text-brand-gold' : 'opacity-40'}`} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
