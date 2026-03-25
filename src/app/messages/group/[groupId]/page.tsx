'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Group } from '@/types';
import { Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { ChatWindow } from '@/components/chat/ChatWindow';

export default function GroupChatPage() {
    const { userData } = useAuth();
    const params = useParams();
    const groupId = params.groupId as string;
    const [group, setGroup] = useState<Group | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Fetch group info
    useEffect(() => {
        if (!groupId) return;

        const fetchGroup = async () => {
            try {
                const groupDoc = await getDoc(doc(db, 'groups', groupId));
                if (groupDoc.exists()) {
                    setGroup({ id: groupDoc.id, ...groupDoc.data() } as Group);
                }
            } catch (error) {
                console.error("Error fetching group:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchGroup();
    }, [groupId]);

    if (!userData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-gray-600">Please log in to access group chat</p>
            </div>
        );
    }

    if (loading || !group) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-12 h-12 animate-spin text-brand-burgundy" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-brand-cream/10">
            <ChatWindow 
                chatId={groupId}
                currentUser={userData}
                otherUser={null}
                isGroup={true}
                groupData={group}
                onBack={() => router.push('/messages?view=groups')}
            />
        </div>
    );
}
