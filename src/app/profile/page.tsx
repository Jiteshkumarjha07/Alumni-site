'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post } from '@/types';
import { PostCard } from '@/components/feed/PostCard';
import { EditProfileModal, ProfileFormData } from '@/components/modals/EditProfileModal';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { SharePostModal } from '@/components/modals/SharePostModal';
import { SignedOutView } from '@/components/auth/SignedOutView';
import { Pencil, LogOut, MapPin, Briefcase } from 'lucide-react';
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
        <div className="max-w-4xl mx-auto p-4 pt-8">
            {/* Cover Photo Area */}
            <div className="bg-gradient-to-r from-brand-burgundy to-[#4a1c20] h-48 rounded-t-xl opacity-90 border-b-4 border-brand-gold/60"></div>

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
                    <div className="text-center">
                        <p className="text-2xl font-bold text-brand-ebony font-serif">{posts.length}</p>
                        <p className="text-xs text-brand-ebony/60 uppercase tracking-widest font-bold mt-1">Posts</p>
                    </div>
                    <div className="text-center border-l w-full border-brand-ebony/10">
                        <p className="text-2xl font-bold text-brand-ebony font-serif">{userData.connections?.length || 0}</p>
                        <p className="text-xs text-brand-ebony/60 uppercase tracking-widest font-bold mt-1">Connections</p>
                    </div>
                    <div className="text-center border-l w-full border-brand-ebony/10">
                        <p className="text-2xl font-bold text-brand-ebony font-serif">{userData.groups?.length || 0}</p>
                        <p className="text-xs text-brand-ebony/60 uppercase tracking-widest font-bold mt-1">Groups</p>
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
                                onLike={() => { /* no-op */ }}
                                onComment={() => { /* no-op */ }}
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

            {/* Logout Section */}
            <div className="flex gap-4 justify-center py-8 opacity-70 hover:opacity-100 transition-opacity">
                <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="flex items-center gap-2 px-6 py-2 bg-transparent text-brand-ebony/80 rounded-full hover:bg-brand-ebony/5 transition border border-brand-ebony/20 text-sm font-semibold tracking-wide"
                >
                    <LogOut className="w-4 h-4" />
                    Secure Logout
                </button>
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
        </div>
    );
}
