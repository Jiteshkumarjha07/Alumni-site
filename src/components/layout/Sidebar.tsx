'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Home, Users, Briefcase, Calendar, Settings, MessageSquare, LogOut, Store } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessaging } from '@/contexts/MessagingContext';
import { usePathname } from 'next/navigation';
import { InstituteSwitcher } from './InstituteSwitcher';
import { ComingSoonModal } from '../modals/ComingSoonModal';

export function Sidebar() {
    const { userData, signOut } = useAuth();
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

            {/* --- FIXED FULL SIDEBAR (Identity & Marketplace) --- */}
            <aside className="hidden md:flex fixed top-28 bottom-6 left-6 z-50 flex-col items-center pointer-events-none">
                <div 
                    className="pointer-events-auto flex flex-col h-full w-64 sidebar-glass border border-brand-ebony/10 shadow-[0_8px_32px_rgba(0,0,0,0.06)] rounded-[2.5rem] py-8 px-4"
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
                        <div className="bg-brand-ebony/5 dark:bg-brand-cream/20 rounded-3xl p-4 border border-brand-ebony/5 dark:border-white/5">
                            <div className="flex items-center mb-4">
                                <img
                                    src={userData.profilePic || `https://placehold.co/80x80/4f46e5/ffffff?text=${userData.name.substring(0, 1)}`}
                                    alt={userData.name}
                                    className="w-11 h-11 rounded-2xl object-cover shadow-sm bg-white dark:bg-brand-parchment"
                                />
                                <div className="ml-3 overflow-hidden">
                                    <p className="text-sm font-black text-brand-ebony truncate leading-none mb-1">{userData.name}</p>
                                    <p className="text-[10px] text-brand-ebony/60 font-black uppercase tracking-widest">Active Member</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <Link 
                                    href="/profile"
                                    className="flex items-center justify-center gap-2 py-2.5 bg-brand-cream/50 dark:bg-brand-parchment rounded-xl border border-brand-ebony/10 dark:border-white/5 text-brand-ebony/60 hover:text-brand-ebony transition-all text-[10px] font-black uppercase tracking-wider"
                                >
                                    Profile
                                </Link>
                                <Link 
                                    href="/settings"
                                    className="flex items-center justify-center gap-2 py-2.5 bg-brand-cream/50 dark:bg-brand-parchment rounded-xl border border-brand-ebony/10 dark:border-white/5 text-brand-ebony/60 hover:text-brand-ebony transition-all text-[10px] font-black uppercase tracking-wider"
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
