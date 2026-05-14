'use client';

import { useState, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export const usePushNotifications = (userId: string | undefined) => {
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) return;

        const requestPermission = async () => {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    const messagingInstance = await messaging();
                    if (!messagingInstance) return;

                    // Replace with your actual VAPID key from Firebase Console
                    const currentToken = await getToken(messagingInstance, {
                        vapidKey: 'YOUR_VAPID_KEY_HERE' 
                    });

                    if (currentToken) {
                        setToken(currentToken);
                        // Save token to user document
                        await updateDoc(doc(db, 'users', userId), {
                            fcmTokens: arrayUnion(currentToken)
                        });
                    }
                }
            } catch (error) {
                console.error('Error requesting notification permission:', error);
            }
        };

        requestPermission();

        // Listen for foreground messages
        const setupListener = async () => {
            const messagingInstance = await messaging();
            if (messagingInstance) {
                onMessage(messagingInstance, (payload) => {
                    console.log('Foreground message received:', payload);
                    // You can show a custom toast here
                });
            }
        };
        setupListener();
    }, [userId]);

    return { token };
};
