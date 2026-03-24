'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, getDocs, getDoc, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post, User, Group } from '@/types';
import { PostCard } from '@/components/feed/PostCard';
import { CommentModal } from '@/components/modals/CommentModal';
import { EditProfileModal, ProfileFormData } from '@/components/modals/EditProfileModal';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { SharePostModal } from '@/components/modals/SharePostModal';
import { uploadMedia } from '@/lib/media';
import { Pencil, LogOut, MapPin, Briefcase, MessageCircle, Users, Settings2, Shield, Settings } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { AccountSettingsModal } from '@/components/modals/AccountSettingsModal';

export default function ProfilePage() {
    const { userData, signOut, loading: authLoading } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [sharingPost, setSharingPost] = useState<Post | null>(null);
    const [commentingPost, setCommentingPost] = useState<Post | null>(null);
    const [activeTab, setActiveTab] = useState<'posts' | 'connections' | 'groups'>('posts');
    const [connections, setConnections] = useState<User[]>([]);
    const [loadingConnections, setLoadingConnections] = useState(false);
    const [userGroups, setUserGroups] = useState<Group[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [showAccountSettings, setShowAccountSettings] = useState(false);

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

                // Fetch full user objects for all connections
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

                // Fetch group objects individually to avoid the 10-item limit of 'in' queries
                // and to guarantee we get the correct doc IDs
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

            // Handle profile picture
            if (isRemovingPic) {
                updates.profilePic = `https://placehold.co/100x100/EFEFEFF/003366?text=${formData.name.substring(0, 2).toUpperCase()}`;
            } else if (profilePicFile) {
                const uploadedUrl = await uploadMedia(profilePicFile);
                if (uploadedUrl) {
                    updates.profilePic = uploadedUrl;
                }
            }

            // Update user document
            await updateDoc(userRef, updates);

            // Update profile info on all posts by this user
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

            // Show success message
            alert('Profile updated successfully!');
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
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        const likes = post.likes || [];
        const updatedLikes = isLiked
            ? likes.filter(uid => uid !== userData.uid)
            : [...likes, userData.uid];

        await updateDoc(postRef, { likes: updatedLikes });
    };

    const handleAddComment = async (text: string) => {
        if (!userData || !commentingPost) return;

        const postRef = doc(db, 'posts', commentingPost.id);
        const post = posts.find(p => p.id === commentingPost.id);
        if (!post) return;

        const newComment = {
            authorUid: userData.uid,
            authorName: userData.name,
            text,
            createdAt: new Date()
        };

        const updatedComments = [...(post.comments || []), newComment];
        await updateDoc(postRef, { comments: updatedComments });
    };

    const handleDeleteComment = async (comment: any) => {
        if (!userData || !commentingPost) return;

        const postRef = doc(db, 'posts', commentingPost.id);
        await updateDoc(postRef, {
            comments: arrayRemove(comment)
        });
    };

    const handleLogout = async () => {
        await signOut();
        window.location.href = '/login';
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">Please log in to view your profile</p>
                    <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 pt-8">
            {/* Cover Photo Area */}
            <div className="bg-gradient-to-r from-brand-burgundy to-[#4a1c20] h-48 rounded-t-xl opacity-90 border-b-4 border-brand-gold/60 relative">
                <button
                    onClick={() => setShowAccountSettings(true)}
                    className="absolute top-4 right-4 p-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white rounded-xl transition-all border border-white/20 shadow-md"
                    title="Account Settings"
                >
                    <Settings className="w-5 h-5" />
                </button>
            </div>

            {/* Profile Header */}
            <div className="bg-brand-parchment/90 rounded-b-xl shadow-md p-6 -mt-20 relative border border-brand-ebony/10">
                <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
                    {/* Profile Picture */}
                    <div className="relative">
                        <Image
                            src={userData.profilePic || `https://placehold.co/150x150/EFEFEFF/003366?text=${userData.name.substring(0, 1)}`}
                            alt={userData.name}
                            width={128}
                            height={128}
                            className="w-32 h-32 rounded-full border-4 border-brand-cream shadow-lg object-cover bg-white"
                            unoptimized
                        />
                    </div>

                    {/* User Info */}
                    <div className="flex-1 text-center md:text-left pt-2">
                        <h1 className="text-4xl font-serif font-bold text-brand-ebony">{userData.name}</h1>
                        <p className="text-lg text-brand-ebony/70 mt-1 italic font-serif">Class of {userData.batch}</p>

                        <div className="flex flex-col md:flex-row gap-4 mt-3 text-brand-ebony/80 font-medium text-sm tracking-wide">
                            {userData.profession && (
                                <div className="flex items-center justify-center md:justify-start gap-2">
                                    <Briefcase className="w-4 h-4 text-brand-burgundy/80" />
                                    <span>{userData.profession}</span>
                                </div>
                            )}
                            {userData.location && (
                                <div className="flex items-center justify-center md:justify-start gap-2">
                                    <MapPin className="w-4 h-4 text-brand-burgundy/80" />
                                    <span>{userData.location}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Edit Button */}
                    <button
                        onClick={() => setShowEditProfile(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-brand-burgundy text-white rounded-lg hover:bg-[#5a2427] transition font-semibold tracking-wide shadow-sm text-sm"
                    >
                        <Pencil className="w-4 h-4" />
                        Edit Profile
                    </button>
                </div>

                    {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-brand-ebony/10">
                    <button 
                        onClick={() => setActiveTab('posts')}
                        className={`text-center p-2 rounded-xl transition ${activeTab === 'posts' ? 'bg-brand-burgundy/5 ring-1 ring-brand-burgundy/20' : 'hover:bg-brand-ebony/5'}`}
                    >
                        <p className="text-2xl font-bold text-brand-ebony font-serif">{posts.length}</p>
                        <p className="text-xs text-brand-ebony/60 uppercase tracking-widest font-bold mt-1">Posts</p>
                    </button>
                    <button 
                        onClick={() => setActiveTab('connections')}
                        className={`text-center border-l w-full border-brand-ebony/10 p-2 rounded-xl transition ${activeTab === 'connections' ? 'bg-brand-burgundy/5 ring-1 ring-brand-burgundy/20' : 'hover:bg-brand-ebony/5'}`}
                    >
                        <p className="text-2xl font-bold text-brand-ebony font-serif">{userData.connections?.length || 0}</p>
                        <p className="text-xs text-brand-ebony/60 uppercase tracking-widest font-bold mt-1">Connections</p>
                    </button>
                    <button 
                        onClick={() => setActiveTab('groups')}
                        className={`text-center border-l w-full border-brand-ebony/10 p-2 rounded-xl transition ${activeTab === 'groups' ? 'bg-brand-burgundy/5 ring-1 ring-brand-burgundy/20' : 'hover:bg-brand-ebony/5'}`}
                    >
                        <p className="text-2xl font-bold text-brand-ebony font-serif">{userData.groups?.length || 0}</p>
                        <p className="text-xs text-brand-ebony/60 uppercase tracking-widest font-bold mt-1">Groups</p>
                    </button>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="mt-8">
                <div className="flex border-b border-brand-ebony/10 mb-6">
                    <button
                        onClick={() => setActiveTab('posts')}
                        className={`pb-3 px-6 text-sm font-bold uppercase tracking-widest transition-all relative ${
                            activeTab === 'posts' ? 'text-brand-burgundy' : 'text-brand-ebony/40 hover:text-brand-ebony/60'
                        }`}
                    >
                        My Feed
                        {activeTab === 'posts' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-burgundy rounded-t-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('connections')}
                        className={`pb-3 px-6 text-sm font-bold uppercase tracking-widest transition-all relative ${
                            activeTab === 'connections' ? 'text-brand-burgundy' : 'text-brand-ebony/40 hover:text-brand-ebony/60'
                        }`}
                    >
                        Connections
                        {activeTab === 'connections' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-burgundy rounded-t-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('groups')}
                        className={`pb-3 px-6 text-sm font-bold uppercase tracking-widest transition-all relative ${
                            activeTab === 'groups' ? 'text-brand-burgundy' : 'text-brand-ebony/40 hover:text-brand-ebony/60'
                        }`}
                    >
                        Groups
                        {activeTab === 'groups' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-burgundy rounded-t-full" />}
                    </button>
                </div>

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
                            <div className="bg-brand-parchment/80 border border-brand-ebony/10 rounded-xl shadow-sm p-12 text-center">
                                <div className="w-16 h-16 bg-brand-ebony/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-ebony/10">
                                    <Pencil className="w-8 h-8 text-brand-ebony/30" />
                                </div>
                                <p className="text-brand-ebony/70 text-lg mb-2 font-serif italic">No posts yet</p>
                                <p className="text-brand-ebony/50 text-sm">Share your first post to get started!</p>
                                <Link
                                    href="/"
                                    className="inline-block mt-4 px-6 py-2.5 bg-brand-burgundy text-white rounded-lg hover:bg-[#5a2427] transition font-semibold text-sm tracking-wide shadow-sm"
                                >
                                    Create Post
                                </Link>
                            </div>
                        )}
                    </div>
                ) : activeTab === 'connections' ? (
                    <div className="space-y-4">
                        {loadingConnections ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="bg-brand-parchment/40 h-24 rounded-xl border border-brand-ebony/5 animate-pulse" />
                                ))}
                            </div>
                        ) : connections.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {connections.map(connection => (
                                    <div key={connection.uid} className="bg-brand-parchment/60 border border-brand-ebony/10 rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition group">
                                        <Link href={`/profile/${connection.uid}`} className="block">
                                            <img 
                                                src={connection.profilePic || `https://placehold.co/100x100/EFEFEFF/5a2427?text=${connection.name.substring(0, 1)}`}
                                                alt={connection.name}
                                                className="w-14 h-14 rounded-full border-2 border-white shadow-sm hover:opacity-80 transition"
                                            />
                                        </Link>
                                        <div className="flex-1 min-w-0">
                                            <Link href={`/profile/${connection.uid}`} className="block w-fit">
                                                <h3 className="font-serif font-bold text-brand-ebony truncate group-hover:text-brand-burgundy transition-colors">{connection.name}</h3>
                                            </Link>
                                            <p className="text-xs text-brand-ebony/60 truncate uppercase tracking-widest font-bold">Class of {connection.batch}</p>
                                            <p className="text-sm text-brand-ebony/70 truncate mt-1">{connection.profession || 'Alumni'}</p>
                                        </div>
                                        <Link 
                                            href={`/messages?userId=${connection.uid}&name=${encodeURIComponent(connection.name)}&pic=${encodeURIComponent(connection.profilePic || '')}`}
                                            className="p-2 text-brand-burgundy hover:bg-brand-burgundy hover:text-white rounded-full transition"
                                        >
                                            <MessageCircle className="w-5 h-5" />
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-brand-parchment/80 border border-brand-ebony/10 rounded-xl shadow-sm p-12 text-center">
                                <div className="w-16 h-16 bg-brand-ebony/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-ebony/10">
                                    <span className="text-2xl">👥</span>
                                </div>
                                <p className="text-brand-ebony/70 text-lg mb-2 font-serif italic">No connections yet</p>
                                <p className="text-brand-ebony/50 text-sm">Grow your network by connecting with fellow alumni!</p>
                                <Link
                                    href="/network"
                                    className="inline-block mt-4 px-6 py-2.5 bg-brand-burgundy text-white rounded-lg hover:bg-[#5a2427] transition font-semibold text-sm tracking-wide shadow-sm"
                                >
                                    Find Alumni
                                </Link>
                            </div>
                        )}
                    </div>
                ) : activeTab === 'groups' ? (
                    <div className="space-y-4">
                        {loadingGroups ? (
                            <div className="space-y-4">
                                {[1, 2].map(i => (
                                    <div key={i} className="bg-brand-parchment/40 h-24 rounded-xl border border-brand-ebony/5 animate-pulse" />
                                ))}
                            </div>
                        ) : userGroups.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {userGroups.map(group => (
                                    <Link key={group.id} href={`/messages/group/${group.id}`} className="bg-brand-parchment/60 border border-brand-ebony/10 rounded-xl p-5 flex items-center justify-between hover:shadow-md transition group">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-12 h-12 rounded-lg bg-brand-burgundy/10 flex items-center justify-center flex-shrink-0 text-brand-burgundy font-bold text-xl border border-brand-burgundy/20 group-hover:bg-brand-burgundy group-hover:text-white transition-colors">
                                                {group.groupName.substring(0, 1).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-serif font-bold text-brand-ebony truncate text-lg group-hover:text-brand-burgundy transition-colors">{group.groupName}</h3>
                                                <div className="flex items-center gap-1 mt-0.5 text-brand-ebony/50 text-xs font-bold uppercase tracking-wider">
                                                    <Users className="w-3.5 h-3.5" />
                                                    {group.members?.length || 0} Members
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-brand-parchment/80 border border-brand-ebony/10 rounded-xl shadow-sm p-12 text-center">
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

            {/* Settings Section */}
            <div className="mt-6 bg-brand-parchment/80 border border-brand-ebony/10 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-brand-ebony/10 bg-brand-ebony/3">
                    <Settings2 className="w-4 h-4 text-brand-burgundy" />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-brand-ebony font-sans">Settings</h3>
                </div>
                <div className="divide-y divide-brand-ebony/5">
                    <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-brand-burgundy/5 transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-burgundy/10 flex items-center justify-center group-hover:bg-brand-burgundy/20 transition-colors">
                                <LogOut className="w-4 h-4 text-brand-burgundy" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-semibold text-brand-ebony">Secure Logout</p>
                                <p className="text-xs text-brand-ebony/40 italic">End your current session safely</p>
                            </div>
                        </div>
                        <Shield className="w-4 h-4 text-brand-ebony/20 group-hover:text-brand-burgundy/40 transition-colors" />
                    </button>
                </div>
            </div>

            {/* Modals */}
            {updating && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-700">Updating profile...</p>
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
                    comments={posts.find(p => p.id === commentingPost.id)?.comments || []}
                    currentUserUid={userData.uid}
                    currentUserName={userData.name}
                />
            )}
            <AccountSettingsModal
                isOpen={showAccountSettings}
                onClose={() => setShowAccountSettings(false)}
                userEmail={userData.email || ''}
                userId={userData.uid}
                onAccountDeleted={() => { signOut(); }}
            />
        </div>
    );
}
