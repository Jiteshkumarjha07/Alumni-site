'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updatePassword, deleteUser } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, getDocs, getDoc, deleteDoc, writeBatch, arrayRemove } from 'firebase/firestore';
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
import { Pencil, LogOut, MapPin, Briefcase, Settings, MoreVertical, ShieldAlert, Lock, Trash2, Loader2, MessageCircle, Heart, Users, Settings2, Shield } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { AccountSettingsModal } from '@/components/modals/AccountSettingsModal';

export default function ProfilePage() {
    const { user, userData, signOut, loading: authLoading } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [sharingPost, setSharingPost] = useState<Post | null>(null);
    const [commentingPost, setCommentingPost] = useState<Post | null>(null);
    const [activeTab, setActiveTab] = useState<'posts' | 'connections' | 'groups'>('posts');
    const [connections, setConnections] = useState<User[]>([]);
    const [loadingConnections, setLoadingConnections] = useState(false);
    const [userGroups, setUserGroups] = useState<Group[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [showAccountSettings, setShowAccountSettings] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    useEffect(() => {
        if (!userData) {
            setLoading(false);
            return;
        }

        const postsQuery = query(
            collection(db, 'posts'),
            where('authorUid', '==', userData.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
            const fetchedPosts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Post[];
            setPosts(fetchedPosts);
            setLoading(false);
        }, (err) => {
            console.error('Error fetching profile posts:', err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userData]);

    useEffect(() => {
        if (!userData || activeTab !== 'connections') return;

        const fetchConnections = async () => {
            setLoadingConnections(true);
            try {
                const connectionIds = userData.connections || [];
                if (connectionIds.length === 0) {
                    setConnections([]);
                    setLoadingConnections(false);
                    return;
                }

                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('uid', 'in', connectionIds));
                const snapshot = await getDocs(q);
                
                const fetchedConnections = snapshot.docs.map(doc => doc.data() as User);
                setConnections(fetchedConnections);
            } catch (err) {
                console.error('Error fetching connections:', err);
            } finally {
                setLoadingConnections(false);
            }
        };

        fetchConnections();
    }, [userData, activeTab]);

    useEffect(() => {
        if (!userData || activeTab !== 'groups') return;

        const fetchGroups = async () => {
            setLoadingGroups(true);
            try {
                const groupIds = userData.groups || [];
                if (groupIds.length === 0) {
                    setUserGroups([]);
                    setLoadingGroups(false);
                    return;
                }

                const groupPromises = groupIds.map(async (groupId) => {
                    const groupDoc = await getDoc(doc(db, 'groups', groupId));
                    if (groupDoc.exists()) {
                        return { id: groupDoc.id, ...groupDoc.data() } as Group;
                    }
                    return null;
                });
                
                const fetchedGroups = (await Promise.all(groupPromises)).filter((g): g is Group => g !== null);
                setUserGroups(fetchedGroups);
            } catch (err) {
                console.error('Error fetching groups:', err);
            } finally {
                setLoadingGroups(false);
            }
        };

        fetchGroups();
    }, [userData, activeTab]);

    const handleUpdateProfile = async (formData: ProfileFormData, profilePicFile?: File | null, isRemovingPic?: boolean) => {
        if (!userData) return;

        setUpdating(true);
        try {
            const userRef = doc(db, 'users', userData.uid);
            const updates: Record<string, unknown> = {
                name: formData.name,
                profession: formData.profession,
                location: formData.location,
            };

            if (isRemovingPic) {
                updates.profilePic = `https://placehold.co/100x100/4f46e5/ffffff?text=${formData.name.substring(0, 2).toUpperCase()}`;
            } else if (profilePicFile) {
                const uploadedUrl = await uploadMedia(profilePicFile);
                if (uploadedUrl) {
                    updates.profilePic = uploadedUrl;
                }
            }

            await updateDoc(userRef, updates);

            const postsQuery = query(collection(db, 'posts'), where('authorUid', '==', userData.uid));
            const postsSnapshot = await getDocs(postsQuery);

            const updatePromises = postsSnapshot.docs.map(postDoc => {
                const postRef = doc(db, 'posts', postDoc.id);
                return updateDoc(postRef, {
                    authorName: updates.name as string,
                    ...(updates.profilePic ? { authorProfilePic: updates.profilePic as string } : {})
                });
            });

            await Promise.all(updatePromises);
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile. Please try again.');
        } finally {
            setUpdating(false);
        }
    };

    const handleLikePost = async (postId: string, isLiked: boolean) => {
        if (!userData) return;

        const postRef = doc(db, 'posts', postId);
        const post = posts.find((p: Post) => p.id === postId);
        if (!post) return;

        const likes = post.likes || [];
        const updatedLikes = isLiked
            ? likes.filter((uid: string) => uid !== userData.uid)
            : [...likes, userData.uid];

        await updateDoc(postRef, { likes: updatedLikes });
    };

    const handleAddComment = async (text: string) => {
        if (!userData || !commentingPost) return;

        const postRef = doc(db, 'posts', commentingPost.id);
        const post = posts.find((p: Post) => p.id === commentingPost.id);
        if (!post) return;

        const newComment = {
            authorUid: userData.uid,
            authorName: userData.name,
            text,
            createdAt: new Date(),
            id: Math.random().toString(36).substring(2, 9),
            reactions: {}
        };

        const updatedComments = [...(post.comments || []), newComment];
        await updateDoc(postRef, { comments: updatedComments });
    };

    const handleDeleteComment = async (comment: AppComment) => {
        if (!userData || !commentingPost) return;

        const postRef = doc(db, 'posts', commentingPost.id);
        await updateDoc(postRef, {
            comments: arrayRemove(comment)
        });
    };

    const handleReactComment = async (comment: AppComment, emoji: string) => {
        if (!userData || !commentingPost) return;

        const post = posts.find((p) => p.id === commentingPost.id);
        if (!post) return;

        const updatedComments = (post.comments || []).map(c => {
          const isMatch = c.id ? c.id === comment.id : (c.text === comment.text && c.authorUid === comment.authorUid);
          if (isMatch) {
            const reactions = { ...(c.reactions || {}) };
            const hasReactedWithThis = reactions[emoji]?.includes(userData.uid);
            
            Object.keys(reactions).forEach(key => {
              reactions[key] = (reactions[key] || []).filter(id => id !== userData.uid);
              if (reactions[key].length === 0) delete reactions[key];
            });

            if (!hasReactedWithThis) {
              reactions[emoji] = [...(reactions[emoji] || []), userData.uid];
            }
            return { ...c, reactions };
          }
          return c;
        });

        const postRef = doc(db, 'posts', commentingPost.id);
        updateDoc(postRef, { comments: updatedComments }).catch(console.error);
    };


    const handleChangePassword = async (newPassword: string) => {
        if (!user) return;
        await updatePassword(user, newPassword);
    };

    const handleDeleteAccount = async () => {
        if (!user || !userData) return;

        setDeleting(true);
        try {
            const postsQuery = query(collection(db, 'posts'), where('authorUid', '==', userData.uid));
            const postsSnapshot = await getDocs(postsQuery);
            const batch = writeBatch(db);
            postsSnapshot.docs.forEach((postDoc) => {
                batch.delete(doc(db, 'posts', postDoc.id));
            });
            await batch.commit();

            await deleteDoc(doc(db, 'users', userData.uid));
            await deleteUser(user);

            window.location.href = '/signup';
        } catch (error: unknown) {
            console.error('Error deleting account:', error);
            const err = error as { code?: string };
            if (err.code === 'auth/requires-recent-login') {
                alert('For security reasons, please log out and log back in before deleting your account.');
            } else {
                alert('Failed to delete account. Please try again later.');
            }
            setDeleting(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut();
            window.location.href = '/login';
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="relative w-16 h-16 mx-auto mb-6">
                     <div className="absolute inset-0 rounded-full border-4 border-brand-burgundy/20"></div>
                     <div className="absolute inset-0 rounded-full border-4 border-brand-burgundy border-t-transparent animate-spin"></div>
                </div>
            </div>
        );
    }

    if (!userData) {
        return <SignedOutView user={user} signOut={signOut} />;
    }

    return (
        <div className="max-w-4xl mx-auto px-4 md:px-8 pt-8 pb-12 w-full animate-fade-up">
            {/* Cover Photo */}
            <div className="bg-gradient-indigo h-32 sm:h-48 md:h-56 rounded-t-3xl relative overflow-hidden">
                {/* Decorative graphics */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full mix-blend-overlay filter blur-[40px] -translate-y-1/2 translate-x-1/4"></div>
                <div className="absolute bottom-0 left-10 w-48 h-48 bg-brand-gold/30 rounded-full mix-blend-overlay filter blur-[40px] translate-y-1/2"></div>
                
                <button
                    onClick={() => setShowAccountSettings(true)}
                    className="absolute top-4 right-4 p-2.5 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-xl transition-all border border-white/20 shadow-md"
                    title="Account Settings"
                >
                    <Settings className="w-5 h-5" />
                </button>
            </div>

            {/* Profile Content */}
            <div className="card-premium rounded-t-none rounded-b-3xl shadow-sm p-4 sm:p-8 -mt-12 sm:-mt-20 md:-mt-24 relative z-10 mx-2 sm:mx-0">
                <div className="flex flex-col md:flex-row items-center md:items-end gap-6 border-b border-brand-ebony/10 pb-8">
                    {/* Avatar */}
                    <div className="relative group">
                        <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-[6px] border-white dark:border-[#0f172a] shadow-xl overflow-hidden bg-brand-cream relative z-10 transition-transform duration-300 group-hover:scale-105">
                            <Image
                                src={userData.profilePic || `https://placehold.co/150x150/4f46e5/ffffff?text=${userData.name.substring(0, 1)}`}
                                alt={userData.name}
                                fill
                                className="object-cover"
                                unoptimized
                            />
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center md:text-left pt-2">
                        <h1 className="text-3xl sm:text-4xl font-serif font-extrabold text-brand-ebony mb-1 tracking-tight">{userData.name}</h1>
                        
                        <div className="flex items-center justify-center md:justify-start gap-3 text-sm font-bold uppercase tracking-widest text-brand-ebony/50 mb-3">
                            <span>Batch of {userData.batch}</span>
                        </div>

                        <div className="flex flex-col md:flex-row gap-3 sm:gap-4 mt-3 text-brand-ebony/70 font-medium text-sm">
                            {userData.profession && (
                                <div className="flex items-center justify-center md:justify-start gap-2 bg-brand-burgundy/5 px-3 py-1.5 rounded-lg border border-brand-burgundy/10">
                                    <Briefcase className="w-4 h-4 text-brand-burgundy" />
                                    <span>{userData.profession}</span>
                                </div>
                            )}
                            {userData.location && (
                                <div className="flex items-center justify-center md:justify-start gap-2 bg-brand-burgundy/5 px-3 py-1.5 rounded-lg border border-brand-burgundy/10">
                                    <MapPin className="w-4 h-4 text-brand-burgundy" />
                                    <span>{userData.location}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Edit Btn */}
                    <button
                        onClick={() => setShowEditProfile(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-white/5 text-brand-ebony rounded-xl hover:bg-brand-parchment transition border border-brand-ebony/10 shadow-sm text-sm font-bold tracking-wide hover:border-brand-burgundy/30 uppercase"
                    >
                        <Pencil className="w-4 h-4" />
                        Edit Profile
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 px-2 sm:px-6 mt-6">
                    <button 
                        onClick={() => setActiveTab('posts')}
                        className={`text-center p-3 rounded-2xl transition-all ${activeTab === 'posts' ? 'bg-gradient-to-b from-brand-burgundy/10 to-transparent border-t border-brand-burgundy/20' : 'hover:bg-brand-ebony/5 object-bottom'}`}
                    >
                        <p className="text-2xl sm:text-3xl font-bold text-brand-ebony font-serif">{posts.length}</p>
                        <p className="text-[10px] sm:text-xs text-brand-ebony/50 uppercase tracking-[0.2em] font-bold mt-1">Posts</p>
                    </button>
                    <button 
                        onClick={() => setActiveTab('connections')}
                        className={`text-center p-3 rounded-2xl transition-all ${activeTab === 'connections' ? 'bg-gradient-to-b from-brand-burgundy/10 to-transparent border-t border-brand-burgundy/20' : 'hover:bg-brand-ebony/5 object-bottom'}`}
                    >
                        <p className="text-2xl sm:text-3xl font-bold text-brand-ebony font-serif">{userData.connections?.length || 0}</p>
                        <p className="text-[10px] sm:text-xs text-brand-ebony/50 uppercase tracking-[0.2em] font-bold mt-1">Network</p>
                    </button>
                    <button 
                        onClick={() => setActiveTab('groups')}
                        className={`text-center p-3 rounded-2xl transition-all ${activeTab === 'groups' ? 'bg-gradient-to-b from-brand-burgundy/10 to-transparent border-t border-brand-burgundy/20' : 'hover:bg-brand-ebony/5 object-bottom'}`}
                    >
                        <p className="text-2xl sm:text-3xl font-bold text-brand-ebony font-serif">{userData.groups?.length || 0}</p>
                        <p className="text-[10px] sm:text-xs text-brand-ebony/50 uppercase tracking-[0.2em] font-bold mt-1">Groups</p>
                    </button>
                </div>
            </div>

            {/* Tabs content block */}
            <div className="mt-6 mx-2 sm:mx-0">
                {activeTab === 'posts' ? (
                    <div className="space-y-4">
                        {posts.length > 0 ? (
                            posts.map(post => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    currentUser={userData}
                                    onLike={(isLiked) => handleLikePost(post.id, isLiked)}
                                    onComment={() => setCommentingPost(post)}
                                    onShare={() => setSharingPost(post)}
                                />
                            ))
                        ) : (
                            <div className="card-premium p-12 text-center border-dashed border-2 border-brand-ebony/10">
                                <div className="w-16 h-16 bg-brand-ebony/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-ebony/10">
                                    <Pencil className="w-8 h-8 text-brand-ebony/30" />
                                </div>
                                <p className="text-brand-ebony/70 text-lg mb-2 font-serif italic">No posts yet</p>
                                <p className="text-brand-ebony/50 text-sm">Share your first post to get started!</p>
                            </div>
                        )}
                    </div>
                ) : activeTab === 'connections' ? (
                    <div className="space-y-4">
                        {loadingConnections ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="card-premium h-24 animate-pulse border border-brand-ebony/5" />
                                ))}
                            </div>
                        ) : connections.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {connections.map(connection => (
                                    <div key={connection.uid} className="card-premium p-4 flex items-center gap-4 hover:shadow-[0_4px_16px_rgba(79,70,229,0.08)] transition group">
                                        <Link href={`/profile/${connection.uid}`} className="block">
                                            <img 
                                                src={connection.profilePic || `https://placehold.co/100x100/4f46e5/ffffff?text=${connection.name.substring(0, 1)}`}
                                                alt={connection.name}
                                                className="w-14 h-14 rounded-full border-2 border-white dark:border-[#0f172a] shadow-sm hover:scale-105 transition-transform"
                                            />
                                        </Link>
                                        <div className="flex-1 min-w-0">
                                            <Link href={`/profile/${connection.uid}`} className="block w-fit">
                                                <h3 className="font-semibold text-brand-ebony truncate group-hover:text-brand-burgundy transition-colors">{connection.name}</h3>
                                            </Link>
                                            <p className="text-[10px] text-brand-ebony/50 truncate uppercase tracking-widest font-bold">Class of {connection.batch}</p>
                                            <p className="text-xs text-brand-ebony/60 truncate mt-1 font-medium">{connection.profession || 'Alumni'}</p>
                                        </div>
                                        <Link 
                                            href={`/messages?userId=${connection.uid}&name=${encodeURIComponent(connection.name)}&pic=${encodeURIComponent(connection.profilePic || '')}`}
                                            className="p-2.5 text-brand-ebony/40 bg-brand-ebony/5 hover:bg-gradient-indigo hover:text-white hover:border-transparent border border-brand-ebony/10 rounded-xl transition-all shadow-sm"
                                        >
                                            <MessageCircle className="w-5 h-5" />
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="card-premium p-12 text-center border-dashed border-2 border-brand-ebony/10">
                                <div className="w-16 h-16 bg-brand-ebony/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-ebony/10">
                                    <Users className="w-8 h-8 text-brand-ebony/30" />
                                </div>
                                <p className="text-brand-ebony/70 text-lg mb-2 font-serif italic">No connections yet</p>
                                <p className="text-brand-ebony/50 text-sm">Grow your network by connecting with fellow alumni!</p>
                            </div>
                        )}
                    </div>
                ) : activeTab === 'groups' ? (
                    <div className="space-y-4">
                        {loadingGroups ? (
                            <div className="space-y-4">
                                {[1, 2].map(i => (
                                    <div key={i} className="card-premium h-24 animate-pulse border border-brand-ebony/5" />
                                ))}
                            </div>
                        ) : userGroups.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {userGroups.map(group => (
                                    <Link key={group.id} href={`/messages/group/${group.id}`} className="card-premium p-5 flex items-center justify-between group hover:shadow-[0_4px_16px_rgba(79,70,229,0.08)] transition">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-12 h-12 rounded-xl bg-brand-burgundy/10 flex items-center justify-center flex-shrink-0 text-brand-burgundy font-bold text-xl border border-brand-burgundy/20 group-hover:bg-gradient-indigo group-hover:text-white transition-all shadow-sm">
                                                {group.groupName.substring(0, 1).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-brand-ebony truncate group-hover:text-brand-burgundy transition-colors">{group.groupName}</h3>
                                                <div className="flex items-center gap-1.5 mt-1 text-brand-ebony/50 text-[10px] font-bold uppercase tracking-widest">
                                                    <Users className="w-3.5 h-3.5" />
                                                    {group.members?.length || 0} Members
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="card-premium p-12 text-center border-dashed border-2 border-brand-ebony/10">
                                <div className="w-16 h-16 bg-brand-ebony/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-ebony/10">
                                    <Users className="w-8 h-8 text-brand-ebony/30" />
                                </div>
                                <p className="text-brand-ebony/70 text-lg mb-2 font-serif italic">No groups joined yet</p>
                                <p className="text-brand-ebony/50 text-sm">Discover and join communities representing your interests!</p>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>

            {/* Modals */}
            {(updating || deleting) && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[110]">
                    <div className="card-premium p-8 text-center shadow-2xl animate-fade-up max-w-xs w-full">
                        <Loader2 className="w-10 h-10 animate-spin text-brand-burgundy mx-auto mb-4" />
                        <p className="text-brand-ebony font-bold text-sm tracking-wide uppercase">{deleting ? 'Deleting Account...' : 'Updating Profile...'}</p>
                    </div>
                </div>
            )}

            <EditProfileModal
                isOpen={showEditProfile}
                onClose={() => setShowEditProfile(false)}
                onSubmit={handleUpdateProfile}
                currentUser={userData}
            />

            <ConfirmDialog
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
                title="Log Out"
                message="Are you sure you want to log out?"
                confirmText="Log Out"
                variant="warning"
            />

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDeleteAccount}
                title="Delete Account"
                message="Are you absolutely sure? This will permanently remove your profile, your posts, and all associated data. This action cannot be undone."
                confirmText="Delete Everything"
                variant="danger"
            />

            <ChangePasswordModal
                isOpen={showChangePassword}
                onClose={() => setShowChangePassword(false)}
                onSubmit={handleChangePassword}
            />

            {sharingPost && (
                <SharePostModal
                    isOpen={!!sharingPost}
                    onClose={() => setSharingPost(null)}
                    post={sharingPost}
                    currentUser={userData}
                />
            )}

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

            <AccountSettingsModal
                isOpen={showAccountSettings}
                onClose={() => setShowAccountSettings(false)}
                userEmail={userData.email || ''}
                userId={userData.uid}
                onAccountDeleted={() => { signOut(); }}
            />

            <div className="py-6 text-center text-brand-ebony/30 text-[10px] font-bold uppercase tracking-[0.3em]">
                Alumnest &bull; For the Tribe
            </div>
        </div>
    );
}
