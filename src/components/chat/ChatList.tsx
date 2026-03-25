'use client';

import React, { useState, useEffect } from 'react';
import { Chat, User, Group } from '@/types';
import { collection, query, getDocs, where, doc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, Loader2, Trash2, MessageSquare, Plus, Users, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CreateGroupModal } from '../modals/CreateGroupModal';

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
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
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

    // Filter active chats to exclude those deleted by the user
    const activeChats = chats.filter(chat => !chat.deletedBy?.includes(currentUser.uid));

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
                        className={`flex-1 flex items-center justify-center gap-2 py-3 sm:py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
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
                        className={`flex-1 flex items-center justify-center gap-2 py-3 sm:py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
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
                        className="w-full pl-10 pr-4 py-2 bg-brand-parchment/40 border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy outline-none transition-all placeholder:text-brand-ebony/30"
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
                                <Loader2 className="w-6 h-6 animate-spin text-brand-burgundy" />
                            </div>
                        ) : searchResults.length > 0 ? (
                            searchResults.map((user) => (
                                <button
                                    key={user.uid}
                                    onClick={() => {
                                        onStartChat(user);
                                        setSearchQuery('');
                                    }}
                                    className="w-full flex items-center p-3 hover:bg-brand-burgundy/5 rounded-xl transition-colors group"
                                >
                                    <img
                                        src={user.profilePic || `https://placehold.co/100x100/EFEFEFF/3D2B27?text=${user.name.substring(0, 1)}`}
                                        alt={user.name}
                                        className="w-12 h-12 rounded-full object-cover mr-3 border-2 border-white shadow-sm"
                                    />
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="font-serif font-bold text-brand-ebony">{user.name}</p>
                                        <p className="text-xs text-brand-ebony/50 uppercase tracking-widest font-bold font-sans">{user.profession || `Batch of ${user.batch}`}</p>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <p className="text-center py-4 text-brand-ebony/40 text-sm italic">No alumni found matching &ldquo;{searchQuery}&rdquo;</p>
                        )}
                    </div>
                ) : (
                    // Tabs Content
                    <div className="p-2">
                        {viewMode === 'chats' ? (
                            activeChats.length === 0 ? (
                                <div className="text-center py-12 px-4 text-brand-ebony/40">
                                    <MessageSquare className="w-12 h-12 mx-auto text-brand-ebony/20 mb-4" />
                                    <p className="font-serif italic">No active conversations.</p>
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
                                            className={`w-full flex items-center p-3 rounded-xl transition-all mb-1 cursor-pointer group relative ${
                                                selectedChatId === chat.id ? 'bg-brand-burgundy/5 border-r-4 border-brand-burgundy' : 'hover:bg-brand-burgundy/5'
                                            }`}
                                        >
                                            <div className="relative flex-shrink-0">
                                                <img
                                                    src={profilePic}
                                                    alt={name}
                                                    className="w-12 h-12 rounded-full object-cover mr-3 border-2 border-white shadow-sm"
                                                />
                                                {unreadCount > 0 && (
                                                    <div className="absolute -top-1 -right-1 bg-brand-burgundy text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white">
                                                        {unreadCount > 9 ? '9+' : unreadCount}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-left flex-1 min-w-0 pr-6">
                                                <div className="flex justify-between items-baseline mb-0.5">
                                                    <p className={`font-serif font-bold truncate pr-2 ${unreadCount > 0 ? 'text-brand-ebony' : 'text-brand-ebony/80'}`}>
                                                        {name}
                                                    </p>
                                                    {chat.lastMessageAt && (
                                                        <span className="text-[10px] text-brand-ebony/30 whitespace-nowrap">
                                                            {formatDistanceToNow(chat.lastMessageAt.toDate(), { addSuffix: false })}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={`text-xs truncate font-medium ${unreadCount > 0 ? 'text-brand-ebony' : 'text-brand-ebony/50 italic font-serif'}`}>
                                                    {chat.lastMessage || 'Sent a message'}
                                                </p>
                                            </div>

                                            {/* Action Buttons */}
                                            <button
                                                onClick={(e) => handleDeleteChat(e, chat.id)}
                                                disabled={isDeleting === chat.id}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-brand-ebony/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full shadow-sm"
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
                            )
                        ) : (
                            // Groups View
                            loadingGroups ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-brand-burgundy" />
                                </div>
                            ) : userGroups.length === 0 ? (
                                <div className="text-center py-12 px-4 text-brand-ebony/40">
                                    <Users className="w-12 h-12 mx-auto text-brand-ebony/20 mb-4" />
                                    <p className="font-serif italic">No groups joined yet.</p>
                                    <p className="text-xs mt-1">Create a group to get started!</p>
                                </div>
                            ) : (
                                userGroups.map((group) => (
                                    <button
                                        key={group.id}
                                        onClick={() => onSelectGroup(group.id)}
                                        className={`w-full flex items-center p-3 rounded-xl transition-all mb-1 relative ${
                                            selectedGroupId === group.id ? 'bg-brand-burgundy/5 border-r-4 border-brand-burgundy' : 'hover:bg-brand-burgundy/5'
                                        }`}
                                    >
                                        <div className="w-12 h-12 bg-brand-parchment rounded-full flex items-center justify-center mr-3 flex-shrink-0 border border-brand-burgundy/20">
                                            <Users className="w-6 h-6 text-brand-burgundy" />
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-0.5">
                                                <p className="font-serif font-bold text-brand-ebony truncate pr-2">
                                                    {group.groupName}
                                                </p>
                                                {group.lastMessageAt && (
                                                    <span className="text-[10px] text-brand-ebony/30 whitespace-nowrap">
                                                        {formatDistanceToNow(group.lastMessageAt.toDate(), { addSuffix: false })}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                <p className="text-xs line-clamp-1 text-brand-ebony/50 italic font-serif flex-1">
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
