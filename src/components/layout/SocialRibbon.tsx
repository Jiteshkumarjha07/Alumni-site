'use client';

import React from 'react';
import Link from 'next/link';
import { Home, MessageSquare, Calendar, Briefcase, Users } from 'lucide-react';
import { useMessaging } from '@/contexts/MessagingContext';
import { usePathname } from 'next/navigation';

const topNavigation = [
    { name: 'Home',           href: '/',         icon: Home },
    { name: 'Messages',       href: '/messages', icon: MessageSquare },
    { name: 'Events',         href: '/events',   icon: Calendar },
    { name: 'Jobs',           href: '/jobs',     icon: Briefcase },
    { name: 'Network',        href: '/network',  icon: Users },
];

export function SocialRibbon() {
    const { totalUnreadCount } = useMessaging();
    const pathname = usePathname();

    return (
        <div className="hidden md:flex fixed top-6 left-[300px] right-12 z-50 pointer-events-none transition-all duration-300 justify-center">
            <div 
                className="group pointer-events-auto flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full sidebar-glass border border-brand-ebony/10 shadow-[0_8px_32px_rgba(79,70,229,0.12)] hover:shadow-[0_12px_48px_rgba(79,70,229,0.20)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] w-fit mx-auto"
            >
                <nav className="flex items-center gap-1.5">
                    {topNavigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`relative flex items-center px-4 py-2.5 rounded-full transition-all duration-300 group/link
                                    ${isActive 
                                        ? 'bg-gradient-indigo text-white shadow-lg shadow-indigo-500/30' 
                                        : 'text-brand-ebony/60 hover:bg-brand-parchment dark:hover:bg-white/10 hover:text-brand-ebony'
                                    }
                                `}
                            >
                                <div className="relative shrink-0 flex items-center justify-center">
                                    <item.icon className={`w-[19px] h-[19px] ${isActive ? 'text-white' : ''}`} />
                                    {item.name === 'Messages' && totalUnreadCount > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
                                            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white text-[8px] text-white items-center justify-center font-black">
                                                {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                                            </span>
                                        </span>
                                    )}
                                </div>
                                
                                <span className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] 
                                    ${isActive 
                                        ? 'ml-2.5 w-auto opacity-100' 
                                        : 'ml-0 w-0 opacity-0 group-hover:ml-2.5 group-hover:w-[65px] group-hover:opacity-100'
                                    }
                                    text-xs font-bold tracking-wide whitespace-nowrap
                                `}>
                                    {item.name}
                                </span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
