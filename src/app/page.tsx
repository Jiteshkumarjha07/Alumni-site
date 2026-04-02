'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post, Comment as AppComment } from '@/types';
import { PostCard } from '@/components/feed/PostCard';
import { CreatePostModal } from '@/components/modals/CreatePostModal';
import { EditPostModal } from '@/components/modals/EditPostModal';
import { CommentModal } from '@/components/modals/CommentModal';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { SharePostModal } from '@/components/modals/SharePostModal';
import { SignedOutView } from '@/components/auth/SignedOutView';
import { PenSquare, Camera, Image as ImageIcon, Paperclip, Users, Menu } from 'lucide-react';
import { RightSidebar } from '@/components/layout/RightSidebar';
import { NotificationBell } from '@/components/notifications/NotificationPanel';
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
    if (!userData) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    const postsQuery = query(
      collection(db, 'posts'),
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

    await addDoc(collection(db, 'posts'), {
      authorUid: userData.uid,
      authorName: userData.name,
      authorBatch: userData.batch,
      authorProfilePic: userData.profilePic,
      content,
      imageUrl: imageUrl || '',
      likes: [],
      comments: [],
      createdAt: serverTimestamp()
    });
  };

  const handleUpdatePost = async (postId: string, newContent: string) => {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, { content: newContent });
  };

  const handleLikePost = async (postId: string, isLiked: boolean) => {
    if (!userData) return;

    const postRef = doc(db, 'posts', postId);
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const likes = post.likes || [];
    const updatedLikes = isLiked
      ? likes.filter((uid) => uid !== userData.uid)
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
        link: `/posts/${postId}`,
        createdAt: serverTimestamp(),
        isRead: false,
      });
    }
  };

  const handleAddComment = async (text: string, replyToId?: string) => {
    if (!userData || !commentingPost) return;

    const postRef = doc(db, 'posts', commentingPost.id);
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
    await updateDoc(postRef, { comments: updatedComments });

    if (commentingPost.authorUid !== userData.uid) {
      await addDoc(collection(db, 'notifications'), {
        userId: commentingPost.authorUid,
        type: 'comment',
        sourceUserUid: userData.uid,
        sourceUserName: userData.name,
        sourceUserProfilePic: userData.profilePic || '',
        message: `${userData.name} commented on your post: "${text.substring(0, 30)}${
          text.length > 30 ? '...' : ''
        }"`,
        link: `/posts/${commentingPost.id}#comments`,
        createdAt: serverTimestamp(),
        isRead: false,
      });
    }
  };

  const handleReactComment = async (comment: AppComment, emoji: string) => {
    if (!userData || !commentingPost) return;

    const postRef = doc(db, 'posts', commentingPost.id);
    const post = posts.find((p) => p.id === commentingPost.id);
    if (!post) return;

    const updatedComments = (post.comments || []).map(c => {
      // Small check: new comments might not have IDs if they were legacy, but we use text/author as fallback if no ID
      const isMatch = c.id ? c.id === comment.id : (c.text === comment.text && c.authorUid === comment.authorUid);
      
      if (isMatch) {
        const reactions = { ...(c.reactions || {}) };
        const hasReactedWithThis = reactions[emoji]?.includes(userData.uid);
        
        // Remove user from ALL existing reactions in this comment
        Object.keys(reactions).forEach(key => {
          reactions[key] = (reactions[key] || []).filter(id => id !== userData.uid);
          if (reactions[key].length === 0) delete reactions[key];
        });

        if (!hasReactedWithThis) {
          // Add to the new emoji
          reactions[emoji] = [...(reactions[emoji] || []), userData.uid];
        }
        
        return { ...c, reactions };
      }
      return c;
    });

    await updateDoc(postRef, { comments: updatedComments });
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-burgundy mx-auto mb-4"></div>
          <p className="text-brand-ebony font-serif italic">Gathering the tribe...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return <SignedOutView user={user} signOut={signOut} />;
  }

  return (
    <div className="min-h-screen transition-all duration-300">
      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-8 pb-12 w-full">
        {/* Feed Header */}
        <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-1 bg-brand-burgundy rounded-full" />
            <h1 className="text-3xl font-serif font-bold text-brand-ebony tracking-tight">The Feed</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
               onClick={() => setIsRightSidebarOpen(true)}
               className="flex items-center justify-center p-2 sm:px-4 sm:py-2 bg-brand-burgundy/10 text-brand-burgundy rounded-xl sm:rounded-full text-sm font-bold hover:bg-brand-burgundy/20 transition-all border border-brand-burgundy/20 shadow-sm"
               title="Suggestions & Trending"
            >
               <Menu className="w-5 h-5" />
               <span className="hidden sm:inline tracking-wider uppercase text-xs sm:ml-2">Discover</span>
            </button>
            <NotificationBell />
          </div>
        </div>

        {/* Create Post Button Area */}
        <div className="bg-brand-parchment/40 rounded-2xl border border-brand-ebony/10 p-5 mb-8 shadow-sm backdrop-blur-sm group hover:border-brand-burgundy/20 transition-all duration-300">
          <div className="flex items-start gap-4 mb-4">
            <img
              src={userData.profilePic || `https://placehold.co/100x100/EFEFEFF/3D2B27?text=${userData.name.substring(0, 1)}`}
              alt={userData.name}
              className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
            />
            <button
              onClick={() => setShowCreatePost(true)}
              className="flex-1 text-left px-5 py-3 bg-white/60 hover:bg-white border border-brand-ebony/10 rounded-xl text-brand-ebony/40 transition-all font-medium group-hover:shadow-inner"
            >
              Share something with your fellow alumni...
            </button>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-brand-ebony/5">
            <div className="flex gap-2">
              <button onClick={() => setShowCreatePost(true)} className="p-2.5 text-brand-ebony/30 hover:text-brand-burgundy hover:bg-brand-burgundy/5 rounded-xl transition-all">
                <Camera className="w-5 h-5" />
              </button>
              <button onClick={() => setShowCreatePost(true)} className="p-2.5 text-brand-ebony/30 hover:text-brand-burgundy hover:bg-brand-burgundy/5 rounded-xl transition-all">
                <ImageIcon className="w-5 h-5" />
              </button>
              <button onClick={() => setShowCreatePost(true)} className="p-2.5 text-brand-ebony/30 hover:text-brand-burgundy hover:bg-brand-burgundy/5 rounded-xl transition-all">
                <Paperclip className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => setShowCreatePost(true)}
              className="px-8 py-2 bg-brand-burgundy text-white rounded-xl font-bold hover:bg-[#5a2427] transition-all shadow-md shadow-brand-burgundy/20 hover:shadow-lg active:scale-95"
            >
              Post
            </button>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-4">
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
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <p className="text-gray-500">No posts yet. Be the first to share something!</p>
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
