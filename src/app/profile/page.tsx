'use client';

import { useState, useEffect } from 'react';
import { updatePassword, deleteUser } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, getDocs, deleteDoc, writeBatch, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post, Comment as AppComment } from '@/types';
import { PostCard } from '@/components/feed/PostCard';
import { EditProfileModal, ProfileFormData } from '@/components/modals/EditProfileModal';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { SharePostModal } from '@/components/modals/SharePostModal';
import { ChangePasswordModal } from '@/components/modals/ChangePasswordModal';
import { CommentModal } from '@/components/modals/CommentModal';
import { SignedOutView } from '@/components/auth/SignedOutView';
import { uploadMedia } from '@/lib/media';
import { useAuth } from '@/contexts/AuthContext';
import { Pencil, LogOut, MapPin, Briefcase, Settings, MoreVertical, ShieldAlert, Lock, Trash2, Loader2, Menu, MessageCircle, Heart } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function ProfilePage() {
    const { user, userData, signOut, loading: authLoading } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [sharingPost, setSharingPost] = useState<Post | null>(null);
    const [commentingPost, setCommentingPost] = useState<Post | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

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
                const uploadedUrl = await uploadMedia(profilePicFile, 'profiles');
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

    const handleLogout = async () => {
        await signOut();
        window.location.href = '/login';
    };

    const handleChangePassword = async (newPassword: string) => {
        if (!user) return;
        await updatePassword(user, newPassword);
    };

    const handleDeleteAccount = async () => {
        if (!user || !userData) return;

        setDeleting(true);
        try {
            // 1. Delete all user posts
            const postsQuery = query(collection(db, 'posts'), where('authorUid', '==', userData.uid));
            const postsSnapshot = await getDocs(postsQuery);
            const batch = writeBatch(db);
            postsSnapshot.docs.forEach((postDoc) => {
                batch.delete(doc(db, 'posts', postDoc.id));
            });
            await batch.commit();

            // 2. Delete user document
            await deleteDoc(doc(db, 'users', userData.uid));

            // 3. Delete auth account
            await deleteUser(user);

            window.location.href = '/signup';
        } catch (error: any) {
            console.error('Error deleting account:', error);
            if (error.code === 'auth/requires-recent-login') {
                alert('For security reasons, please log out and log back in before deleting your account.');
            } else {
                alert('Failed to delete account. Please try again later.');
            }
            setDeleting(false);
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

    const handleDeleteComment = async (comment: AppComment) => {
        if (!userData || !commentingPost) return;

        const postRef = doc(db, 'posts', commentingPost.id);
        await updateDoc(postRef, {
            comments: arrayRemove(comment)
        });
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
        return <SignedOutView user={user} signOut={signOut} />;
    }

    return (
        <div className="max-w-4xl mx-auto py-8">
            {/* Cover Photo Area */}
            <div className="bg-gradient-to-r from-brand-burgundy to-[#4a1c20] h-32 sm:h-40 md:h-48 rounded-t-xl opacity-90 border-b-4 border-brand-gold/60 relative"></div>

            {/* Profile Header */}
            <div className="bg-brand-parchment/90 rounded-b-xl shadow-md p-4 sm:p-6 -mt-12 sm:-mt-16 md:-mt-20 relative border border-brand-ebony/10 z-10">
                {/* Account Settings Menu (Top Right of Header) */}
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-[60]">
                    <div className="relative">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="p-2 text-brand-ebony/40 hover:text-brand-burgundy hover:bg-brand-burgundy/5 rounded-full transition-all"
                            title="Account Settings"
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        {showSettings && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl py-2 z-[70] border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="px-4 py-2 border-b border-gray-50 mb-1">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account Settings</p>
                                </div>
                                
                                <button
                                    onClick={() => { setShowChangePassword(true); setShowSettings(false); }}
                                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-brand-burgundy/5 flex items-center gap-3 transition-colors"
                                >
                                    <Lock className="w-4 h-4 text-brand-burgundy/60" />
                                    <span className="font-semibold">Change Password</span>
                                </button>
                                
                                <button
                                    onClick={() => { setShowLogoutConfirm(true); setShowSettings(false); }}
                                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-brand-burgundy/5 flex items-center gap-3 transition-colors"
                                >
                                    <LogOut className="w-4 h-4 text-brand-burgundy/60" />
                                    <span className="font-semibold">Logout</span>
                                </button>

                                <div className="border-t border-gray-50 mt-1 pt-1">
                                    <button
                                        onClick={() => { setShowDeleteConfirm(true); setShowSettings(false); }}
                                        className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                                    >
                                        <ShieldAlert className="w-4 h-4 text-red-500/60" />
                                        <span className="font-semibold">Delete Account</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
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
                <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6 pt-6 border-t border-brand-ebony/10">
                    <div className="text-center px-1">
                        <p className="text-xl sm:text-2xl font-bold text-brand-ebony font-serif">{posts.length}</p>
                        <p className="text-[10px] sm:text-xs text-brand-ebony/60 uppercase tracking-widest font-bold mt-1">Posts</p>
                    </div>
                    <div className="text-center border-l w-full border-brand-ebony/10 px-1">
                        <p className="text-xl sm:text-2xl font-bold text-brand-ebony font-serif">{userData.connections?.length || 0}</p>
                        <p className="text-[10px] sm:text-xs text-brand-ebony/60 uppercase tracking-widest font-bold mt-1">Connections</p>
                    </div>
                    <div className="text-center border-l w-full border-brand-ebony/10 px-1">
                        <p className="text-xl sm:text-2xl font-bold text-brand-ebony font-serif">{userData.groups?.length || 0}</p>
                        <p className="text-[10px] sm:text-xs text-brand-ebony/60 uppercase tracking-widest font-bold mt-1">Groups</p>
                    </div>
                </div>
            </div>

            {/* User Posts */}
            <div className="mt-8">
                <h2 className="text-2xl font-serif font-bold text-brand-ebony mb-6 flex items-center gap-2">
                    <span>My Posts</span>
                    <span className="text-base font-normal text-brand-ebony/50">({posts.length})</span>
                </h2>
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
            </div>

            {/* Removed bottom logout section */}
            <div className="py-8 text-center text-brand-ebony/30 text-xs font-serif italic tracking-widest">
                Alumnest &bull; For the Tribe
            </div>

            {/* Modals */}
            {(updating || deleting) && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110]">
                    <div className="bg-white rounded-2xl p-8 text-center shadow-2xl animate-in zoom-in duration-200 max-w-xs w-full">
                        <Loader2 className="w-12 h-12 animate-spin text-brand-burgundy mx-auto mb-4" />
                        <p className="text-gray-800 font-bold">{deleting ? 'Deleting Account...' : 'Updating Profile...'}</p>
                        <p className="text-xs text-gray-500 mt-2">Please wait a moment</p>
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
                    comments={posts.find(p => p.id === commentingPost.id)?.comments || []}
                    postAuthor={commentingPost.authorName}
                    currentUserUid={userData.uid}
                />
            )}
        </div>
    );
}
