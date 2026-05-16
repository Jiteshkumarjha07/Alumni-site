'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, User, MessageSquare, Briefcase, Calendar, Store, Globe2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
        { name: 'Jobs',     href: '/jobs',     icon: Briefcase },
        { name: 'Events',   href: '/events',   icon: Calendar },
        { name: 'Lobby',    href: '/lobby',    icon: Globe2 },
        { name: 'Network',  href: '/network',  icon: Users },
        { name: 'Market',   href: '#',         icon: Store, isMarketplace: true },
        { name: 'Profile',  href: '/profile',  icon: User },
    ];

    const isMessagesPage = pathname.startsWith('/messages');
    
    return (
        <>
            <ComingSoonModal 
                isOpen={isMarketplaceOpen} 
                onClose={() => setIsMarketplaceOpen(false)} 
                featureName="Marketplace" 
            />
            
            <div className={`fixed inset-x-0 ${isMessagesPage ? 'bottom-0' : 'bottom-4'} md:hidden z-50 transition-all duration-300 flex justify-center`}>
                <div
                    className={`${isMessagesPage ? 'w-full' : 'w-[calc(100%-1.5rem)]'} flex justify-around items-center px-1 py-1 bg-[var(--brand-surface)] backdrop-blur-3xl border-t border-[var(--brand-border)] ${isMessagesPage ? 'rounded-none' : 'rounded-2xl shadow-2xl border'} max-w-none`}
                    style={!isMessagesPage ? {
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.05)',
                    } : {}}
                >
                    {navItems.map((item) => {
                        const isActive = item.href === '/' 
                            ? (pathname === '/' || pathname.startsWith('/posts'))
                            : (item.href !== '#' && pathname.startsWith(item.href));
                        
                        const content = (
                            <div className="relative flex-shrink-0 flex flex-col items-center justify-center gap-0 px-1.5 py-1.5 rounded-xl transition-all duration-200 min-w-[42px]">
                                <div className="relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300">
                                    {isActive && (
                                        <motion.div
                                            layoutId="mobile-nav-pill"
                                            className="absolute inset-0 bg-brand-burgundy rounded-xl shadow-[0_4px_12px_rgba(139,21,56,0.4)]"
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                    <item.icon className={`h-4 w-4 relative z-10 transition-colors duration-300 ${isActive ? 'text-white' : 'text-brand-ebony/50'}`} />
                                    
                                    {item.name === 'Messages' && totalUnreadCount > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center h-[18px] w-[18px] rounded-full bg-red-500 text-white border-2 border-white dark:border-[var(--brand-surface)] text-[9px] font-black shadow-[0_0_12px_3px_rgba(239,68,68,0.9)] animate-pulse will-change-transform z-10">
                                            {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                                        </span>
                                    )}
                                </div>
                                <span className={`text-[7px] font-black uppercase tracking-tighter transition-colors ${
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
