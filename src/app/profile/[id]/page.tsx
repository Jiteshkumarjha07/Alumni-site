'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, onSnapshot, doc, getDocs, getDoc, updateDoc, arrayRemove, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post, User, Group } from '@/types';
import { PostCard } from '@/components/feed/PostCard';
import { CommentModal } from '@/components/modals/CommentModal';
import { SharePostModal } from '@/components/modals/SharePostModal';
import { MapPin, Briefcase, MessageCircle, Users } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';

export default function PublicProfilePage() {
    const params = useParams();
    const router = useRouter();
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

    const profileId = params.id as string;

    useEffect(() => {
        if (!authLoading && userData?.uid === profileId) {
            router.replace('/profile');
        }
    }, [userData, profileId, authLoading, router]);

    useEffect(() => {
        const fetchProfileUser = async () => {
            try {
                const docRef = doc(db, 'users', profileId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setProfileUser({ uid: docSnap.id, ...docSnap.data() } as User);
                } else {
                    setProfileUser(null);
                }
            } catch (error) {
                console.error('Error fetching profile user:', error);
            } finally {
                setLoading(false);
            }
        };

        if (profileId) {
            fetchProfileUser();
        }
    }, [profileId]);

    useEffect(() => {
        if (!profileUser || !userData?.instituteId) return;

        const postsQuery = query(
            collection(db, 'posts'),
            where('authorUid', '==', profileUser.uid),
            where('instituteId', '==', userData.instituteId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
            const fetchedPosts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data({ serverTimestamps: 'estimate' })
            })) as Post[];
            setPosts(fetchedPosts);
        }, (err) => {
            console.error('Error fetching profile posts:', err);
        });

        return () => unsubscribe();
    }, [profileUser, userData?.instituteId]);

    useEffect(() => {
        if (!profileUser || activeTab !== 'connections') return;

        const fetchConnections = async () => {
            setLoadingConnections(true);
            try {
                const connectionIds = profileUser.connections || [];
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
    }, [profileUser, activeTab]);

    useEffect(() => {
        if (!profileUser || activeTab !== 'groups') return;

        const fetchGroups = async () => {
            setLoadingGroups(true);
            try {
                const groupIds = profileUser.groups || [];
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
    }, [profileUser, activeTab]);

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

        if (!isLiked && post.authorUid !== userData.uid) {
            await addDoc(collection(db, 'notifications'), {
                userId: post.authorUid,
                type: 'like',
                sourceUserUid: userData.uid,
                sourceUserName: userData.name,
                sourceUserProfilePic: userData.profilePic || '',
                message: 'liked your post.',
                link: `/posts/${postId}?action=view`,
                createdAt: serverTimestamp(),
                isRead: false,
            });
        }
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

        if (post.authorUid !== userData.uid) {
            await addDoc(collection(db, 'notifications'), {
                userId: post.authorUid,
                type: 'comment',
                sourceUserUid: userData.uid,
                sourceUserName: userData.name,
                sourceUserProfilePic: userData.profilePic || '',
                message: `${userData.name} commented on your post: "${text.substring(0, 30)}${
                    text.length > 30 ? '...' : ''
                }"`,
                link: `/posts/${post.id}?action=comment`,
                createdAt: serverTimestamp(),
                isRead: false,
            });
        }
    };

    const handleDeleteComment = async (comment: any) => {
        if (!userData || !commentingPost) return;

        const postRef = doc(db, 'posts', commentingPost.id);
        await updateDoc(postRef, {
            comments: arrayRemove(comment)
        });
    };

    if (authLoading || loading || (userData?.uid === profileId)) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                </div>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">Please log in to view profiles</p>
                    <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    if (!profileUser) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">User not found</p>
                    <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
                        Return Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 pt-8 pb-0">
            {/* Cover Photo Area */}
            <div className="bg-gradient-to-r from-brand-burgundy to-[#4a1c20] h-48 rounded-t-xl opacity-90 border-b-4 border-brand-gold/60"></div>

            {/* Profile Header */}
            <div className="bg-brand-parchment/90 rounded-b-xl shadow-md p-6 -mt-20 relative border border-brand-ebony/10">
                <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
                    {/* Profile Picture */}
                    <div className="relative">
                        <Image
                            src={profileUser.profilePic || `https://placehold.co/150x150/EFEFEFF/003366?text=${profileUser.name.substring(0, 1)}`}
                            alt={profileUser.name}
                            width={128}
                            height={128}
                            className="w-32 h-32 rounded-full border-4 border-brand-cream shadow-lg object-cover bg-white"
                            unoptimized
                        />
                    </div>

                    {/* User Info */}
                    <div className="flex-1 text-center md:text-left pt-2">
                        <h1 className="text-4xl font-serif font-bold text-brand-ebony">{profileUser.name}</h1>
                        <p className="text-lg text-brand-ebony/70 mt-1 italic font-serif">Class of {profileUser.batch}</p>

                        <div className="flex flex-col md:flex-row gap-4 mt-3 text-brand-ebony/80 font-medium text-sm tracking-wide">
                            {profileUser.profession && (
                                <div className="flex items-center justify-center md:justify-start gap-2">
                                    <Briefcase className="w-4 h-4 text-brand-burgundy/80" />
                                    <span>{profileUser.profession}</span>
                                </div>
                            )}
                            {profileUser.location && (
                                <div className="flex items-center justify-center md:justify-start gap-2">
                                    <MapPin className="w-4 h-4 text-brand-burgundy/80" />
                                    <span>{profileUser.location}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Message Button if Connected */}
                    {userData?.connections?.includes(profileUser.uid) && (
                        <Link
                            href={`/messages?userId=${profileUser.uid}&name=${encodeURIComponent(profileUser.name)}&pic=${encodeURIComponent(profileUser.profilePic || '')}`}
                            className="flex items-center gap-2 px-6 py-2.5 bg-brand-burgundy text-white rounded-lg hover:bg-[#5a2427] transition font-semibold tracking-wide shadow-sm text-sm"
                        >
                            <MessageCircle className="w-4 h-4" />
                            Message
                        </Link>
                    )}
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
                        <p className="text-2xl font-bold text-brand-ebony font-serif">{profileUser.connections?.length || 0}</p>
                        <p className="text-xs text-brand-ebony/60 uppercase tracking-widest font-bold mt-1">Connections</p>
                    </button>
                    <button 
                        onClick={() => setActiveTab('groups')}
                        className={`text-center border-l w-full border-brand-ebony/10 p-2 rounded-xl transition ${activeTab === 'groups' ? 'bg-brand-burgundy/5 ring-1 ring-brand-burgundy/20' : 'hover:bg-brand-ebony/5'}`}
                    >
                        <p className="text-2xl font-bold text-brand-ebony font-serif">{profileUser.groups?.length || 0}</p>
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
                        Activity
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
                                <p className="text-brand-ebony/70 text-lg mb-2 font-serif italic">No activity yet</p>
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
                                            <Link href={`/profile/${connection.uid}`} className="block">
                                                <h3 className="font-serif font-bold text-brand-ebony truncate group-hover:text-brand-burgundy transition-colors">{connection.name}</h3>
                                            </Link>
                                            <p className="text-xs text-brand-ebony/60 truncate uppercase tracking-widest font-bold">Class of {connection.batch}</p>
                                            <p className="text-sm text-brand-ebony/70 truncate mt-1">{connection.profession || 'Alumni'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-brand-parchment/80 border border-brand-ebony/10 rounded-xl shadow-sm p-12 text-center">
                                <p className="text-brand-ebony/70 text-lg mb-2 font-serif italic">No connections yet</p>
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
                                    <div key={group.id} className="bg-brand-parchment/60 border border-brand-ebony/10 rounded-xl p-5 flex items-center justify-between hover:shadow-md transition group">
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
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-brand-parchment/80 border border-brand-ebony/10 rounded-xl shadow-sm p-12 text-center">
                                <p className="text-brand-ebony/70 text-lg mb-2 font-serif italic">No groups joined yet</p>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>

            {sharingPost && (
                <SharePostModal
                    isOpen={!!sharingPost}
                    onClose={() => setSharingPost(null)}
                    post={sharingPost}
                    currentUser={userData!}
                />
            )}

            {commentingPost && (
                <CommentModal
                    isOpen={true}
                    onClose={() => setCommentingPost(null)}
                    onSubmit={handleAddComment}
                    onDelete={handleDeleteComment}
                    comments={posts.find(p => p.id === commentingPost.id)?.comments || []}
                    currentUserUid={userData?.uid}
                    currentUserName={userData?.name}
                    postAuthor={commentingPost.authorName}
                />
            )}
        </div>
    );
}
