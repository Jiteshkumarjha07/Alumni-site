'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, onSnapshot, updateDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Message } from '@/types';

export function GlobalMessaging() {
    const { userData } = useAuth();
    const activeListeners = useRef<Map<string, () => void>>(new Map());

    useEffect(() => {
        if (!userData?.uid) return;

        // Guard: skip callbacks after cleanup to prevent dangling Firestore targets
        let isMounted = true;

        // 1. Listen to all chats where the user is a participant
        const chatsRef = collection(db, 'chats');
        const userChatsQuery = query(
            chatsRef,
            where('participants', 'array-contains', userData.uid)
        );

        const unsubscribeChats = onSnapshot(userChatsQuery, (snapshot) => {
            if (!isMounted) return; // ← skip if unmounted mid-snapshot

            snapshot.docs.forEach(chatDoc => {
                if (!isMounted) return;
                const chatId = chatDoc.id;

                // Only attach a listener if we haven't already for this chat
                if (!activeListeners.current.has(chatId)) {
                    const messagesRef = collection(db, 'chats', chatId, 'messages');
                    const recentMessagesQuery = query(
                        messagesRef,
                        orderBy('createdAt', 'desc'),
                        limit(25)
                    );

                    const unsubMessages = onSnapshot(recentMessagesQuery, (msgSnapshot) => {
                        if (!isMounted) return; // ← skip if unmounted
                        msgSnapshot.docs.forEach(async (msgDoc) => {
                            if (!isMounted) return;
                            const data = msgDoc.data() as Message;
                            if (data.senderId !== userData.uid && data.isDelivered === false) {
                                try {
                                    await updateDoc(msgDoc.ref, { isDelivered: true });
                                } catch (err) {
                                    console.error('[GlobalMessaging] Error auto-marking delivered:', err);
                                }
                            }
                        });
                    }, (err) => {
                        console.error('[GlobalMessaging] Error listening to messages:', err);
                    });

                    activeListeners.current.set(chatId, unsubMessages);
                }
            });
        }, (error) => {
            console.error('[GlobalMessaging] Error in chat listener:', error);
        });

        return () => {
            isMounted = false;
            unsubscribeChats();
            activeListeners.current.forEach(unsub => unsub());
            activeListeners.current.clear();
        };
    }, [userData?.uid]);

    return null; // This is a logic-only component
}
