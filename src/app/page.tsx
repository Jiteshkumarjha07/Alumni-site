'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, arrayRemove, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post, Comment as AppComment } from '@/types';
import { PostCard } from '@/components/feed/PostCard';
import { CreatePostModal } from '@/components/modals/CreatePostModal';
import { EditPostModal } from '@/components/modals/EditPostModal';
import { CommentModal } from '@/components/modals/CommentModal';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { SharePostModal } from '@/components/modals/SharePostModal';
import { SignedOutView } from '@/components/auth/SignedOutView';
import { PenSquare, Camera, Image as ImageIcon, Paperclip, Users, Menu, Sparkles } from 'lucide-react';
import { RightSidebar } from '@/components/layout/RightSidebar';
import { NotificationBell } from '@/components/notifications/NotificationPanel';
import { InstituteSwitcher } from '@/components/layout/InstituteSwitcher';
import Link from 'next/link';

export default function HomePage() {
  const { user, userData, signOut, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [commentingPost, setCommentingPost] = useState<Post | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  // Fetch posts from Firebase
  useEffect(() => {
    if (!userData || !userData.instituteId) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    const postsQuery = query(
      collection(db, 'posts'),
      where('instituteId', '==', userData.instituteId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(postsQuery, 
      (snapshot) => {
        const fetchedPosts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Post[];
        setPosts(fetchedPosts);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching posts:', error);
        setLoading(false); // Still stop loading even on error
      }
    );

    return () => unsubscribe();
  }, [userData]);

  const handleCreatePost = async (content: string, imageUrl?: string) => {
    if (!userData) return;

    // Optimistic UI: Prepend to feed instantly
    const pseudoId = `temp-${Date.now()}`;
    const newPost: Post = {
      id: pseudoId,
      authorUid: userData.uid,
      authorName: userData.name,
      authorBatch: userData.batch || 0,
      authorProfilePic: userData.profilePic,
      content,
      imageUrl: imageUrl || '',
      likes: [],
      comments: [],
      instituteId: userData.instituteId || '',
      createdAt: new Date() as any // Temporary visual timestamp
    };
    
    setPosts(current => [newPost, ...current]);

    // Background Firebase operation
    addDoc(collection(db, 'posts'), {
      authorUid: userData.uid,
      authorName: userData.name,
      authorBatch: userData.batch || 0,
      authorProfilePic: userData.profilePic || '',
      content,
      imageUrl: imageUrl || '',
      likes: [],
      comments: [],
      instituteId: userData.instituteId || '',
      createdAt: serverTimestamp()
    }).catch(console.error);
  };

  const handleUpdatePost = async (postId: string, newContent: string) => {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, { content: newContent });
  };

  const handleLikePost = async (postId: string, isLiked: boolean) => {
    if (!userData) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const likes = post.likes || [];
    const updatedLikes = isLiked
      ? likes.filter((uid) => uid !== userData.uid)
      : [...likes, userData.uid];

    // Optimistic UI: Update local state instantly
    setPosts(currentPosts => currentPosts.map(p => 
      p.id === postId ? { ...p, likes: updatedLikes } : p
    ));

    // Background network request (No Await)
    const postRef = doc(db, 'posts', postId);
    updateDoc(postRef, { likes: updatedLikes }).catch(err => {
      console.error("Failed optimistic like:", err);
      // Let onSnapshot automatically revert local state if failed
    });

    if (!isLiked && post.authorUid !== userData.uid) {
      addDoc(collection(db, 'notifications'), {
        userId: post.authorUid,
        type: 'like',
        sourceUserUid: userData.uid,
        sourceUserName: userData.name,
        sourceUserProfilePic: userData.profilePic || '',
        message: 'liked your post.',
        link: `/posts/${postId}?action=view`,
        createdAt: serverTimestamp(),
        isRead: false,
      }).catch(console.error);
    }
  };

  const handleAddComment = async (text: string, replyToId?: string) => {
    if (!userData || !commentingPost) return;

    const post = posts.find((p) => p.id === commentingPost.id);
    if (!post) return;

    const newComment: AppComment = {
      id: Math.random().toString(36).substr(2, 9),
      authorUid: userData.uid,
      authorName: userData.name,
      text,
      createdAt: new Date(),
      reactions: {},
      ...(replyToId ? { replyToId } : {})
    };

    const updatedComments = [...(post.comments || []), newComment];
    
    // Optimistic UI: Update feed and modal state instantly
    setPosts(currentPosts => currentPosts.map(p => 
      p.id === commentingPost.id ? { ...p, comments: updatedComments } : p
    ));
    setCommentingPost(prev => prev ? { ...prev, comments: updatedComments } : prev);

    // Background network request
    const postRef = doc(db, 'posts', commentingPost.id);
    updateDoc(postRef, { comments: updatedComments }).catch(console.error);

    if (commentingPost.authorUid !== userData.uid) {
      addDoc(collection(db, 'notifications'), {
        userId: commentingPost.authorUid,
        type: 'comment',
        sourceUserUid: userData.uid,
        sourceUserName: userData.name,
        sourceUserProfilePic: userData.profilePic || '',
        message: `${userData.name} commented on your post: "${text.substring(0, 30)}${
          text.length > 30 ? '...' : ''
        }"`,
        link: `/posts/${commentingPost.id}?action=comment`,
        createdAt: serverTimestamp(),
        isRead: false,
      }).catch(console.error);
    }
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

    // Optimistic UI updates
    setPosts(currentPosts => currentPosts.map(p => 
      p.id === commentingPost.id ? { ...p, comments: updatedComments } : p
    ));
    setCommentingPost(prev => prev ? { ...prev, comments: updatedComments } : prev);

    // Background network request
    const postRef = doc(db, 'posts', commentingPost.id);
    updateDoc(postRef, { comments: updatedComments }).catch(console.error);
  };

  const handleDeleteComment = async (comment: AppComment) => {
    if (!userData || !commentingPost) return;

    const postRef = doc(db, 'posts', commentingPost.id);
    await updateDoc(postRef, {
      comments: arrayRemove(comment)
    });
  };

  const handleDeletePost = async () => {
    if (!deletingPostId) return;
    await deleteDoc(doc(db, 'posts', deletingPostId));
    setDeletingPostId(null);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center animate-fade-up">
          <div className="relative w-16 h-16 mx-auto mb-6">
             <div className="absolute inset-0 rounded-full border-4 border-brand-burgundy/20"></div>
             <div className="absolute inset-0 rounded-full border-4 border-brand-burgundy border-t-transparent animate-spin"></div>
          </div>
          <p className="text-brand-ebony font-serif italic text-lg opacity-80">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return <SignedOutView user={user} signOut={signOut} />;
  }

  return (
    <div className="min-h-screen transition-all duration-300">
      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-8 pb-12 w-full">
        {/* Feed Header */}
        <div className="flex flex-wrap items-center justify-between mb-8 gap-4 px-2">
          <div className="flex items-center gap-4">
            <div className="page-header-accent glow-indigo"></div>
            <h1 className="text-3xl font-serif font-extrabold text-brand-ebony tracking-tight flex items-center gap-2">
               The Feed
               <Sparkles className="w-5 h-5 text-brand-gold animate-pulse" />
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
               onClick={() => setIsRightSidebarOpen(true)}
               className="flex items-center justify-center px-4 py-2 bg-brand-burgundy/10 hover:bg-brand-burgundy/20 text-brand-burgundy rounded-xl text-sm font-bold transition-all border border-brand-burgundy/20 shadow-sm"
               title="Suggestions"
            >
               <Users className="w-4 h-4" />
               <span className="hidden sm:inline tracking-wider uppercase text-[10px] ml-2">Discover</span>
            </button>
            <div className="bg-brand-parchment/60 p-1.5 rounded-xl border border-brand-ebony/10">
               <NotificationBell />
            </div>
          </div>
        </div>

        {/* Mobile Switcher (Hidden on Desktop) */}
        <div className="md:hidden mb-6 px-2">
          <InstituteSwitcher />
        </div>

        {/* Create Post Button Area */}
        <div className="card-premium p-5 mb-8 group hover:border-brand-burgundy/30 transition-all duration-300 ease-in-out relative overflow-hidden">
          {/* subtle background glow on hover */}
          <div className="absolute -inset-2 bg-gradient-to-r from-brand-burgundy/0 via-brand-burgundy/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none -z-10" />
          
          <div className="flex items-start gap-4 mb-4">
            <img
              src={userData.profilePic || `https://placehold.co/100x100/4f46e5/ffffff?text=${userData.name.substring(0, 1)}`}
              alt={userData.name}
              className="w-12 h-12 rounded-full ring-2 ring-white dark:ring-brand-parchment shadow-sm object-cover"
            />
            <button
              onClick={() => setShowCreatePost(true)}
              className="flex-1 text-left px-5 py-3 input-premium rounded-xl text-brand-ebony/40 transition-all font-medium text-sm border border-brand-ebony/10 bg-brand-cream/50 dark:bg-white/5 hover:bg-white dark:hover:bg-brand-parchment"
            >
              Share something with your fellow alumni...
            </button>
          </div>
          
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-brand-ebony/5">
            <div className="flex gap-1.5">
              <button onClick={() => setShowCreatePost(true)} className="p-2 text-brand-ebony/40 hover:text-brand-burgundy hover:bg-brand-burgundy/10 rounded-lg transition-colors flex items-center gap-2">
                <Camera className="w-5 h-5" />
                <span className="hidden sm:inline text-xs font-semibold">Photo</span>
              </button>
              <button onClick={() => setShowCreatePost(true)} className="p-2 text-brand-ebony/40 hover:text-brand-burgundy hover:bg-brand-burgundy/10 rounded-lg transition-colors flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                <span className="hidden sm:inline text-xs font-semibold">Video</span>
              </button>
              <button onClick={() => setShowCreatePost(true)} className="p-2 text-brand-ebony/40 hover:text-brand-burgundy hover:bg-brand-burgundy/10 rounded-lg transition-colors flex items-center gap-2">
                <Paperclip className="w-5 h-5" />
                <span className="hidden sm:inline text-xs font-semibold">Attach</span>
              </button>
            </div>
            <button
              onClick={() => setShowCreatePost(true)}
              className="px-6 py-2 bg-gradient-indigo text-white rounded-xl font-bold hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all shadow-md active:scale-95 text-sm shimmer overflow-hidden relative"
            >
              <span className="relative z-10">Post</span>
            </button>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-6">
          {posts.length > 0 ? (
            posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={userData}
                onLike={(isLiked) => handleLikePost(post.id, isLiked)}
                onComment={() => setCommentingPost(post)}
                onEdit={() => setEditingPost(post)}
                onDelete={() => setDeletingPostId(post.id)}
                onShare={() => setSharingPost(post)}
              />
            ))
          ) : (
            <div className="card-premium p-12 text-center animate-fade-up border-dashed border-2 border-brand-ebony/10">
              <div className="w-16 h-16 bg-brand-burgundy/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PenSquare className="w-8 h-8 text-brand-burgundy opacity-80" />
              </div>
              <p className="text-brand-ebony font-serif italic text-lg mb-1">It's quiet in here...</p>
              <p className="text-brand-ebony/50 text-sm mb-6">Be the first to share an update with your network.</p>
              <button
                onClick={() => setShowCreatePost(true)}
                className="px-6 py-2 bg-brand-burgundy/10 text-brand-burgundy rounded-xl font-bold hover:bg-brand-burgundy hover:text-white transition-colors"
              >
                 Create Post
              </button>
            </div>
          )}
        </div>
      </div>

      <RightSidebar isOpen={isRightSidebarOpen} onClose={() => setIsRightSidebarOpen(false)} />

      {/* Modals */}
      <CreatePostModal
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onSubmit={handleCreatePost}
        currentUser={userData}
      />

      {editingPost && (
        <EditPostModal
          isOpen={true}
          onClose={() => setEditingPost(null)}
          onSubmit={handleUpdatePost}
          post={editingPost}
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
          postAuthor={commentingPost.authorName}
          currentUserUid={userData.uid}
          currentUserName={userData.name}
        />
      )}

      <ConfirmDialog
        isOpen={!!deletingPostId}
        onClose={() => setDeletingPostId(null)}
        onConfirm={handleDeletePost}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
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
