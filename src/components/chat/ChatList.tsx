import React, { useState, useEffect } from 'react';
import { Chat, User } from '@/types';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, Loader2 } from 'lucide-react';
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

    useEffect(() => {
        const searchUsers = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                // Perform a simple search for users.
                // In a production app, Algolia or a similar service is recommended for full-text search.
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('name', '>=', searchQuery), where('name', '<=', searchQuery + '\uf8ff'));
                const querySnapshot = await getDocs(q);

                const results: User[] = [];
                querySnapshot.forEach((doc) => {
                    const user = doc.data() as User;
                    if (user.uid !== currentUser.uid) {
                        results.push(user);
                    }
                });
                setSearchResults(results);
            } catch (error) {
                console.error('Error searching users:', error);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(searchUsers, 500); // Debounce
        return () => clearTimeout(timeoutId);
    }, [searchQuery, currentUser.uid]);

    return (
        <div className="w-full h-full flex flex-col bg-brand-parchment/10 border-r border-brand-ebony/10">
            {/* Header & Search */}
            <div className="p-4 border-b border-brand-ebony/10">
                <h2 className="text-xl font-serif font-bold text-brand-ebony mb-4 tracking-tight">Messages</h2>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search alumni to chat..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white/60 border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy outline-none transition-all"
                    />
                    <Search className="w-5 h-5 text-brand-ebony/30 absolute left-3 top-1/2 -translate-y-1/2" />
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
                                    className="w-full flex items-center p-3 hover:bg-brand-burgundy/5 rounded-xl transition-colors"
                                >
                                    <img
                                        src={user.profilePic || `https://placehold.co/100x100/EFEFEFF/3D2B27?text=${user.name.substring(0, 1)}`}
                                        alt={user.name}
                                        className="w-12 h-12 rounded-full object-cover mr-3 border-2 border-white shadow-sm"
                                    />
                                    <div className="text-left flex-1">
                                        <p className="font-serif font-bold text-brand-ebony">{user.name}</p>
                                        <p className="text-xs text-brand-ebony/50 uppercase tracking-widest font-bold font-sans">{user.profession || `Batch of ${user.batch}`}</p>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <p className="text-center py-4 text-gray-500 text-sm">No alumni found matching "{searchQuery}"</p>
                        )}
                    </div>
                ) : (
                    // Active Chats
                    <div className="p-2">
                        {chats.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p>No active conversations.</p>
                                <p className="text-sm">Search above to start chatting!</p>
                            </div>
                        ) : (
                            chats.map((chat) => {
                                const otherUserId = chat.participants.find(id => id !== currentUser.uid);
                                const otherUserDetails = otherUserId ? chat.participantDetails?.[otherUserId] : null;

                                const name = otherUserDetails?.name || 'Unknown User';
                                const profilePic = otherUserDetails?.profilePic || `https://placehold.co/100x100/EFEFEFF/003366?text=${name.substring(0, 1)}`;
                                const unreadCount = chat.unreadCount?.[currentUser.uid] || 0;

                                return (
                                    <button
                                        key={chat.id}
                                        onClick={() => onSelectChat(chat.id)}
                                        className={`w-full flex items-center p-3 rounded-xl transition-all mb-1 ${selectedChatId === chat.id 
                                            ? 'bg-brand-burgundy/10 border-l-4 border-brand-burgundy translate-x-1 shadow-sm' 
                                            : 'hover:bg-brand-burgundy/5 translate-x-0'
                                            }`}
                                    >
                                        <div className="relative">
                                            <img
                                                src={profilePic}
                                                alt={name}
                                                className="w-12 h-12 rounded-full object-cover mr-3"
                                            />
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-0.5">
                                                <p className={`font-serif font-bold truncate pr-2 ${unreadCount > 0 ? 'text-brand-ebony' : 'text-brand-ebony/80'}`}>
                                                    {name}
                                                </p>
                                                {chat.lastMessageAt && (
                                                    <span className="text-xs text-gray-400 whitespace-nowrap">
                                                        {formatDistanceToNow(chat.lastMessageAt.toDate(), { addSuffix: true })}
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-sm truncate font-medium ${unreadCount > 0 ? 'text-brand-ebony' : 'text-brand-ebony/50 italic font-serif'}`}>
                                                {chat.lastMessage || 'Start a conversation'}
                                            </p>
                                        </div>
                                        {unreadCount > 0 && (
                                            <div className="ml-3 bg-brand-burgundy text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </div>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Need to import MessageSquare here
import { MessageSquare } from 'lucide-react';
