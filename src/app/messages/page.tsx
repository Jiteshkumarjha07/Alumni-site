'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ChatList } from '@/components/chat/ChatList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Chat, User, Group } from '@/types';
import { Loader2, Users, ArrowLeft } from 'lucide-react';
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

    // State for the currently active chat
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<{ name: string; profilePic: string; uid: string } | null>(null);
    const [selectedGroupData, setSelectedGroupData] = useState<Group | null>(null);
    const [viewMode, setViewMode] = useState<'chats' | 'groups'>('chats');

    // Helper to generate a consistent chat ID between two users
    const getChatId = (uid1: string, uid2: string) => {
        return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
    };

    // Handle view mode from URL
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

        // Find the other user's info from the chat document
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
        
        // Fetch group data
        try {
            const groupDoc = await getDoc(doc(db, 'groups', groupId));
            if (groupDoc.exists()) {
                setSelectedGroupData({ id: groupDoc.id, ...groupDoc.data() } as Group);
            }
        } catch (error) {
            console.error("Error fetching group data:", error);
        }
    };

    // 1. Fetch user's chats
    useEffect(() => {
        if (!userData?.uid) {
            setLoadingChats(false);
            return;
        }

        const chatsRef = collection(db, 'chats');
        const q = query(
            chatsRef,
            where('participants', 'array-contains', userData.uid),
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedChats = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Chat[];

            // Sort client-side
            fetchedChats.sort((a, b) => {
                const timeA = typeof a.lastMessageAt?.toMillis === 'function' ? a.lastMessageAt.toMillis() : Date.now();
                const timeB = typeof b.lastMessageAt?.toMillis === 'function' ? b.lastMessageAt.toMillis() : Date.now();
                return timeB - timeA;
            });

            setChats(fetchedChats);
            setLoadingChats(false);
        }, (error) => {
            console.error('Error fetching chats:', error);
            setLoadingChats(false);
        });

        return () => unsubscribe();
    }, [userData?.uid]);

    // 2. Handle 'new' chat from URL query parameters (e.g. clicking "Message" on someone's profile)
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

            // Clean up URL so refresh doesn't trigger it again
            router.replace('/messages');
        }
    }, [searchParams, userData?.uid, router, handleStartChat]);

    if (authLoading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!userData) return null; // Wait for redirect

    return (
        <div className="h-[calc(100vh-4rem)] bg-white w-full max-w-6xl mx-auto md:p-4 p-0 overflow-x-hidden">
            <div className="flex bg-white md:rounded-xl shadow-sm border overflow-hidden h-full w-full max-w-full">

                {/* Left Pane: Chat List */}
                <div className={`md:w-1/3 w-full max-w-full border-r border-brand-ebony/10 flex-shrink-0 ${(selectedChatId || selectedGroupId) ? 'hidden md:flex flex-col' : 'flex flex-col'}`}>
                    {loadingChats ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-brand-burgundy" />
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

                {/* Right Pane: Chat Window */}
                <div className={`flex-1 flex flex-col min-w-0 w-full max-w-full overflow-hidden ${(!selectedChatId && !selectedGroupId) ? 'hidden md:flex' : 'flex'}`}>
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
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        }>
            <MessagesClient />
        </Suspense>
    );
}

