'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import { Chat } from '@/types';

interface MessagingContextType {
    totalUnreadCount: number;
    unreadUsersCount: number;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export const useMessaging = () => {
    const context = useContext(MessagingContext);
    if (!context) {
        throw new Error('useMessaging must be used within a MessagingProvider');
    }
    return context;
};

export const MessagingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { userData } = useAuth();
    const [totalUnreadCount, setTotalUnreadCount] = useState(0);
    const [unreadUsersCount, setUnreadUsersCount] = useState(0);

    useEffect(() => {
        if (!userData?.uid) {
            setTotalUnreadCount(0);
            setUnreadUsersCount(0);
            return;
        }

        let isMounted = true;

        const chatsRef = collection(db, 'chats');
        const q = query(
            chatsRef,
            where('participants', 'array-contains', userData.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!isMounted) return;
            let total = 0;
            let users = 0;

            snapshot.docs.forEach(doc => {
                const data = doc.data() as Chat;
                const count = data.unreadCount?.[userData.uid] || 0;
                if (count > 0) {
                    total += count;
                    users += 1;
                }
            });

            setTotalUnreadCount(total);
            setUnreadUsersCount(users);
        }, (error) => {
            console.error('[MessagingContext] Error fetching unread counts:', error);
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [userData?.uid]);

    return (
        <MessagingContext.Provider value={{ totalUnreadCount, unreadUsersCount }}>
            {children}
        </MessagingContext.Provider>
    );
};
