import React, { useState, useEffect } from 'react';
import { Chat, User } from '@/types';
import { collection, query, getDocs, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, Loader2, Plus, Users, MessageCircle, MoreVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CreateGroupModal } from '../modals/CreateGroupModal';
import { Group } from '@/types';

interface ChatListProps {
    currentUser: User;
    chats: Chat[];
    onSelectChat: (chatId: string) => void;
    onStartChat: (otherUser: User) => void;
    onSelectGroup: (groupId: string) => void;
    selectedChatId: string | null;
    selectedGroupId: string | null;
    viewMode: 'chats' | 'groups';
    onViewModeChange: (mode: 'chats' | 'groups') => void;
}

export function ChatList({ currentUser, chats, onSelectChat, onStartChat, onSelectGroup, selectedChatId, selectedGroupId, viewMode, onViewModeChange }: ChatListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isActionsPopupOpen, setIsActionsPopupOpen] = useState(false);
    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
    const [userGroups, setUserGroups] = useState<Group[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(false);

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

    // Fetch user groups
    useEffect(() => {
        if (!currentUser.uid || viewMode !== 'groups') return;

        setLoadingGroups(true);
        const groupsRef = collection(db, 'groups');
        const q = query(groupsRef, where('members', 'array-contains', currentUser.uid));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedGroups = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Group[];
            
            setUserGroups(fetchedGroups.sort((a, b) => 
                (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
            ));
            setLoadingGroups(false);
        });

        return () => unsubscribe();
    }, [currentUser.uid, viewMode]);

    return (
        <div className="w-full h-full flex flex-col bg-brand-parchment/10 border-r border-brand-ebony/10">
            {/* Header & Search */}
            <div className="p-4 border-b border-brand-ebony/10 relative">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-serif font-bold text-brand-ebony tracking-tight">Messages</h2>
                    <div className="relative">
                        <button
                            onClick={() => setIsActionsPopupOpen(!isActionsPopupOpen)}
                            className="p-2 bg-brand-burgundy/5 text-brand-burgundy rounded-xl hover:bg-brand-burgundy/10 transition-colors shadow-sm border border-brand-burgundy/20"
                        >
                            <Plus className="w-5 h-5" />
                        </button>

                        {isActionsPopupOpen && (
                            <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-2xl border border-brand-ebony/5 z-[80] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-2 space-y-1">
                                    <button 
                                        onClick={() => {
                                            setIsActionsPopupOpen(false);
                                            // Focus search input or just clear it
                                            setSearchQuery('');
                                            const input = document.getElementById('chat-search-input');
                                            if (input) input.focus();
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-brand-ebony hover:bg-brand-parchment/30 rounded-xl transition-colors"
                                    >
                                        <MessageCircle className="w-4 h-4 text-brand-burgundy" />
                                        New Message
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setIsActionsPopupOpen(false);
                                            setIsCreateGroupModalOpen(true);
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-brand-ebony hover:bg-brand-parchment/30 rounded-xl transition-colors"
                                    >
                                        <Users className="w-4 h-4 text-brand-burgundy" />
                                        Create Group
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs for switching between Chats and Groups */}
                <div className="flex p-1 bg-brand-ebony/5 rounded-xl mb-4">
                    <button
                        onClick={() => onViewModeChange('chats')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                            viewMode === 'chats' 
                                ? 'bg-white text-brand-burgundy shadow-sm' 
                                : 'text-brand-ebony/40 hover:text-brand-ebony/60'
                        }`}
                    >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Chats
                    </button>
                    <button
                        onClick={() => onViewModeChange('groups')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                            viewMode === 'groups' 
                                ? 'bg-white text-brand-burgundy shadow-sm' 
                                : 'text-brand-ebony/40 hover:text-brand-ebony/60'
                        }`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        Groups
                    </button>
                </div>

                <div className="relative">
                    <input
                        id="chat-search-input"
                        type="text"
                        placeholder={viewMode === 'chats' ? "Search alumni to chat..." : "Search your groups..."}
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
                        {viewMode === 'chats' ? (
                            chats.length === 0 ? (
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
                            )
                        ) : (
                            // Groups View
                            loadingGroups ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-brand-burgundy" />
                                </div>
                            ) : userGroups.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                    <p>No groups joined yet.</p>
                                    <p className="text-sm">Create a group to get started!</p>
                                </div>
                            ) : (
                                userGroups.map((group) => (
                                    <button
                                        key={group.id}
                                        onClick={() => onSelectGroup(group.id)}
                                        className={`w-full flex items-center p-3 rounded-xl transition-all mb-1 ${selectedGroupId === group.id 
                                            ? 'bg-brand-burgundy/10 border-l-4 border-brand-burgundy translate-x-1 shadow-sm' 
                                            : 'hover:bg-brand-burgundy/5 translate-x-0'
                                            }`}
                                    >
                                        <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                            <Users className="w-6 h-6 text-brand-burgundy" />
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-0.5">
                                                <p className="font-serif font-bold text-brand-ebony truncate pr-2">
                                                    {group.groupName}
                                                </p>
                                                {group.lastMessageAt && (
                                                    <span className="text-xs text-gray-400 whitespace-nowrap">
                                                        {formatDistanceToNow(group.lastMessageAt.toDate(), { addSuffix: true })}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                <p className="text-sm truncate text-brand-ebony/50 italic font-serif flex-1">
                                                    {group.lastMessage ? (
                                                        <>
                                                            <span className="font-sans font-bold not-italic text-[10px] uppercase text-brand-burgundy/60 mr-1">
                                                                {group.lastSenderName?.split(' ')[0]}:
                                                            </span>
                                                            {group.lastMessage}
                                                        </>
                                                    ) : (
                                                        'No messages yet'
                                                    )}
                                                </p>
                                                <span className="text-[10px] bg-brand-ebony/5 px-1.5 py-0.5 rounded text-brand-ebony/40 font-bold shrink-0">
                                                    {group.members.length}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )
                        )}
                    </div>
                )}
            </div>

            <CreateGroupModal 
                isOpen={isCreateGroupModalOpen}
                onClose={() => setIsCreateGroupModalOpen(false)}
                currentUser={currentUser}
                onGroupCreated={(groupId) => {
                    onViewModeChange('groups');
                    onSelectGroup(groupId);
                }}
            />
        </div>
    );
}

// Need to import MessageSquare here
import { MessageSquare } from 'lucide-react';
