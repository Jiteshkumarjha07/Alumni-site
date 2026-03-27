'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collectionGroup, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function GlobalMessaging() {
    const { userData } = useAuth();

    useEffect(() => {
        if (!userData?.uid) return;

        // Listen for undelivered messages sent TO the current user
        const q = query(
            collectionGroup(db, 'messages'),
            where('receiverId', '==', userData.uid),
            where('isDelivered', '==', false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docs.forEach(async (docSnapshot) => {
                try {
                    await updateDoc(docSnapshot.ref, {
                        isDelivered: true
                    });
                } catch (error) {
                    console.error('Error auto-marking message as delivered:', error);
                }
            });
        }, (error) => {
            console.error('Global messaging listener error:', error);
        });

        return () => unsubscribe();
    }, [userData?.uid]);

    return null; // This is a logic-only component
}
