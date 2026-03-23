import React from 'react';
import { Message } from '@/types';
import { format } from 'date-fns';
import { Share2, CheckCheck, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface MessageBubbleProps {
    message: Message;
    isOwnMessage: boolean;
    onEdit?: (message: Message) => void;
    onUnsend?: (message: Message) => void;
}

export function MessageBubble({ message, isOwnMessage, onEdit, onUnsend }: MessageBubbleProps) {
    const [showMenu, setShowMenu] = useState(false);

    const timeString = message.createdAt
        ? format(message.createdAt.toDate(), 'h:mm a')
        : '';

    const canAction = isOwnMessage && message.createdAt && (
        (Date.now() - message.createdAt.toMillis()) < 10 * 60 * 1000
    );

    return (
        <div className={`flex w-full mb-4 group ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                {!isOwnMessage && message.senderProfilePic && (
                    <img
                        src={message.senderProfilePic}
                        alt={message.senderName || 'Sender'}
                        className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                )}
                <div
                    className={`px-4 py-2 rounded-2xl relative shadow-sm ${isOwnMessage
                            ? 'bg-brand-burgundy text-white rounded-br-none'
                            : 'bg-white border border-brand-ebony/10 text-brand-ebony rounded-bl-none'
                        }`}
                >
                    {canAction && (
                        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <div className="relative">
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    className={`p-1 rounded-full shadow-md border border-brand-ebony/10 transition-colors ${
                                        isOwnMessage ? 'bg-white text-brand-burgundy hover:bg-brand-cream' : 'bg-brand-burgundy text-white'
                                    }`}
                                >
                                    <MoreVertical className="w-3 h-3" />
                                </button>
                                {showMenu && (
                                    <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-xl border border-brand-ebony/10 py-1 min-w-[100px] z-20">
                                        <button
                                            onClick={() => {
                                                onEdit?.(message);
                                                setShowMenu(false);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-brand-ebony hover:bg-brand-parchment/30 transition-colors"
                                        >
                                            <Pencil className="w-3 h-3" />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => {
                                                onUnsend?.(message);
                                                setShowMenu(false);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            Unsend
                                        </button>
                                    </div>
                                )}
                            </div>
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
                    <p className="text-sm whitespace-pre-wrap word-break break-words">
                        {message.text}
                    </p>
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
    );
}
