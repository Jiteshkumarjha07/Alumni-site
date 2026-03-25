'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User as FirebaseUser,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
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
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);

                // Listen to user document changes
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const unsubscribeUser = onSnapshot(
                    userDocRef,
                    (docSnapshot) => {
                        if (docSnapshot.exists()) {
                            setUserData({ uid: firebaseUser.uid, ...docSnapshot.data() } as User);
                            setLoading(false);
                        } else {
                            console.warn('User document does not exist for UID:', firebaseUser.uid);
                            // Do not setUser(null) here, as it might cause a loop
                            // Just set userData to null and let the UI handle the "Incomplete Setup" state
                            setUserData(null);
                            setLoading(false);
                        }
                    },
                    (err) => {
                        console.error('Error fetching user data snapshot:', err);
                        // If we get a permission-denied error, it's likely because the doc hasn't been created yet
                        // or the rules are too strict.
                        if (err.code === 'permission-denied') {
                            console.warn('Permission denied for user doc. This is expected if the doc is being created.');
                            // Don't set error state yet, give it a moment
                        } else {
                            setError('Failed to load user profile');
                        }
                        setLoading(false);
                    }
                );

                return () => unsubscribeUser();
            } else {
                setUser(null);
                setUserData(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
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
