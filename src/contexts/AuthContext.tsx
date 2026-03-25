'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User as FirebaseUser,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
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
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let unsubscribeUser: (() => void) | null = null;
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

                // Listen to user document changes
                unsubscribeUser = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnapshot) => {
                    if (docSnapshot.exists()) {
                        setUserData({ uid: firebaseUser.uid, ...docSnapshot.data() } as User);
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
            if (presenceInterval) clearInterval(presenceInterval);
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        try {
            setError(null);
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err: unknown) {
            console.error('Sign in error details:', {
                error: err,
                code: (err as { code?: string }).code,
                message: (err as { message?: string }).message
            });
            const error = err as { message?: string };
            setError(error.message || 'Failed to sign in');
            throw err;
        }
    };

    const signUp = async (email: string, password: string, userInfo: Partial<User>) => {
        try {
            setError(null);
            const credential = await createUserWithEmailAndPassword(auth, email, password);

            // Create user document in Firestore
            const userDoc: Partial<User> = {
                uid: credential.user.uid,
                email,
                ...userInfo,
                connections: [],
                pendingRequests: [],
                sentRequests: [],
                groups: [],
                isAdmin: false,
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

    const value: AuthContextType = {
        user,
        userData,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        clearError,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
