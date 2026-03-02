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
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
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
                                    className="w-full flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    <img
                                        src={user.profilePic || `https://placehold.co/100x100/EFEFEFF/003366?text=${user.name.substring(0, 1)}`}
                                        alt={user.name}
                                        className="w-12 h-12 rounded-full object-cover mr-3"
                                    />
                                    <div className="text-left flex-1">
                                        <p className="font-semibold text-gray-900">{user.name}</p>
                                        <p className="text-sm text-gray-500 line-clamp-1">{user.profession || `Batch of ${user.batch}`}</p>
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
                                        className={`w-full flex items-center p-3 rounded-lg transition-colors mb-1 ${selectedChatId === chat.id ? 'bg-blue-50' : 'hover:bg-gray-50'
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
                                            <div className="flex justify-between items-baseline mb-1">
                                                <p className={`font-semibold truncate pr-2 ${unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                                                    {name}
                                                </p>
                                                {chat.lastMessageAt && (
                                                    <span className="text-xs text-gray-400 whitespace-nowrap">
                                                        {formatDistanceToNow(chat.lastMessageAt.toDate(), { addSuffix: true })}
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-sm truncate ${unreadCount > 0 ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                                                {chat.lastMessage || 'Start a conversation'}
                                            </p>
                                        </div>
                                        {unreadCount > 0 && (
                                            <div className="ml-3 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
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
