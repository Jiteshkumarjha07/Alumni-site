'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updatePassword, deleteUser } from 'firebase/auth';
import {
    collection, query, where, orderBy, onSnapshot, updateDoc,
    doc, getDocs, getDoc, deleteDoc, writeBatch, arrayRemove
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post, Comment as AppComment, User, Group } from '@/types';
import { PostCard } from '@/components/feed/PostCard';
import { CommentModal } from '@/components/modals/CommentModal';
import { EditProfileModal, ProfileFormData } from '@/components/modals/EditProfileModal';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { SharePostModal } from '@/components/modals/SharePostModal';
import { ChangePasswordModal } from '@/components/modals/ChangePasswordModal';
import { SignedOutView } from '@/components/auth/SignedOutView';
import { uploadMedia } from '@/lib/media';
import {
    Pencil, MapPin, Briefcase, Settings, MessageCircle,
    Users, Loader2, ImagePlus, FileText, Sparkles,
    GraduationCap, Globe, BadgeCheck, Trash2, Palette,
    X, Check, Camera,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { AccountSettingsModal } from '@/components/modals/AccountSettingsModal';
import { Portal } from '@/components/ui/Portal';

// ── Cover palette presets ────────────────────────────────────────────────────
const COVER_PALETTES = [
    // Solid
    { id: 's1', label: 'Midnight',   css: 'linear-gradient(135deg,#0f172a 0%,#0f172a 100%)',          type: 'solid'    },
    { id: 's2', label: 'Charcoal',   css: 'linear-gradient(135deg,#1c1c1e 0%,#1c1c1e 100%)',          type: 'solid'    },
    { id: 's3', label: 'Ivory',      css: 'linear-gradient(135deg,#faf7f2 0%,#faf7f2 100%)',          type: 'solid'    },
    { id: 's4', label: 'Forest',     css: 'linear-gradient(135deg,#064e3b 0%,#064e3b 100%)',          type: 'solid'    },
    // Gradients
    { id: 'g1', label: 'Aurora',     css: 'linear-gradient(135deg,#1a1040 0%,#312e81 50%,#0f172a 100%)', type: 'gradient' },
    { id: 'g2', label: 'Sunset',     css: 'linear-gradient(135deg,#7c2d12 0%,#b45309 50%,#1e1b4b 100%)', type: 'gradient' },
    { id: 'g3', label: 'Ocean',      css: 'linear-gradient(135deg,#0c4a6e 0%,#0e7490 50%,#164e63 100%)', type: 'gradient' },
    { id: 'g4', label: 'Rose Gold',  css: 'linear-gradient(135deg,#881337 0%,#9f1239 50%,#7c2d12 100%)', type: 'gradient' },
    { id: 'g5', label: 'Northern',   css: 'linear-gradient(135deg,#064e3b 0%,#065f46 45%,#1e3a5f 100%)', type: 'gradient' },
    { id: 'g6', label: 'Cosmos',     css: 'linear-gradient(135deg,#1e1b4b 0%,#4c1d95 50%,#1a0a2e 100%)', type: 'gradient' },
    { id: 'g7', label: 'Dusk',       css: 'linear-gradient(135deg,#111827 0%,#374151 50%,#0f172a 100%)', type: 'gradient' },
    { id: 'g8', label: 'Gold Rush',  css: 'linear-gradient(135deg,#78350f 0%,#d97706 50%,#1c1917 100%)', type: 'gradient' },
] as const;

type CoverPaletteId = typeof COVER_PALETTES[number]['id'];

// ── Cover Picker Popover ─────────────────────────────────────────────────────
function CoverPickerPanel({
    onPickPalette,
    onUpload,
    onDelete,
    hasCover,
    uploading,
    onClose,
}: {
    onPickPalette: (css: string) => void;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDelete: () => void;
    hasCover: boolean;
    uploading: boolean;
    onClose: () => void;
}) {
    return (
        <div className="absolute top-14 right-4 z-30 w-72 bg-white/95 dark:bg-[#12111a]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-brand-ebony/10 p-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Upload photo */}
            <label className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-brand-ebony/5 cursor-pointer transition-all group mb-1">
                <div className="w-8 h-8 rounded-xl bg-brand-burgundy/10 flex items-center justify-center">
                    <Camera className="w-4 h-4 text-brand-burgundy" />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-brand-ebony">Upload Photo</span>
                <input type="file" accept="image/*" onChange={(e) => { onUpload(e); onClose(); }} className="hidden" />
            </label>

            {/* Delete */}
            {hasCover && (
                <button
                    onClick={() => { onDelete(); onClose(); }}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-all group mb-1"
                >
                    <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
                        <Trash2 className="w-4 h-4 text-red-500" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-red-500">Remove Cover</span>
                </button>
            )}

            {/* Divider */}
            <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-brand-ebony/8" />
                <span className="text-[9px] font-black text-brand-ebony/30 uppercase tracking-widest flex items-center gap-1">
                    <Palette className="w-3 h-3" /> Colour Palettes
                </span>
                <div className="flex-1 h-px bg-brand-ebony/8" />
            </div>

            {/* Palette grid */}
            <div className="grid grid-cols-4 gap-2">
                {COVER_PALETTES.map((p) => (
                    <button
                        key={p.id}
                        title={p.label}
                        onClick={() => { onPickPalette(p.css); onClose(); }}
                        className="group/swatch relative aspect-square rounded-xl overflow-hidden border-2 border-white shadow-md hover:scale-110 hover:shadow-lg transition-all duration-200"
                        style={{ background: p.css }}
                    >
                        <span className="absolute inset-0 flex items-end justify-center pb-1 opacity-0 group-hover/swatch:opacity-100 transition-opacity">
                            <span className="text-white text-[8px] font-black bg-black/30 rounded px-1 backdrop-blur-sm leading-tight">{p.label}</span>
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
    const { user, userData, signOut, loading: authLoading } = useAuth();
    const [posts,               setPosts]               = useState<Post[]>([]);
    const [loading,             setLoading]             = useState(true);
    const [showEditProfile,     setShowEditProfile]     = useState(false);
    const [updating,            setUpdating]            = useState(false);
    const [uploadingCover,      setUploadingCover]      = useState(false);
    const [showCoverPicker,     setShowCoverPicker]     = useState(false);
    const [sharingPost,         setSharingPost]         = useState<Post | null>(null);
    const [commentingPost,      setCommentingPost]      = useState<Post | null>(null);
    const [activeTab,           setActiveTab]           = useState<'posts' | 'connections' | 'groups'>('posts');
    const [connections,         setConnections]         = useState<User[]>([]);
    const [loadingConnections,  setLoadingConnections]  = useState(false);
    const [userGroups,          setUserGroups]          = useState<Group[]>([]);
    const [loadingGroups,       setLoadingGroups]       = useState(false);
    const [showAccountSettings, setShowAccountSettings] = useState(false);
    const [showChangePassword,  setShowChangePassword]  = useState(false);
    const [showDeleteConfirm,   setShowDeleteConfirm]   = useState(false);
    const [deleting,            setDeleting]            = useState(false);
    const [showLogoutConfirm,   setShowLogoutConfirm]   = useState(false);
    const [instituteCoverPhoto, setInstituteCoverPhoto] = useState<string | null>(null);

    const coverPickerRef = useRef<HTMLDivElement>(null);

    // Close cover picker when clicking outside
    useEffect(() => {
        if (!showCoverPicker) return;
        const handler = (e: MouseEvent) => {
            if (coverPickerRef.current && !coverPickerRef.current.contains(e.target as Node)) {
                setShowCoverPicker(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showCoverPicker]);

    // ── Posts ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!userData) { setLoading(false); return; }
        const q = query(collection(db, 'posts'), where('authorUid', '==', userData.uid), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Post[]);
            setLoading(false);
        }, (err) => { console.error(err); setLoading(false); });
        return () => unsub();
    }, [userData]);

    // ── Institute Cover Photo ────────────────────────────────────────────────
    useEffect(() => {
        if (!userData?.instituteId) return;
        const fetchInstCover = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'institutes', userData.instituteId));
                if (docSnap.exists()) {
                    setInstituteCoverPhoto(docSnap.data().coverPhotoUrl || null);
                }
            } catch (err) {
                console.error("Error fetching institute cover:", err);
            }
        };
        fetchInstCover();
    }, [userData?.instituteId]);

    // ── Connections ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!userData || activeTab !== 'connections') return;
        setLoadingConnections(true);
        const ids = userData.connections || [];
        if (!ids.length) { setConnections([]); setLoadingConnections(false); return; }
        getDocs(query(collection(db, 'users'), where('uid', 'in', ids)))
            .then(s => setConnections(s.docs.map(d => d.data() as User)))
            .catch(console.error)
            .finally(() => setLoadingConnections(false));
    }, [userData, activeTab]);

    // ── Groups ───────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!userData || activeTab !== 'groups') return;
        setLoadingGroups(true);
        const ids = userData.groups || [];
        if (!ids.length) { setUserGroups([]); setLoadingGroups(false); return; }
        Promise.all(ids.map(id => getDoc(doc(db, 'groups', id))))
            .then(snaps => setUserGroups(snaps.filter(s => s.exists()).map(s => ({ id: s.id, ...s.data() }) as Group)))
            .catch(console.error)
            .finally(() => setLoadingGroups(false));
    }, [userData, activeTab]);

    // ── Cover handlers ───────────────────────────────────────────────────────
    const saveCover = async (value: string, field: 'coverPic' | 'coverPalette', clear?: 'coverPic' | 'coverPalette') => {
        if (!userData) return;
        setUploadingCover(true);
        try {
            const upd: Record<string, string | null> = { [field]: value };
            if (clear) upd[clear] = null;
            await updateDoc(doc(db, 'users', userData.uid), upd);
        } catch (err) { console.error(err); }
        finally { setUploadingCover(false); }
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userData) return;
        if (file.size > 8 * 1024 * 1024) { alert('Cover image must be under 8 MB'); return; }
        if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
        setUploadingCover(true);
        try {
            const url = await uploadMedia(file);
            if (url) await updateDoc(doc(db, 'users', userData.uid), { coverPic: url, coverPalette: null });
        } catch (err) { console.error(err); }
        finally { setUploadingCover(false); }
    };

    const handlePickPalette = (css: string) => saveCover(css, 'coverPalette', 'coverPic');

    const handleDeleteCover = async () => {
        if (!userData) return;
        setUploadingCover(true);
        try {
            await updateDoc(doc(db, 'users', userData.uid), { coverPic: null, coverPalette: null });
        } catch (err) { console.error(err); }
        finally { setUploadingCover(false); }
    };

    // ── Profile update ───────────────────────────────────────────────────────
    const handleUpdateProfile = async (formData: ProfileFormData, profilePicFile?: File | null, isRemovingPic?: boolean) => {
        if (!userData) return;
        setUpdating(true);
        try {
            const updates: Record<string, unknown> = { name: formData.name, profession: formData.profession, location: formData.location };
            if (isRemovingPic) {
                updates.profilePic = `https://placehold.co/100x100/4f46e5/ffffff?text=${formData.name.substring(0, 2).toUpperCase()}`;
            } else if (profilePicFile) {
                const url = await uploadMedia(profilePicFile);
                if (url) updates.profilePic = url;
            }
            await updateDoc(doc(db, 'users', userData.uid), updates);
            const snap = await getDocs(query(collection(db, 'posts'), where('authorUid', '==', userData.uid)));
            await Promise.all(snap.docs.map(d => updateDoc(doc(db, 'posts', d.id), {
                authorName: updates.name as string,
                ...(updates.profilePic ? { authorProfilePic: updates.profilePic as string } : {}),
            })));
        } catch (err) { console.error(err); alert('Failed to update profile.'); }
        finally { setUpdating(false); }
    };

    const handleLikePost = async (postId: string, isLiked: boolean) => {
        if (!userData) return;
        const post = posts.find(p => p.id === postId); if (!post) return;
        const likes = post.likes || [];
        await updateDoc(doc(db, 'posts', postId), { likes: isLiked ? likes.filter(u => u !== userData.uid) : [...likes, userData.uid] });
    };

    const handleAddComment = async (text: string) => {
        if (!userData || !commentingPost) return;
        const post = posts.find(p => p.id === commentingPost.id); if (!post) return;
        const nc = { id: Math.random().toString(36).substring(2, 9), authorUid: userData.uid, authorName: userData.name, text, createdAt: new Date(), reactions: {} };
        await updateDoc(doc(db, 'posts', commentingPost.id), { comments: [...(post.comments || []), nc] });
    };

    const handleDeleteComment = async (comment: AppComment) => {
        if (!userData || !commentingPost) return;
        await updateDoc(doc(db, 'posts', commentingPost.id), { comments: arrayRemove(comment) });
    };

    const handleReactComment = async (comment: AppComment, emoji: string) => {
        if (!userData || !commentingPost) return;
        const post = posts.find(p => p.id === commentingPost.id); if (!post) return;
        const updatedComments = (post.comments || []).map(c => {
            const match = c.id ? c.id === comment.id : (c.text === comment.text && c.authorUid === comment.authorUid);
            if (!match) return c;
            const reactions = { ...(c.reactions || {}) };
            const had = reactions[emoji]?.includes(userData.uid);
            Object.keys(reactions).forEach(k => { reactions[k] = (reactions[k] || []).filter(id => id !== userData.uid); if (!reactions[k].length) delete reactions[k]; });
            if (!had) reactions[emoji] = [...(reactions[emoji] || []), userData.uid];
            return { ...c, reactions };
        });
        await updateDoc(doc(db, 'posts', commentingPost.id), { comments: updatedComments }).catch(console.error);
    };

    const handleChangePassword = async (pw: string) => { if (user) await updatePassword(user, pw); };

    const handleDeleteAccount = async () => {
        if (!user || !userData) return;
        setDeleting(true);
        try {
            const snap = await getDocs(query(collection(db, 'posts'), where('authorUid', '==', userData.uid)));
            const batch = writeBatch(db);
            snap.docs.forEach(d => batch.delete(doc(db, 'posts', d.id)));
            await batch.commit();
            await deleteDoc(doc(db, 'users', userData.uid));
            await deleteUser(user);
            window.location.href = '/signup';
        } catch (error: unknown) {
            const err = error as { code?: string };
            if (err.code === 'auth/requires-recent-login') alert('Please log out and log back in before deleting your account.');
            else alert('Failed to delete account. Please try again.');
            setDeleting(false);
        }
    };

    const handleLogout = async () => { try { await signOut(); window.location.href = '/login'; } catch (err) { console.error(err); } };

    // ── Guards ───────────────────────────────────────────────────────────────
    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="relative w-14 h-14">
                    <div className="absolute inset-0 rounded-full border-4 border-brand-burgundy/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-brand-burgundy border-t-transparent animate-spin" />
                </div>
            </div>
        );
    }
    if (!userData) return <SignedOutView user={user} signOut={signOut} />;

    const coverPic     = instituteCoverPhoto || ((userData as any).coverPic as string | undefined | null);
    const coverPalette = (userData as any).coverPalette as string | undefined | null;
    const hasCover     = !!(coverPic || coverPalette);
    
    // Disable cover actions if forced to institute cover
    const isInstituteCover = !!instituteCoverPhoto;

    const tabs = [
        { id: 'posts'       as const, label: 'Posts',       Icon: FileText,      count: posts.length },
        { id: 'connections' as const, label: 'Connections',  Icon: Users,         count: userData.connections?.length || 0 },
        { id: 'groups'      as const, label: 'Groups',       Icon: GraduationCap, count: userData.groups?.length || 0 },
    ];

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-4xl mx-auto px-3 sm:px-6 md:px-8 pt-6 pb-16 w-full animate-fade-up">

            {/* ═══════════════════════════════════════════════════════════════
                COVER
            ═══════════════════════════════════════════════════════════════ */}
            <div className="relative h-48 sm:h-64 md:h-80 rounded-[2.5rem] shadow-2xl group border border-white/10 dark:border-white/5">

                {/* ── Background Wrapper (Clips contents but not popover) ── */}
                <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden">
                    {/* Background */}
                    {coverPic ? (
                        <img
                            src={coverPic}
                            alt="Cover"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.015]"
                        />
                    ) : coverPalette ? (
                        <div className="absolute inset-0" style={{ background: coverPalette }} />
                    ) : (
                        /* Default premium gradient */
                        <div className="absolute inset-0" style={{ background: COVER_PALETTES[4].css }}>
                            <div className="absolute -top-16 -right-16 w-80 h-80 bg-indigo-500/25 rounded-full blur-3xl" />
                            <div className="absolute top-10 left-1/3 w-56 h-56 bg-brand-gold/15 rounded-full blur-2xl" />
                            <div className="absolute -bottom-10 left-10 w-48 h-48 bg-violet-600/20 rounded-full blur-2xl" />
                            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle,white 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
                        </div>
                    )}

                    {/* Gradient scrims for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {/* Subtle top shimmer */}
                    <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                </div>

                {/* ── Controls bar (top) ── */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
                    {/* Settings */}
                    <Link
                        href="/settings"
                        className="flex items-center gap-2 px-4 py-2 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-xl border border-white/10 hover:border-white/20 text-[11px] font-black uppercase tracking-wider shadow-lg transition-all"
                    >
                        <Settings className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Settings</span>
                    </Link>

                    {/* Cover picker toggle */}
                    <div className="relative" ref={coverPickerRef}>
                        {!isInstituteCover && (
                            <button
                                onClick={() => setShowCoverPicker(p => !p)}
                                disabled={uploadingCover}
                                className={`flex items-center gap-2 px-4 py-2 backdrop-blur-md text-white rounded-xl border  text-[11px] font-black uppercase tracking-wider shadow-lg transition-all disabled:opacity-50 ${
                                    showCoverPicker 
                                    ? 'bg-black/60 border-white/30' 
                                    : 'bg-black/20 hover:bg-black/40 border-white/10 hover:border-white/20'
                                }`}
                            >
                                {uploadingCover
                                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                                    : <><Palette className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{hasCover ? 'Change Cover' : 'Add Cover'}</span><span className="sm:hidden">Cover</span></>
                                }
                            </button>
                        )}

                        {showCoverPicker && !isInstituteCover && (
                            <CoverPickerPanel
                                onPickPalette={handlePickPalette}
                                onUpload={handleCoverUpload}
                                onDelete={handleDeleteCover}
                                hasCover={hasCover}
                                uploading={uploadingCover}
                                onClose={() => setShowCoverPicker(false)}
                            />
                        )}
                    </div>
                </div>

                {/* ── Cover label (bottom left) ── */}
                {!hasCover && !isInstituteCover && (
                    <div className="absolute bottom-5 left-6 z-10 pointer-events-none">
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.25em] drop-shadow-md">Click "Cover" to personalise</p>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                IDENTITY CARD
            ═══════════════════════════════════════════════════════════════ */}
            <div className="relative z-10 mx-2 sm:mx-4 -mt-16 sm:-mt-24">
                <div className="bg-white/80 dark:bg-[#0c0a1e]/80 backdrop-blur-2xl ring-1 ring-brand-ebony/5 dark:ring-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] rounded-[2.5rem] px-6 sm:px-10 pt-6 sm:pt-10 pb-8 transition-all">

                    {/* ── Avatar + Identity row ── */}
                    <div className="flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-7">

                        {/* Avatar */}
                        <div className="relative shrink-0 self-start sm:self-auto -mt-12 sm:-mt-24">
                            {/* Glow ring */}
                            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-brand-burgundy/50 to-indigo-500/50 blur-md opacity-70" />
                            {/* White border frame */}
                            <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full border-[5px] border-white dark:border-[#0c0a1e] shadow-2xl overflow-hidden bg-brand-cream">
                                <Image
                                    src={userData.profilePic || `https://placehold.co/160x160/4f46e5/ffffff?text=${userData.name.substring(0, 1)}`}
                                    alt={userData.name}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            </div>
                            {/* Online indicator */}
                            <span className="absolute bottom-1.5 right-1.5 w-4 h-4 bg-emerald-400 border-[3px] border-white dark:border-[#0c0a1e] rounded-full shadow-sm" />
                        </div>

                        {/* Name + meta */}
                        <div className="flex-1 min-w-0 sm:pb-2 space-y-2.5">
                            {/* Name line */}
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h1 className="text-3xl sm:text-[2.4rem] font-serif font-extrabold text-brand-ebony leading-tight tracking-tight">
                                    {userData.name}
                                </h1>
                                <BadgeCheck className="w-6 h-6 text-brand-burgundy shrink-0" />
                            </div>

                            {/* Batch + institute */}
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-gold/10 border border-brand-gold/20 rounded-xl text-[11px] font-black text-amber-700 dark:text-brand-gold uppercase tracking-widest">
                                    <GraduationCap className="w-3.5 h-3.5" />
                                    Batch of {userData.batch}
                                </span>
                                {userData.instituteName && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-ebony/5 border border-brand-ebony/8 rounded-xl text-[11px] font-black text-brand-ebony/50 uppercase tracking-widest">
                                        <Globe className="w-3 h-3" />
                                        {userData.instituteName}
                                    </span>
                                )}
                            </div>

                            {/* Profession + location pills */}
                            <div className="flex flex-wrap gap-2">
                                {userData.profession && (
                                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-burgundy/8 border border-brand-burgundy/15 rounded-xl text-xs font-bold text-brand-ebony/75">
                                        <Briefcase className="w-3.5 h-3.5 text-brand-burgundy" />
                                        {userData.profession}
                                    </span>
                                )}
                                {userData.location && (
                                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-ebony/5 border border-brand-ebony/8 rounded-xl text-xs font-bold text-brand-ebony/60">
                                        <MapPin className="w-3.5 h-3.5 text-brand-burgundy" />
                                        {userData.location}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Edit Profile CTA */}
                        <div className="flex sm:flex-col gap-2 shrink-0 sm:pb-2">
                            <button
                                onClick={() => setShowEditProfile(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-brand-burgundy text-white rounded-2xl hover:brightness-110 active:scale-95 transition-all text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-burgundy/25"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Edit Profile</span>
                            </button>
                        </div>
                    </div>

                    {/* ── Decorative divider ── */}
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-brand-ebony/10 to-transparent my-6" />

                    {/* ── Stats row ── */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        {tabs.map(({ id, Icon, label, count }) => (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id)}
                                className={`group/stat relative flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl transition-all duration-300 overflow-hidden ${
                                    activeTab === id
                                        ? 'bg-gradient-to-b from-brand-burgundy/12 to-transparent border border-brand-burgundy/18 shadow-sm'
                                        : 'hover:bg-brand-ebony/4 border border-transparent'
                                }`}
                            >
                                {activeTab === id && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-[2px] bg-brand-burgundy rounded-full" />
                                )}
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                    activeTab === id ? 'bg-brand-burgundy/15' : 'bg-brand-ebony/5 group-hover/stat:bg-brand-ebony/8'
                                }`}>
                                    <Icon className={`w-4 h-4 transition-colors ${activeTab === id ? 'text-brand-burgundy' : 'text-brand-ebony/35'}`} />
                                </div>
                                <p className={`text-2xl sm:text-3xl font-serif font-bold leading-none transition-colors ${activeTab === id ? 'text-brand-burgundy' : 'text-brand-ebony'}`}>
                                    {count}
                                </p>
                                <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${activeTab === id ? 'text-brand-burgundy/70' : 'text-brand-ebony/35'}`}>
                                    {label}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                TAB NAV
            ═══════════════════════════════════════════════════════════════ */}
            <div className="flex gap-1.5 mt-4 mx-1 sm:mx-0 bg-white/60 dark:bg-brand-parchment/10 backdrop-blur-sm rounded-2xl p-1.5 border border-brand-ebony/6 shadow-sm">
                {tabs.map(({ id, Icon, label }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${
                            activeTab === id
                                ? 'bg-brand-burgundy text-white shadow-lg shadow-brand-burgundy/25'
                                : 'text-brand-ebony/40 hover:text-brand-ebony/70 hover:bg-brand-ebony/5'
                        }`}
                    >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{label}</span>
                    </button>
                ))}
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                TAB CONTENT
            ═══════════════════════════════════════════════════════════════ */}
            <div className="mt-4 mx-1 sm:mx-0 space-y-4">

                {/* Posts */}
                {activeTab === 'posts' && (
                    posts.length > 0 ? posts.map(post => (
                        <PostCard
                            key={post.id}
                            post={post}
                            currentUser={userData}
                            onLike={(isLiked) => handleLikePost(post.id, isLiked)}
                            onComment={() => setCommentingPost(post)}
                            onShare={() => setSharingPost(post)}
                        />
                    )) : (
                        <EmptyState Icon={FileText} title="No posts yet" subtitle="Share your first post to showcase your journey." />
                    )
                )}

                {/* Connections */}
                {activeTab === 'connections' && (
                    loadingConnections ? <SkeletonGrid /> :
                    connections.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {connections.map(c => (
                                <ConnectionCard key={c.uid} connection={c} />
                            ))}
                        </div>
                    ) : (
                        <EmptyState Icon={Users} title="No connections yet" subtitle="Grow your network by connecting with fellow alumni!" />
                    )
                )}

                {/* Groups */}
                {activeTab === 'groups' && (
                    loadingGroups ? <SkeletonGrid count={2} /> :
                    userGroups.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {userGroups.map(g => (
                                <Link key={g.id} href={`/messages/group/${g.id}`} className="card-premium p-5 flex items-center gap-4 group hover:shadow-[0_4px_20px_rgba(79,70,229,0.1)] transition-all">
                                    <div className="w-12 h-12 rounded-2xl bg-brand-burgundy/10 border border-brand-burgundy/20 flex items-center justify-center text-brand-burgundy font-extrabold text-xl group-hover:bg-gradient-indigo group-hover:text-white transition-all shadow-sm shrink-0">
                                        {g.groupName[0].toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-serif font-bold text-brand-ebony truncate group-hover:text-brand-burgundy transition-colors">{g.groupName}</p>
                                        <p className="flex items-center gap-1 text-[10px] font-black text-brand-ebony/40 uppercase tracking-widest mt-0.5">
                                            <Users className="w-3 h-3" /> {g.members?.length || 0} members
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <EmptyState Icon={GraduationCap} title="No groups joined" subtitle="Discover and join communities that represent your interests!" />
                    )
                )}
            </div>

            {/* Loading overlay */}
            {(updating || deleting) && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[110]">
                    <div className="card-premium p-8 text-center shadow-2xl animate-fade-up max-w-xs w-full">
                        <Loader2 className="w-10 h-10 animate-spin text-brand-burgundy mx-auto mb-4" />
                        <p className="text-brand-ebony font-black text-xs tracking-widest uppercase">{deleting ? 'Deleting Account…' : 'Updating Profile…'}</p>
                    </div>
                </div>
            )}

            {/* ── Modals ── */}
            <EditProfileModal isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} onSubmit={handleUpdateProfile} currentUser={userData} />
            <AccountSettingsModal isOpen={showAccountSettings} onClose={() => setShowAccountSettings(false)} userEmail={userData.email || ''} userId={userData.uid} onAccountDeleted={() => signOut()} />
            <ConfirmDialog isOpen={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} onConfirm={handleLogout} title="Log Out" message="Are you sure you want to log out?" confirmText="Log Out" variant="warning" />
            <ConfirmDialog isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={handleDeleteAccount} title="Delete Account" message="Are you absolutely sure? This permanently removes your profile, posts, and all data." confirmText="Delete Everything" variant="danger" />
            <ChangePasswordModal isOpen={showChangePassword} onClose={() => setShowChangePassword(false)} onSubmit={handleChangePassword} />
            {sharingPost && <SharePostModal isOpen={!!sharingPost} onClose={() => setSharingPost(null)} post={sharingPost} currentUser={userData} />}
            {commentingPost && (
                <CommentModal
                    isOpen={true}
                    onClose={() => setCommentingPost(null)}
                    onSubmit={handleAddComment}
                    onDelete={handleDeleteComment}
                    onReact={handleReactComment}
                    comments={posts.find(p => p.id === commentingPost.id)?.comments || []}
                    currentUserUid={userData.uid}
                    currentUserName={userData.name}
                    postAuthor={commentingPost.authorName}
                />
            )}

            <p className="mt-10 text-center text-brand-ebony/20 text-[10px] font-black uppercase tracking-[0.3em]">Alumnest · For the Tribe</p>
        </div>
    );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ConnectionCard({ connection }: { connection: User }) {
    return (
        <div className="card-premium p-4 flex items-center gap-4 hover:shadow-[0_4px_20px_rgba(79,70,229,0.1)] transition-all group">
            <Link href={`/profile/${connection.uid}`} className="shrink-0">
                <img
                    src={connection.profilePic || `https://placehold.co/80x80/4f46e5/ffffff?text=${connection.name[0]}`}
                    alt={connection.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm group-hover:scale-105 transition-transform"
                />
            </Link>
            <div className="flex-1 min-w-0">
                <Link href={`/profile/${connection.uid}`}>
                    <p className="font-serif font-bold text-brand-ebony truncate group-hover:text-brand-burgundy transition-colors">{connection.name}</p>
                </Link>
                <p className="text-[10px] font-black text-brand-ebony/40 uppercase tracking-widest">Class of {connection.batch}</p>
                <p className="text-xs text-brand-ebony/55 font-medium mt-0.5 truncate">{connection.profession || 'Alumni'}</p>
            </div>
            <Link
                href={`/messages?userId=${connection.uid}&name=${encodeURIComponent(connection.name)}&pic=${encodeURIComponent(connection.profilePic || '')}`}
                className="p-2.5 rounded-xl bg-brand-ebony/5 border border-brand-ebony/8 text-brand-ebony/40 hover:bg-gradient-indigo hover:text-white hover:border-transparent transition-all shadow-sm"
            >
                <MessageCircle className="w-4 h-4" />
            </Link>
        </div>
    );
}

function EmptyState({ Icon, title, subtitle }: { Icon: React.ElementType; title: string; subtitle: string }) {
    return (
        <div className="card-premium p-14 text-center border-dashed border-2 border-brand-ebony/8">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-burgundy/10 to-indigo-500/10 rounded-[1.25rem] flex items-center justify-center mx-auto mb-5 shadow-inner">
                <Icon className="w-8 h-8 text-brand-burgundy/40" />
            </div>
            <p className="text-lg font-serif italic text-brand-ebony/50 mb-1">{title}</p>
            <p className="text-xs text-brand-ebony/35 font-medium max-w-[220px] mx-auto leading-relaxed">{subtitle}</p>
        </div>
    );
}

function SkeletonGrid({ count = 3 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="card-premium h-24 animate-pulse border border-brand-ebony/5" />
            ))}
        </div>
    );
}
