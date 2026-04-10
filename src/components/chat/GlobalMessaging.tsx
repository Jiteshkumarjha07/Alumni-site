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

        // 1. Listen to all chats where the user is a participant
        const chatsRef = collection(db, 'chats');
        const userChatsQuery = query(
            chatsRef,
            where('participants', 'array-contains', userData.uid)
        );

        const unsubscribeChats = onSnapshot(userChatsQuery, (snapshot) => {
            snapshot.docs.forEach(chatDoc => {
                const chatId = chatDoc.id;
                
                // Only attach a listener if we haven't already for this chat
                if (!activeListeners.current.has(chatId)) {
                    // 2. Fetch the latest messages to guarantee we catch undelivered ones
                    // This ordered query is naturally indexed by Firebase, completely avoiding custom index errors.
                    const messagesRef = collection(db, 'chats', chatId, 'messages');
                    const recentMessagesQuery = query(
                        messagesRef, 
                        orderBy('createdAt', 'desc'),
                        limit(25) // Look at the last 25 messages to auto-deliver
                    );

                    const unsubMessages = onSnapshot(recentMessagesQuery, (msgSnapshot) => {
                        msgSnapshot.docs.forEach(async (msgDoc) => {
                            const data = msgDoc.data() as Message;
                            
                            // 3. Filter in-memory for messages sent to us that aren't marked delivered
                            if (data.senderId !== userData.uid && data.isDelivered === false) {
                                try {
                                    await updateDoc(msgDoc.ref, {
                                        isDelivered: true
                                    });
                                } catch (err) {
                                    console.error('Error auto-marking message as delivered:', err);
                                }
                            }
                        });
                    }, (err) => {
                        console.error('[GlobalMessaging] Error listening to recent messages:', err);
                    });

                    activeListeners.current.set(chatId, unsubMessages);
                }
            });
        }, (error) => {
            console.error('Error in GlobalMessaging chat listener:', error);
        });

        return () => {
            unsubscribeChats();
            // Cleanup all active message listeners
            activeListeners.current.forEach(unsub => unsub());
            activeListeners.current.clear();
        };
    }, [userData?.uid]);

    return null; // This is a logic-only component
}
