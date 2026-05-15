'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  collection, query, orderBy, onSnapshot, addDoc,
  serverTimestamp, doc, updateDoc, getDocs, limit, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LobbyPost, Poll, PollOption, MediaAttachment, User } from '@/types';
import {
  Globe2, Pin, Heart, Send, Lock, Tag, Loader2,
  Image as ImageIcon, Video as VideoIcon, FileText, BarChart3,
  Plus, Trash2, Download, Play, X, MessageSquare, Share2, Pencil
} from 'lucide-react';
import { uploadMedia, uploadVideo, uploadFile } from '@/lib/media';
import { EmojiPicker } from '../ui/EmojiPicker';
import { EmojiRenderer } from '../ui/EmojiRenderer';

// ── Helpers ───────────────────────────────────────────────────────────────
const CommentEditUI = ({ editText, setEditText, onCancel, onSave }: any) => (
  <div className="mt-1 space-y-2">
    <div className="relative group">
      <div className="w-full min-h-[60px] p-3 bg-white/50 border border-violet-100 rounded-lg focus-within:border-violet-300 transition-all relative overflow-hidden">
        <div className="absolute inset-0 p-3 text-xs leading-relaxed whitespace-pre-wrap break-words pointer-events-none select-none overflow-hidden" aria-hidden="true">
          <EmojiRenderer text={editText || ' '} />
        </div>
        <textarea 
          value={editText} 
          onChange={e => setEditText(e.target.value)}
          className="w-full bg-transparent border-none outline-none focus:ring-0 p-0 text-xs leading-relaxed resize-none relative z-10 text-transparent caret-violet-500 overflow-hidden"
          rows={2}
        />
      </div>
      <div className="absolute right-2 bottom-2 z-20">
        <EmojiPicker onEmojiSelect={(emoji) => setEditText((prev: string) => prev + emoji)} />
      </div>
    </div>
    <div className="flex justify-end gap-2">
      <button onClick={onCancel} className="text-[10px] font-bold text-brand-ebony/40 uppercase">Cancel</button>
      <button onClick={onSave} className="text-[10px] font-bold text-violet-600 uppercase">Save</button>
    </div>
  </div>
);

