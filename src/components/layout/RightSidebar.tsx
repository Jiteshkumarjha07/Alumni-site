'use client';

import { useState, useEffect } from 'react';
import { UserPlus, X, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, onSnapshot, updateDoc, arrayUnion, addDoc, doc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types';

interface RightSidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export function RightSidebar({ isOpen = false, onClose = () => {} }: RightSidebarProps) {
    const { userData } = useAuth();
    const [suggestions, setSuggestions] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userData) { setLoading(false); return; }

        const usersQuery = query(
            collection(db, 'users'),
            where('instituteId', '==', userData.instituteId)
        );
        const unsubscribe = onSnapshot(usersQuery,
            (snapshot) => {
                const fetched = snapshot.docs
                    .map(doc => ({ uid: doc.id, ...doc.data() } as User))
                    .filter(user =>
                        user.uid !== userData.uid &&
                        !userData.connections?.includes(user.uid) &&
                        !userData.pendingRequests?.includes(user.uid) &&
                        !user.pendingRequests?.includes(userData.uid)
                    );
                const shuffled = [...fetched].sort(() => 0.5 - Math.random());
                setSuggestions(shuffled.slice(0, 4));
                setLoading(false);
            },
            (error) => { 
                console.error('Error fetching suggestions (Permissions/Rules?):', error); 
                setLoading(false); 
                setSuggestions([]);
            }
        );
        return () => unsubscribe();
    }, [userData]);

    const handleConnect = async (recipientId: string) => {
        if (!userData) return;
        setSuggestions(prev => prev.filter(u => u.uid !== recipientId));
        try {
            await updateDoc(doc(db, 'users', recipientId), {
                pendingRequests: arrayUnion(userData.uid)
            });
            await addDoc(collection(db, 'notifications'), {
                userId: recipientId,
                type: 'connection_request',
                sourceUserUid: userData.uid,
                sourceUserName: userData.name,
                sourceUserProfilePic: userData.profilePic || '',
                message: 'sent you a connection request',
                link: `/profile/${userData.uid}`,
                createdAt: new Date(),
                isRead: false
            });
        } catch (error) {
            console.error('Error sending connection request:', error);
        }
    };

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Panel */}
            <div
                className={`w-80 fixed right-0 top-0 h-full overflow-y-auto scrollbar-hide z-50 transition-transform duration-300 ease-out ${
                    isOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'
                }`}
                style={{
                    background: 'rgba(244,246,255,0.94)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    borderLeft: '1px solid rgba(99,102,241,0.12)',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-brand-ebony/6">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg,#4f46e5,#818cf8)', boxShadow: '0 4px 10px rgba(99,102,241,0.35)' }}
                        >
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                        </div>
                        <h2 className="font-serif font-bold text-brand-ebony text-lg tracking-tight">Discover Alumni</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-brand-ebony/40 hover:text-brand-ebony hover:bg-brand-parchment rounded-lg transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-5 py-5">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="flex gap-3 items-center animate-pulse">
                                    <div className="w-10 h-10 rounded-full bg-brand-parchment flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-brand-parchment rounded w-3/4" />
                                        <div className="h-2.5 bg-brand-parchment rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {suggestions.length > 0 ? (
                                suggestions.map((user) => (
                                    <div
                                        key={user.uid}
                                        className="card-premium p-3.5 flex items-center gap-3 group hover:shadow-[0_4px_16px_rgba(79,70,229,0.12)] transition-all duration-200"
                                    >
                                        {/* Avatar */}
                                        <Link href={`/profile/${user.uid}`} className="relative h-10 w-10 flex-shrink-0 rounded-full overflow-hidden ring-2 ring-white dark:ring-brand-parchment group-hover:ring-brand-burgundy/40 transition-all block">
                                            <Image
                                                src={user.profilePic || `https://placehold.co/80x80/4f46e5/ffffff?text=${user.name.substring(0, 1)}`}
                                                alt={user.name}
                                                fill
                                                className="object-cover"
                                                unoptimized
                                            />
                                        </Link>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <Link href={`/profile/${user.uid}`}>
                                                <p className="text-sm font-serif font-bold text-brand-ebony truncate hover:text-brand-burgundy transition-colors leading-tight">
                                                    {user.name}
                                                </p>
                                            </Link>
                                            <p className="text-[10px] text-brand-ebony/40 truncate mt-1 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                                                {user.profession || `Batch of ${user.batch}`}
                                            </p>
                                        </div>

                                        {/* Connect */}
                                        <button
                                            onClick={() => handleConnect(user.uid)}
                                            className="flex-shrink-0 flex items-center gap-1.5 text-[10px] font-bold text-brand-burgundy border border-brand-burgundy/20 bg-brand-burgundy/5 hover:bg-brand-burgundy hover:text-white px-3 py-2 rounded-xl transition-all duration-300 uppercase tracking-widest shadow-sm active:scale-95"
                                        >
                                            <UserPlus className="w-3.5 h-3.5" />
                                            <span>Invite</span>
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10">
                                    <div
                                        className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                                        style={{ background: 'linear-gradient(135deg,#4f46e5,#818cf8)' }}
                                    >
                                        <UserPlus className="w-5 h-5 text-white" />
                                    </div>
                                    <p className="text-sm text-brand-ebony/50 font-medium">You&apos;re connected with everyone!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
