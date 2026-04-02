'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, onSnapshot, updateDoc, arrayUnion, arrayRemove, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types';
import { AlumniCard } from '@/components/network/AlumniCard';
import { Users, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NetworkPage() {
    const { userData, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !userData) {
            router.push('/login');
        }
    }, [userData, authLoading, router]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBatch, setFilterBatch] = useState<string>('all');
    const [loading, setLoading] = useState(true);

    // Fetch all users
    useEffect(() => {
        if (!userData) {
            setTimeout(() => setLoading(false), 0);
            return;
        }

        const usersQuery = query(collection(db, 'users'));
        const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
            const fetchedUsers = snapshot.docs
                .map(doc => ({
                    uid: doc.id,
                    ...doc.data()
                }))
                .filter(user => user.uid !== userData.uid) as User[];

            setAllUsers(fetchedUsers);
            setFilteredUsers(fetchedUsers);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userData]);

    // Filter users
    useEffect(() => {
        let filtered = allUsers;

        if (searchTerm) {
            filtered = filtered.filter(user =>
                user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.profession?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filterBatch !== 'all') {
            filtered = filtered.filter(user => user.batch?.toString() === filterBatch);
        }

        setTimeout(() => setFilteredUsers(filtered), 0);
    }, [searchTerm, filterBatch, allUsers]);

    const handleConnect = async (recipientId: string) => {
        if (!userData) return;

        const recipientRef = doc(db, 'users', recipientId);
        await updateDoc(recipientRef, {
            pendingRequests: arrayUnion(userData.uid)
        });
    };

    const handleCancelRequest = async (recipientId: string) => {
        if (!userData) return;

        const recipientRef = doc(db, 'users', recipientId);
        await updateDoc(recipientRef, {
            pendingRequests: arrayRemove(userData.uid)
        });
    };

    const handleAcceptRequest = async (requesterId: string) => {
        if (!userData) return;

        const userRef = doc(db, 'users', userData.uid);
        const requesterRef = doc(db, 'users', requesterId);

        await Promise.all([
            updateDoc(userRef, {
                connections: arrayUnion(requesterId),
                pendingRequests: arrayRemove(requesterId)
            }),
            updateDoc(requesterRef, {
                connections: arrayUnion(userData.uid)
            })
        ]);
    };

    const handleRejectRequest = async (requesterId: string) => {
        if (!userData) return;

        const userRef = doc(db, 'users', userData.uid);
        await updateDoc(userRef, {
            pendingRequests: arrayRemove(requesterId)
        });
    };

    const getConnectionStatus = (user: User): 'connected' | 'pending' | 'received' | 'none' => {
        if (userData?.connections?.includes(user.uid)) return 'connected';
        if (user.pendingRequests?.includes(userData?.uid || '')) return 'pending';
        if (userData?.pendingRequests?.includes(user.uid)) return 'received';
        return 'none';
    };

    // Get unique batches for filter
    const batches = Array.from(new Set(allUsers.map(u => u.batch))).sort();

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!userData) return null; // Wait for redirect



    return (
        <div className="max-w-4xl mx-auto px-4 md:px-8 pt-8 pb-12 w-full">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="bg-brand-burgundy/10 p-3 rounded-xl border border-brand-burgundy/20">
                    <Users className="w-8 h-8 text-brand-burgundy" />
                </div>
                <h1 className="text-3xl font-serif font-bold text-brand-ebony">Alumni Network</h1>
            </div>

            {/* Pending Requests Section */}
            {userData.pendingRequests && userData.pendingRequests.length > 0 && (
                <div className="bg-brand-gold/10 border border-brand-gold/20 rounded-xl p-4 mb-6 shadow-sm">
                    <h2 className="font-semibold text-brand-ebony mb-3 font-serif text-lg flex items-center gap-2">
                        Connection Requests <span className="text-sm bg-brand-gold text-white px-2 py-0.5 rounded-full">{userData.pendingRequests.length}</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allUsers
                            .filter(user => userData.pendingRequests?.includes(user.uid))
                            .map(user => (
                                <AlumniCard
                                    key={user.uid}
                                    user={user}
                                    connectionStatus="received"
                                    onConnect={handleConnect}
                                    onCancelRequest={handleCancelRequest}
                                    onAcceptRequest={handleAcceptRequest}
                                    onRejectRequest={handleRejectRequest}
                                />
                            ))}
                    </div>
                </div>
            )}

            {/* Search and Filters */}
            <div className="bg-brand-parchment/80 rounded-xl shadow-sm border border-brand-ebony/10 p-4 mb-8">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-brand-ebony/40" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name or profession..."
                            className="w-full pl-10 pr-4 py-2 border border-brand-ebony/20 rounded-lg focus:ring-2 focus:ring-brand-burgundy focus:border-transparent bg-white/50 text-brand-ebony placeholder-brand-ebony/40 font-medium"
                        />
                    </div>
                    <select
                        value={filterBatch}
                        onChange={(e) => setFilterBatch(e.target.value)}
                        className="px-4 py-2 border border-brand-ebony/20 rounded-lg focus:ring-2 focus:ring-brand-burgundy focus:border-transparent bg-white/50 text-brand-ebony font-medium"
                    >
                        <option value="all">All Batches</option>
                        {batches.map(batch => (
                            <option key={batch} value={batch}>Batch of {batch}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Alumni Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                        <AlumniCard
                            key={user.uid}
                            user={user}
                            connectionStatus={getConnectionStatus(user)}
                            onConnect={handleConnect}
                            onCancelRequest={handleCancelRequest}
                            onAcceptRequest={handleAcceptRequest}
                            onRejectRequest={handleRejectRequest}
                        />
                    ))
                ) : (
                    <div className="col-span-full bg-brand-parchment/50 border border-brand-ebony/10 rounded-xl shadow-sm p-12 text-center">
                        <Users className="w-16 h-16 text-brand-ebony/20 mx-auto mb-4" />
                        <p className="text-brand-ebony/60 font-medium text-lg font-serif italic">No alumni found matching your criteria</p>
                    </div>
                )}
            </div>
        </div>
    );
}
