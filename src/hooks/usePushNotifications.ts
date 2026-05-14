'use client';

import { useState, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export const usePushNotifications = (userId: string | undefined) => {
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        if (!userId || typeof window === 'undefined') return;

        const setupNotifications = async () => {
            try {
                // 1. Request Permission
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    console.warn('Notification permission not granted:', permission);
                    return;
                }

                // 2. Wait for Service Worker registration
                if (!('serviceWorker' in navigator)) {
                    console.error('Service Workers not supported in this browser');
                    return;
                }

                // Explicitly register the service worker to be sure it's ready
                // and pass it to getToken to prevent 'AbortError: Registration failed'
                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

                // 3. Get Messaging Instance
                const messagingInstance = await messaging();
                if (!messagingInstance) {
                    console.error('Firebase Messaging not supported');
                    return;
                }

                // 4. Get Token with the explicit registration
                const currentToken = await getToken(messagingInstance, {
                    vapidKey: 'BPuWbTBLzBnCsDblq_l1VJ0trRpQKozfsNoJkp5J95UlzKcBUMkQmHqS0LSvKr0GoaJH6TbpFRSx6KneUWOi6_s',
                    serviceWorkerRegistration: registration
                });

                if (currentToken) {
                    console.log('FCM Token generated successfully');
                    setToken(currentToken);
                    // Save token to user document
                    await updateDoc(doc(db, 'users', userId), {
                        fcmTokens: arrayUnion(currentToken)
                    });
                }
            } catch (error) {
                console.error('FCM Registration Error:', error);
            }
        };

        setupNotifications();

        // Listen for foreground messages
        let unsubscribe: (() => void) | null = null;
        const setupListener = async () => {
            const messagingInstance = await messaging();
            if (messagingInstance) {
                unsubscribe = onMessage(messagingInstance, (payload) => {
                    console.log('Foreground message received:', payload);
                    if (payload.notification) {
                        new Notification(payload.notification.title || 'New Notification', {
                            body: payload.notification.body,
                            icon: '/logo.png'
                        });
                    }
                });
            }
        };
        setupListener();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [userId]);

    return { token };
};
