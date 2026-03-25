'use client';

import { useState, useEffect } from 'react';
import { UserPlus, TrendingUp, X, Bell } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, onSnapshot, updateDoc, arrayUnion, arrayRemove, doc, where, orderBy, limit, getDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, Notification } from '@/types';

interface RightSidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export function RightSidebar({ isOpen = false, onClose = () => {} }: RightSidebarProps) {
    const { userData } = useAuth();
    const [suggestions, setSuggestions] = useState<User[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userData) {
            setLoading(false);
            return;
        }

        const usersQuery = query(collection(db, 'users'));
        const unsubscribe = onSnapshot(usersQuery, 
            (snapshot) => {
                const fetchedUsers = snapshot.docs
                    .map(doc => ({
                        uid: doc.id,
                        ...doc.data()
                    } as User))
                    .filter(user => 
                        user.uid !== userData.uid && 
                        !userData.connections?.includes(user.uid) && 
                        !userData.pendingRequests?.includes(user.uid) && 
                        !user.pendingRequests?.includes(userData.uid)
                    );

                // Shuffle and pick 3 suggestions
                const shuffled = [...fetchedUsers].sort(() => 0.5 - Math.random());
                setSuggestions(shuffled.slice(0, 3));
                setLoading(false);
            },
            (error) => {
                console.error('Error fetching suggestions:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userData]);

    // Fetch Notifications
    useEffect(() => {
        if (!userData) return;

        const notifQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', userData.uid),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        const unsubscribe = onSnapshot(notifQuery, async (snapshot) => {
            const fetchedList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Notification));
            
            setNotifications(fetchedList);
        });

        return () => unsubscribe();
    }, [userData]);

    const handleConnect = async (recipientId: string) => {
        if (!userData) return;
        
        setSuggestions(prev => prev.filter(u => u.uid !== recipientId));

        try {
            const recipientRef = doc(db, 'users', recipientId);
            await updateDoc(recipientRef, {
                pendingRequests: arrayUnion(userData.uid)
            });
            
            // Create a notification for the recipient
            await addDoc(collection(db, 'notifications'), {
                userId: recipientId,
                type: 'connection_request',
                sourceUserUid: userData.uid,
                sourceUserName: userData.name,
                sourceUserProfilePic: userData.profilePic || '',
                message: 'sent you a connection request',
                createdAt: new Date(),
                isRead: false
            });
        } catch (error) {
            console.error('Error sending connection request:', error);
        }
    };

    const handleAcceptRequest = async (notif: Notification) => {
        if (!userData) return;
        const requesterId = notif.sourceUserUid;

        try {
            // Add to connections for both users
            const currentUserRef = doc(db, 'users', userData.uid);
            const requesterRef = doc(db, 'users', requesterId);

            await updateDoc(currentUserRef, {
                pendingRequests: arrayRemove(requesterId),
                connections: arrayUnion(requesterId)
            });

            await updateDoc(requesterRef, {
                sentRequests: arrayRemove(userData.uid),
                connections: arrayUnion(userData.uid)
            });

            // Delete the connection request notification
            await updateDoc(doc(db, 'notifications', notif.id), {
                type: 'connection_accepted',
                message: 'You are now connected.',
                isRead: true
            });
            
            // Send back an accepted notification
            await addDoc(collection(db, 'notifications'), {
                userId: requesterId,
                type: 'connection_accepted',
                sourceUserUid: userData.uid,
                sourceUserName: userData.name,
                sourceUserProfilePic: userData.profilePic || '',
                message: 'accepted your connection request',
                createdAt: new Date(),
                isRead: false
            });

        } catch (error) {
            console.error('Error accepting request:', error);
        }
    };

    const handleIgnoreRequest = async (notif: Notification) => {
        if (!userData) return;
        const requesterId = notif.sourceUserUid;

        try {
            const currentUserRef = doc(db, 'users', userData.uid);
            await updateDoc(currentUserRef, {
                pendingRequests: arrayRemove(requesterId)
            });

            const requesterRef = doc(db, 'users', requesterId);
            await updateDoc(requesterRef, {
                sentRequests: arrayRemove(userData.uid)
            });

            // Remove or mark as read the notification
            await updateDoc(doc(db, 'notifications', notif.id), {
                isRead: true,
                message: 'Request ignored'
            });
        } catch (error) {
            console.error('Error ignoring request:', error);
        }
    };

    return (
        <>
            {/* Backdrop for all screen sizes */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
                    onClick={onClose}
                />
            )}
            
            <div className={`w-80 fixed right-0 top-0 h-full p-6 overflow-y-auto border-l border-brand-ebony/10 bg-brand-parchment/95 backdrop-blur-xl z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}`}>
                
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-brand-ebony/50 hover:text-brand-burgundy hover:bg-brand-burgundy/10 rounded-full transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                {loading ? (
                    <div className="animate-pulse flex flex-col gap-8 mt-8">
                        <div>
                            <div className="h-6 bg-brand-ebony/10 rounded w-1/2 mb-5"></div>
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-3 items-center mb-4">
                                    <div className="w-10 h-10 rounded-full bg-brand-ebony/10"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-brand-ebony/10 rounded w-3/4"></div>
                                        <div className="h-3 bg-brand-ebony/10 rounded w-1/2"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Suggestions */}
                        <div className="mb-10 lg:mt-4">
                            <h2 className="text-brand-ebony font-serif font-bold text-lg mb-5 flex items-center">
                                <UserPlus className="h-5 w-5 mr-2 text-brand-burgundy" />
                                More Alumni to Follow
                            </h2>
                            <div className="space-y-5">
                                {suggestions.length > 0 ? (
                                    suggestions.map((user) => (
                                        <div key={user.uid} className="flex items-center justify-between group">
                                            <div className="flex items-center space-x-3 overflow-hidden">
                                                <Link href={`/profile/${user.uid}`} className="relative h-11 w-11 flex-shrink-0 rounded-full overflow-hidden border border-brand-ebony/10 shadow-sm hover:opacity-80 transition block">
                                                    <Image
                                                        src={user.profilePic || `https://placehold.co/100x100/EFEFEFF/3D2B27?text=${user.name.substring(0, 1)}`}
                                                        alt={user.name}
                                                        fill
                                                        className="object-cover"
                                                        unoptimized
                                                    />
                                                </Link>
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <Link href={`/profile/${user.uid}`}>
                                                        <p className="text-sm font-bold text-brand-ebony truncate hover:text-brand-burgundy transition-colors">
                                                            {user.name}
                                                        </p>
                                                    </Link>
                                                    <p className="text-xs text-brand-ebony/60 truncate">
                                                        {user.profession || `Class of ${user.batch}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleConnect(user.uid)}
                                                className="text-brand-burgundy text-xs font-bold hover:bg-brand-burgundy/10 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap border border-brand-burgundy/20"
                                            >
                                                Connect
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-brand-ebony/60 italic">You&apos;re connected with everyone!</p>
                                )}
                            </div>
                        </div>

                        {/* Notifications */}
                        <div>
                            <h2 className="text-brand-ebony font-serif font-bold text-lg mb-5 flex items-center">
                                <Bell className="h-5 w-5 mr-2 text-brand-burgundy" />
                                Notifications
                            </h2>
                            <div className="space-y-4">
                                {notifications.length > 0 ? (
                                    notifications.map((notif: any) => (
                                        <div key={notif.id} className="flex gap-3 p-3 rounded-xl bg-white/50 border border-brand-ebony/5 shadow-sm hover:border-brand-burgundy/20 transition-all cursor-pointer">
                                            <Link href={`/profile/${notif.sourceUserUid}`} className="relative h-10 w-10 flex-shrink-0 rounded-full overflow-hidden border border-brand-ebony/10">
                                                <Image
                                                    src={notif.sourceUserProfilePic || `https://placehold.co/100x100/EFEFEFF/3D2B27?text=${notif.sourceUserName.substring(0, 1)}`}
                                                    alt={notif.sourceUserName}
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                            </Link>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-brand-ebony">
                                                    <span className="font-bold hover:text-brand-burgundy transition-colors">{notif.sourceUserName}</span> {notif.message}
                                                </p>
                                                {notif.type === 'connection_request' && (
                                                    <div className="flex gap-2 mt-2">
                                                        <button className="text-xs font-bold text-white bg-brand-burgundy hover:bg-[#5a2427] px-3 py-1 rounded-full transition-colors">Accept</button>
                                                        <button className="text-xs font-bold text-brand-ebony/60 hover:bg-brand-ebony/10 px-3 py-1 rounded-full transition-colors">Ignore</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center p-6 bg-brand-ebony/5 rounded-xl border border-brand-ebony/10">
                                        <Bell className="w-8 h-8 mx-auto text-brand-ebony/20 mb-2" />
                                        <p className="text-sm text-brand-ebony/60">No new notifications</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
                
                {/* Decorative element */}
                <div className="absolute bottom-10 right-0 w-32 h-32 opacity-[0.03] pointer-events-none">
                    <svg viewBox="0 0 200 200" className="w-full h-full fill-brand-ebony">
                        <path d="M40,160 C40,160 80,100 160,100 C160,100 100,160 40,160 Z" />
                        <path d="M40,160 C40,160 20,100 100,80 C100,80 60,140 40,160 Z" opacity="0.7" />
                    </svg>
                </div>
            </div>
        </>
    );
}
