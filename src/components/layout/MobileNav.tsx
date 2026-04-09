'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, User, MessageSquare, Briefcase, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessaging } from '@/contexts/MessagingContext';

const navigation = [
    { name: 'Home',     href: '/',         icon: Home },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'Events',   href: '/events',   icon: Calendar },
    { name: 'Jobs',     href: '/jobs',     icon: Briefcase },
    { name: 'Network',  href: '/network',  icon: Users },
    { name: 'Profile',  href: '/profile',  icon: User },
];

export function MobileNav() {
    const { userData } = useAuth();
    const { totalUnreadCount } = useMessaging();
    const pathname = usePathname();

    if (!userData || pathname.startsWith('/admin') || pathname === '/login' || pathname === '/signup') return null;

    return (
        /* Floating pill nav */
        <div className="fixed bottom-4 left-3 right-3 md:hidden z-50">
            <div
                className="flex justify-around items-center px-2 py-2 rounded-2xl shadow-2xl"
                style={{
                    background: 'rgba(244,246,255,0.88)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(99,102,241,0.18)',
                    boxShadow: '0 8px 32px rgba(79,70,229,0.15), 0 2px 8px rgba(0,0,0,0.08)',
                }}
            >
                {/* Dark mode override inline since we need inline styles */}
                <style>{`
                  @media (prefers-color-scheme: dark) {}
                  .dark .mob-nav-wrap {
                    background: rgba(9,14,28,0.92) !important;
                    border-color: rgba(129,140,248,0.12) !important;
                  }
                `}</style>

                {navigation.map((item) => {
                    const isActive = pathname === item.href.split('?')[0];
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="relative flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200"
                        >
                            <div className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 ${
                                isActive
                                    ? 'bg-brand-burgundy shadow-[0_4px_12px_rgba(99,102,241,0.40)]'
                                    : 'hover:bg-brand-parchment dark:hover:bg-white/8'
                            }`}>
                                <item.icon className={`h-[18px] w-[18px] transition-colors ${isActive ? 'text-white' : 'text-brand-ebony/50'}`} />

                                {/* Unread badge */}
                                {item.name === 'Messages' && totalUnreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-70" />
                                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border border-white dark:border-brand-parchment text-[7px] text-white items-center justify-center font-bold">
                                            {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                                        </span>
                                    </span>
                                )}
                            </div>
                            <span className={`text-[9px] font-semibold tracking-wide transition-colors ${
                                isActive ? 'text-brand-burgundy' : 'text-brand-ebony/40'
                            }`}>
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
