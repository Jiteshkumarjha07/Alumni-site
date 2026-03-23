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
import { PenSquare, Camera, Image as ImageIcon, Paperclip } from 'lucide-react';
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

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(fetchedPosts);
      setLoading(false);
    });

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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-brand-parchment/80 rounded-2xl shadow-xl max-w-sm w-full mx-4 border border-brand-ebony/10">
          <div className="w-16 h-16 bg-brand-burgundy/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">🤝</span>
          </div>
          <h2 className="text-2xl font-serif font-bold mb-4 text-brand-ebony">Welcome back!</h2>

          {user ? (
            <>
              <p className="text-brand-ebony/70 mb-6">
                We found your account, but your profile details are missing.
                This usually happens if the final step of registration was interrupted.
              </p>
              <div className="flex flex-col gap-3">
                <Link href="/signup" className="w-full px-6 py-3 bg-brand-burgundy text-white rounded-lg font-semibold hover:bg-[#5a2427] transition text-center">
                  Create Profile
                </Link>
                <button
                  onClick={() => signOut()}
                  className="w-full px-6 py-3 border border-brand-ebony/20 text-brand-ebony/80 rounded-lg hover:bg-brand-ebony/5 transition"
                >
                  Log Out & Try Again
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-brand-ebony/70 mb-6">Connect with fellow alumni from Loyola School Jamshedpur.</p>
              <div className="space-y-3">
                <Link href="/login" className="block w-full px-6 py-3 bg-brand-burgundy text-white rounded-lg font-semibold hover:bg-[#5a2427] transition text-center">
                  Log In
                </Link>
                <Link href="/signup" className="block w-full px-6 py-3 border border-brand-burgundy/30 text-brand-burgundy rounded-lg font-semibold hover:bg-brand-burgundy/5 transition text-center">
                  Sign Up
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pt-8">
      {/* Feed Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-1 bg-brand-burgundy rounded-full" />
          <h1 className="text-3xl font-serif font-bold text-brand-ebony tracking-tight">The Feed</h1>
        </div>
        <div className="text-[10px] font-bold text-brand-gold uppercase tracking-[0.3em] bg-brand-gold/5 px-4 py-1.5 rounded-full border border-brand-gold/20 shadow-inner">
          Premium Alumni Network
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
          comments={posts.find(p => p.id === commentingPost.id)?.comments || []}
          postAuthor={commentingPost.authorName}
          currentUserUid={userData.uid}
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