function timeAgo(ts: any): string {
  try {
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch { return ''; }
}

const TAG_OPTIONS = ['Announcement', 'Collaboration', 'Event', 'Research', 'Achievement', 'General'];

// ── LobbyPostCard ─────────────────────────────────────────────────────────
function LobbyPostCard({ post, currentUid, onLike, onVote, userData }: {
  post: LobbyPost;
  currentUid: string;
  onLike: (post: LobbyPost) => void;
  onVote?: (postId: string, optionId: string) => void;
  userData: User;
}) {
  const isLiked = post.likes?.includes(currentUid);
  const [likeAnim, setLikeAnim] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!carouselRef.current) return;
    const scrollPosition = carouselRef.current.scrollLeft;
    const width = carouselRef.current.clientWidth;
    const newSlide = Math.round(scrollPosition / width);
    if (newSlide !== currentSlide) setCurrentSlide(newSlide);
  };

  const handleLike = () => {
    setLikeAnim(true);
    onLike(post);
    setTimeout(() => setLikeAnim(false), 400);
  };

  const handleComment = async () => {
    if (!commentText.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      const postRef = doc(db, 'lobbyPosts', post.id);
      const newComment = {
        id: Math.random().toString(36).substring(7),
        authorUid: userData.uid,
        authorName: userData.name,
        text: commentText.trim(),
        createdAt: new Date(),
        ...(replyingTo ? { replyToId: replyingTo.id } : {})
      };
      await updateDoc(postRef, {
        comments: arrayUnion(newComment)
      });
      setCommentText('');
      setReplyingTo(null);
    } catch (err) {
      console.error('Error adding comment to lobby post:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      const postRef = doc(db, 'lobbyPosts', post.id);
      // Filter out the comment itself AND any replies to it
      const updatedComments = (post.comments || []).filter((c: any) => c.id !== commentId && c.replyToId !== commentId);
      await updateDoc(postRef, { comments: updatedComments });
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const handleEditComment = async () => {
    if (!editText.trim()) return;
    try {
      const postRef = doc(db, 'lobbyPosts', post.id);
      const updatedComments = (post.comments || []).map((c: any) => 
        c.id === editingCommentId ? { ...c, text: editText.trim(), isEdited: true } : c
      );
      await updateDoc(postRef, { comments: updatedComments });
      setEditingCommentId(null);
      setEditText('');
    } catch (err) {
      console.error('Error editing comment:', err);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/lobby?post=${post.id}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  return (
    <div className={`relative rounded-[1.75rem] border overflow-hidden transition-all duration-500
      hover:shadow-[0_8px_32px_rgba(124,58,237,0.12)] hover:-translate-y-0.5 backdrop-blur-sm
      ${post.isPinned
        ? 'bg-gradient-to-br from-violet-50/80 to-indigo-50/60 dark:from-violet-900/20 dark:to-indigo-900/10 border-violet-300/30'
        : 'bg-white/70 dark:bg-white/5 border-brand-ebony/6 dark:border-white/8'
      }`}
    >
      {/* Pinned top stripe */}
      {post.isPinned && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400" />
      )}

      <div className="p-5 md:p-6">
        {/* Author row */}
        <div className="flex items-start gap-3 mb-4">
          <div className="relative shrink-0">
            <img
              src={post.authorProfilePic || `https://placehold.co/80x80/7c3aed/fff?text=${post.authorName?.charAt(0) || '?'}`}
              alt={post.authorName}
              className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-md"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-violet-500 rounded-full border-2 border-white flex items-center justify-center">
              <Globe2 className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-sm text-brand-ebony">{post.authorName}</span>
              {post.isPinned && (
                <span className="flex items-center gap-1 text-[9px] font-black text-violet-600 bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <Pin className="w-2.5 h-2.5" /> Pinned
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[10px] font-bold text-violet-600 bg-violet-100/60 dark:bg-violet-900/30 px-2 py-0.5 rounded-full">
                {post.authorInstituteName}
              </span>
              <span className="text-[10px] text-brand-ebony/40 font-medium">{timeAgo(post.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-serif font-bold text-lg text-brand-ebony mb-2 leading-snug">
          <EmojiRenderer text={post.title} />
        </h3>

        {/* Content */}
        <p className="text-sm text-brand-ebony/70 leading-relaxed mb-4 whitespace-pre-wrap">
          <EmojiRenderer text={post.content} />
        </p>

        {/* Media Rendering */}
        {post.attachments && post.attachments.length > 0 ? (
          <div className="relative mb-4 -mx-1 group/carousel">
            <div 
              ref={carouselRef}
              onScroll={handleScroll}
              className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide rounded-2xl"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {post.attachments.map((attachment, idx) => (
                <div key={idx} className="w-full shrink-0 snap-center relative border border-brand-ebony/5 bg-black/5 flex items-center justify-center">
                  {attachment.type === 'image' ? (
                    <img src={attachment.url} alt="" className="w-full max-h-[400px] object-contain" />
                  ) : attachment.type === 'video' ? (
                    <video controls className="w-full max-h-[400px] bg-black">
                      <source src={attachment.url} />
                    </video>
                  ) : (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-4 w-full h-[300px] bg-white/50 dark:bg-white/5 hover:bg-white transition-all group text-center"
                    >
                      <FileText className="w-8 h-8 text-blue-500 mb-2" />
                      <span className="text-sm font-bold text-brand-ebony truncate w-full max-w-[200px] px-2">
                        {attachment.name || 'Document'}
                      </span>
                    </a>
                  )}
                </div>
              ))}
            </div>

            {/* Navigation Arrows (Desktop) */}
            {post.attachments.length > 1 && (
              <>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    if (carouselRef.current) {
                      carouselRef.current.scrollBy({ left: -carouselRef.current.clientWidth, behavior: 'smooth' });
                    }
                  }}
                  className={`absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur shadow text-brand-ebony flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity disabled:opacity-0 ${currentSlide === 0 ? 'hidden' : ''}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    if (carouselRef.current) {
                      carouselRef.current.scrollBy({ left: carouselRef.current.clientWidth, behavior: 'smooth' });
                    }
                  }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur shadow text-brand-ebony flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity disabled:opacity-0 ${currentSlide === post.attachments.length - 1 ? 'hidden' : ''}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </button>
                
                {/* Dot Indicators */}
                <div className="absolute -bottom-4 left-0 right-0 flex justify-center gap-1.5 pb-1">
                  {post.attachments.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-4 bg-violet-500' : 'w-1.5 bg-brand-ebony/20'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : post.mediaUrl ? (
          <div className="relative rounded-2xl overflow-hidden mb-4 border border-brand-ebony/5 bg-black/5">
            {post.mediaType === 'video' ? (
              <video controls className="w-full max-h-[500px] bg-black">
                <source src={post.mediaUrl} />
              </video>
            ) : post.mediaType === 'file' ? (
              <a
                href={post.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-white/50 dark:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-bold text-brand-ebony">{post.mediaName || 'Document'}</span>
                </div>
                <Download className="w-4 h-4" />
              </a>
            ) : (
              <img src={post.mediaUrl || post.imageUrl} alt="" className="w-full max-h-[500px] object-contain" />
            )}
          </div>
        ) : null}

        {/* Poll Rendering */}
        {post.poll && (
          <div className="mb-6 space-y-3 bg-white/40 dark:bg-white/5 p-4 rounded-2xl border border-brand-ebony/5">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-violet-500" />
              <span className="text-xs font-black text-brand-ebony/40 uppercase tracking-widest">{post.poll.question}</span>
            </div>
            {post.poll.options.map((option) => {
              const totalVotes = post.poll?.options.reduce((acc, o) => acc + (o.votes?.length || 0), 0) || 1;
              const voteCount = option.votes?.length || 0;
              const percentage = Math.round((voteCount / totalVotes) * 100);
              const hasVoted = option.votes?.includes(currentUid);

              return (
                <div key={option.id} className="relative group">
                  <button
                    onClick={() => onVote?.(post.id, option.id)}
                    disabled={!onVote}
                    className={`relative w-full overflow-hidden rounded-xl border transition-all duration-300 ${
                      hasVoted
                        ? 'border-violet-500/50 bg-violet-500/5'
                        : 'border-brand-ebony/10 bg-white/50 dark:bg-white/5 hover:border-violet-500/30'
                    }`}
                  >
                    {/* Progress Bar */}
                    <div
                      className={`absolute inset-y-0 left-0 transition-all duration-1000 ${
                        hasVoted ? 'bg-violet-500/10' : 'bg-brand-ebony/5'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="relative px-4 py-3 flex items-center justify-between gap-3 text-sm font-bold">
                      <span className={hasVoted ? 'text-violet-600' : 'text-brand-ebony/70'}>{option.text}</span>
                      <span className="text-[10px] text-brand-ebony/40 font-black">{percentage}% ({voteCount})</span>
                    </div>
                  </button>
                </div>
              );
            })}
            <p className="text-[10px] text-brand-ebony/30 font-bold text-center mt-2">
              {post.poll.options.reduce((acc, o) => acc + (o.votes?.length || 0), 0)} total votes
            </p>
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-4">
            {post.tags.map(tag => (
              <span key={tag} className="text-[10px] font-bold text-purple-600 bg-purple-100/60 dark:bg-purple-900/20 border border-purple-200/40 px-2.5 py-1 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer – Actions */}
        <div className="flex flex-col gap-4 pt-3 border-t border-brand-ebony/5">
          <div className="flex items-center gap-2">
            {/* Like */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95
                ${isLiked
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-200/40'
                  : 'bg-brand-parchment/40 dark:bg-white/5 text-brand-ebony/50 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200/30'
                }`}
            >
              <Heart
                className={`w-3.5 h-3.5 transition-transform ${likeAnim ? 'scale-125' : 'scale-100'}`}
                fill={isLiked ? 'currentColor' : 'none'}
              />
              <span>{post.likes?.length || 0}</span>
            </button>

            {/* Comment */}
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-brand-parchment/40 dark:bg-white/5 text-brand-ebony/50 hover:text-violet-500 hover:bg-violet-50 transition-all border border-transparent hover:border-violet-200/30"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{post.comments?.length || 0}</span>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-brand-parchment/40 dark:bg-white/5 text-brand-ebony/50 hover:text-blue-500 hover:bg-blue-50 transition-all border border-transparent hover:border-blue-200/30"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>

          {/* Comment Section */}
          {showComments && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
              {replyingTo && (
                <div className="flex items-center justify-between px-4 py-2 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-100 dark:border-violet-800/30">
                  <p className="text-[10px] font-medium text-violet-600 dark:text-violet-400">
                    Replying to <span className="font-bold">@{replyingTo.authorName}</span>
                  </p>
                  <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-violet-100 dark:hover:bg-violet-800/40 rounded-lg text-violet-400 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex items-start gap-3 w-full">
                <div className="flex-1 relative group">
                  <div className="w-full min-h-[40px] px-4 py-2 bg-white/70 dark:bg-white/5 border border-brand-ebony/10 rounded-xl focus-within:ring-2 focus-within:ring-violet-400/40 transition-all relative overflow-hidden">
                    {/* Mirroring Layer */}
                    <div 
                      className="absolute inset-0 px-4 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words pointer-events-none select-none overflow-hidden"
                      aria-hidden="true"
                    >
                      <EmojiRenderer text={commentText || ' '} />
                      {!commentText && <span className="text-brand-ebony/30">Write a comment...</span>}
                    </div>
                    <textarea
                      value={commentText}
                      onChange={(e) => {
                        setCommentText(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      rows={1}
                      className="w-full bg-transparent border-none outline-none focus:ring-0 p-0 text-xs leading-relaxed resize-none relative z-10 text-transparent caret-violet-500 overflow-hidden"
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleComment())}
                      style={{ minHeight: '24px' }}
                    />
                  </div>
                  <div className="absolute right-2 bottom-1.5 z-20">
                    <EmojiPicker onEmojiSelect={(emoji) => setCommentText(prev => prev + emoji)} />
                  </div>
                </div>
                <button
                  onClick={handleComment}
                  disabled={!commentText.trim() || isSubmittingComment}
                  className="mt-1 p-2 bg-violet-500 text-white rounded-xl hover:bg-violet-600 disabled:opacity-50 transition-all shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {post.comments && post.comments.length > 0 && (
                <div className="space-y-3 pl-2 border-l-2 border-brand-ebony/5">
                  {(() => {
                    const parentComments = (post.comments || []).filter((c: any) => !c.replyToId);
                    const replies = (post.comments || []).filter((c: any) => c.replyToId);

                    return parentComments.map((c: any) => (
                      <div key={c.id} className="space-y-3">
                        <div className="flex flex-col gap-1 group/comm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-brand-ebony uppercase tracking-widest">{c.authorName}</span>
                              <span className="text-[9px] text-brand-ebony/30">{timeAgo(c.createdAt)}</span>
                              {c.isEdited && <span className="text-[8px] text-brand-ebony/20 font-bold uppercase">(Edited)</span>}
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover/comm:opacity-100 transition-opacity">
                              <button onClick={() => setReplyingTo(c)} className="p-1 text-brand-ebony/20 hover:text-violet-500 transition-colors">
                                <MessageSquare className="w-2.5 h-2.5" />
                              </button>
                              {c.authorUid === currentUid && (
                                <>
                                  <button onClick={() => { setEditingCommentId(c.id); setEditText(c.text); }} className="p-1 text-brand-ebony/20 hover:text-violet-500 transition-colors">
                                    <Pencil className="w-2.5 h-2.5" />
                                  </button>
                                  <button onClick={() => handleDeleteComment(c.id)} className="p-1 text-brand-ebony/20 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {editingCommentId === c.id ? (
                            <CommentEditUI 
                              editText={editText} 
                              setEditText={setEditText} 
                              onCancel={() => setEditingCommentId(null)} 
                              onSave={handleEditComment} 
                            />
                          ) : (
                            <p className="text-xs text-brand-ebony/70 whitespace-pre-wrap">
                              <EmojiRenderer text={c.text} />
                            </p>
                          )}
                        </div>

                        {/* Replies */}
                        {replies.filter((r: any) => r.replyToId === c.id).map((r: any) => (
                          <div key={r.id} className="ml-8 pl-4 border-l-2 border-brand-ebony/5 flex flex-col gap-1 group/reply">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-brand-ebony uppercase tracking-widest">{r.authorName}</span>
                                <span className="text-[9px] text-brand-ebony/30">{timeAgo(r.createdAt)}</span>
                                {r.isEdited && <span className="text-[8px] text-brand-ebony/20 font-bold uppercase">(Edited)</span>}
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover/reply:opacity-100 transition-opacity">
                                {r.authorUid === currentUid && (
                                  <>
                                    <button onClick={() => { setEditingCommentId(r.id); setEditText(r.text); }} className="p-1 text-brand-ebony/20 hover:text-violet-500 transition-colors">
                                      <Pencil className="w-2.5 h-2.5" />
                                    </button>
                                    <button onClick={() => handleDeleteComment(r.id)} className="p-1 text-brand-ebony/20 hover:text-red-500 transition-colors">
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-brand-ebony/70 whitespace-pre-wrap">
                              <span className="text-violet-500 font-bold mr-1">@{c.authorName}</span>
                              <EmojiRenderer text={r.text} />
                            </p>
                          </div>
                        ))}
                      </div>
                    )).reverse();
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── CreateLobbyPost ───────────────────────────────────────────────────────
function CreateLobbyPost({ onSubmit }: {
  onSubmit: (title: string, content: string, tags: string[], mediaFiles?: { file: File, type: 'image' | 'video' | 'file' }[], poll?: { question: string, options: string[] }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Media state
  const [mediaFiles, setMediaFiles] = useState<{ file: File, type: 'image' | 'video' | 'file' }[]>([]);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  // Poll state
  const [showPollBuilder, setShowPollBuilder] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  const toggleTag = (tag: string) =>
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map(file => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      const type = isImage ? 'image' : isVideo ? 'video' : 'file';
      return { file, type: type as 'image' | 'video' | 'file' };
    });
    setMediaFiles(prev => [...prev, ...newFiles]);
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addPollOption = () => {
    if (pollOptions.length < 5) setPollOptions([...pollOptions, '']);
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      const pollData = showPollBuilder && pollQuestion.trim() && pollOptions.every(o => o.trim())
        ? { question: pollQuestion, options: pollOptions }
        : undefined;

      await onSubmit(title.trim(), content.trim(), selectedTags, mediaFiles.length > 0 ? mediaFiles : undefined, pollData);
      setTitle(''); setContent(''); setSelectedTags([]);
      setMediaFiles([]); setShowPollBuilder(false); setPollQuestion(''); setPollOptions(['', '']);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="rounded-[1.75rem] border border-violet-200/40 bg-gradient-to-br from-violet-50/60 to-indigo-50/40 dark:from-violet-900/10 dark:to-indigo-900/5 backdrop-blur-sm overflow-hidden mb-7">
      <div className="h-[2px] bg-gradient-to-r from-violet-400 via-purple-500 to-indigo-500" />
      <div className="p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe2 className="w-4 h-4 text-violet-500" />
          <span className="text-xs font-black text-violet-600 uppercase tracking-widest">Broadcast to All Institutes</span>
        </div>

        <div className="relative mb-3">
          <div className="w-full bg-white/70 dark:bg-white/5 border border-violet-200/40 rounded-2xl px-4 py-3 min-h-[46px] flex items-center focus-within:ring-2 focus-within:ring-violet-400/40 transition-all relative overflow-hidden">
            {/* Mirroring Layer */}
            <div 
              className="absolute inset-0 px-4 py-3 pr-12 text-sm font-bold pointer-events-none select-none overflow-hidden flex items-center"
              aria-hidden="true"
            >
              <EmojiRenderer text={title || ' '} />
              {!title && <span className="text-brand-ebony/30">Post title / topic...</span>}
            </div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-transparent border-none outline-none focus:ring-0 p-0 text-sm font-bold relative z-10 text-transparent caret-violet-500"
            />
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20">
            <EmojiPicker onEmojiSelect={(emoji) => setTitle(prev => prev + emoji)} />
          </div>
        </div>

        <div className="relative mb-3">
          <div className="w-full bg-white/70 dark:bg-white/5 border border-violet-200/40 rounded-2xl px-4 py-3 min-h-[100px] focus-within:ring-2 focus-within:ring-violet-400/40 transition-all relative overflow-hidden">
            {/* Mirroring Layer */}
            <div 
              className="absolute inset-0 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words pointer-events-none select-none overflow-hidden"
              aria-hidden="true"
            >
              <EmojiRenderer text={content || ' '} />
              {!content && <span className="text-brand-ebony/30">Share an update, announcement, or collaboration opportunity with all institutes...</span>}
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={3}
              className="w-full h-full bg-transparent border-none outline-none focus:ring-0 p-0 text-sm leading-relaxed resize-none relative z-10 text-transparent caret-violet-500"
              style={{ minHeight: '80px' }}
            />
          </div>
        </div>

        {/* Attachment Previews */}
        {mediaFiles.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {mediaFiles.map((m, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden border border-violet-200 shadow-sm bg-white/50 aspect-video flex items-center justify-center p-2">
                <div className="flex flex-col items-center gap-1 w-full">
                  {m.type === 'image' ? <ImageIcon className="w-4 h-4 text-violet-500" /> :
                   m.type === 'video' ? <VideoIcon className="w-4 h-4 text-violet-500" /> :
                   <FileText className="w-4 h-4 text-violet-500" />}
                  <span className="text-[9px] font-bold text-brand-ebony truncate w-full text-center px-1">{m.file.name}</span>
                </div>
                <button
                  onClick={() => removeMedia(idx)}
                  className="absolute top-1 right-1 p-1 bg-white/90 hover:bg-red-50 text-red-400 rounded-full shadow-sm transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Poll Builder */}
        {showPollBuilder && (
          <div className="mt-4 p-5 bg-white/80 dark:bg-white/5 border border-violet-200 rounded-2xl space-y-4 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-violet-500" />
                <span className="text-xs font-black text-brand-ebony/40 uppercase tracking-widest">Create a Poll</span>
              </div>
              <button onClick={() => setShowPollBuilder(false)} className="text-brand-ebony/30 hover:text-red-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={pollQuestion}
              onChange={e => setPollQuestion(e.target.value)}
              placeholder="Ask a question..."
              className="w-full bg-transparent border-b border-violet-100 py-2 text-sm font-bold placeholder-brand-ebony/20 focus:border-violet-500 outline-none transition-colors"
            />
            <div className="space-y-2">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-violet-200" />
                  <input
                    type="text"
                    value={opt}
                    onChange={e => updatePollOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 bg-white/50 border border-violet-50 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-violet-300"
                  />
                  {pollOptions.length > 2 && (
                    <button onClick={() => removePollOption(i)} className="text-brand-ebony/20 hover:text-red-400 transition-colors p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 5 && (
                <button
                  onClick={addPollOption}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-violet-500 hover:text-violet-600 transition-colors pl-4 mt-2"
                >
                  <Plus className="w-3 h-3" /> Add Option
                </button>
              )}
            </div>
          </div>
        )}

        {/* Post Actions & Tags */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
          <div className="flex flex-wrap gap-1.5">
            {TAG_OPTIONS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full transition-all
                  ${selectedTags.includes(tag)
                    ? 'bg-violet-500 text-white shadow-md shadow-violet-500/20'
                    : 'bg-white/60 dark:bg-white/5 text-brand-ebony/60 border border-brand-ebony/10 hover:border-violet-300 hover:text-violet-600'
                  }`}
              >
                <Tag className="w-2.5 h-2.5" />{tag}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white/60 rounded-xl border border-violet-100 p-1">
              <input
                type="file"
                ref={mediaInputRef}
                className="hidden"
                onChange={handleFileSelect}
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
              />
              <button
                onClick={() => {
                  if (mediaInputRef.current) {
                    mediaInputRef.current.accept = "image/*";
                    mediaInputRef.current.click();
                  }
                }}
                className="p-2 hover:bg-violet-50 text-brand-ebony/40 hover:text-violet-500 rounded-lg transition-all"
                title="Add Images"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (mediaInputRef.current) {
                    mediaInputRef.current.accept = "video/*";
                    mediaInputRef.current.click();
                  }
                }}
                className="p-2 hover:bg-violet-50 text-brand-ebony/40 hover:text-violet-500 rounded-lg transition-all"
                title="Add Videos"
              >
                <VideoIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (mediaInputRef.current) {
                    mediaInputRef.current.accept = ".pdf,.doc,.docx,.txt";
                    mediaInputRef.current.click();
                  }
                }}
                className="p-2 hover:bg-violet-50 text-brand-ebony/40 hover:text-violet-500 rounded-lg transition-all"
                title="Add Documents"
              >
                <FileText className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-violet-100 mx-1" />
              <button
                onClick={() => setShowPollBuilder(true)}
                className={`p-2 rounded-lg transition-all ${
                  showPollBuilder ? 'bg-violet-500 text-white shadow-sm' : 'hover:bg-violet-50 text-brand-ebony/40 hover:text-violet-500'
                }`}
                title="Create Poll"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-violet-100 mx-1" />
              <EmojiPicker onEmojiSelect={(emoji) => setContent(prev => prev + emoji)} />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!title.trim() || !content.trim() || submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-violet-500/20 hover:brightness-110 active:scale-[0.97] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Broadcast
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main InstituteLobby ───────────────────────────────────────────────────
export function InstituteLobby() {
  const { userData } = useAuth();
  const [posts, setPosts] = useState<LobbyPost[]>([]);
  const [loading, setLoading] = useState(true);

  const isInsAdmin = userData?.isinsadmin === true;

  // ── Fetch lobby posts ──
  // ONLY order by createdAt — no composite index required.
  // Pinned posts are floated to the top client-side.
  useEffect(() => {
    const q = query(
      collection(db, 'lobbyPosts'),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const unsub = onSnapshot(
      q,
      snap => {
        console.log('[Lobby] Received snap, size:', snap.size);
        const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as LobbyPost));
        fetched.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return 0;
        });
        setPosts(fetched);
        setLoading(false);
      },
      err => {
        console.error('[Lobby] FETCH PERMISSION ERROR:', err.code, err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // ── Like / unlike ──
  const handleLike = async (post: LobbyPost) => {
    if (!userData) return;
    const uid = userData.uid;
    const newLikes = post.likes.includes(uid)
      ? post.likes.filter(l => l !== uid)
      : [...post.likes, uid];
    // Optimistic update
    setPosts(cur => cur.map(p => p.id === post.id ? { ...p, likes: newLikes } : p));
    updateDoc(doc(db, 'lobbyPosts', post.id), { likes: newLikes })
      .then(() => console.log('[Lobby] Like updated successfully'))
      .catch(err => console.error('[Lobby] LIKE PERMISSION ERROR:', err.code, err.message));
  };

  // ── Vote in a poll ──
  const handleVote = async (postId: string, optionId: string) => {
    if (!userData) return;
    const uid = userData.uid;
    const post = posts.find(p => p.id === postId);
    if (!post || !post.poll) return;

    // Check if already voted for THIS option (to toggle) or another option
    const options = post.poll.options.map(opt => {
      if (opt.id === optionId) {
        return {
          ...opt,
          votes: opt.votes?.includes(uid) ? opt.votes.filter(v => v !== uid) : [...(opt.votes || []), uid]
        };
      } else {
        // Remove vote from other options (single choice poll)
        return {
          ...opt,
          votes: opt.votes?.filter(v => v !== uid) || []
        };
      }
    });

    // Optimistic UI
    setPosts(cur => cur.map(p => p.id === postId ? { ...p, poll: { ...p.poll!, options } } : p));

    updateDoc(doc(db, 'lobbyPosts', postId), { 'poll.options': options })
      .catch(err => console.error('[Lobby] VOTE ERROR:', err));
  };

  // ── Notify ALL users across all institutes ──
  // Uses a simple getDocs(collection) — no index needed, no where() clause.
  const notifyAllInstitutes = async (postId: string, instituteName: string, title: string) => {
    try {
      let otherUsers: any[] = [];
      try {
        // Fetch a limited set of users to notify. 
        // Note: Broad collection reads on 'users' can hit permission limits if not careful.
        const snap = await getDocs(query(collection(db, 'users'), limit(50)));
        otherUsers = snap.docs
          .map(d => ({ uid: d.id, ...(d.data() as any) }))
          .filter(u => u.uid !== userData?.uid);
      } catch (queryErr) {
        console.error('[Lobby] Error fetching user list for notifications:', queryErr);
        // Fallback: Continue without notifying others if user list is restricted
        return;
      }

      await Promise.allSettled(
        otherUsers.map(u =>
          addDoc(collection(db, 'notifications'), {
            userId: u.uid,
            type: 'lobby_post',
            sourceUserUid: userData?.uid || '',
            sourceUserName: instituteName,
            sourceUserProfilePic: userData?.profilePic || '',
            message: `has posted "${title}" in the Institute Lobby`,
            link: `/lobby`,
            createdAt: serverTimestamp(),
            isRead: false,
            instituteId: u.instituteId || '',
          })
        )
      );
    } catch (err) {
      console.error('[Lobby] notification error:', err);
    }
  };

  const handleCreate = async (
    title: string,
    content: string,
    tags: string[],
    mediaFiles?: { file: File, type: 'image' | 'video' | 'file' }[],
    poll?: { question: string, options: string[] }
  ) => {
    if (!userData) return;
    const instituteName = userData.instituteName || userData.instituteId || 'Unknown Institute';

    const attachments: MediaAttachment[] = [];

    if (mediaFiles && mediaFiles.length > 0) {
      const uploadPromises = mediaFiles.map(async (m) => {
        let url = '';
        if (m.type === 'image') url = await uploadMedia(m.file) || '';
        else if (m.type === 'video') url = await uploadVideo(m.file, 'lobby/videos') || '';
        else if (m.type === 'file') url = await uploadFile(m.file, 'lobby/docs') || '';
        
        if (url) {
          attachments.push({ url, type: m.type, name: m.file.name });
        }
      });
      await Promise.all(uploadPromises);
    }

    const payload: Omit<LobbyPost, 'id'> = {
      authorUid: userData.uid,
      authorName: userData.name,
      authorInstituteName: instituteName,
      authorInstituteId: userData.instituteId || '',
      authorProfilePic: userData.profilePic,
      title,
      content,
      likes: [],
      createdAt: serverTimestamp() as any,
      isPinned: false,
      tags,
      attachments,
      poll: poll ? {
        question: poll.question,
        options: poll.options.map((opt, i) => ({ id: `opt-${i}-${Date.now()}`, text: opt, votes: [] })),
        totalVotes: 0
      } : undefined
    };

    const ref = await addDoc(collection(db, 'lobbyPosts'), payload);
    notifyAllInstitutes(ref.id, instituteName, title);
  };

  if (!userData) return null;

  return (
    <section id="institute-lobby">
      {/* ── Hero header ── */}
      <div className="relative mb-7 overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 p-7 shadow-xl">
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-white/50 text-[10px] font-extrabold uppercase tracking-[0.3em]">Live · Cross-Institute</span>
            </div>
            <h2 className="text-3xl font-serif font-bold text-white flex items-center gap-3">
              Institute Lobby
              <Globe2 className="w-6 h-6 text-violet-300 animate-pulse" />
            </h2>
            <p className="text-white/50 text-xs font-medium mt-1.5">
              A shared space where all institutes communicate publicly
            </p>
          </div>

          {isInsAdmin ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-400/20 border border-emerald-400/30 rounded-2xl">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-300 text-[11px] font-black uppercase tracking-widest">Admin Access</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/10 rounded-2xl">
              <Lock className="w-3.5 h-3.5 text-white/50" />
              <span className="text-white/50 text-[11px] font-black uppercase tracking-widest">Read Only</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Create form – institute admins only ── */}
      {isInsAdmin && <CreateLobbyPost onSubmit={handleCreate} />}

      {/* ── Info strip for non-admins ── */}
      {!isInsAdmin && (
        <div className="flex items-center gap-3 px-5 py-3.5 bg-violet-50/60 dark:bg-violet-900/10 border border-violet-200/30 rounded-2xl mb-6 text-xs text-violet-600 font-medium">
          <Lock className="w-4 h-4 shrink-0" />
          Only your institute's admin can post here. You can read and like posts from every institute.
        </div>
      )}

      {/* ── Posts feed ── */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-[1.75rem] border border-brand-ebony/5 bg-white/60 p-6 animate-pulse">
              <div className="flex gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-violet-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-violet-100 rounded-full w-1/3" />
                  <div className="h-2.5 bg-violet-50 rounded-full w-1/4" />
                </div>
              </div>
              <div className="h-4 bg-violet-100 rounded-full w-2/3 mb-3" />
              <div className="space-y-2">
                <div className="h-3 bg-violet-50 rounded-full w-full" />
                <div className="h-3 bg-violet-50 rounded-full w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-violet-200/40 bg-white/40 dark:bg-white/[0.03] p-16 text-center">
          <div className="w-16 h-16 bg-violet-100/60 rounded-[1.25rem] flex items-center justify-center mx-auto mb-4">
            <Globe2 className="w-7 h-7 text-violet-400" />
          </div>
          <h3 className="text-xl font-serif font-bold text-brand-ebony mb-2">The Lobby is quiet...</h3>
          <p className="text-sm text-brand-ebony/45">
            {isInsAdmin
              ? 'Be the first institute to post something here.'
              : 'No institute has posted yet. Check back soon.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {posts.map(post => (
            <LobbyPostCard
              key={post.id}
              post={post}
              currentUid={userData.uid}
              onLike={handleLike}
              onVote={handleVote}
              userData={userData}
            />
          ))}
        </div>
      )}
    </section>
  );
}
