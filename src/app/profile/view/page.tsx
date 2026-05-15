'use client';

import { Suspense, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    collection, query, where, orderBy, onSnapshot, doc, getDocs,
    getDoc, updateDoc, deleteDoc, arrayRemove, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post, Comment as AppComment, User, Group } from '@/types';
import { PostCard } from '@/components/feed/PostCard';
import { CommentModal } from '@/components/modals/CommentModal';
import { SharePostModal } from '@/components/modals/SharePostModal';
import { MapPin, Briefcase, MessageCircle, Users, Trash2, UserX, UserCheck, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

function PublicProfileClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const profileId = searchParams.get('id');
    const { userData, loading: authLoading } = useAuth();
    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [sharingPost, setSharingPost] = useState<Post | null>(null);
    const [commentingPost, setCommentingPost] = useState<Post | null>(null);
    const [activeTab, setActiveTab] = useState<'posts' | 'connections' | 'groups'>('posts');
    const [connections, setConnections] = useState<User[]>([]);
    const [loadingConnections, setLoadingConnections] = useState(false);
    const [userGroups, setUserGroups] = useState<Group[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [instituteCoverPhoto, setInstituteCoverPhoto] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && userData?.uid === profileId) { router.replace('/profile'); }
    }, [userData, profileId, authLoading, router]);

    useEffect(() => {
        if (!profileId) return;
        const fetchProfileUser = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'users', profileId));
                if (docSnap.exists()) {
                    const data = { uid: docSnap.id, ...docSnap.data() } as User;
                    setProfileUser(data);
                    if (data.instituteId) {
                        try {
                            const instDoc = await getDoc(doc(db, 'institutes', data.instituteId));
                            if (instDoc.exists()) setInstituteCoverPhoto(instDoc.data().coverPhotoUrl || null);
                        } catch {}
                    }
                } else { setProfileUser(null); }
            } catch (err) { console.error('Error fetching profile:', err); }
            finally { setLoading(false); }
        };
        fetchProfileUser();
    }, [profileId]);

    useEffect(() => {
        if (!profileUser || !userData?.instituteId) return;
        const q = query(collection(db, 'posts'), where('authorUid', '==', profileUser.uid), where('instituteId', '==', profileUser.instituteId), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, snap => setPosts(snap.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })) as Post[]), err => console.error(err));
        return () => unsub();
    }, [profileUser, userData?.instituteId]);

    useEffect(() => {
        if (!profileUser || activeTab !== 'connections') return;
        const fetchConnections = async () => {
            setLoadingConnections(true);
            try {
                const ids = profileUser.connections || [];
                if (!ids.length) { setConnections([]); return; }
                const snap = await getDocs(query(collection(db, 'users'), where('uid', 'in', ids)));
                setConnections(snap.docs.map(d => d.data() as User));
            } catch {} finally { setLoadingConnections(false); }
        };
        fetchConnections();
    }, [profileUser, activeTab]);

    useEffect(() => {
        if (!profileUser || activeTab !== 'groups') return;
        const fetchGroups = async () => {
            setLoadingGroups(true);
            try {
                const ids = profileUser.groups || [];
                if (!ids.length) { setUserGroups([]); return; }
                const results = await Promise.all(ids.map(async id => {
                    const d = await getDoc(doc(db, 'groups', id));
                    return d.exists() ? { id: d.id, ...d.data() } as Group : null;
                }));
                setUserGroups(results.filter(Boolean) as Group[]);
            } catch {} finally { setLoadingGroups(false); }
        };
        fetchGroups();
    }, [profileUser, activeTab]);

    const handleLikePost = async (postId: string, isLiked: boolean) => {
        if (!userData) return;
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        const likes = isLiked ? (post.likes || []).filter(uid => uid !== userData.uid) : [...(post.likes || []), userData.uid];
        await updateDoc(doc(db, 'posts', postId), { likes });
        if (!isLiked && post.authorUid !== userData.uid) {
            await addDoc(collection(db, 'notifications'), {
                userId: post.authorUid, type: 'like', sourceUserUid: userData.uid,
                sourceUserName: userData.name, sourceUserProfilePic: userData.profilePic || '',
                message: 'liked your post.', link: `/posts/view?id=${postId}&action=view`,
                createdAt: serverTimestamp(), isRead: false, instituteId: userData.instituteId
            });
        }
    };

    const handleAddComment = async (text: string) => {
        if (!userData || !commentingPost) return;
        const post = posts.find(p => p.id === commentingPost.id);
        if (!post) return;
        await updateDoc(doc(db, 'posts', commentingPost.id), { comments: [...(post.comments || []), { authorUid: userData.uid, authorName: userData.name, text, createdAt: new Date() }] });
        if (post.authorUid !== userData.uid) {
            await addDoc(collection(db, 'notifications'), {
                userId: post.authorUid, type: 'comment', sourceUserUid: userData.uid,
                sourceUserName: userData.name, sourceUserProfilePic: userData.profilePic || '',
                message: `${userData.name} commented on your post: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`,
                link: `/posts/view?id=${post.id}&action=comment`,
                createdAt: serverTimestamp(), isRead: false, instituteId: userData.instituteId
            });
        }
    };

    const handleDeleteComment = async (comment: any) => {
        if (!userData || !commentingPost) return;
        await updateDoc(doc(db, 'posts', commentingPost.id), { comments: arrayRemove(comment) });
    };

    const handleAdminDeleteUser = async () => {
        if (!profileUser || !confirm(`PERMANENTLY DELETE "${profileUser.name}"'s account?\n\nThis cannot be undone.`)) return;
        try { await deleteDoc(doc(db, 'users', profileUser.uid)); router.replace('/'); }
        catch (err) { console.error(err); }
    };

    const handleAdminSuspendUser = async () => {
        if (!profileUser) return;
        const isSuspended = profileUser.isSuspended;
        if (!confirm(isSuspended ? 'Restore this user\'s account?' : 'Suspend this user? They will be signed out immediately.')) return;
        try {
            await updateDoc(doc(db, 'users', profileUser.uid), { isSuspended: !isSuspended });
            setProfileUser(prev => prev ? { ...prev, isSuspended: !isSuspended } : prev);
        } catch (err) { console.error(err); }
    };

    if (authLoading || loading || userData?.uid === profileId) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-burgundy mx-auto" />
        </div>
    );

    if (!userData) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <p className="text-brand-ebony/60 mb-4">Please log in to view profiles</p>
                <Link href="/login" className="text-brand-burgundy hover:text-brand-burgundy/80 font-medium">Go to Login</Link>
            </div>
        </div>
    );

    if (!profileUser) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <p className="text-brand-ebony/60 mb-4">User not found</p>
                <Link href="/" className="text-brand-burgundy hover:text-brand-burgundy/80 font-medium">Return Home</Link>
            </div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto px-4 pt-8 pb-0">
            {instituteCoverPhoto ? (
                <div className="h-48 rounded-t-xl opacity-90 border-b-4 border-brand-gold/60 bg-cover bg-center" style={{ backgroundImage: `url(${instituteCoverPhoto})` }} />
            ) : (
                <div className="bg-gradient-to-r from-brand-burgundy to-[#4a1c20] h-48 rounded-t-xl opacity-90 border-b-4 border-brand-gold/60" />
            )}

            <div className="bg-brand-parchment/90 rounded-b-xl shadow-md p-6 -mt-20 relative border border-brand-ebony/10">
                <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
                    <div className="relative">
                        <Image
                            src={profileUser.profilePic || `https://placehold.co/150x150/EFEFEFF/003366?text=${profileUser.name.substring(0, 1)}`}
                            alt={profileUser.name} width={128} height={128}
                            className="w-32 h-32 rounded-full border-4 border-brand-cream shadow-lg object-cover bg-white" unoptimized
                        />
                    </div>
                    <div className="flex-1 text-center md:text-left pt-2">
                        <h1 className="text-4xl font-serif font-bold text-brand-ebony">{profileUser.name}</h1>
                        <p className="text-lg text-brand-ebony/70 mt-1 italic font-serif">Class of {profileUser.batch}</p>
                        <div className="flex flex-col md:flex-row gap-4 mt-3 text-brand-ebony/80 font-medium text-sm tracking-wide">
                            {profileUser.profession && <div className="flex items-center justify-center md:justify-start gap-2"><Briefcase className="w-4 h-4 text-brand-burgundy/80" /><span>{profileUser.profession}</span></div>}
                            {profileUser.location && <div className="flex items-center justify-center md:justify-start gap-2"><MapPin className="w-4 h-4 text-brand-burgundy/80" /><span>{profileUser.location}</span></div>}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {userData?.connections?.includes(profileUser.uid) && (
                            <Link href={`/messages?userId=${profileUser.uid}&name=${encodeURIComponent(profileUser.name)}&pic=${encodeURIComponent(profileUser.profilePic || '')}`}
                                className="flex items-center gap-2 px-5 py-2.5 bg-brand-burgundy text-white rounded-lg hover:bg-[#5a2427] transition font-semibold tracking-wide shadow-sm text-sm">
                                <MessageCircle className="w-4 h-4" /> Message
                            </Link>
                        )}
                        {userData?.isinsadmin && !userData?.isAdmin && userData.instituteId === profileUser.instituteId && (
                            <button onClick={handleAdminSuspendUser} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition ${profileUser.isSuspended ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border border-emerald-500/30' : 'bg-orange-500/10 text-orange-700 hover:bg-orange-500/20 border border-orange-500/30'}`}>
                                {profileUser.isSuspended ? <><UserCheck className="w-4 h-4" /> Restore</> : <><UserX className="w-4 h-4" /> Suspend</>}
                            </button>
                        )}
                        {userData?.isAdmin && (
                            <>
                                <button onClick={handleAdminSuspendUser} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition ${profileUser.isSuspended ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border border-emerald-500/30' : 'bg-orange-500/10 text-orange-700 hover:bg-orange-500/20 border border-orange-500/30'}`}>
                                    {profileUser.isSuspended ? <><UserCheck className="w-4 h-4" /> Restore</> : <><UserX className="w-4 h-4" /> Suspend</>}
                                </button>
                                <button onClick={handleAdminDeleteUser} className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-700 hover:bg-red-500/20 border border-red-500/30 rounded-lg font-semibold text-sm transition">
                                    <Trash2 className="w-4 h-4" /> Delete Profile
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-brand-ebony/10">
                    {[{label:'Posts',value:posts.length,tab:'posts'},{label:'Connections',value:profileUser.connections?.length||0,tab:'connections'},{label:'Groups',value:profileUser.groups?.length||0,tab:'groups'}].map((s,i) => (
                        <button key={s.tab} onClick={() => setActiveTab(s.tab as any)} className={`text-center p-2 rounded-xl transition ${i>0?'border-l border-brand-ebony/10':''} ${activeTab===s.tab?'bg-brand-burgundy/5 ring-1 ring-brand-burgundy/20':'hover:bg-brand-ebony/5'}`}>
                            <p className="text-2xl font-bold text-brand-ebony font-serif">{s.value}</p>
                            <p className="text-xs text-brand-ebony/60 uppercase tracking-widest font-bold mt-1">{s.label}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-8">
                <div className="flex border-b border-brand-ebony/10 mb-6">
                    {['posts','connections','groups'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab as any)} className={`pb-3 px-6 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab===tab?'text-brand-burgundy':'text-brand-ebony/40 hover:text-brand-ebony/60'}`}>
                            {tab.charAt(0).toUpperCase()+tab.slice(1)}
                            {activeTab===tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-burgundy rounded-t-full" />}
                        </button>
                    ))}
                </div>

                {activeTab === 'posts' && (
                    <div className="space-y-4">
                        {posts.length > 0 ? posts.map(post => (
                            <PostCard key={post.id} post={post} currentUser={userData}
                                onLike={(isLiked) => handleLikePost(post.id, isLiked)}
                                onComment={() => setCommentingPost(post)}
                                onShare={() => setSharingPost(post)} />
                        )) : (
                            <div className="bg-brand-parchment/80 border border-brand-ebony/10 rounded-xl shadow-sm p-12 text-center">
                                <p className="text-brand-ebony/70 text-lg mb-2 font-serif italic">No activity yet</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'connections' && (
                    <div className="space-y-4">
                        {loadingConnections ? (
                            <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="bg-brand-parchment/40 h-24 rounded-xl border border-brand-ebony/5 animate-pulse" />)}</div>
                        ) : connections.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {connections.map(c => (
                                    <div key={c.uid} className="bg-brand-parchment/60 border border-brand-ebony/10 rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition group">
                                        <Link href={`/profile/view?id=${c.uid}`} className="block">
                                            <img src={c.profilePic || `https://placehold.co/100x100/EFEFEFF/5a2427?text=${c.name.substring(0,1)}`} alt={c.name} className="w-14 h-14 rounded-full border-2 border-white shadow-sm hover:opacity-80 transition" />
                                        </Link>
                                        <div className="flex-1 min-w-0">
                                            <Link href={`/profile/view?id=${c.uid}`}><h3 className="font-serif font-bold text-brand-ebony truncate group-hover:text-brand-burgundy transition-colors">{c.name}</h3></Link>
                                            <p className="text-xs text-brand-ebony/60 truncate uppercase tracking-widest font-bold">Class of {c.batch}</p>
                                            <p className="text-sm text-brand-ebony/70 truncate mt-1">{c.profession || 'Alumni'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-brand-parchment/80 border border-brand-ebony/10 rounded-xl shadow-sm p-12 text-center"><p className="text-brand-ebony/70 text-lg mb-2 font-serif italic">No connections yet</p></div>
                        )}
                    </div>
                )}

                {activeTab === 'groups' && (
                    <div className="space-y-4">
                        {loadingGroups ? (
                            <div className="space-y-4">{[1,2].map(i => <div key={i} className="bg-brand-parchment/40 h-24 rounded-xl border border-brand-ebony/5 animate-pulse" />)}</div>
                        ) : userGroups.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {userGroups.map(g => (
                                    <div key={g.id} className="bg-brand-parchment/60 border border-brand-ebony/10 rounded-xl p-5 flex items-center justify-between hover:shadow-md transition group">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-12 h-12 rounded-lg bg-brand-burgundy/10 flex items-center justify-center flex-shrink-0 text-brand-burgundy font-bold text-xl border border-brand-burgundy/20 group-hover:bg-brand-burgundy group-hover:text-white transition-colors">
                                                {g.groupName.substring(0,1).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-serif font-bold text-brand-ebony truncate text-lg group-hover:text-brand-burgundy transition-colors">{g.groupName}</h3>
                                                <div className="flex items-center gap-1 mt-0.5 text-brand-ebony/50 text-xs font-bold uppercase tracking-wider">
                                                    <Users className="w-3.5 h-3.5" /> {g.members?.length || 0} Members
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-brand-parchment/80 border border-brand-ebony/10 rounded-xl shadow-sm p-12 text-center"><p className="text-brand-ebony/70 text-lg mb-2 font-serif italic">No groups joined yet</p></div>
                        )}
                    </div>
                )}
            </div>

            {sharingPost && <SharePostModal isOpen={!!sharingPost} onClose={() => setSharingPost(null)} post={sharingPost} currentUser={userData!} />}
            {commentingPost && (
                <CommentModal isOpen onClose={() => setCommentingPost(null)} onSubmit={handleAddComment}
                    onDelete={handleDeleteComment} comments={posts.find(p => p.id === commentingPost.id)?.comments || []}
                    currentUserUid={userData?.uid} currentUserName={userData?.name} postAuthor={commentingPost.authorName} />
            )}
        </div>
    );
}

export default function ProfileViewPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-12 h-12 animate-spin text-brand-burgundy" /></div>}>
            <PublicProfileClient />
        </Suspense>
    );
}
