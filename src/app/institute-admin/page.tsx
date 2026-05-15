'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
    collection, query, where, doc, getDoc,
    updateDoc, deleteDoc, onSnapshot, orderBy
} from 'firebase/firestore';
import { uploadMedia } from '@/lib/media';
import {
    Loader2, Camera, Users, FileText, Briefcase, Globe,
    LayoutDashboard, Search, Trash2, UserX, UserCheck,
    Mail, ShieldCheck, Plus, ChevronUp, ChevronDown
} from 'lucide-react';
import { User, Post, Job } from '@/types';
import { isAuthenticEmailDomain } from '@/lib/validation';
import { serverTimestamp, setDoc, arrayUnion, arrayRemove, getDocs } from 'firebase/firestore';

type Tab = 'overview' | 'members' | 'posts' | 'jobs' | 'approvals' | 'suspended';

export default function InstituteAdminPage() {
    const { userData, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    // Overview
    const [overviewStats, setOverviewStats] = useState({ users: 0, posts: 0, jobs: 0 });
    const [statsLoading, setStatsLoading] = useState(true);
    const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    // Members tab
    const [members, setMembers] = useState<User[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');

    // Posts tab
    const [posts, setPosts] = useState<Post[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(false);

    // Jobs tab
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(false);

    // Approvals tab
    const [approvals, setApprovals] = useState<{ email: string; instituteIds: string[] }[]>([]);
    const [loadingApprovals, setLoadingApprovals] = useState(false);
    const [newApprovalEmail, setNewApprovalEmail] = useState('');
    const [approving, setApproving] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isBannerCollapsed, setIsBannerCollapsed] = useState(false);

    // Subscribe to live overview counts + cover photo on mount
    useEffect(() => {
        if (authLoading || !userData?.instituteId) return;
        const instId = userData.instituteId;

        // Bug #9 fix: use onSnapshot for live-updating counts instead of one-shot getDocs
        const unsubUsers = onSnapshot(
            query(collection(db, 'users'), where('instituteId', '==', instId)),
            snap => setOverviewStats(s => ({ ...s, users: snap.size })),
            err => console.error('Stats users error:', err)
        );
        const unsubPosts = onSnapshot(
            query(collection(db, 'posts'), where('instituteId', '==', instId)),
            snap => setOverviewStats(s => ({ ...s, posts: snap.size })),
            err => console.error('Stats posts error:', err)
        );
        const unsubJobs = onSnapshot(
            query(collection(db, 'opportunities'), where('instituteId', '==', instId)),
            snap => { setOverviewStats(s => ({ ...s, jobs: snap.size })); setStatsLoading(false); },
            err => { console.error('Stats jobs error:', err); setStatsLoading(false); }
        );

        // Fetch cover photo once (it changes rarely)
        getDoc(doc(db, 'institutes', instId))
            .then(d => { if (d.exists()) setCoverPhoto(d.data().coverPhotoUrl || null); })
            .catch(err => console.error('Cover photo error:', err));

        return () => { unsubUsers(); unsubPosts(); unsubJobs(); };
    }, [authLoading, userData?.instituteId]);

    // Subscribe to members when tab is active
    useEffect(() => {
        if (activeTab !== 'members' || !userData?.instituteId) return;
        setLoadingMembers(true);
        const q = query(collection(db, 'users'), where('instituteId', '==', userData.instituteId));
        const unsub = onSnapshot(q, snap => {
            setMembers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as User)));
            setLoadingMembers(false);
        }, (err) => { console.error(err); setLoadingMembers(false); });
        return () => unsub();
    }, [activeTab, userData?.instituteId]);

    // Subscribe to posts when tab is active
    useEffect(() => {
        if (activeTab !== 'posts' || !userData?.instituteId) return;
        setLoadingPosts(true);
        const q = query(
            collection(db, 'posts'),
            where('instituteId', '==', userData.instituteId),
            orderBy('createdAt', 'desc')
        );
        const unsub = onSnapshot(q, snap => {
            setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
            setLoadingPosts(false);
        }, (err) => { console.error(err); setLoadingPosts(false); });
        return () => unsub();
    }, [activeTab, userData?.instituteId]);

    // Subscribe to jobs when tab is active
    useEffect(() => {
        if (activeTab !== 'jobs' || !userData?.instituteId) return;
        setLoadingJobs(true);
        const q = query(
            collection(db, 'opportunities'),
            where('instituteId', '==', userData.instituteId),
            orderBy('createdAt', 'desc')
        );
        const unsub = onSnapshot(q, snap => {
            setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Job)));
            setLoadingJobs(false);
        }, (err) => { console.error(err); setLoadingJobs(false); });
        return () => unsub();
    }, [activeTab, userData?.instituteId]);

    // Subscribe to approvals when tab is active
    useEffect(() => {
        if (activeTab !== 'approvals' || !userData?.instituteId) return;
        setLoadingApprovals(true);
        const q = query(
            collection(db, 'approvals'),
            where('instituteIds', 'array-contains', userData.instituteId)
        );
        const unsub = onSnapshot(q, snap => {
            setApprovals(snap.docs.map(d => ({ email: d.id, ...d.data() } as any)));
            setLoadingApprovals(false);
        }, (err) => { console.error(err); setLoadingApprovals(false); });
        return () => unsub();
    }, [activeTab, userData?.instituteId]);

    const filteredMembers = useMemo(() => {
        const q = memberSearch.toLowerCase().trim();
        if (!q) return members;
        return members.filter(m =>
            m.name?.toLowerCase().includes(q) ||
            m.email?.toLowerCase().includes(q) ||
            m.profession?.toLowerCase().includes(q)
        );
    }, [members, memberSearch]);

    const suspendedCount = useMemo(() => members.filter(m => m.isSuspended).length, [members]);

    const handleSuspendUser = async (uid: string, currentStatus: boolean) => {
        const msg = currentStatus
            ? 'Restore this user\'s account?'
            : 'Suspend this user? They will be immediately signed out.';
        if (!confirm(msg)) return;
        try {
            await updateDoc(doc(db, 'users', uid), { isSuspended: !currentStatus });
        } catch (err: unknown) {
            setError((err as { message?: string }).message || 'Failed to update user.');
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm('Delete this post permanently?')) return;
        try {
            await deleteDoc(doc(db, 'posts', postId));
            setOverviewStats(s => ({ ...s, posts: Math.max(0, s.posts - 1) }));
        } catch (err: unknown) {
            setError((err as { message?: string }).message || 'Failed to delete post.');
        }
    };

    const handleDeleteJob = async (jobId: string) => {
        if (!confirm('Delete this job listing permanently?')) return;
        try {
            await deleteDoc(doc(db, 'opportunities', jobId));
            setOverviewStats(s => ({ ...s, jobs: Math.max(0, s.jobs - 1) }));
        } catch (err: unknown) {
            setError((err as { message?: string }).message || 'Failed to delete job.');
        }
    };

    const handleAddApproval = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newApprovalEmail.trim() || !userData?.instituteId) return;
        
        const email = newApprovalEmail.trim().toLowerCase();
        if (!isAuthenticEmailDomain(email)) {
            setError('Invalid email domain.');
            return;
        }

        setApproving(true);
        setError(null);
        setSuccess(null);

        try {
            // 1. Add to approvals
            await setDoc(doc(db, 'approvals', email), {
                email,
                instituteIds: arrayUnion(userData.instituteId),
                updatedAt: serverTimestamp()
            }, { merge: true });

            // 2. Restore account if previously suspended
            const usersQuery = query(collection(db, 'users'), where('email', '==', email));
            const userSnap = await getDocs(usersQuery);
            const restorePromises = userSnap.docs
                .filter(userDoc => userDoc.data().isSuspended)
                .map(userDoc =>
                    updateDoc(doc(db, 'users', userDoc.id), { isSuspended: false })
                );
            await Promise.all(restorePromises);

            setSuccess(`Granted access to ${email}`);
            setNewApprovalEmail('');
        } catch (err: any) {
            setError(err.message || 'Failed to add approval');
        } finally {
            setApproving(false);
        }
    };

    const handleDeleteApproval = async (emailToDelete: string) => {
        if (!confirm(`Remove access for ${emailToDelete}?`)) return;
        try {
            // 1. Remove institute from approval
            await updateDoc(doc(db, 'approvals', emailToDelete), {
                instituteIds: arrayRemove(userData!.instituteId)
            });

            // 2. Suspend user if they belong to this institute
            const usersQuery = query(
                collection(db, 'users'), 
                where('email', '==', emailToDelete),
                where('instituteId', '==', userData!.instituteId)
            );
            const userSnap = await getDocs(usersQuery);
            const updatePromises = userSnap.docs.map(userDoc =>
                updateDoc(doc(db, 'users', userDoc.id), { isSuspended: true })
            );
            await Promise.all(updatePromises);
        } catch (err: any) {
            setError(err.message || 'Failed to remove approval');
        }
    };

    const handleUploadCoverPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userData?.instituteId) return;
        if (file.size > 8 * 1024 * 1024) { alert('Image must be under 8 MB'); return; }
        setUploading(true);
        try {
            const url = await uploadMedia(file);
            if (url) {
                await updateDoc(doc(db, 'institutes', userData.instituteId), { coverPhotoUrl: url });
                setCoverPhoto(url);
            }
        } catch (err) {
            console.error('Upload error:', err);
        } finally {
            setUploading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="flex h-[calc(100vh-100px)] items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-brand-burgundy/40" />
            </div>
        );
    }

    // Bug #3 fix: page-level guard in addition to layout — prevents access via shallow routing
    if (!userData?.isinsadmin) {
        return null;
    }

    const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
        { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'members', label: 'Members', icon: <Users className="w-4 h-4" /> },
        { id: 'posts', label: 'Posts', icon: <FileText className="w-4 h-4" /> },
        { id: 'jobs', label: 'Jobs', icon: <Briefcase className="w-4 h-4" />, badge: overviewStats.jobs },
        { id: 'approvals', label: 'Whitelisting', icon: <ShieldCheck className="w-4 h-4" /> },
        { id: 'suspended', label: 'Suspended', icon: <UserX className="w-4 h-4" />, badge: suspendedCount },
    ];

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-up">
            {/* Header */}
            {/* Dynamic Togglable Ribbon */}
            <div className={`relative overflow-hidden rounded-3xl mb-8 transition-all duration-500 ease-in-out border border-brand-ebony/5 shadow-xl ${isBannerCollapsed ? 'h-24' : 'h-48 sm:h-64'}`}>
                {/* Background Cover Photo */}
                <div className="absolute inset-0 z-0">
                    {coverPhoto ? (
                        <img src={coverPhoto} alt="" className="w-full h-full object-cover opacity-60 dark:opacity-40" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-brand-burgundy/10 to-indigo-500/10" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-brand-ebony via-white/20 dark:via-brand-ebony/40 to-transparent" />
                </div>

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col justify-end p-6 sm:p-8">
                    <div className="flex items-end justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className={`flex items-center gap-3 mb-2 flex-wrap transition-all duration-500 ${isBannerCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                                <span className="px-3 py-1 bg-brand-burgundy text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-brand-burgundy/20">
                                    Official Dashboard
                                </span>
                                <span className="px-3 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-emerald-500/20 animate-pulse">
                                    Live Pulse
                                </span>
                            </div>
                            <h1 className={`font-serif font-black text-brand-ebony dark:text-white leading-tight transition-all duration-500 ${isBannerCollapsed ? 'text-xl' : 'text-3xl sm:text-5xl'}`}>
                                {userData?.instituteName || 'Institute Admin'}
                            </h1>
                            {!isBannerCollapsed && (
                                <p className="text-brand-ebony/60 dark:text-white/60 text-sm sm:text-base mt-2 font-medium max-w-2xl line-clamp-2 animate-in fade-in slide-in-from-left-4 duration-700">
                                    Welcome back, admin. You are managing the Alumnest hub for {userData?.instituteName}.
                                </p>
                            )}
                        </div>

                        {/* Toggle Button */}
                        <button
                            onClick={() => setIsBannerCollapsed(!isBannerCollapsed)}
                            className="p-3 bg-white/40 dark:bg-white/10 backdrop-blur-md hover:bg-white/60 dark:hover:bg-white/20 rounded-2xl transition-all shadow-xl border border-white/50 dark:border-white/10 group mb-1"
                            title={isBannerCollapsed ? 'Expand Header' : 'Collapse Header'}
                        >
                            {isBannerCollapsed ? (
                                <ChevronDown className="w-5 h-5 text-brand-ebony dark:text-white group-hover:translate-y-0.5 transition-transform" />
                            ) : (
                                <ChevronUp className="w-5 h-5 text-brand-ebony dark:text-white group-hover:-translate-y-0.5 transition-transform" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 text-sm font-medium flex items-center justify-between animate-in fade-in">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="font-bold ml-3 text-red-400 hover:text-red-600">✕</button>
                </div>
            )}

            {success && (
                <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 text-sm font-medium flex items-center justify-between animate-in fade-in">
                    <span>{success}</span>
                    <button onClick={() => setSuccess(null)} className="font-bold ml-3 text-emerald-400 hover:text-emerald-600">✕</button>
                </div>
            )}

            {/* Dynamic Expanding Navigation Ribbon */}
            <div className="flex justify-center mb-10 sticky top-4 z-50 px-2">
                <div className="flex gap-4 p-2 bg-white/60 dark:bg-brand-ebony/40 backdrop-blur-xl rounded-full shadow-2xl border border-white dark:border-white/5 ring-1 ring-brand-ebony/5 transition-all hover:ring-brand-burgundy/20 max-w-full overflow-x-auto scrollbar-hide">
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-700 relative group/tab flex-shrink-0 ${
                                    isActive 
                                        ? 'bg-brand-burgundy text-white shadow-lg shadow-brand-burgundy/30' 
                                        : 'text-brand-ebony/40 dark:text-white/40 hover:text-brand-ebony/80 hover:bg-brand-ebony/5 dark:hover:bg-white/5'
                                }`}
                            >
                                <div className={`transition-all duration-500 ${isActive ? 'scale-110' : 'group-hover/tab:scale-110 group-hover/tab:text-brand-burgundy'}`}>
                                    {tab.icon}
                                </div>
                                <span className={`transition-all duration-700 overflow-hidden whitespace-nowrap font-sans ${
                                    isActive 
                                        ? 'max-w-[200px] ml-4 opacity-100' 
                                        : 'max-w-0 opacity-0 group-hover/tab:max-w-[200px] group-hover/tab:ml-4 group-hover/tab:opacity-100'
                                }`}>
                                    {tab.label}
                                </span>
                                {tab.badge !== undefined && tab.badge > 0 && (
                                    <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[8px] font-black border-2 transition-all duration-500 ${
                                        isActive 
                                            ? 'bg-white text-brand-burgundy border-brand-burgundy scale-110' 
                                            : 'bg-brand-burgundy text-white border-white dark:border-brand-ebony group-hover/tab:scale-110'
                                    }`}>
                                        {tab.badge}
                                    </span>
                                )}
                                {isActive && (
                                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full animate-pulse" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── OVERVIEW TAB ────────────────────────────────────── */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        {[
                            {
                                label: 'Total Members', value: overviewStats.users,
                                icon: <Users className="w-6 h-6 text-brand-burgundy" />,
                                color: 'bg-brand-burgundy/10', tab: 'members' as Tab
                            },
                            {
                                label: 'Suspended', value: suspendedCount,
                                icon: <UserX className="w-6 h-6 text-red-600" />,
                                color: 'bg-red-50 dark:bg-red-900/20', tab: 'suspended' as Tab,
                                alert: suspendedCount > 0
                            },
                            {
                                label: 'Total Posts', value: overviewStats.posts,
                                icon: <FileText className="w-6 h-6 text-brand-ebony/70" />,
                                color: 'bg-brand-ebony/5', tab: 'posts' as Tab
                            },
                            {
                                label: 'Total Jobs', value: overviewStats.jobs,
                                icon: <Briefcase className="w-6 h-6 text-amber-700" />,
                                color: 'bg-amber-50 dark:bg-amber-900/20', tab: 'jobs' as Tab
                            },
                        ].map(stat => (
                            <button
                                key={stat.label}
                                onClick={() => setActiveTab(stat.tab)}
                                className={`card-premium p-6 flex flex-col items-center justify-center text-center group hover:shadow-lg cursor-pointer transition-all ${(stat as any).alert ? 'border-red-500/20 shadow-md shadow-red-500/5' : ''}`}
                            >
                                <div className={`w-12 h-12 rounded-full ${stat.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                                    {stat.icon}
                                </div>
                                <h3 className={`text-3xl font-serif font-bold ${stat.label === 'Suspended' && suspendedCount > 0 ? 'text-red-600' : 'text-brand-ebony dark:text-white'}`}>
                                    {statsLoading ? <Loader2 className="w-6 h-6 animate-spin text-brand-ebony/20 mx-auto" /> : stat.value}
                                </h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-ebony/40 dark:text-white/40 mt-1">{stat.label}</p>
                                <p className="text-[9px] text-brand-burgundy/50 font-bold uppercase tracking-wider mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Click to manage →
                                </p>
                            </button>
                        ))}
                    </div>

                    {/* Cover Photo Branding */}
                    <div className="card-premium overflow-hidden">
                        <div className="p-5 sm:p-6 border-b border-brand-ebony/10 dark:border-white/10">
                            <h2 className="text-lg sm:text-xl font-serif font-bold text-brand-ebony dark:text-white flex items-center gap-2">
                                <Globe className="w-5 h-5 text-brand-burgundy" />
                                Institute Branding
                            </h2>
                            <p className="text-sm text-brand-ebony/60 dark:text-white/40 mt-1">
                                This cover photo appears on all member profiles in your institute.
                            </p>
                        </div>
                        <div className="p-5 sm:p-6">
                            <div className="relative w-full h-40 sm:h-56 rounded-2xl overflow-hidden bg-brand-ebony/5 border-2 border-dashed border-brand-ebony/10 dark:border-white/10 flex flex-col items-center justify-center group">
                                {coverPhoto ? (
                                    <>
                                        <img
                                            src={coverPhoto}
                                            alt="Institute Cover"
                                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <label className="cursor-pointer px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-white text-xs font-black uppercase tracking-wider flex items-center gap-2">
                                                <Camera className="w-4 h-4" /> Change Image
                                                <input type="file" onChange={handleUploadCoverPhoto} disabled={uploading} accept="image/*" className="hidden" />
                                            </label>
                                        </div>
                                    </>
                                ) : (
                                    <label className="cursor-pointer flex flex-col items-center text-brand-ebony/40 hover:text-brand-burgundy transition-colors">
                                        <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center mb-3">
                                            <Camera className="w-6 h-6" />
                                        </div>
                                        <span className="text-sm font-bold">Upload Cover Photo</span>
                                        <input type="file" onChange={handleUploadCoverPhoto} disabled={uploading} accept="image/*" className="hidden" />
                                    </label>
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
                                        <Loader2 className="w-8 h-8 animate-spin text-brand-burgundy" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MEMBERS TAB ─────────────────────────────────────── */}
            {activeTab === 'members' && (
                <div className="card-premium overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-brand-ebony/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-serif font-bold text-brand-ebony dark:text-white">Members</h2>
                            <p className="text-xs text-brand-ebony/50 dark:text-white/40 mt-0.5">
                                {members.length} total · {suspendedCount} suspended
                            </p>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ebony/30 dark:text-white/30" />
                            <input
                                type="text"
                                placeholder="Search members…"
                                value={memberSearch}
                                onChange={e => setMemberSearch(e.target.value)}
                                className="pl-9 pr-4 py-2.5 bg-brand-ebony/5 dark:bg-white/5 border border-brand-ebony/10 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-burgundy/20 w-full sm:w-64 text-brand-ebony dark:text-white"
                            />
                        </div>
                    </div>

                    {loadingMembers ? (
                        <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-burgundy/30" /></div>
                    ) : filteredMembers.length === 0 ? (
                        <div className="p-12 text-center text-brand-ebony/40 dark:text-white/30 text-sm font-bold uppercase tracking-widest">
                            {memberSearch ? 'No members match your search' : 'No members found'}
                        </div>
                    ) : (
                        <div className="divide-y divide-brand-ebony/5 dark:divide-white/5">
                            {filteredMembers.map(member => (
                                <div
                                    key={member.uid}
                                    className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                                        member.isSuspended
                                            ? 'bg-red-50/50 dark:bg-red-900/10'
                                            : 'hover:bg-brand-ebony/[0.02] dark:hover:bg-white/[0.02]'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <img
                                            src={member.profilePic || `https://placehold.co/80x80/EFEFEFF/5a2427?text=${member.name?.charAt(0) || '?'}`}
                                            alt={member.name}
                                            className="w-10 h-10 rounded-full border-2 border-white dark:border-white/10 shadow-sm flex-shrink-0 object-cover"
                                        />
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                <p className="font-bold text-brand-ebony dark:text-white text-sm">{member.name}</p>
                                                {member.isSuspended && (
                                                    <span className="px-2 py-0.5 bg-red-500/10 text-red-600 text-[9px] font-black uppercase tracking-wider rounded-full border border-red-500/20">
                                                        Suspended
                                                    </span>
                                                )}
                                                {member.isinsadmin && (
                                                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 text-[9px] font-black uppercase tracking-wider rounded-full border border-indigo-500/20">
                                                        Admin
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-brand-ebony/50 dark:text-white/40 truncate">{member.email}</p>
                                            <code className="inline-block mt-1 text-[9px] font-mono bg-brand-ebony/5 dark:bg-white/5 text-brand-ebony/40 dark:text-white/40 px-1.5 py-0.5 rounded">
                                                ID: {member.uid}
                                            </code>
                                            <p className="text-[10px] text-brand-ebony/40 dark:text-white/30 mt-0.5">
                                                Class of {member.batch} · {member.profession || 'Alumni'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleSuspendUser(member.uid, !!member.isSuspended)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex-shrink-0 border ${
                                            member.isSuspended
                                                ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20'
                                                : 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-500/20'
                                        }`}
                                    >
                                        {member.isSuspended
                                            ? <><UserCheck className="w-3.5 h-3.5" /> Restore</>
                                            : <><UserX className="w-3.5 h-3.5" /> Suspend</>
                                        }
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── POSTS TAB ───────────────────────────────────────── */}
            {activeTab === 'posts' && (
                <div className="card-premium overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-brand-ebony/10 dark:border-white/10">
                        <h2 className="text-lg font-serif font-bold text-brand-ebony dark:text-white">Posts</h2>
                        <p className="text-xs text-brand-ebony/50 dark:text-white/40 mt-0.5">{posts.length} posts in your institute</p>
                    </div>

                    {loadingPosts ? (
                        <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-burgundy/30" /></div>
                    ) : posts.length === 0 ? (
                        <div className="p-12 text-center text-brand-ebony/40 dark:text-white/30 text-sm font-bold uppercase tracking-widest">No posts found</div>
                    ) : (
                        <div className="divide-y divide-brand-ebony/5 dark:divide-white/5">
                            {posts.map(post => (
                                <div key={post.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-brand-ebony/[0.02] dark:hover:bg-white/[0.02] transition group">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                            <p className="font-bold text-sm text-brand-ebony dark:text-white">{post.authorName}</p>
                                            <span className="text-[10px] text-brand-ebony/30 dark:text-white/20">
                                                {post.createdAt?.toDate?.()?.toLocaleDateString?.() || ''}
                                            </span>
                                        </div>
                                        <p className="text-sm text-brand-ebony/70 dark:text-white/60 line-clamp-2">{post.content}</p>
                                        {post.mediaUrl && (
                                            <span className="inline-block mt-1.5 text-[10px] font-bold text-brand-burgundy/60 uppercase tracking-wider">📎 Has attachment</span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDeletePost(post.id)}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex-shrink-0 border border-red-500/20 sm:opacity-0 sm:group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── JOBS TAB ────────────────────────────────────────── */}
            {activeTab === 'jobs' && (
                <div className="card-premium overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-brand-ebony/10 dark:border-white/10">
                        <h2 className="text-lg font-serif font-bold text-brand-ebony dark:text-white">Job Listings</h2>
                        <p className="text-xs text-brand-ebony/50 dark:text-white/40 mt-0.5">{jobs.length} listings in your institute</p>
                    </div>

                    {loadingJobs ? (
                        <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-burgundy/30" /></div>
                    ) : jobs.length === 0 ? (
                        <div className="p-12 text-center text-brand-ebony/40 dark:text-white/30 text-sm font-bold uppercase tracking-widest">No job listings found</div>
                    ) : (
                        <div className="divide-y divide-brand-ebony/5 dark:divide-white/5">
                            {jobs.map(job => (
                                <div key={job.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-brand-ebony/[0.02] dark:hover:bg-white/[0.02] transition group">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <p className="font-bold text-sm text-brand-ebony dark:text-white">{job.title}</p>
                                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[9px] font-black uppercase tracking-wider rounded-full border border-amber-500/20">
                                                {job.type}
                                            </span>
                                        </div>
                                        <p className="text-xs text-brand-ebony/60 dark:text-white/40">{job.company}{job.location ? ` · ${job.location}` : ''}</p>
                                        <p className="text-[10px] text-brand-ebony/40 dark:text-white/30 mt-1 uppercase tracking-wider">
                                            Posted by {job.postedByName}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteJob(job.id)}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex-shrink-0 border border-red-500/20 sm:opacity-0 sm:group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {/* ── APPROVALS TAB ────────────────────────────────────── */}
            {activeTab === 'approvals' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Form */}
                    <div className="lg:col-span-4">
                        <div className="card-premium p-6">
                            <h2 className="text-lg font-serif font-bold text-brand-ebony dark:text-white mb-4">Authorize Email</h2>
                            <form onSubmit={handleAddApproval} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-brand-ebony/40 dark:text-white/40 mb-1.5 uppercase tracking-widest">Alumni Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ebony/30" />
                                        <input
                                            type="email"
                                            placeholder="name@alumni.edu"
                                            value={newApprovalEmail}
                                            onChange={e => setNewApprovalEmail(e.target.value)}
                                            className="w-full pl-9 pr-4 py-3 bg-brand-ebony/5 dark:bg-white/5 border border-brand-ebony/10 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-burgundy/20"
                                            required
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={approving}
                                    className="w-full py-3 bg-brand-burgundy text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Grant Access</>}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* List */}
                    <div className="lg:col-span-8">
                        <div className="card-premium overflow-hidden">
                            <div className="p-4 border-b border-brand-ebony/10 dark:border-white/10">
                                <h2 className="text-lg font-serif font-bold text-brand-ebony dark:text-white">Authorized Accounts</h2>
                            </div>
                            {loadingApprovals ? (
                                <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-burgundy/30" /></div>
                            ) : approvals.length === 0 ? (
                                <div className="p-12 text-center text-brand-ebony/40 dark:text-white/30 text-xs font-bold uppercase tracking-widest">No authorized emails yet</div>
                            ) : (
                                <div className="divide-y divide-brand-ebony/5 dark:divide-white/5">
                                    {approvals.map(app => (
                                        <div key={app.email} className="p-4 flex items-center justify-between group hover:bg-brand-ebony/[0.02] transition">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-brand-burgundy/5 flex items-center justify-center text-brand-burgundy border border-brand-burgundy/10">
                                                    <Mail className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-bold text-brand-ebony dark:text-white">{app.email}</span>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteApproval(app.email)}
                                                className="p-2 text-brand-ebony/10 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* ── SUSPENDED TAB ────────────────────────────────────── */}
            {activeTab === 'suspended' && (
                <div className="card-premium overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-brand-ebony/10 dark:border-white/10">
                        <h2 className="text-lg font-serif font-bold text-brand-ebony dark:text-white">Suspended Accounts</h2>
                        <p className="text-xs text-brand-ebony/50 dark:text-white/40 mt-0.5">{suspendedCount} suspended {suspendedCount === 1 ? 'account' : 'accounts'} in your institute</p>
                    </div>

                    {loadingMembers ? (
                        <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-burgundy/30" /></div>
                    ) : suspendedCount === 0 ? (
                        <div className="p-12 sm:p-20 text-center">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <UserCheck className="w-8 h-8 text-emerald-500" />
                            </div>
                            <p className="text-brand-ebony/40 dark:text-white/30 text-sm font-bold uppercase tracking-widest">No suspended accounts</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-brand-ebony/5 dark:divide-white/5">
                            {members.filter(u => u.isSuspended).map(u => (
                                <div key={u.uid} className="p-4 sm:p-5 bg-red-50/30 dark:bg-red-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <img
                                            src={u.profilePic || `https://placehold.co/80x80/EFEFEF/5a2427?text=${u.name?.charAt(0) || '?'}`}
                                            alt={u.name}
                                            className="w-10 h-10 rounded-full border-2 border-red-200 dark:border-red-800 shadow-sm flex-shrink-0 object-cover opacity-60"
                                        />
                                        <div className="min-w-0">
                                            <p className="font-bold text-brand-ebony dark:text-white text-sm">{u.name}</p>
                                            <p className="text-xs text-brand-ebony/50 dark:text-white/40 truncate">{u.email}</p>
                                            <code className="inline-block mt-1 text-[10px] font-mono bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded">
                                                UID: {u.uid}
                                            </code>
                                            <p className="text-[10px] text-brand-ebony/40 dark:text-white/30 mt-1">
                                                Class of {u.batch} · {u.profession || 'Alumni'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0 self-end sm:self-center flex-wrap">
                                        <button
                                            onClick={() => handleSuspendUser(u.uid, true)}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-emerald-500/20"
                                        >
                                            <UserCheck className="w-3 h-3" /> Restore
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
