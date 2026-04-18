'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
    collection, query, where, getDocs, doc, getDoc,
    updateDoc, deleteDoc, onSnapshot, orderBy
} from 'firebase/firestore';
import { uploadMedia } from '@/lib/media';
import {
    Loader2, Camera, Users, FileText, Briefcase, Globe,
    LayoutDashboard, Search, Trash2, UserX, UserCheck
} from 'lucide-react';
import { User, Post, Job } from '@/types';

type Tab = 'overview' | 'members' | 'posts' | 'jobs';

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

    const [error, setError] = useState<string | null>(null);

    // Fetch overview stats + cover photo on mount
    useEffect(() => {
        if (authLoading || !userData?.instituteId) return;

        const fetchOverview = async () => {
            setStatsLoading(true);
            try {
                const instId = userData.instituteId;
                const [usersSnap, postsSnap, jobsSnap, instDoc] = await Promise.all([
                    getDocs(query(collection(db, 'users'), where('instituteId', '==', instId))),
                    getDocs(query(collection(db, 'posts'), where('instituteId', '==', instId))),
                    getDocs(query(collection(db, 'opportunities'), where('instituteId', '==', instId))),
                    getDoc(doc(db, 'institutes', instId)),
                ]);
                setOverviewStats({
                    users: usersSnap.size,
                    posts: postsSnap.size,
                    jobs: jobsSnap.size,
                });
                if (instDoc.exists()) {
                    setCoverPhoto(instDoc.data().coverPhotoUrl || null);
                }
            } catch (err) {
                console.error('Error fetching overview:', err);
            } finally {
                setStatsLoading(false);
            }
        };

        fetchOverview();
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

    const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
        { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'members', label: 'Members', icon: <Users className="w-4 h-4" />, badge: overviewStats.users },
        { id: 'posts', label: 'Posts', icon: <FileText className="w-4 h-4" />, badge: overviewStats.posts },
        { id: 'jobs', label: 'Jobs', icon: <Briefcase className="w-4 h-4" />, badge: overviewStats.jobs },
    ];

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-up">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-ebony dark:text-white">
                    Institute Admin
                </h1>
                <p className="text-sm text-brand-ebony/60 dark:text-white/50 mt-1">
                    {userData?.instituteName || 'Your Institute'} — Manage members and content
                </p>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 text-sm font-medium flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="font-bold ml-3 text-red-400 hover:text-red-600">✕</button>
                </div>
            )}

            {/* Tab Switcher */}
            <div className="flex gap-1 p-1 bg-brand-ebony/5 dark:bg-white/5 rounded-2xl mb-6 overflow-x-auto scrollbar-hide">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap flex-1 justify-center ${
                            activeTab === tab.id
                                ? 'bg-white dark:bg-white/10 shadow-sm text-brand-burgundy'
                                : 'text-brand-ebony/50 dark:text-white/40 hover:text-brand-ebony/70 dark:hover:text-white/60'
                        }`}
                    >
                        {tab.icon}
                        <span className="hidden xs:inline">{tab.label}</span>
                        {tab.badge !== undefined && tab.badge > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                                activeTab === tab.id
                                    ? 'bg-brand-burgundy/10 text-brand-burgundy'
                                    : 'bg-brand-ebony/10 dark:bg-white/10 text-brand-ebony/50 dark:text-white/40'
                            }`}>
                                {tab.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── OVERVIEW TAB ────────────────────────────────────── */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            {
                                label: 'Total Members', value: overviewStats.users,
                                icon: <Users className="w-6 h-6 text-brand-burgundy" />,
                                color: 'bg-brand-burgundy/10', tab: 'members' as Tab
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
                                className="card-premium p-6 flex flex-col items-center justify-center text-center group hover:shadow-lg cursor-pointer transition-all"
                            >
                                <div className={`w-12 h-12 rounded-full ${stat.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                                    {stat.icon}
                                </div>
                                <h3 className="text-3xl font-serif font-bold text-brand-ebony dark:text-white">
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
        </div>
    );
}
