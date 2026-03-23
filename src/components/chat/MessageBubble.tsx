import React from 'react';
import { Message } from '@/types';
import { format } from 'date-fns';
import { Share2, CheckCheck } from 'lucide-react';

interface MessageBubbleProps {
    message: Message;
    isOwnMessage: boolean;
}

export function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
    const timeString = message.createdAt
        ? format(message.createdAt.toDate(), 'h:mm a')
        : '';

    return (
        <div className={`flex w-full mb-4 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                {!isOwnMessage && message.senderProfilePic && (
                    <img
                        src={message.senderProfilePic}
                        alt={message.senderName || 'Sender'}
                        className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                )}
                <div
                    className={`px-4 py-2 rounded-2xl relative ${isOwnMessage
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                        }`}
                >
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
                    <div className={`text-[10px] flex items-center gap-1 mt-1 ${isOwnMessage ? 'text-blue-100 justify-end' : 'text-gray-400 justify-start'}`}>
                        <span>{timeString}</span>
                        {isOwnMessage && (
                            <CheckCheck className={`w-3 h-3 ${message.isRead ? 'text-blue-300' : 'opacity-40'}`} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
