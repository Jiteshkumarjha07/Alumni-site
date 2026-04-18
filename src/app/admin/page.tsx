'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
    collection, query, onSnapshot, deleteDoc, doc, updateDoc, orderBy
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Users, FileText, Building2, ShieldX, Search, Trash2, UserX, UserCheck,
    Loader2, Shield, LayoutDashboard, ChevronRight, ShieldCheck
} from 'lucide-react';
import { User, Post, Institute } from '@/types';

type Tab = 'overview' | 'users' | 'posts' | 'suspended';

export default function AdminDashboard() {
    const { userData, loading: authLoading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allPosts, setAllPosts] = useState<Post[]>([]);
    const [institutes, setInstitutes] = useState<Institute[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [loadingPosts, setLoadingPosts] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [postSearch, setPostSearch] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Redirect institute-only admins away from this page
    useEffect(() => {
        if (!authLoading && userData && !userData.isAdmin && userData.isinsadmin) {
            router.replace('/institute-admin');
        }
    }, [authLoading, userData, router]);

    // Subscribe to all users and institutes
    useEffect(() => {
        if (authLoading || !userData?.isAdmin) return;

        setLoadingUsers(true);
        const unsubUsers = onSnapshot(collection(db, 'users'), snap => {
            setAllUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as User)));
            setLoadingUsers(false);
        }, (err) => { console.error(err); setLoadingUsers(false); });

        const unsubInstitutes = onSnapshot(collection(db, 'institutes'), snap => {
            setInstitutes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Institute)));
        }, console.error);

        return () => { unsubUsers(); unsubInstitutes(); };
    }, [authLoading, userData?.isAdmin]);

    // Subscribe to posts only when on posts or overview tab
    useEffect(() => {
        if ((activeTab !== 'posts' && activeTab !== 'overview') || !userData?.isAdmin) {
            // Bug #2 fix: always return a no-op so previous subscriptions are properly cleaned up
            return () => {};
        }
        setLoadingPosts(true);
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, snap => {
            setAllPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
            setLoadingPosts(false);
        }, (err) => { console.error(err); setLoadingPosts(false); });
        return () => unsub();
    }, [activeTab, userData?.isAdmin]);

    const suspendedUsers = useMemo(() => allUsers.filter(u => u.isSuspended), [allUsers]);

    const filteredUsers = useMemo(() => {
        const q = userSearch.toLowerCase().trim();
        if (!q) return allUsers;
        return allUsers.filter(u =>
            u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            u.uid?.toLowerCase().includes(q) ||
            u.instituteName?.toLowerCase().includes(q)
        );
    }, [allUsers, userSearch]);

    const filteredPosts = useMemo(() => {
        const q = postSearch.toLowerCase().trim();
        if (!q) return allPosts;
        return allPosts.filter(p =>
            p.content?.toLowerCase().includes(q) ||
            p.authorName?.toLowerCase().includes(q)
        );
    }, [allPosts, postSearch]);

    const getInstituteName = (id: string) => {
        // Bug #8 fix: return empty string while institutes haven't loaded yet
        // to avoid misleading "Unknown Institute" flash on first render
        if (institutes.length === 0) return '';
        return institutes.find(i => i.id === id)?.name || 'Unknown Institute';
    };

    const handleSuspendUser = async (uid: string, currentStatus: boolean) => {
        const msg = currentStatus ? 'Restore this user\'s account?' : 'Suspend this user? They will be signed out immediately.';
        if (!confirm(msg)) return;
        try {
            await updateDoc(doc(db, 'users', uid), { isSuspended: !currentStatus });
        } catch (err: unknown) {
            setError((err as { message?: string }).message || 'Failed to update user.');
        }
    };

    const handleDeleteUser = async (uid: string, name: string) => {
        if (!confirm(`PERMANENTLY DELETE user "${name}"?\n\nThis cannot be undone. All their data may become orphaned.`)) return;
        try {
            await deleteDoc(doc(db, 'users', uid));
        } catch (err: unknown) {
            setError((err as { message?: string }).message || 'Failed to delete user.');
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm('Delete this post permanently?')) return;
        try {
            await deleteDoc(doc(db, 'posts', postId));
        } catch (err: unknown) {
            setError((err as { message?: string }).message || 'Failed to delete post.');
        }
    };

    if (authLoading) {
        return (
            <div className="flex h-[calc(100vh-100px)] items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-brand-burgundy/40" />
            </div>
        );
    }

    if (!userData?.isAdmin) return null;

    const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
        { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" />, count: allUsers.length },
        { id: 'posts', label: 'Posts', icon: <FileText className="w-4 h-4" />, count: allPosts.length },
        { id: 'suspended', label: 'Suspended', icon: <ShieldX className="w-4 h-4" />, count: suspendedUsers.length },
    ];

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-up">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-indigo rounded-2xl flex items-center justify-center shadow-lg shadow-brand-burgundy/20 flex-shrink-0">
                        <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-ebony">Admin Console</h1>
                        <p className="text-[10px] text-brand-ebony/40 uppercase tracking-[0.2em] font-bold mt-0.5">Global Administration</p>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Link
                        href="/admin/institutes"
                        className="flex items-center gap-1.5 px-4 py-2 bg-brand-ebony/5 hover:bg-brand-ebony/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-brand-ebony/60 dark:text-white/60 hover:text-brand-ebony dark:hover:text-white transition-all"
                    >
                        <Building2 className="w-3.5 h-3.5" /> Institutes
                    </Link>
                    <Link
                        href="/admin/approvals"
                        className="flex items-center gap-1.5 px-4 py-2 bg-brand-ebony/5 hover:bg-brand-ebony/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-brand-ebony/60 dark:text-white/60 hover:text-brand-ebony dark:hover:text-white transition-all"
                    >
                        <ShieldCheck className="w-3.5 h-3.5" /> Approvals
                    </Link>
                </div>
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
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                                activeTab === tab.id ? 'bg-brand-burgundy/10 text-brand-burgundy' : 'bg-brand-ebony/10 dark:bg-white/10 text-brand-ebony/50 dark:text-white/40'
                            }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── OVERVIEW TAB ────────────────────────────────────── */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Users', value: allUsers.length, icon: <Users className="w-5 h-5 text-brand-burgundy" />, tab: 'users' as Tab },
                            { label: 'Suspended', value: suspendedUsers.length, icon: <ShieldX className="w-5 h-5 text-red-500" />, tab: 'suspended' as Tab, alert: suspendedUsers.length > 0 },
                            { label: 'Total Posts', value: allPosts.length, icon: <FileText className="w-5 h-5 text-indigo-500" />, tab: 'posts' as Tab },
                            { label: 'Institutes', value: institutes.length, icon: <Building2 className="w-5 h-5 text-amber-600" />, tab: null },
                        ].map(stat => (
                            <button
                                key={stat.label}
                                onClick={() => stat.tab && setActiveTab(stat.tab)}
                                className={`card-premium p-4 sm:p-5 flex flex-col items-center text-center transition-all ${stat.tab ? 'cursor-pointer group hover:shadow-lg' : 'cursor-default'} ${stat.alert ? 'border-red-300/40' : ''}`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform ${stat.alert ? 'bg-red-500/10' : 'bg-brand-ebony/5'}`}>
                                    {stat.icon}
                                </div>
                                <p className="text-2xl font-serif font-bold text-brand-ebony dark:text-white">
                                    {loadingUsers ? '—' : stat.value}
                                </p>
                                <p className="text-[9px] font-black uppercase tracking-wider text-brand-ebony/40 dark:text-white/40 mt-0.5">{stat.label}</p>
                                {stat.tab && <p className="text-[9px] text-brand-burgundy/50 font-bold uppercase tracking-wider mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">View →</p>}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Link href="/admin/institutes" className="card-premium p-5 flex items-center justify-between group hover:shadow-md transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-indigo flex items-center justify-center flex-shrink-0">
                                    <Building2 className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="font-bold text-brand-ebony dark:text-white text-sm">Manage Institutes</p>
                                    <p className="text-xs text-brand-ebony/50 dark:text-white/40">Add, rename, delete organizations</p>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-brand-ebony/30 group-hover:text-brand-burgundy group-hover:translate-x-1 transition-all flex-shrink-0" />
                        </Link>
                        <Link href="/admin/approvals" className="card-premium p-5 flex items-center justify-between group hover:shadow-md transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-brand-ebony dark:text-white text-sm">Access Control</p>
                                    <p className="text-xs text-brand-ebony/50 dark:text-white/40">Whitelist emails for signup</p>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-brand-ebony/30 group-hover:text-brand-burgundy group-hover:translate-x-1 transition-all flex-shrink-0" />
                        </Link>
                    </div>
                </div>
            )}

            {/* ── USERS TAB ───────────────────────────────────────── */}
            {activeTab === 'users' && (
                <div className="card-premium overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-brand-ebony/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-serif font-bold text-brand-ebony dark:text-white">All Users</h2>
                            <p className="text-xs text-brand-ebony/50 dark:text-white/40 mt-0.5">{allUsers.length} registered accounts</p>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ebony/30 dark:text-white/30" />
                            <input
                                type="text"
                                placeholder="Search name, email, UID…"
                                value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                                className="pl-9 pr-4 py-2.5 bg-brand-ebony/5 dark:bg-white/5 border border-brand-ebony/10 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-burgundy/20 w-full sm:w-72 text-brand-ebony dark:text-white"
                            />
                        </div>
                    </div>

                    {loadingUsers ? (
                        <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-burgundy/30" /></div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-12 text-center text-brand-ebony/40 dark:text-white/30 text-sm font-bold uppercase tracking-widest">
                            {userSearch ? 'No users match your search' : 'No users found'}
                        </div>
                    ) : (
                        <div className="divide-y divide-brand-ebony/5 dark:divide-white/5">
                            {filteredUsers.map(u => (
                                <div
                                    key={u.uid}
                                    className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${u.isSuspended ? 'bg-red-50/50 dark:bg-red-900/10' : 'hover:bg-brand-ebony/[0.02] dark:hover:bg-white/[0.02]'}`}
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <img
                                            src={u.profilePic || `https://placehold.co/80x80/EFEFEF/5a2427?text=${u.name?.charAt(0) || '?'}`}
                                            alt={u.name}
                                            className="w-10 h-10 rounded-full border-2 border-white dark:border-white/10 shadow-sm flex-shrink-0 object-cover"
                                        />
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                <p className="font-bold text-brand-ebony dark:text-white text-sm">{u.name}</p>
                                                {u.isSuspended && (
                                                    <span className="px-2 py-0.5 bg-red-500/10 text-red-600 text-[9px] font-black uppercase tracking-wider rounded-full border border-red-500/20">Suspended</span>
                                                )}
                                                {u.isAdmin && (
                                                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 text-[9px] font-black uppercase tracking-wider rounded-full border border-purple-500/20">Admin</span>
                                                )}
                                                {u.isinsadmin && (
                                                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 text-[9px] font-black uppercase tracking-wider rounded-full border border-indigo-500/20">Inst. Admin</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-brand-ebony/50 dark:text-white/40 truncate">{u.email}</p>
                                            <p className="text-[10px] font-mono text-brand-ebony/30 dark:text-white/30 mt-0.5">UID: {u.uid}</p>
                                            <p className="text-[10px] text-brand-ebony/40 dark:text-white/30">{u.instituteName || getInstituteName(u.instituteId)} • Class of {u.batch}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0 self-end sm:self-center flex-wrap">
                                        <button
                                            onClick={() => handleSuspendUser(u.uid, !!u.isSuspended)}
                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                                                u.isSuspended
                                                    ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20'
                                                    : 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-500/20'
                                            }`}
                                        >
                                            {u.isSuspended ? <><UserCheck className="w-3 h-3" /> Restore</> : <><UserX className="w-3 h-3" /> Suspend</>}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(u.uid, u.name)}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-red-500/20"
                                        >
                                            <Trash2 className="w-3 h-3" /> Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── POSTS TAB ───────────────────────────────────────── */}
            {activeTab === 'posts' && (
                <div className="card-premium overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-brand-ebony/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-serif font-bold text-brand-ebony dark:text-white">All Posts</h2>
                            <p className="text-xs text-brand-ebony/50 dark:text-white/40 mt-0.5">{allPosts.length} posts across all institutes</p>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ebony/30 dark:text-white/30" />
                            <input
                                type="text"
                                placeholder="Search posts…"
                                value={postSearch}
                                onChange={e => setPostSearch(e.target.value)}
                                className="pl-9 pr-4 py-2.5 bg-brand-ebony/5 dark:bg-white/5 border border-brand-ebony/10 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-burgundy/20 w-full sm:w-64 text-brand-ebony dark:text-white"
                            />
                        </div>
                    </div>

                    {loadingPosts ? (
                        <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-burgundy/30" /></div>
                    ) : filteredPosts.length === 0 ? (
                        <div className="p-12 text-center text-brand-ebony/40 dark:text-white/30 text-sm font-bold uppercase tracking-widest">
                            {postSearch ? 'No posts match your search' : 'No posts found'}
                        </div>
                    ) : (
                        <div className="divide-y divide-brand-ebony/5 dark:divide-white/5">
                            {filteredPosts.map(post => (
                                <div key={post.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-brand-ebony/[0.02] dark:hover:bg-white/[0.02] transition group">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                            <p className="font-bold text-sm text-brand-ebony dark:text-white">{post.authorName}</p>
                                            <span className="px-2 py-0.5 bg-brand-ebony/5 dark:bg-white/5 text-brand-ebony/50 dark:text-white/40 text-[9px] font-bold uppercase tracking-wider rounded-full">
                                                {getInstituteName(post.instituteId)}
                                            </span>
                                            <span className="text-[10px] text-brand-ebony/30 dark:text-white/20">
                                                {post.createdAt?.toDate?.()?.toLocaleDateString?.() || ''}
                                            </span>
                                        </div>
                                        <p className="text-sm text-brand-ebony/70 dark:text-white/60 line-clamp-2">{post.content}</p>
                                        {post.mediaUrl && (
                                            <span className="inline-block mt-1.5 text-[10px] font-bold text-brand-burgundy/60 uppercase tracking-wider">📎 Has attachment</span>
                                        )}
                                        <p className="text-[10px] font-mono text-brand-ebony/20 dark:text-white/20 mt-1 truncate">ID: {post.id}</p>
                                    </div>
                                    <button
                                        onClick={() => handleDeletePost(post.id)}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex-shrink-0 border border-red-500/20"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── SUSPENDED TAB ───────────────────────────────────── */}
            {activeTab === 'suspended' && (
                <div className="card-premium overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-brand-ebony/10 dark:border-white/10">
                        <h2 className="text-lg font-serif font-bold text-brand-ebony dark:text-white">Suspended Accounts</h2>
                        <p className="text-xs text-brand-ebony/50 dark:text-white/40 mt-0.5">{suspendedUsers.length} suspended {suspendedUsers.length === 1 ? 'account' : 'accounts'}</p>
                    </div>

                    {loadingUsers ? (
                        <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-burgundy/30" /></div>
                    ) : suspendedUsers.length === 0 ? (
                        <div className="p-12 sm:p-20 text-center">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <UserCheck className="w-8 h-8 text-emerald-500" />
                            </div>
                            <p className="text-brand-ebony/40 dark:text-white/30 text-sm font-bold uppercase tracking-widest">No suspended accounts</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-brand-ebony/5 dark:divide-white/5">
                            {suspendedUsers.map(u => (
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
                                                {u.instituteName || getInstituteName(u.instituteId)} • Class of {u.batch}
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
                                        <button
                                            onClick={() => handleDeleteUser(u.uid, u.name)}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-red-500/20"
                                        >
                                            <Trash2 className="w-3 h-3" /> Delete
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
