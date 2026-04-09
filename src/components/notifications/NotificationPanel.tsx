'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  collection, query, where,
  onSnapshot, updateDoc, doc, addDoc, arrayUnion, arrayRemove, serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Notification } from '@/types';
import { Bell, Heart, MessageCircle, UserPlus, CheckCheck, X, Check, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
  if (type === 'like') return <Heart className="w-4 h-4 text-pink-500" fill="currentColor" />;
  if (type === 'comment') return <MessageCircle className="w-4 h-4 text-brand-burgundy" />;
  if (type === 'connection_request') return <UserPlus className="w-4 h-4 text-brand-gold" />;
  if (type === 'connection_accepted') return <Check className="w-4 h-4 text-emerald-500" />;
  return <Bell className="w-4 h-4 text-brand-ebony/30" />;
}

export function NotificationBell() {
  const { userData } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userData?.uid) return;
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
        link: `/profile/${userData.uid}`,
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

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) markRead(notif.id);
    setOpen(false);
    const destination = notif.link || `/profile/${notif.sourceUserUid}`;
    router.push(destination);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all shadow-sm border ${
          open ? 'bg-gradient-indigo text-white border-transparent' : 'bg-brand-burgundy/5 hover:bg-brand-burgundy/10 border-brand-burgundy/10 text-brand-burgundy'
        }`}
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border border-white dark:border-brand-parchment text-[9px] text-white items-center justify-center font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 z-50 w-[calc(100vw-32px)] sm:w-[400px] max-h-[520px] flex flex-col card-premium shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300 border-brand-burgundy/10">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-brand-ebony/5 flex-shrink-0 bg-white/40 dark:bg-brand-parchment/40 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-brand-burgundy/10 rounded-lg flex items-center justify-center">
                 <Bell className="w-4 h-4 text-brand-burgundy" />
              </div>
              <div>
                <span className="text-brand-ebony font-extrabold text-md tracking-tight">Notifications</span>
                <p className="text-[10px] font-bold text-brand-ebony/30 uppercase tracking-widest mt-0.5">Stay updated with your circle</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={markAllRead}
                className="p-1.5 text-brand-ebony/40 hover:text-brand-burgundy hover:bg-brand-burgundy/10 rounded-lg transition-all"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 text-brand-ebony/40 hover:text-brand-ebony hover:bg-brand-ebony/5 rounded-lg transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 scrollbar-hide bg-white/10 dark:bg-brand-parchment/10">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-16 h-16 bg-brand-ebony/5 rounded-full flex items-center justify-center mb-4 border border-brand-ebony/5">
                   <Bell className="w-8 h-8 text-brand-ebony/10" />
                </div>
                <p className="text-lg font-serif font-bold text-brand-ebony/60 italic mb-1">Silence is golden</p>
                <p className="text-xs text-brand-ebony/40 font-medium">You're all caught up for now.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`flex items-start gap-4 px-5 py-4 border-b border-brand-ebony/5 hover:bg-white dark:hover:bg-brand-ebony/20 transition-all cursor-pointer group/item relative ${
                    !notif.isRead ? 'bg-brand-burgundy/[0.02]' : ''
                  }`}
                >
                  {!notif.isRead && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 bg-gradient-indigo rounded-r-full" />
                  )}
                  
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={notif.sourceUserProfilePic || `https://placehold.co/40x40/4f46e5/fff?text=${notif.sourceUserName?.charAt(0) || '?'}`}
                      alt={notif.sourceUserName}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-brand-parchment shadow-sm group-hover/item:scale-105 transition-transform"
                    />
                    <div className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-[#0f172a] rounded-full shadow-sm ring-2 ring-transparent group-hover/item:ring-brand-burgundy/10 transition-all">
                      <NotifIcon type={notif.type} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-brand-ebony leading-relaxed">
                      <span className="font-extrabold group-hover/item:text-brand-burgundy transition-colors">
                        {notif.sourceUserName}
                      </span>{' '}
                      <span className="text-brand-ebony/60 font-medium">{notif.message}</span>
                    </p>
                    <p className="text-[10px] font-bold text-brand-ebony/30 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                       {timeAgo(notif.createdAt)}
                       {notif.isRead === false && <span className="w-1 h-1 rounded-full bg-brand-burgundy"></span>}
                    </p>

                    {/* Connection request actions */}
                    {notif.type === 'connection_request' && (
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAccept(notif); }}
                          className="text-[10px] font-bold text-white bg-gradient-indigo px-4 py-2 rounded-xl shadow-md hover:shadow-indigo-500/20 transition-all uppercase tracking-widest"
                        >
                          Accept
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleIgnore(notif); }}
                          className="text-[10px] font-bold text-brand-ebony/40 bg-brand-ebony/5 hover:bg-brand-ebony/10 px-4 py-2 rounded-xl transition-all uppercase tracking-widest"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {/* Context Hint */}
                    {notif.link && notif.type !== 'connection_request' && notif.type !== 'connection_accepted' && (
                      <div className="inline-flex items-center mt-3 text-[10px] font-bold uppercase tracking-widest text-brand-burgundy group-hover/item:translate-x-1 transition-transform">
                        Explore detail <ArrowRight size={10} className="ml-1" />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="px-5 py-3 bg-brand-burgundy/5 border-t border-brand-ebony/5 text-center">
             <Link href="/settings" onClick={() => setOpen(false)} className="text-[10px] font-bold text-brand-burgundy/60 hover:text-brand-burgundy uppercase tracking-[0.2em] transition-colors">
                Notification Settings
             </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function ArrowRight({ size, className }: { size: number, className: string }) {
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
    )
}
