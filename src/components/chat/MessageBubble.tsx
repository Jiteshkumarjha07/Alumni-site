import React from 'react';
import { Message } from '@/types';
import { format } from 'date-fns';
import { Share2, Check, CheckCheck, Play, FileText } from 'lucide-react';
import Link from 'next/link';

interface MessageBubbleProps {
    message: Message;
    isOwnMessage: boolean;
}

export function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
    const timeString = message.createdAt
        ? format(message.createdAt.toDate(), 'h:mm a')
        : '';

    // A message is "read" if it has been marked as readBy the recipient.
    // For 1-on-1, it's just true/false for the other person.
    const isRead = message.isRead || (message.readBy && message.readBy.length > 1);

    return (
        <div className={`flex w-full mb-2 ${isOwnMessage ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
            <div className={`flex max-w-[85%] md:max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                {!isOwnMessage && message.senderProfilePic && (
                    <div className="relative flex-shrink-0 mb-1">
                         <img
                            src={message.senderProfilePic}
                            alt={message.senderName || 'Sender'}
                            className="w-7 h-7 rounded-full object-cover shadow-sm ring-1 ring-gray-100"
                        />
                    </div>
                )}
                
                <div className="flex flex-col">
                    <div
                        className={`px-3 py-2 rounded-2xl relative shadow-sm ${isOwnMessage
                                ? 'bg-blue-600 text-white rounded-br-sm'
                                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                            }`}
                    >
                        {/* Reply Context */}
                        {message.replyTo && (
                            <div className={`mb-2 p-2 rounded-lg border-l-4 text-xs ${
                                isOwnMessage ? 'bg-white/10 border-white/40 text-blue-50' : 'bg-gray-50 border-blue-400 text-gray-600'
                            }`}>
                                <p className="font-bold mb-0.5 opacity-80">{message.replyTo.senderName}</p>
                                <p className="truncate italic">"{message.replyTo.text}"</p>
                            </div>
                        )}

                        {/* Shared Post Content */}
                        {message.sharedPostId && (
                            <Link href={`/posts/${message.sharedPostId}`} className="block focus:outline-none mb-3">
                                <div className={`p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all ${isOwnMessage ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-gray-50 border-gray-100 text-gray-800 hover:bg-white'}`}>
                                    <div className="flex items-center gap-2 mb-2 opacity-70">
                                        <Share2 className="w-3 h-3" />
                                        <span className="text-[10px] uppercase tracking-wider font-bold">Shared Post</span>
                                    </div>
                                    {message.sharedPostImage && (
                                        <div className="relative w-full h-32 rounded-lg overflow-hidden mb-2 shadow-inner">
                                             <img src={message.sharedPostImage} alt="Shared" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <p className="text-xs font-bold mb-1 font-serif italic">By {message.sharedPostAuthor}</p>
                                    <p className="text-xs line-clamp-2 opacity-90">{message.sharedPostContent}</p>
                                </div>
                            </Link>
                        )}

                        {/* Media Content (Image/Video) */}
                        {message.mediaUrl && (
                            <div className="mb-2 max-w-sm rounded-lg overflow-hidden">
                                {message.mediaType === 'video' ? (
                                    <div className="relative group cursor-pointer">
                                        <video 
                                            src={message.mediaUrl} 
                                            className="w-full max-h-64 object-cover"
                                            controls
                                        />
                                    </div>
                                ) : (
                                    <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" className="block">
                                        <img 
                                            src={message.mediaUrl} 
                                            alt="Media Content" 
                                            className="w-full max-h-80 object-cover hover:opacity-95 transition-opacity" 
                                        />
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Text Content */}
                        {message.text && (
                            <p className="text-sm whitespace-pre-wrap word-break break-words leading-relaxed">
                                {message.text}
                            </p>
                        )}

                        {/* Meta Data: Time + Read Receipts */}
                        <div className={`flex items-center gap-1 mt-1 ${isOwnMessage ? 'justify-end text-blue-100' : 'justify-start text-gray-400'}`}>
                            <span className="text-[9px] uppercase font-bold tracking-tighter">
                                {timeString}
                            </span>
                            {isOwnMessage && (
                                <span className="flex items-center" title={isRead ? 'Read' : 'Delivered'}>
                                    {isRead ? (
                                        <CheckCheck className="w-3 h-3 text-blue-200" />
                                    ) : (
                                        <Check className="w-3 h-3 opacity-70" />
                                    )}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
