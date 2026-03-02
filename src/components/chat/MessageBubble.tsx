import React from 'react';
import { Message } from '@/types';
import { format } from 'date-fns';

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
                    <p className="text-sm whitespace-pre-wrap word-break break-words">
                        {message.text}
                    </p>
                    <span className={`text-[10px] block mt-1 ${isOwnMessage ? 'text-blue-100 text-right' : 'text-gray-400 text-left'}`}>
                        {timeString}
                    </span>
                </div>
            </div>
        </div>
    );
}
