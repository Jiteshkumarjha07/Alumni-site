'use client';

import React, { useState, useEffect } from 'react';
import { Chat, User } from '@/types';
import { collection, query, getDocs, where, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, Loader2, Trash2, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatListProps {
    currentUser: User;
    chats: Chat[];
    onSelectChat: (chatId: string) => void;
    onStartChat: (otherUser: User) => void;
    selectedChatId: string | null;
}

export function ChatList({ currentUser, chats, onSelectChat, onStartChat, selectedChatId }: ChatListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    useEffect(() => {
        const searchUsers = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const usersRef = collection(db, 'users');
                const q = query(usersRef, 
                    where('name', '>=', searchQuery), 
                    where('name', '<=', searchQuery + '\uf8ff')
                );
                const querySnapshot = await getDocs(q);

                const results: User[] = [];
                querySnapshot.forEach((doc) => {
                    const user = doc.data() as User;
                    if (user.uid !== currentUser.uid) {
                        results.push({ ...user, uid: doc.id });
                    }
                });
                setSearchResults(results);
            } catch (error) {
                console.error('Error searching users:', error);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(searchUsers, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, currentUser.uid]);

    // Filter active chats to exclude those deleted by the user
    const activeChats = chats.filter(chat => !chat.deletedBy?.includes(currentUser.uid));

    const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this chat? It will be hidden from your list.')) return;

        setIsDeleting(chatId);
        try {
            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, {
                deletedBy: arrayUnion(currentUser.uid)
            });
        } catch (error) {
            console.error('Error deleting chat:', error);
            alert('Failed to delete chat. Please try again.');
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-white border-r">
            {/* Header & Search */}
            <div className="p-4 border-b">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Messages</h2>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search alumni to chat..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50 text-sm"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto">
                {searchQuery ? (
                    // Search Results
                    <div className="p-2">
                        {isSearching ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                            </div>
                        ) : searchResults.length > 0 ? (
                            searchResults.map((user) => (
                                <button
                                    key={user.uid}
                                    onClick={() => {
                                        onStartChat(user);
                                        setSearchQuery('');
                                    }}
                                    className="w-full flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors group"
                                >
                                    <img
                                        src={user.profilePic || `https://placehold.co/100x100/EFEFEFF/003366?text=${user.name.substring(0, 1)}`}
                                        alt={user.name}
                                        className="w-10 h-10 rounded-full object-cover mr-3 shadow-sm"
                                    />
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                                        <p className="text-xs text-gray-500 truncate">{user.profession || `Batch of ${user.batch}`}</p>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <p className="text-center py-4 text-gray-500 text-sm italic">No alumni found matching "{searchQuery}"</p>
                        )}
                    </div>
                ) : (
                    // Active Chats
                    <div className="p-2">
                        {activeChats.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 px-4">
                                <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                <p className="font-medium">No active conversations</p>
                                <p className="text-xs mt-1">Search above to find alumni and start a conversation.</p>
                            </div>
                        ) : (
                            activeChats.map((chat) => {
                                const otherUserId = chat.participants.find(id => id !== currentUser.uid);
                                const otherUserDetails = otherUserId ? chat.participantDetails?.[otherUserId] : null;

                                const name = otherUserDetails?.name || 'Unknown User';
                                const profilePic = otherUserDetails?.profilePic || `https://placehold.co/100x100/EFEFEFF/003366?text=${name.substring(0, 1)}`;
                                const unreadCount = chat.unreadCount?.[currentUser.uid] || 0;

                                return (
                                    <div
                                        key={chat.id}
                                        onClick={() => onSelectChat(chat.id)}
                                        className={`w-full flex items-center p-3 rounded-lg transition-colors mb-1 cursor-pointer group relative ${
                                            selectedChatId === chat.id ? 'bg-blue-50 ring-1 ring-blue-100' : 'hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <img
                                                src={profilePic}
                                                alt={name}
                                                className="w-12 h-12 rounded-full object-cover mr-3 shadow-sm"
                                            />
                                            {unreadCount > 0 && (
                                                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white">
                                                    {unreadCount > 9 ? '9+' : unreadCount}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-left flex-1 min-w-0 pr-6">
                                            <div className="flex justify-between items-baseline mb-0.5">
                                                <p className={`font-semibold truncate pr-2 ${unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                                                    {name}
                                                </p>
                                                {chat.lastMessageAt && (
                                                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                        {formatDistanceToNow(chat.lastMessageAt.toDate(), { addSuffix: false })}
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-xs truncate ${unreadCount > 0 ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                                                {chat.lastMessage || 'Sent a message'}
                                            </p>
                                        </div>

                                        {/* Action Buttons */}
                                        <button
                                            onClick={(e) => handleDeleteChat(e, chat.id)}
                                            disabled={isDeleting === chat.id}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full shadow-sm"
                                            title="Delete conversation"
                                        >
                                            {isDeleting === chat.id ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-3 h-3" />
                                            )}
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
