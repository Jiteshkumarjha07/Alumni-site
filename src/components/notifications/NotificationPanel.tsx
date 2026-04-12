'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  collection, query, where,
  onSnapshot, updateDoc, doc, addDoc, arrayUnion, arrayRemove, serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Notification } from '@/types';
import { Bell, Heart, MessageCircle, UserPlus, CheckCheck, X, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUI } from '@/contexts/UIContext';

function timeAgo(ts: any): string {
  try {
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return '';
  }
}

function NotifIcon({ type }: { type: string }) {
  if (type === 'like') return <Heart className="w-3.5 h-3.5 text-pink-500" fill="currentColor" />;
  if (type === 'comment') return <MessageCircle className="w-3.5 h-3.5 text-brand-burgundy" />;
  if (type === 'connection_request') return <UserPlus className="w-3.5 h-3.5 text-brand-gold" />;
  if (type === 'connection_accepted') return <Check className="w-3.5 h-3.5 text-emerald-500" />;
  return <Bell className="w-3.5 h-3.5 text-brand-ebony/30" />;
}

export function NotificationBell() {
  const { userData } = useAuth();
  const router = useRouter();
  const { setFocusMode } = useUI();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false); // for portal SSR safety
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const drawerRef = useRef<HTMLDivElement>(null);

  // ── SSR safety: only mount portal on client ──
  useEffect(() => { setMounted(true); }, []);

  // ── stable close handler ──
  const closeDrawer = useCallback(() => {
    setOpen(false);
    setFocusMode(false);
  }, [setFocusMode]);

  // ── Live notifications listener ──
  useEffect(() => {
    if (!userData?.uid) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userData.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Notification))
        .filter(n => n.type !== 'message')   // ← DMs handled by chat badge, not bell
        .sort((a, b) => {
          const ta = a.createdAt?.toDate?.()?.getTime?.() ?? 0;
          const tb = b.createdAt?.toDate?.()?.getTime?.() ?? 0;
          return tb - ta;
        })
        .slice(0, 30);
      setNotifications(list);
    }, (err) => {
      console.error('Notifications query error:', err);
    });
    return () => unsub();
  }, [userData?.uid]);

  // ── Close on outside click — delayed so the opening click doesn't immediately close ──
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        closeDrawer();
      }
    };
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', handler);
    };
  }, [open, closeDrawer]);

  // ── Auto mark-all-read 1.5 s after opening ──
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      const unread = notifications.filter(n => !n.isRead);
      if (!unread.length) return;
      await Promise.all(
        unread.map(n => updateDoc(doc(db, 'notifications', n.id), { isRead: true }))
      ).catch(console.error);
    }, 1500);
    return () => clearTimeout(timer);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────── actions ───────────────────────
  const markAllRead = () => {
    notifications
      .filter(n => !n.isRead)
      .forEach(n => updateDoc(doc(db, 'notifications', n.id), { isRead: true }).catch(console.error));
  };

  const handleAccept = async (notif: Notification) => {
    if (!userData) return;
    try {
      await updateDoc(doc(db, 'users', userData.uid), {
        pendingRequests: arrayRemove(notif.sourceUserUid),
        connections: arrayUnion(notif.sourceUserUid),
      });
      await updateDoc(doc(db, 'users', notif.sourceUserUid), {
        sentRequests: arrayRemove(userData.uid),
        connections: arrayUnion(userData.uid),
      });
      await updateDoc(doc(db, 'notifications', notif.id), {
        type: 'connection_accepted', message: 'You are now connected.', isRead: true,
      });
      await addDoc(collection(db, 'notifications'), {
        userId: notif.sourceUserUid,
        type: 'connection_accepted',
        sourceUserUid: userData.uid,
        sourceUserName: userData.name,
        sourceUserProfilePic: userData.profilePic || '',
        message: 'accepted your connection request.',
        link: `/profile/${userData.uid}`,
        createdAt: serverTimestamp(),
        isRead: false,
      });
    } catch (err) { console.error('Accept error:', err); }
  };

  const handleIgnore = async (notif: Notification) => {
    if (!userData) return;
    try {
      await updateDoc(doc(db, 'users', userData.uid), { pendingRequests: arrayRemove(notif.sourceUserUid) });
      await updateDoc(doc(db, 'notifications', notif.id), { isRead: true, message: 'Request declined.' });
    } catch (err) { console.error('Ignore error:', err); }
  };

  const handleNotificationClick = (notif: Notification) => {
    updateDoc(doc(db, 'notifications', notif.id), { isRead: true }).catch(console.error);
    closeDrawer();
    router.push(notif.link || `/profile/${notif.sourceUserUid}`);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // ─────────────────────── Portal content ───────────────────────
  const drawerPortal = mounted ? createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[200] transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeDrawer}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={`fixed right-0 top-0 h-full w-[22rem] z-[201] flex flex-col transition-transform duration-300 ease-out bg-white dark:bg-gray-900 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderLeft: '1px solid rgba(139,21,56,0.12)',
          boxShadow: open ? '-8px 0 40px rgba(0,0,0,0.25)' : 'none',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-brand-ebony/10 dark:border-white/10 flex-shrink-0 bg-gradient-to-r from-brand-burgundy/5 to-transparent dark:from-brand-burgundy/10 dark:to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-burgundy/10 rounded-2xl flex items-center justify-center">
              <Bell className="w-4 h-4 text-brand-burgundy" />
            </div>
            <div>
              <span className="text-brand-ebony font-extrabold text-[15px] tracking-tight block leading-none">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] text-brand-burgundy font-bold uppercase tracking-wider">
                  {unreadCount} unread
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={markAllRead}
              className="p-2 text-brand-ebony/40 hover:text-brand-burgundy hover:bg-brand-burgundy/10 rounded-xl transition-all"
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
            <button
              onClick={closeDrawer}
              className="p-2 text-brand-ebony/40 hover:text-brand-ebony hover:bg-brand-ebony/5 rounded-xl transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 scrollbar-hide">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-5 bg-gradient-to-br from-brand-burgundy/8 to-indigo-500/8 dark:from-brand-burgundy/15 dark:to-indigo-500/15">
                <Bell className="w-9 h-9 text-brand-ebony/20 dark:text-brand-ebony/40" />
              </div>
              <p className="text-lg font-serif font-bold text-brand-ebony/60 dark:text-brand-ebony/80 italic mb-1">All caught up!</p>
              <p className="text-xs text-brand-ebony/40 dark:text-brand-ebony/60 font-medium">No new activity from your circle.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`flex items-start gap-4 px-5 py-4 border-b border-brand-ebony/5 dark:border-white/5 cursor-pointer group/item relative transition-colors ${
                  !notif.isRead
                    ? 'bg-brand-burgundy/[0.03] hover:bg-brand-burgundy/[0.07] dark:bg-brand-burgundy/10 dark:hover:bg-brand-burgundy/15'
                    : 'hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                {!notif.isRead && (
                  <div className="absolute left-0 top-4 bottom-4 w-[3px] bg-brand-burgundy rounded-r-full" />
                )}
                <div className="relative shrink-0 mt-0.5">
                  <img
                    src={notif.sourceUserProfilePic || `https://placehold.co/40x40/4f46e5/fff?text=${notif.sourceUserName?.charAt(0) || '?'}`}
                    alt={notif.sourceUserName}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm ring-1 ring-brand-ebony/5">
                    <NotifIcon type={notif.type} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-brand-ebony leading-snug">
                    <span className="font-extrabold">{notif.sourceUserName}</span>{' '}
                    <span className="text-brand-ebony/70 dark:text-brand-ebony/80 font-medium">{notif.message}</span>
                  </p>
                  <p className="text-[10px] font-bold text-brand-ebony/40 dark:text-brand-ebony/50 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                    {timeAgo(notif.createdAt)}
                    {!notif.isRead && <span className="w-1.5 h-1.5 rounded-full bg-brand-burgundy inline-block" />}
                  </p>
                  {notif.type === 'connection_request' && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAccept(notif); }}
                        className="text-[10px] font-bold text-white bg-brand-burgundy px-4 py-1.5 rounded-xl hover:brightness-110 transition-all uppercase tracking-widest shadow-sm"
                      >
                        Accept
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleIgnore(notif); }}
                        className="text-[10px] font-bold text-brand-ebony/60 dark:text-brand-ebony/80 bg-brand-ebony/8 dark:bg-white/10 hover:bg-brand-ebony/15 dark:hover:bg-white/20 border border-brand-ebony/10 dark:border-white/10 px-4 py-1.5 rounded-xl transition-all uppercase tracking-widest"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-brand-ebony/10 dark:border-white/10 text-center flex-shrink-0 bg-brand-ebony/[0.015] dark:bg-white/[0.03]">
          <Link
            href="/settings"
            onClick={closeDrawer}
            className="text-[10px] font-bold text-brand-ebony/50 dark:text-brand-ebony/70 hover:text-brand-burgundy uppercase tracking-[0.2em] transition-colors"
          >
            Notification Settings
          </Link>
        </div>
      </div>
    </>,
    document.body
  ) : null;

  // ─────────────────────── render ───────────────────────
  return (
    <>
      {/* Bell button — stays in normal flow, NOT inside drawerRef */}
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          setFocusMode(next, 'partial');
        }}
        className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all shadow-sm border ${
          open
            ? 'bg-brand-burgundy text-white border-transparent shadow-brand-burgundy/30'
            : 'bg-white/15 hover:bg-white/25 border-white/20 text-white'
        }`}
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 pointer-events-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border border-white text-[9px] text-white items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Drawer & Backdrop mounted via Portal at document.body — escapes all transform stacking contexts */}
      {drawerPortal}
    </>
  );
}
