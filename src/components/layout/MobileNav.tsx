'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, User, MessageSquare, Briefcase, Calendar, Store } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessaging } from '@/contexts/MessagingContext';
import { ComingSoonModal } from '../modals/ComingSoonModal';

export function MobileNav() {
    const { userData } = useAuth();
    const { totalUnreadCount } = useMessaging();
    const pathname = usePathname();
    const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);

    if (!userData || pathname.startsWith('/admin') || pathname === '/login' || pathname === '/signup') return null;

    const navItems = [
        { name: 'Home',     href: '/',         icon: Home },
        { name: 'Messages', href: '/messages', icon: MessageSquare },
        { name: 'Market',   href: '#',         icon: Store, isMarketplace: true },
        { name: 'Jobs',     href: '/jobs',     icon: Briefcase },
        { name: 'Events',   href: '/events',   icon: Calendar },
        { name: 'Network',  href: '/network',  icon: Users },
        { name: 'Profile',  href: '/profile',  icon: User },
    ];

    return (
        <>
            <ComingSoonModal 
                isOpen={isMarketplaceOpen} 
                onClose={() => setIsMarketplaceOpen(false)} 
                featureName="Marketplace" 
            />
            
            <div className="fixed bottom-4 left-3 right-3 md:hidden z-50">
                <div
                    className="flex justify-around items-center px-1 py-1 rounded-2xl shadow-2xl bg-[var(--brand-surface)] backdrop-blur-3xl border border-[var(--brand-border)]"
                    style={{
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.05)',
                    }}
                >
                    {navItems.map((item) => {
                        const isActive = pathname === item.href.split('?')[0];
                        
                        const content = (
                            <div className="relative flex flex-col items-center justify-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all duration-200">
                                <div className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 ${
                                    isActive
                                        ? 'bg-brand-burgundy shadow-[0_4px_12px_rgba(99,102,241,0.40)]'
                                        : 'hover:bg-brand-parchment dark:hover:bg-white/8'
                                }`}>
                                    <item.icon className={`h-4 w-4 transition-colors ${isActive ? 'text-white' : 'text-brand-ebony/50'}`} />

                                    {item.name === 'Messages' && totalUnreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-70" />
                                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border border-white dark:border-brand-parchment text-[7px] text-white items-center justify-center font-bold">
                                                {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                                            </span>
                                        </span>
                                    )}
                                </div>
                                <span className={`text-[8px] font-black uppercase tracking-wider transition-colors ${
                                    isActive ? 'text-brand-burgundy' : 'text-brand-ebony/40 dark:text-brand-ebony/60'
                                }`}>
                                    {item.name}
                                </span>
                            </div>
                        );

                        if (item.isMarketplace) {
                            return (
                                <button key={item.name} onClick={() => setIsMarketplaceOpen(true)} className="flex flex-col items-center">
                                    {content}
                                </button>
                            );
                        }

                        return (
                            <Link key={item.name} href={item.href}>
                                {content}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
