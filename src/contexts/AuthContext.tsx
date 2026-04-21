'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User as FirebaseUser,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, serverTimestamp, collection, query, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/types';

interface AuthContextType {
    user: FirebaseUser | null;
    userData: User | null;
    loading: boolean;
    error: string | null;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, userData: Partial<User>) => Promise<void>;
    signOut: () => Promise<void>;
    switchInstitute: (instituteId: string, instituteName: string) => Promise<void>;
    clearError: () => void;
    suspendedUids: Set<string>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [userData, setUserData] = useState<User | null>(null);
    const [suspendedUids, setSuspendedUids] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let unsubscribeUser: (() => void) | null = null;
        let unsubscribeSuspensions: (() => void) | null = null;
        let presenceInterval: NodeJS.Timeout | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            const updatePresence = async (online: boolean) => {
                if (!firebaseUser?.uid) return;
                try {
                    await updateDoc(doc(db, 'users', firebaseUser.uid), {
                        isOnline: online,
                        lastSeen: serverTimestamp()
                    });
                } catch (err) {
                    console.error('Error updating presence:', err);
                }
            };

            if (firebaseUser) {
                setUser(firebaseUser);
                updatePresence(true);

                // Heartbeat to keep lastSeen fresh
                presenceInterval = setInterval(() => {
                    if (document.visibilityState === 'visible') {
                        updatePresence(true);
                    }
                }, 30000);

                // Handle tab close
                const handleUnload = () => {
                    updateDoc(doc(db, 'users', firebaseUser.uid), {
                        isOnline: false,
                        lastSeen: serverTimestamp()
                    });
                };
                window.addEventListener('beforeunload', handleUnload);

                // Listen to global suspensions
                const suspQuery = query(collection(db, 'users'), where('isSuspended', '==', true));
                unsubscribeSuspensions = onSnapshot(suspQuery, (snapshot) => {
                    setSuspendedUids(new Set(snapshot.docs.map(doc => doc.id)));
                }, (err) => {
                    console.error('Error fetching suspensions:', err);
                });

                // Listen to user document changes
                unsubscribeUser = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnapshot) => {
                    if (docSnapshot.exists()) {
                        const data = docSnapshot.data() as User;

                        // ── Suspension check ─────────────────────────────
                        // If an admin suspends this account by setting isSuspended:true,
                        // this listener fires immediately and we force-sign them out.
                        // Bug #1 fix: clear user state BEFORE calling signOut to prevent
                        // a brief window where user is set but userData is null.
                        if (data.isSuspended) {
                            setUser(null);
                            setUserData(null);
                            setLoading(false);
                            firebaseSignOut(auth); // async — called last so state is cleared first
                            return;
                        }

                        setUserData({ ...data });

                        // Passive sync for case-insensitive search
                        if (data.name && !data.nameLowercase) {
                            updateDoc(doc(db, 'users', firebaseUser.uid), {
                                nameLowercase: data.name.toLowerCase()
                            }).catch(err => console.error('Passive sync error:', err));
                        }
                    } else {
                        setUserData(null);
                    }
                    setLoading(false);
                }, (err) => {
                    console.error('Error fetching user data snapshot:', err);
                    setLoading(false);
                });

                return () => {
                    clearInterval(presenceInterval);
                    window.removeEventListener('beforeunload', handleUnload);
                };
            } else {
                setUser(null);
                setUserData(null);
                setLoading(false);
                if (unsubscribeUser) {
                    unsubscribeUser();
                    unsubscribeUser = null;
                }
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeUser) unsubscribeUser();
            if (unsubscribeSuspensions) unsubscribeSuspensions();
            if (presenceInterval) clearInterval(presenceInterval);
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        try {
            setError(null);
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err: unknown) {
            const firebaseErr = err as { code?: string; message?: string };
            // FirebaseError props are non-enumerable — log them directly
            console.error('Sign in error:', firebaseErr.code, firebaseErr.message);

            // Map Firebase codes to user-friendly messages
            const friendlyMessages: Record<string, string> = {
                'auth/user-not-found':      'No account found with this email.',
                'auth/wrong-password':      'Incorrect password. Please try again.',
                'auth/invalid-email':       'Please enter a valid email address.',
                'auth/user-disabled':       'This account has been disabled.',
                'auth/too-many-requests':   'Too many failed attempts. Please try again later.',
                'auth/network-request-failed': 'Network error. Check your connection and retry.',
                'auth/invalid-credential':  'Invalid email or password.',
            };

            const message = (firebaseErr.code && friendlyMessages[firebaseErr.code])
                || firebaseErr.message
                || 'Failed to sign in. Please try again.';

            setError(message);
            throw err; // keep for login page's catch → setError display
        }
    };

    const signUp = async (email: string, password: string, userInfo: Partial<User>) => {
        try {
            setError(null);
            const credential = await createUserWithEmailAndPassword(auth, email, password);

            // Create user document in Firestore
            // Bug #6 fix: explicitly set isinsadmin and isSuspended defaults so Firestore
            // rules that check these fields work correctly from the first read.
            const userDoc: Partial<User> = {
                uid: credential.user.uid,
                email,
                ...userInfo,
                nameLowercase: userInfo.name?.toLowerCase() || '',
                connections: [],
                pendingRequests: [],
                sentRequests: [],
                groups: [],
                isAdmin: false,
                isinsadmin: false,
                isSuspended: false,
                joinedAt: serverTimestamp(),
            };

            console.log('User created in Auth, creating Firestore document...');
            await setDoc(doc(db, 'users', credential.user.uid), userDoc);
            console.log('Firestore document created successfully');
        } catch (err: unknown) {
            console.error('Sign up error details:', {
                error: err,
                code: (err as { code?: string }).code,
                message: (err as { message?: string }).message
            });

            // Atomicity: If Auth succeeded but Firestore failed, delete the Auth user
            // so they can retry without "email-already-in-use" errors.
            if (auth.currentUser) {
                try {
                    console.warn('Deleting Auth user due to Firestore failure...');
                    await auth.currentUser.delete();
                    console.log('Auth user deleted successfully');
                } catch (deleteErr) {
                    console.error('Failed to delete Auth user after sync failure:', deleteErr);
                }
            }

            const error = err as { message?: string };
            setError(error.message || 'Failed to sign up');
            throw err;
        }
    };

    const signOut = async () => {
        try {
            if (userData?.uid) {
                await updateDoc(doc(db, 'users', userData.uid), {
                    isOnline: false,
                    lastSeen: serverTimestamp()
                });
            }
            await firebaseSignOut(auth);
        } catch (err: unknown) {
            console.error('Sign out error:', err);
            const error = err as { message?: string };
            setError(error.message || 'Failed to sign out');
            throw err;
        }
    };

    const clearError = () => setError(null);

    const switchInstitute = async (instituteId: string, instituteName: string) => {
        if (!user) return;
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                instituteId,
                instituteName
            });
        } catch (err) {
            console.error('Error switching institute:', err);
            setError('Failed to switch institute');
        }
    };

    const value: AuthContextType = {
        user,
        userData,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        switchInstitute,
        clearError,
        suspendedUids,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
