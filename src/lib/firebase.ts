import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported as isMessagingSupported } from 'firebase/messaging';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { firebaseConfig } from './firebase-config';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize App Check (required if enforced in Firebase Console)
if (typeof window !== 'undefined') {
    // Enable debug mode for localhost to print the debug token in the console
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    
    try {
        initializeAppCheck(app, {
            // If you have a real ReCaptcha V3 site key, replace '6Ldummy...' with it.
            // For local development with DEBUG_TOKEN = true, a dummy key is sufficient.
            provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6Ldummykeyforsitekeyhere'),
            isTokenAutoRefreshEnabled: true
        });
    } catch (e) {
        console.error('App Check initialization failed:', e);
    }
}

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

export default app;
