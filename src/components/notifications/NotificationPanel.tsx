'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  collection, query, where,
  onSnapshot, updateDoc, doc, addDoc, arrayUnion, arrayRemove, serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Notification } from '@/types';
import { Bell, Heart, MessageCircle, UserPlus, CheckCheck, X, Check } from 'lucide-react';
import Link from 'next/link';

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
  if (type === 'like') return <Heart className="w-4 h-4 text-red-400" fill="currentColor" />;
  if (type === 'comment') return <MessageCircle className="w-4 h-4 text-blue-400" />;
  if (type === 'connection_request') return <UserPlus className="w-4 h-4 text-brand-gold" />;
  if (type === 'connection_accepted') return <Check className="w-4 h-4 text-green-400" />;
  return <Bell className="w-4 h-4 text-slate-400" />;
}

export function NotificationBell() {
  const { userData } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userData?.uid) return;
    // Simple query — no orderBy/limit so no composite index needed
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userData.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Notification))
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

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unread = notifications.filter(n => !n.isRead).length;

  const markAllRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.isRead);
    await Promise.all(
      unreadNotifs.map(n => updateDoc(doc(db, 'notifications', n.id), { isRead: true }))
    );
  };

  const markRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { isRead: true });
  };

  const handleAccept = async (notif: Notification) => {
    if (!userData) return;
    const requesterId = notif.sourceUserUid;
    try {
      await updateDoc(doc(db, 'users', userData.uid), {
        pendingRequests: arrayRemove(requesterId),
        connections: arrayUnion(requesterId),
      });
      await updateDoc(doc(db, 'users', requesterId), {
        sentRequests: arrayRemove(userData.uid),
        connections: arrayUnion(userData.uid),
      });
      await updateDoc(doc(db, 'notifications', notif.id), {
        type: 'connection_accepted',
        message: 'You are now connected.',
        isRead: true,
      });
      await addDoc(collection(db, 'notifications'), {
        userId: requesterId,
        type: 'connection_accepted',
        sourceUserUid: userData.uid,
        sourceUserName: userData.name,
        sourceUserProfilePic: userData.profilePic || '',
        message: 'accepted your connection request.',
        createdAt: serverTimestamp(),
        isRead: false,
      });
    } catch (err) {
      console.error('Accept error:', err);
    }
  };

  const handleIgnore = async (notif: Notification) => {
    if (!userData) return;
    try {
      await updateDoc(doc(db, 'users', userData.uid), {
        pendingRequests: arrayRemove(notif.sourceUserUid),
      });
      await updateDoc(doc(db, 'notifications', notif.id), { isRead: true, message: 'Request declined.' });
    } catch (err) {
      console.error('Ignore error:', err);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-brand-burgundy/10 hover:bg-brand-burgundy/20 border border-brand-burgundy/20 text-brand-burgundy transition-all shadow-sm"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Drop-down panel */}
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[calc(100vw-32px)] sm:w-[380px] max-h-[520px] flex flex-col bg-brand-parchment border border-brand-ebony/20 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-brand-ebony/10 flex-shrink-0 bg-brand-parchment/95 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-burgundy" />
              <span className="text-brand-ebony font-bold text-sm">Notifications</span>
              {unread > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unread}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={markAllRead}
                className="text-xs text-brand-ebony/40 hover:text-brand-burgundy flex items-center gap-1 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
              <button onClick={() => setOpen(false)} className="text-brand-ebony/40 hover:text-brand-ebony transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Bell className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markRead(notif.id)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-brand-ebony/5 hover:bg-brand-burgundy/5 transition-colors cursor-pointer ${
                    !notif.isRead ? 'bg-brand-burgundy/5' : ''
                  }`}
                >
                  {/* Avatar */}
                  <Link href={`/profile/${notif.sourceUserUid}`} onClick={e => e.stopPropagation()}>
                    <img
                      src={notif.sourceUserProfilePic || `https://placehold.co/40x40/3D2B27/fff?text=${notif.sourceUserName?.charAt(0) || '?'}`}
                      alt={notif.sourceUserName}
                      className="w-10 h-10 rounded-full object-cover border border-white/10 flex-shrink-0 hover:opacity-80 transition-opacity"
                    />
                  </Link>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-brand-ebony leading-snug">
                        <Link href={`/profile/${notif.sourceUserUid}`} className="font-bold hover:text-brand-burgundy transition-colors" onClick={e => e.stopPropagation()}>
                          {notif.sourceUserName}
                        </Link>{' '}
                        <span className="text-brand-ebony/60">{notif.message}</span>
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                        <NotifIcon type={notif.type} />
                        {!notif.isRead && <span className="w-1.5 h-1.5 rounded-full bg-brand-burgundy flex-shrink-0" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{timeAgo(notif.createdAt)}</p>

                    {/* Connection request actions */}
                    {notif.type === 'connection_request' && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAccept(notif); }}
                          className="text-xs font-bold text-white bg-brand-burgundy hover:bg-[#5a2427] px-3 py-1 rounded-full transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleIgnore(notif); }}
                          className="text-xs font-bold text-white/60 hover:bg-white/10 px-3 py-1 rounded-full transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {/* Post link */}
                    {notif.link && notif.type !== 'connection_request' && notif.type !== 'connection_accepted' && (
                      <Link
                        href={notif.link}
                        onClick={e => e.stopPropagation()}
                        className="inline-block mt-1 text-[11px] text-brand-gold hover:text-brand-gold/70 transition-colors"
                      >
                        View post →
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
