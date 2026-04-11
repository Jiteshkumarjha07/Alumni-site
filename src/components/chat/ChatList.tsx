'use client';

import React, { useState, useEffect } from 'react';
import { Chat, User, Group } from '@/types';
import { collection, query, getDocs, where, doc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, Loader2, Trash2, MessageSquare, Plus, Users, MessageCircle, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CreateGroupModal } from '../modals/CreateGroupModal';
import { useMessaging } from '@/contexts/MessagingContext';

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
    const { unreadUsersCount } = useMessaging();

    useEffect(() => {
        const searchUsers = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const usersRef = collection(db, 'users');
                const q = query(
                    usersRef, 
                    where('instituteId', '==', currentUser.instituteId)
                );
                const querySnapshot = await getDocs(q);
                const term = searchQuery.toLowerCase();

                const results: User[] = [];
                querySnapshot.forEach((docSnap) => {
                    const user = { ...docSnap.data(), uid: docSnap.id } as User;
                    if (
                        user.uid !== currentUser.uid &&
                        (user.name?.toLowerCase().includes(term) ||
                         user.profession?.toLowerCase().includes(term))
                    ) {
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

        const timeoutId = setTimeout(searchUsers, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, currentUser.uid]);

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
        if (!window.confirm('Are you sure you want to delete this chat?')) return;

        setIsDeleting(chatId);
        try {
            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, {
                deletedBy: arrayUnion(currentUser.uid)
            });
        } catch (error) {
            console.error('Error deleting chat:', error);
        } finally {
            setIsDeleting(null);
        }
    };

    const activeChats = chats.filter(chat => !chat.deletedBy?.includes(currentUser.uid));

    return (
        <div className="w-full h-full flex flex-col bg-white/20 dark:bg-brand-parchment/5">
            {/* Header & Control Center */}
            <div className="px-4 py-4 border-b border-brand-ebony/5 bg-white/40 dark:bg-brand-parchment/10 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-2xl font-serif font-extrabold text-brand-ebony tracking-tight flex items-center gap-2">
                            Inbox
                            <Sparkles className="w-4 h-4 text-brand-gold animate-pulse" />
                        </h2>
                        <p className="text-[10px] font-bold text-brand-ebony/30 uppercase tracking-[0.2em] mt-0.5">Encrypted • Secure</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <button
                                onClick={() => setIsActionsPopupOpen(!isActionsPopupOpen)}
                                className={`p-3 rounded-2xl transition-all shadow-sm border ${
                                    isActionsPopupOpen 
                                        ? 'bg-gradient-indigo text-white border-transparent' 
                                        : 'bg-brand-burgundy/5 text-brand-burgundy hover:bg-brand-burgundy/10 border-brand-burgundy/10'
                                }`}
                            >
                                <Plus className="w-5 h-5" />
                            </button>

                            {isActionsPopupOpen && (
                                <>
                                    <div className="fixed inset-0 z-[70]" onClick={() => setIsActionsPopupOpen(false)}></div>
                                    <div className="absolute right-0 top-14 w-60 card-premium shadow-2xl z-[80] overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300 border-brand-burgundy/10">
                                        <div className="p-2 space-y-1">
                                            <button 
                                                onClick={() => {
                                                    setIsActionsPopupOpen(false);
                                                    setSearchQuery('');
                                                    document.getElementById('chat-search-input')?.focus();
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-brand-ebony hover:bg-brand-burgundy/5 rounded-xl transition-all"
                                            >
                                                <div className="p-2 bg-brand-burgundy/10 rounded-lg">
                                                    <MessageCircle className="w-4 h-4 text-brand-burgundy" />
                                                </div>
                                                New Chat
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setIsActionsPopupOpen(false);
                                                    setIsCreateGroupModalOpen(true);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-brand-ebony hover:bg-brand-burgundy/5 rounded-xl transition-all"
                                            >
                                                <div className="p-2 bg-indigo-500/10 rounded-lg">
                                                    <Users className="w-4 h-4 text-indigo-500" />
                                                </div>
                                                Create Group
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Glassy Tabs */}
                <div className="flex p-1.5 bg-brand-ebony/[0.03] rounded-xl mb-4 shadow-inner ring-1 ring-inset ring-brand-ebony/5">
                    <button
                        onClick={() => onViewModeChange('chats')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.08em] rounded-lg transition-all ${
                            viewMode === 'chats' 
                                ? 'bg-white dark:bg-brand-parchment text-brand-burgundy shadow-sm ring-1 ring-brand-ebony/5' 
                                : 'text-brand-ebony/40 hover:text-brand-ebony/60 hover:bg-black/5'
                        }`}
                    >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Direct</span>
                        {unreadUsersCount > 0 && (
                            <span className="w-4 h-4 flex items-center justify-center bg-red-500 text-white rounded-full text-[8px] animate-in zoom-in shrink-0">
                                {unreadUsersCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => onViewModeChange('groups')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.08em] rounded-lg transition-all ${
                            viewMode === 'groups' 
                                ? 'bg-white dark:bg-brand-parchment text-brand-burgundy shadow-sm ring-1 ring-brand-ebony/5' 
                                : 'text-brand-ebony/40 hover:text-brand-ebony/60 hover:bg-black/5'
                        }`}
                    >
                        <Users className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Circles</span>
                    </button>
                </div>

                <div className="relative group shadow-sm rounded-2xl">
                    <input
                        id="chat-search-input"
                        type="text"
                        placeholder={viewMode === 'chats' ? "Search direct network..." : "Search circles..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-5 py-2.5 bg-white dark:bg-brand-cream/20 border border-brand-ebony/5 dark:border-white/5 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-xs shadow-inner text-brand-ebony"
                    />
                    <Search className="w-3.5 h-3.5 text-brand-ebony/20 absolute left-3.5 top-1/2 -mt-1.5 group-focus-within:text-brand-burgundy transition-colors" />
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {searchQuery ? (
                    <div className="p-4 space-y-1">
                        {isSearching ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="w-8 h-8 animate-spin text-brand-burgundy/20" />
                            </div>
                        ) : searchResults.length > 0 ? (
                            searchResults.map((user) => (
                                <button
                                    key={user.uid}
                                    onClick={() => {
                                        onStartChat(user);
                                        setSearchQuery('');
                                    }}
                                    className="w-full flex items-center p-4 hover:bg-white dark:hover:bg-brand-ebony/20 rounded-2xl transition-all group border border-transparent hover:border-brand-ebony/5"
                                >
                                    <div className="relative shrink-0 mr-4">
                                        <img
                                            src={user.profilePic || `https://placehold.co/100x100/4f46e5/ffffff?text=${user.name.substring(0, 1)}`}
                                            alt={user.name}
                                            className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-brand-parchment shadow-md group-hover:scale-105 transition-transform"
                                        />
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="font-extrabold text-brand-ebony group-hover:text-brand-burgundy transition-colors">{user.name}</p>
                                        <p className="text-[10px] text-brand-ebony/30 uppercase tracking-widest font-bold mt-1 truncate">{user.profession || `Class of ${user.batch}`}</p>
                                    </div>
                                    <MessageCircle className="w-4 h-4 text-brand-ebony/10 group-hover:text-brand-burgundy transition-colors" />
                                </button>
                            ))
                        ) : (
                            <div className="text-center py-20">
                                <p className="text-sm font-serif italic text-brand-ebony/30">No matching alumni found</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-4 space-y-1.5">
                        {viewMode === 'chats' ? (
                            activeChats.length === 0 ? (
                                <div className="text-center py-16 px-6">
                                    <div className="w-16 h-16 bg-brand-ebony/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                         <MessageSquare className="w-8 h-8 text-brand-ebony/10" />
                                    </div>
                                    <p className="font-serif font-bold text-lg text-brand-ebony/60 italic mb-1">No conversations yet</p>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-ebony/30">Start connecting with your circle</p>
                                </div>
                            ) : (
                                activeChats.map((chat) => {
                                    const otherUserId = chat.participants.find(id => id !== currentUser.uid);
                                    const otherUserDetails = otherUserId ? chat.participantDetails?.[otherUserId] : null;
                                    const name = otherUserDetails?.name || 'Unknown User';
                                    const profilePic = otherUserDetails?.profilePic || `https://placehold.co/100x100/4f46e5/ffffff?text=${name.substring(0, 1)}`;
                                    const unreadCount = chat.unreadCount?.[currentUser.uid] || 0;
                                    const isActive = selectedChatId === chat.id;

                                    return (
                                        <div
                                            key={chat.id}
                                            onClick={() => onSelectChat(chat.id)}
                                            className={`w-full flex items-center p-2.5 rounded-xl transition-all cursor-pointer group relative border ${
                                                isActive 
                                                    ? 'bg-white dark:bg-brand-parchment border-brand-burgundy/10 shadow-lg' 
                                                    : 'hover:bg-white dark:hover:bg-brand-ebony/10 border-transparent hover:border-brand-ebony/5'
                                            }`}
                                        >
                                            <div className="relative flex-shrink-0 mr-4">
                                                <img
                                                    src={profilePic}
                                                    alt={name}
                                                    className={`w-9 h-9 rounded-xl object-cover border shadow-sm transition-all ${isActive ? 'border-brand-burgundy/50 scale-105' : 'border-white dark:border-brand-parchment group-hover:scale-105'}`}
                                                />
                                                {/* Online Status Indicator in Sidebar */}
                                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-brand-ebony shadow-sm transition-transform duration-300 group-hover:scale-110 ${otherUserDetails?.isOnline ? 'bg-emerald-500' : 'bg-brand-ebony/20'}`}>
                                                    {otherUserDetails?.isOnline && <div className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-60" />}
                                                </div>
                                                {unreadCount > 0 && (
                                                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-extrabold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white dark:border-brand-ebony animate-bounce shadow-sm z-10">
                                                        {unreadCount > 9 ? '9+' : unreadCount}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-left flex-1 min-w-0 pr-4">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <p className={`text-[13.5px] font-extrabold tracking-tight truncate pr-2 ${isActive || unreadCount > 0 ? 'text-black dark:text-white' : 'text-brand-ebony/70 dark:text-white/60'}`}>
                                                        {name}
                                                    </p>
                                                    {chat.lastMessageAt && (
                                                        <span className="text-[9px] font-bold text-brand-ebony/20 uppercase tracking-tighter whitespace-nowrap">
                                                            {formatDistanceToNow(chat.lastMessageAt.toDate(), { addSuffix: false })}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={`text-xs truncate transition-colors ${unreadCount > 0 ? 'text-brand-ebony font-bold' : 'text-brand-ebony/40 font-medium'}`}>
                                                    {chat.lastMessage || 'Sent a secure message'}
                                                </p>
                                            </div>

                                            <button
                                                onClick={(e) => handleDeleteChat(e, chat.id)}
                                                disabled={isDeleting === chat.id}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 text-brand-ebony/10 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                title="Delete conversation"
                                            >
                                                {isDeleting === chat.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    );
                                })
                            )
                        ) : (
                            // Circles View
                            loadingGroups ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-7 h-7 animate-spin text-brand-burgundy/20" />
                                </div>
                            ) : userGroups.length === 0 ? (
                                <div className="text-center py-16 px-6">
                                    <div className="w-16 h-16 bg-brand-ebony/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                         <Users className="w-8 h-8 text-brand-ebony/10" />
                                    </div>
                                    <p className="font-serif font-bold text-lg text-brand-ebony/60 italic mb-1">No circles yet</p>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-ebony/30">Connect with your community in groups</p>
                                </div>
                            ) : (
                                userGroups.map((group) => {
                                    const isActive = selectedGroupId === group.id;
                                    return (
                                        <button
                                            key={group.id}
                                            onClick={() => onSelectGroup(group.id)}
                                            className={`w-full flex items-center p-2.5 rounded-xl transition-all mb-1 relative border ${
                                                isActive 
                                                    ? 'bg-white dark:bg-brand-parchment border-brand-burgundy/10 shadow-lg' 
                                                    : 'hover:bg-white dark:hover:bg-brand-ebony/10 border-transparent hover:border-brand-ebony/5'
                                            }`}
                                        >
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mr-4 flex-shrink-0 border transition-all ${isActive ? 'bg-gradient-indigo text-white border-transparent' : 'bg-brand-burgundy/5 text-brand-burgundy border-brand-burgundy/10 group-hover:scale-105'}`}>
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <div className="text-left flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <p className={`text-[13.5px] font-bold truncate pr-2 ${isActive ? 'text-brand-ebony' : 'text-brand-ebony/80'}`}>
                                                        {group.groupName}
                                                    </p>
                                                    {group.lastMessageAt && (
                                                        <span className="text-[9px] font-bold text-brand-ebony/20 uppercase tracking-tighter">
                                                            {formatDistanceToNow(group.lastMessageAt.toDate(), { addSuffix: false })}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <p className="text-[11px] truncate text-brand-ebony/40 font-medium flex-1">
                                                        {group.lastMessage ? (
                                                            <>
                                                                <span className="font-extrabold text-brand-burgundy/40 uppercase text-[9px] mr-1">
                                                                    {group.lastSenderName?.split(' ')[0]}:
                                                                </span>
                                                                {group.lastMessage}
                                                            </>
                                                        ) : (
                                                            'Be the first to say hello'
                                                        )}
                                                    </p>
                                                    <span className="text-[9px] bg-brand-ebony/5 px-2 py-0.5 rounded-lg text-brand-ebony/30 font-extrabold shrink-0 border border-brand-ebony/5">
                                                        {group.members.length}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
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
