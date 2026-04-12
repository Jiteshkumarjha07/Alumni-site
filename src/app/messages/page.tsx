'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ChatList } from '@/components/chat/ChatList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Chat, User, Group } from '@/types';
import { Loader2 } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';

import { Suspense } from 'react';

function MessagesClient() {
    const { userData, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!authLoading && !userData) {
            router.push('/login');
        }
    }, [userData, authLoading, router]);

    const [chats, setChats] = useState<Chat[]>([]);
    const [loadingChats, setLoadingChats] = useState(true);

    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<{ name: string; profilePic: string; uid: string } | null>(null);
    const [selectedGroupData, setSelectedGroupData] = useState<Group | null>(null);
    const [viewMode, setViewMode] = useState<'chats' | 'groups'>('chats');
    
    // Resizable Sidebar State
    const [sidebarWidth, setSidebarWidth] = useState(400);
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const getChatId = (uid1: string, uid2: string) => {
        return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
    };

    useEffect(() => {
        const view = searchParams.get('view');
        if (view === 'groups') {
            setViewMode('groups');
        } else if (view === 'chats') {
            setViewMode('chats');
        }
    }, [searchParams]);

    const handleStartChat = (otherUser: User) => {
        if (!userData?.uid) return;
        const chatId = getChatId(userData.uid, otherUser.uid);
        setSelectedChatId(chatId);
        setSelectedGroupId(null);
        setSelectedUser({
            uid: otherUser.uid,
            name: otherUser.name,
            profilePic: otherUser.profilePic || '',
        });
    };

    const handleSelectChat = (chatId: string) => {
        setSelectedChatId(chatId);
        setSelectedGroupId(null);
        const chat = chats.find(c => c.id === chatId);
        if (chat && userData?.uid) {
            const otherUid = chat.participants.find(id => id !== userData.uid);
            if (otherUid && chat.participantDetails?.[otherUid]) {
                setSelectedUser({
                    uid: otherUid,
                    name: chat.participantDetails[otherUid].name,
                    profilePic: chat.participantDetails[otherUid].profilePic,
                });
            }
        }
    };

    const handleSelectGroup = async (groupId: string) => {
        setSelectedChatId(null);
        setSelectedUser(null);
        setSelectedGroupId(groupId);
        try {
            const groupDoc = await getDoc(doc(db, 'groups', groupId));
            if (groupDoc.exists()) {
                setSelectedGroupData({ id: groupDoc.id, ...groupDoc.data() } as Group);
            }
        } catch (error) {
            console.error("Error fetching group data:", error);
        }
    };

    useEffect(() => {
        if (!userData?.uid) {
            setLoadingChats(false);
            return;
        }

        let isMounted = true;

        const chatsRef = collection(db, 'chats');
        const q = query(chatsRef, where('participants', 'array-contains', userData.uid));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!isMounted) return;
            const fetchedChats = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Chat[];

            fetchedChats.sort((a, b) => {
                const timeA = typeof a.lastMessageAt?.toMillis === 'function' ? a.lastMessageAt.toMillis() : Date.now();
                const timeB = typeof b.lastMessageAt?.toMillis === 'function' ? b.lastMessageAt.toMillis() : Date.now();
                return timeB - timeA;
            });

            setChats(fetchedChats);
            setLoadingChats(false);
        }, (error) => {
            console.error('Error fetching chats:', error);
            if (isMounted) setLoadingChats(false);
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [userData?.uid]);

    useEffect(() => {
        const userId = searchParams.get('userId');
        const userName = searchParams.get('name');
        const userPic = searchParams.get('pic');

        if (userId && userName && userData?.uid) {
            const tempUser = {
                uid: userId,
                name: userName,
                profilePic: userPic || '',
            } as User;
            handleStartChat(tempUser);
            router.replace('/messages');
        }
    }, [searchParams, userData?.uid, router]);

    // Handle Resize
    const startResizing = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    const stopResizing = () => {
        setIsResizing(false);
    };

    useEffect(() => {
        const resize = (e: MouseEvent) => {
            if (!isResizing || !containerRef.current) return;
            
            const containerLeft = containerRef.current.getBoundingClientRect().left;
            let newWidth = e.clientX - containerLeft;
            
            // Limit bounds: 300px to 600px
            if (newWidth < 300) newWidth = 300;
            if (newWidth > 600) newWidth = 600;
            
            setSidebarWidth(newWidth);
        };

        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        };
    }, [isResizing]);

    if (authLoading) {
        return (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-brand-burgundy/30" />
            </div>
        );
    }

    if (!userData) return null;

    return (
        <div className="h-dvh md:h-[calc(100dvh-7rem)] w-full max-w-[1700px] mx-auto md:px-4 md:pb-4 animate-fade-in overflow-hidden">
            <div ref={containerRef} className="flex bg-white/60 dark:bg-brand-parchment/10 backdrop-blur-2xl md:rounded-[2rem] shadow-premium ring-1 ring-white/50 dark:ring-white/10 border border-brand-ebony/5 h-full w-full overflow-hidden transition-all duration-500">
                {/* Left Pane: Chat List */}
                <div 
                    style={{ width: sidebarWidth ? `${sidebarWidth}px` : undefined }}
                    className={`flex-shrink-0 border-r border-brand-ebony/[0.04] flex flex-col bg-white/40 dark:bg-black/5 ${(selectedChatId || selectedGroupId) ? 'hidden md:flex' : 'flex'}`}
                >
                    {loadingChats ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-brand-burgundy/20" />
                        </div>
                    ) : (
                        <ChatList
                            currentUser={userData}
                            chats={chats}
                            onSelectChat={handleSelectChat}
                            onStartChat={handleStartChat}
                            onSelectGroup={handleSelectGroup}
                            selectedChatId={selectedChatId}
                            selectedGroupId={selectedGroupId}
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                        />
                    )}
                </div>

                {/* Resizer Handle */}
                <div 
                    onMouseDown={startResizing}
                    className={`hidden md:block w-1 h-full cursor-col-resize hover:bg-brand-burgundy/30 active:bg-brand-burgundy/50 transition-colors z-50 -ml-0.5 relative group ${isResizing ? 'bg-brand-burgundy/40' : 'bg-transparent'}`}
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-12 bg-brand-ebony/10 rounded-full group-hover:bg-brand-burgundy/40" />
                </div>

                {/* Right Pane: Chat Window */}
                <div className={`flex-1 flex flex-col min-w-0 h-full ${(!selectedChatId && !selectedGroupId) ? 'hidden md:flex flex-col' : 'flex flex-col'}`}>
                    <ChatWindow
                        chatId={selectedChatId || selectedGroupId || ''}
                        currentUser={userData}
                        otherUser={selectedUser}
                        isGroup={!!selectedGroupId}
                        groupData={selectedGroupData}
                        onBack={() => {
                            setSelectedChatId(null);
                            setSelectedGroupId(null);
                            setSelectedUser(null);
                            setSelectedGroupData(null);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

export default function MessagesPage() {
    return (
        <Suspense fallback={
            <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-burgundy/30" />
            </div>
        }>
            <MessagesClient />
        </Suspense>
    );
}
