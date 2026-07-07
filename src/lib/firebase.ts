import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported as isMessagingSupported } from 'firebase/messaging';
import { firebaseConfig } from './firebase-config';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// NOTE: Firebase App Check was intentionally removed. It had been initialized with a
// placeholder reCAPTCHA key (the real key env var name never matched), so it produced
// invalid App Check tokens — the recurring "firebase-app-check-token-is-invalid" /
// "missing or insufficient permissions" login breakage in the git history.
// App Check enforcement must remain OFF in the Firebase Console while this is absent.
// To re-enable later: initializeAppCheck with a REAL reCAPTCHA site key
// (ReCaptchaEnterpriseProvider if using an Enterprise key) sourced from an env var that
// is actually set at build time, then enable enforcement per-service in the console.

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
