import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported as isMessagingSupported } from 'firebase/messaging';
import { firebaseConfig } from './firebase-config';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
export const auth = getAuth(app);

// Initialize Firestore with stability settings
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true
});

export const storage = getStorage(app);

// Messaging initialized conditionally (client-side only)
export const messaging = async () => {
    const supported = await isMessagingSupported();
    return supported ? getMessaging(app) : null;
};

console.log("Firebase initialized successfully with project:", firebaseConfig.projectId);

export default app;
