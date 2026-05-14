'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, onSnapshot, updateDoc, arrayUnion, arrayRemove, doc, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types';
import { AlumniCard } from '@/components/network/AlumniCard';
import { AlumniAtlas } from '@/components/network/AlumniAtlas';
import { Users, Search, Sparkles, Map, LayoutGrid, Navigation, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NetworkPage() {
    const { userData, loading: authLoading, suspendedUids } = useAuth();
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
    const [viewMode, setViewMode] = useState<'list' | 'atlas'>('list');
    const [loading, setLoading] = useState(true);
    const [sharingLocation, setSharingLocation] = useState(false);
    const [locationToast, setLocationToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const showToast = (type: 'success' | 'error', msg: string) => {
        setLocationToast({ type, msg });
        setTimeout(() => setLocationToast(null), 4000);
    };

    const shareLiveLocation = () => {
        if (!userData) return;
        if (!navigator.geolocation) {
            showToast('error', 'Geolocation is not supported by your browser.');
            return;
        }
        setSharingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const userRef = doc(db, 'users', userData.uid);
                    await updateDoc(userRef, {
                        liveLocation: {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            updatedAt: serverTimestamp()
                        }
                    });
                    setSharingLocation(false);
                    showToast('success', `📍 Location shared! (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`);
                } catch (err) {
                    console.error('Error sharing live location:', err);
                    setSharingLocation(false);
                    showToast('error', 'Failed to save location. Check Firestore permissions.');
                }
            },
            (err) => {
                setSharingLocation(false);
                const msgs: Record<number, string> = {
                    1: 'Permission denied. Please allow location access in your browser settings.',
                    2: 'Position unavailable. Try again or check your GPS.',
                    3: 'Location request timed out. Please try again.',
                };
                showToast('error', msgs[err.code] || 'Unable to get location.');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // Fetch all users
    useEffect(() => {
        if (!userData || !userData.instituteId) {
            setLoading(false);
            return;
        }

        const usersQuery = query(
            collection(db, 'users'),
            where('instituteId', '==', userData.instituteId)
        );
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
        }, (err) => {
            console.error('[Network] Error fetching users:', err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userData]);

    // Filter users
    useEffect(() => {
        let filtered = allUsers.filter(user => !suspendedUids.has(user.uid));

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
    }, [searchTerm, filterBatch, allUsers, suspendedUids]);

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
                <div className="relative w-16 h-16">
                     <div className="absolute inset-0 rounded-full border-4 border-brand-burgundy/20"></div>
                     <div className="absolute inset-0 rounded-full border-4 border-brand-burgundy border-t-transparent animate-spin"></div>
                </div>
            </div>
        );
    }

    if (!userData) return null; // Wait for redirect

    return (
        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-8 pb-12 w-full animate-fade-up">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="page-header-accent glow-indigo"></div>
                    <h1 className="text-3xl sm:text-4xl font-serif font-extrabold text-brand-ebony tracking-tight flex items-center gap-3">
                        Alumni Network
                        <Sparkles className="w-6 h-6 text-brand-gold animate-pulse" />
                    </h1>
                </div>
                
                <div className="flex bg-slate-200/50 dark:bg-white/5 p-1 rounded-xl w-fit self-start sm:self-auto">
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${viewMode === 'list' ? 'bg-white dark:bg-brand-ebony text-brand-burgundy dark:text-brand-gold shadow-sm' : 'text-brand-ebony/60 hover:text-brand-ebony'}`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        <span className="hidden sm:inline">Directory</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('atlas')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${viewMode === 'atlas' ? 'bg-white dark:bg-brand-ebony text-brand-burgundy dark:text-brand-gold shadow-sm' : 'text-brand-ebony/60 hover:text-brand-ebony'}`}
                    >
                        <Map className="w-4 h-4" />
                        <span className="hidden sm:inline">Atlas</span>
                    </button>
                </div>
            </div>

            {/* Pending Requests Section */}
            {userData.pendingRequests && userData.pendingRequests.length > 0 && (
                <div className="card-premium border-brand-gold/30 p-5 mb-8 outline outline-1 outline-brand-gold/20 shadow-[0_0_30px_rgba(251,191,36,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/10 blur-[60px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/4" />
                    
                    <h2 className="font-semibold text-brand-ebony mb-4 text-lg flex items-center gap-2 relative z-10">
                        Connection Requests 
                        <span className="text-xs bg-gradient-gold text-brand-cream px-2.5 py-0.5 rounded-full shadow-sm font-bold ml-1">
                            {userData.pendingRequests.length}
                        </span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
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
            <div className="card-premium p-4 mb-8">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-brand-ebony/40 group-focus-within:text-brand-burgundy transition-colors" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name or profession..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-100 border-2 border-slate-300 dark:bg-white/5 dark:border-white/10 text-brand-ebony placeholder:text-brand-ebony/40 focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/20 outline-none transition-all font-medium rounded-xl transition-all"
                        />
                    </div>
                    <div className="relative md:w-64">
                        <select
                            value={filterBatch}
                            onChange={(e) => setFilterBatch(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-100 border-2 border-slate-300 dark:bg-white/5 dark:border-white/10 text-brand-ebony placeholder:text-brand-ebony/40 focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/20 outline-none transition-all font-medium rounded-xl appearance-none pr-10 cursor-pointer"
                        >
                            <option value="all">All Batches</option>
                            {batches.map(batch => (
                                <option key={batch} value={batch}>Batch of {batch}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <span className="border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-brand-ebony/50 block"></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alumni View */}
            {viewMode === 'atlas' ? (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between flex-wrap gap-3 px-1">
                        <p className="text-brand-ebony/50 text-sm font-medium flex items-center gap-2">
                            <Map className="w-4 h-4" />
                            Showing <span className="font-bold text-brand-ebony">{filteredUsers.length}</span> alumni · click a pin to view profile
                        </p>
                        <button 
                            onClick={shareLiveLocation}
                            disabled={sharingLocation}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-sm tracking-wide disabled:opacity-70 disabled:cursor-not-allowed text-white"
                            style={{ background: 'linear-gradient(135deg,#881337,#c2185b)', boxShadow: '0 4px 18px rgba(136,19,55,.35)' }}
                        >
                            {sharingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                            {sharingLocation ? 'Getting GPS…' : 'Share Live Location'}
                        </button>
                    </div>
                    {locationToast && (
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold animate-fade-up ${locationToast.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                            <span>{locationToast.type === 'success' ? '✅' : '⚠️'}</span>
                            {locationToast.msg}
                        </div>
                    )}
                    <AlumniAtlas users={filteredUsers} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                        <div className="col-span-full card-premium p-16 text-center border-dashed border-2 border-brand-ebony/10">
                            <div className="w-16 h-16 bg-brand-ebony/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-ebony/10">
                                <Users className="w-8 h-8 text-brand-ebony/30" />
                            </div>
                            <p className="text-brand-ebony/60 font-medium text-lg font-serif italic mb-1">No alumni found</p>
                            <p className="text-brand-ebony/40 text-sm">Try adjusting your search filters.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
