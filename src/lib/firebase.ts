import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported as isMessagingSupported } from 'firebase/messaging';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { firebaseConfig } from './firebase-config';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

if (typeof window !== 'undefined') {
    // Initialize App Check only on the client
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const useDebug = process.env.NEXT_PUBLIC_APP_CHECK_DEBUG === 'true';

    if (siteKey) {
        if (isLocalhost) {
            if (useDebug) {
                // Enable the App Check Debug Provider. It will print a debug token in the browser console.
                (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
                initializeAppCheck(app, {
                    provider: new ReCaptchaEnterpriseProvider(siteKey),
                    isTokenAutoRefreshEnabled: true
                });
                console.log('Firebase App Check: Running in DEBUG mode on localhost.');
            } else {
                console.log('Firebase App Check: Bypassed on localhost to prevent invalid token errors.');
            }
        } else {
            initializeAppCheck(app, {
                provider: new ReCaptchaEnterpriseProvider(siteKey),
                isTokenAutoRefreshEnabled: true
            });
        }
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
