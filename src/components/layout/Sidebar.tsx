'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Home, Users, Briefcase, Calendar, Settings, MessageSquare, LogOut, Store } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessaging } from '@/contexts/MessagingContext';
import { usePathname } from 'next/navigation';
import { InstituteSwitcher } from './InstituteSwitcher';
import { ComingSoonModal } from '../modals/ComingSoonModal';

const topNavigation = [
    { name: 'Home',           href: '/',         icon: Home },
    { name: 'Messages',       href: '/messages', icon: MessageSquare },
    { name: 'Events',         href: '/events',   icon: Calendar },
    { name: 'Jobs',           href: '/jobs',     icon: Briefcase },
    { name: 'Network',        href: '/network',  icon: Users },
];

export function Sidebar() {
    const { userData, signOut } = useAuth();
    const { totalUnreadCount } = useMessaging();
    const pathname = usePathname();
    const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);

    if (!userData || pathname.startsWith('/admin') || pathname === '/login' || pathname === '/signup') return null;

    return (
        <>
            <ComingSoonModal 
                isOpen={isMarketplaceOpen} 
                onClose={() => setIsMarketplaceOpen(false)} 
                featureName="Marketplace" 
            />

            {/* --- TOP RIBBON (Social Navigation) --- */}
            <div className="hidden md:block fixed top-6 left-[340px] right-12 z-50 pointer-events-none transition-all duration-300">
                <div 
                    className="group pointer-events-auto flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full sidebar-glass border border-brand-ebony/10 shadow-[0_8px_32px_rgba(79,70,229,0.12)] hover:shadow-[0_12px_48px_rgba(79,70,229,0.20)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
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
                                            : 'text-brand-ebony/50 hover:bg-brand-parchment dark:hover:bg-white/10 hover:text-brand-ebony'
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
                                    
                                    {/* Togo/Expand behavior: Active is always shown, others expand on group hover */}
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

            {/* --- FIXED FULL SIDEBAR (Identity & Marketplace) --- */}
            <aside className="hidden md:flex fixed top-28 bottom-6 left-6 z-50 flex-col items-center pointer-events-none">
                <div 
                    className="pointer-events-auto flex flex-col h-full w-72 sidebar-glass border border-brand-ebony/10 shadow-[0_8px_32px_rgba(0,0,0,0.06)] rounded-[2.5rem] py-8 px-4"
                >
                    {/* Marketplace Section */}
                    <div className="mb-4">
                        <p className="px-5 text-[10px] font-black text-brand-ebony/30 uppercase tracking-[0.2em] mb-4">Portals</p>
                        <button
                            onClick={() => setIsMarketplaceOpen(true)}
                            className="relative w-full flex items-center p-4 rounded-2xl text-brand-ebony/60 hover:text-brand-ebony hover:bg-brand-parchment dark:hover:bg-white/10 transition-all"
                        >
                            <div className="w-11 h-11 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0">
                                <Store className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div className="flex flex-col items-start ml-4 overflow-hidden">
                                <span className="text-sm font-bold truncate">Marketplace</span>
                                <span className="text-[10px] text-indigo-500/60 font-black tracking-wider uppercase">In Development</span>
                            </div>
                        </button>
                    </div>

                    <div className="flex-1" />

                    {/* Bottom Governance Section */}
                    <div className="space-y-6 pt-6 border-t border-brand-ebony/5">
                        {/* Institute Switcher */}
                        <div>
                            <p className="px-1 text-[10px] font-black text-brand-ebony/30 uppercase tracking-[0.2em] mb-4">Governance</p>
                            <InstituteSwitcher />
                        </div>

                        {/* Profile Info */}
                        <div className="bg-brand-ebony/5 dark:bg-white/5 rounded-3xl p-4 border border-brand-ebony/5">
                            <div className="flex items-center mb-4">
                                <img
                                    src={userData.profilePic || `https://placehold.co/80x80/4f46e5/ffffff?text=${userData.name.substring(0, 1)}`}
                                    alt={userData.name}
                                    className="w-11 h-11 rounded-2xl object-cover shadow-sm bg-white"
                                />
                                <div className="ml-3 overflow-hidden">
                                    <p className="text-sm font-black text-brand-ebony truncate leading-none mb-1">{userData.name}</p>
                                    <p className="text-[10px] text-brand-ebony/40 font-bold uppercase tracking-widest">Active Member</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <Link 
                                    href="/profile"
                                    className="flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-brand-ebony rounded-xl border border-brand-ebony/10 text-brand-ebony/60 hover:text-brand-ebony transition-all text-[10px] font-black uppercase tracking-wider"
                                >
                                    Archives
                                </Link>
                                <Link 
                                    href="/settings"
                                    className="flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-brand-ebony rounded-xl border border-brand-ebony/10 text-brand-ebony/60 hover:text-brand-ebony transition-all text-[10px] font-black uppercase tracking-wider"
                                >
                                    Settings
                                </Link>
                            </div>

                            <button 
                                onClick={() => signOut()}
                                className="mt-4 w-full py-3 flex items-center justify-center gap-2 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all text-[10px] font-black uppercase tracking-[0.2em]"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                Terminate Session
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
