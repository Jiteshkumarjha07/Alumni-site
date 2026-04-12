'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import { useUI } from '@/contexts/UIContext';
import Link from 'next/link';

// ── Bidirectional Fade Scroll Animation ────────────────────────────────
const EASE_IN  = 'cubic-bezier(0.22, 1, 0.36, 1)';   // spring settle
const EASE_OUT = 'cubic-bezier(0.4, 0, 0.6, 1)';      // smooth fade out

type CardState = 'below' | 'visible' | 'above';

function ScrollRevealCard({ children, index = 0 }: { children: React.ReactNode; index?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<CardState>('below');
  // Track whether a stagger delay has already played (only first appearance)
  const hasStaggered = useRef(false);
  const [shouldDelay, setShouldDelay] = useState(false);
  const hasBeenVisible = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          hasBeenVisible.current = true;
          if (!hasStaggered.current) {
            setShouldDelay(true);
            hasStaggered.current = true;
          } else {
            setShouldDelay(false);
          }
          setState('visible');
        } else {
          if (!hasBeenVisible.current) return; // never shown yet — stay 'below'
          const rect = entry.boundingClientRect;
          if (rect.top < 0) {
            // Card exited above viewport (user scrolled DOWN past it)
            setState('above');
          } else {
            // Card exited below viewport (user scrolled UP past it)
            setState('below');
          }
        }
      },
      // Negative rootMargin triggers fade-in/out slightly BEFORE the card
      // fully enters/leaves — gives the smooth leading-edge animation feel
      { threshold: 0.05, rootMargin: '0px 0px -40px 0px' }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const entryDelay = shouldDelay ? Math.min(index * 60, 240) : 0;

  const styles: Record<CardState, { opacity: number; transform: string }> = {
    below:   { opacity: 0, transform: 'translateY(40px) scale(0.97)' },
    visible: { opacity: 1, transform: 'translateY(0px)  scale(1)'   },
    above:   { opacity: 0, transform: 'translateY(-20px) scale(0.98)' },
  };

  const isVisible = state === 'visible';
  const current = styles[state];

  return (
    <div
      ref={ref}
      style={{
        opacity: current.opacity,
        transform: current.transform,
        transition: isVisible
          ? `opacity 0.55s ${EASE_IN} ${entryDelay}ms, transform 0.60s ${EASE_IN} ${entryDelay}ms`
          : `opacity 0.30s ${EASE_OUT}, transform 0.34s ${EASE_OUT}`,
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </div>
  );
}
// ───────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user, userData, signOut, loading: authLoading, suspendedUids } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [commentingPost, setCommentingPost] = useState<Post | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const { setFocusMode } = useUI();
  const [newPostCount, setNewPostCount] = useState(0);
  const isFirstLoad = useRef(true);

  // Fetch posts from Firebase
  useEffect(() => {
    if (!userData || !userData.instituteId) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    // Instantly clear the feed when `instituteId` changes to prevent visual bleed from previous institute
    setPosts([]);
    setLoading(true);

    const postsQuery = query(
      collection(db, 'posts'),
      where('instituteId', '==', userData.instituteId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(postsQuery, 
      (snapshot) => {
        const fetchedPosts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data({ serverTimestamps: 'estimate' })
        })) as Post[];

        if (isFirstLoad.current) {
          // First load — no 'new' posts yet
          isFirstLoad.current = false;
          setNewPostCount(0);
        } else {
          // Subsequent updates — count increments
          setNewPostCount(prev => prev + Math.max(0, fetchedPosts.length - posts.length));
        }

        setPosts(fetchedPosts);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching posts:', error);
        setLoading(false); // Still stop loading even on error
      }
    );

    return () => unsubscribe();
  }, [userData?.instituteId]); // Explicitly depend ONLY on changes in instituteId

  const handleCreatePost = async (
    content: string, 
    mediaPayload?: { imageUrl?: string; mediaUrl?: string; mediaType?: 'image' | 'video' | 'file'; fileName?: string }
  ) => {
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
      imageUrl: mediaPayload?.imageUrl || '',
      mediaUrl: mediaPayload?.mediaUrl,
      mediaType: mediaPayload?.mediaType,
      fileName: mediaPayload?.fileName,
      likes: [],
      comments: [],
      instituteId: userData.instituteId || '',
      createdAt: new Date() as any // Temporary visual timestamp
    };
    
    setPosts(current => [newPost, ...current]);

    // Background Firebase operation
    const payloadFields: any = {
      authorUid: userData.uid,
      authorName: userData.name,
      authorBatch: userData.batch || 0,
      authorProfilePic: userData.profilePic || '',
      content,
      imageUrl: mediaPayload?.imageUrl || '',
      likes: [],
      comments: [],
      instituteId: userData.instituteId || '',
      createdAt: serverTimestamp()
    };

    if (mediaPayload?.mediaUrl) payloadFields.mediaUrl = mediaPayload.mediaUrl;
    if (mediaPayload?.mediaType) payloadFields.mediaType = mediaPayload.mediaType;
    if (mediaPayload?.fileName) payloadFields.fileName = mediaPayload.fileName;

    addDoc(collection(db, 'posts'), payloadFields).catch(err => console.error('[page.tsx] Error adding post:', err));
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
      }).catch(err => console.error('[page.tsx] Error adding notification:', err));
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
      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-8 pb-12 space-y-6">
        {/* Skeleton loader */}
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white/60 dark:bg-brand-parchment/10 rounded-[1.75rem] border border-brand-ebony/5 p-6 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-brand-parchment/60" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-brand-parchment/60 rounded-full w-1/3" />
                <div className="h-2.5 bg-brand-parchment/40 rounded-full w-1/4" />
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-3 bg-brand-parchment/50 rounded-full w-full" />
              <div className="h-3 bg-brand-parchment/50 rounded-full w-5/6" />
              <div className="h-3 bg-brand-parchment/50 rounded-full w-4/6" />
            </div>
            {i === 1 && <div className="h-48 bg-brand-parchment/40 rounded-2xl mb-4" />}
            <div className="flex gap-2 pt-3 border-t border-brand-ebony/5">
              {[1, 2, 3].map(j => <div key={j} className="flex-1 h-9 bg-brand-parchment/40 rounded-2xl" />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!userData) {
    return <SignedOutView user={user} signOut={signOut} />;
  }

  return (
    <div className="min-h-screen transition-all duration-300">
      <div className="max-w-3xl mx-auto px-4 md:px-6 pt-6 pb-12 w-full">

        {/* ── Hero Header ── */}
        <div className="relative mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-burgundy via-[#6b1a2a] to-indigo-900 p-8 shadow-2xl">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
          <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px'}} />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-white/50 text-[10px] font-extrabold uppercase tracking-[0.3em]">Live Feed</span>
              </div>
              <h1 className="text-[2.5rem] font-serif font-bold text-white tracking-tight leading-none flex items-center gap-3">
                The Feed
                <Sparkles className="w-7 h-7 text-brand-gold animate-pulse" />
              </h1>
              <p className="text-white/40 text-xs font-semibold mt-1.5 tracking-wider">
                {newPostCount > 0
                  ? <><span className="text-emerald-400 font-extrabold">{newPostCount} new</span> · {posts.length} total in your network</>
                  : <>{posts.length} update{posts.length !== 1 ? 's' : ''} from your network</>}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => { setIsRightSidebarOpen(true); setFocusMode(true, 'full'); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold transition-all border border-white/10 hover:border-white/20 backdrop-blur-sm group"
              >
                <Users className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="tracking-[0.1em] uppercase">Connect</span>
              </button>
              <div className="bg-white/10 p-2 rounded-xl border border-white/10 backdrop-blur-sm hover:bg-white/20 transition-all">
                <NotificationBell />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile institute switcher */}
        <div className="md:hidden mb-6">
          <InstituteSwitcher />
        </div>

        {/* ── Create Post Card ── */}
        <div className="group relative bg-white/70 dark:bg-brand-parchment/10 backdrop-blur-sm rounded-[1.75rem] border border-brand-ebony/6 hover:border-brand-burgundy/20 hover:shadow-[0_8px_40px_rgba(79,70,229,0.10)] transition-all duration-500 mb-7 overflow-hidden">
          {/* Hover glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-burgundy/0 to-indigo-500/0 group-hover:from-brand-burgundy/[0.02] group-hover:to-indigo-500/[0.02] transition-all duration-700 pointer-events-none rounded-[1.75rem]" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-burgundy/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative p-5 md:p-6">
            <div className="flex items-center gap-4 mb-5">
              <div className="relative shrink-0">
                <img
                  src={userData.profilePic || `https://placehold.co/100x100/4f46e5/ffffff?text=${userData.name.substring(0, 1)}`}
                  alt={userData.name}
                  className="w-11 h-11 rounded-full ring-2 ring-white shadow-md object-cover"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full shadow-sm" />
              </div>
              <button
                onClick={() => setShowCreatePost(true)}
                className="flex-1 text-left px-5 py-3.5 rounded-2xl text-brand-ebony/40 transition-all font-medium text-sm border border-brand-ebony/8 bg-brand-parchment/30 hover:bg-white/70 hover:border-brand-burgundy/20 hover:text-brand-ebony/60 shadow-sm"
              >
                Share an update with your legacy...
              </button>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-brand-ebony/5">
              <div className="flex gap-1">
                {[
                  { icon: Camera, label: 'Photo' },
                  { icon: ImageIcon, label: 'Video' },
                  { icon: Paperclip, label: 'File' },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    onClick={() => setShowCreatePost(true)}
                    className="flex items-center gap-2 px-3 py-2 text-brand-ebony/40 hover:text-brand-burgundy hover:bg-brand-burgundy/6 rounded-xl transition-all group/btn"
                  >
                    <Icon className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                    <span className="hidden sm:inline text-[11px] font-bold tracking-wide">{label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowCreatePost(true)}
                className="px-7 py-2.5 bg-brand-burgundy text-white rounded-2xl font-bold hover:brightness-110 active:scale-[0.97] transition-all text-[11px] tracking-widest uppercase shadow-lg shadow-brand-burgundy/20 relative overflow-hidden group/post"
              >
                <span className="relative z-10">Post</span>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/post:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Posts Feed ── */}
        <div className="space-y-5">
          {(() => {
            const visiblePosts = posts
              .filter(post => !suspendedUids.has(post.authorUid))
              .map(post => ({
                ...post,
                comments: (post.comments || []).filter(c => !suspendedUids.has(c.authorUid))
              }));

            return visiblePosts.length > 0 ? (
              visiblePosts.map((post, idx) => (
                <ScrollRevealCard key={post.id} index={idx}>
                <PostCard
                  post={post}
                  currentUser={userData}
                  onLike={(isLiked) => handleLikePost(post.id, isLiked)}
                  onComment={() => setCommentingPost(post)}
                  onEdit={() => setEditingPost(post)}
                  onDelete={() => setDeletingPostId(post.id)}
                  onShare={() => setSharingPost(post)}
                />
              </ScrollRevealCard>
            ))
          ) : (
            <div className="relative overflow-hidden rounded-[2rem] border-2 border-dashed border-brand-burgundy/15 bg-white/50 dark:bg-brand-parchment/5 p-16 text-center animate-in fade-in duration-700">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-burgundy/3 to-indigo-500/3" />
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-brand-burgundy/10 to-indigo-500/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <PenSquare className="w-9 h-9 text-brand-burgundy/50" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-brand-ebony mb-2">It&apos;s quiet in here...</h3>
                <p className="text-brand-ebony/45 text-sm mb-8 max-w-xs mx-auto leading-relaxed">Be the first to share a memory, insight, or update with your alumni network.</p>
                <button
                  onClick={() => setShowCreatePost(true)}
                  className="px-8 py-3 bg-brand-burgundy text-white rounded-2xl font-bold hover:brightness-110 transition-all text-sm tracking-wide shadow-lg shadow-brand-burgundy/20"
                >
                  Create First Post
                </button>
              </div>
            </div>
          );
          })()}
        </div>
      </div>

      <RightSidebar
        isOpen={isRightSidebarOpen}
        onClose={() => { setIsRightSidebarOpen(false); setFocusMode(false); }}
      />

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

