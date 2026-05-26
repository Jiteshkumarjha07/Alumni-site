import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported as isMessagingSupported } from 'firebase/messaging';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { firebaseConfig } from './firebase-config';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

if (typeof window !== 'undefined') {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isLocalhost) {
        // Enable App Check Debug Provider.
        // It can be set to true to generate a new debug token, or a persistent UUID from environment variables.
        (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN || true;
    }

    if (siteKey) {
        initializeAppCheck(app, {
            provider: new ReCaptchaEnterpriseProvider(siteKey),
            isTokenAutoRefreshEnabled: true
        });
    } else {
        console.warn('Firebase App Check is skipped: NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY is missing.');
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

