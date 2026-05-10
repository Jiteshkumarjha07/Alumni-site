'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Home, Users, Briefcase, Calendar, Settings, MessageSquare, LogOut, Store, Shield, Globe2 } from 'lucide-react';
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
            <aside className="hidden md:flex fixed top-32 left-6 z-50 flex-col items-center pointer-events-none">
                <div 
                    className="pointer-events-auto flex flex-col h-fit w-64 sidebar-glass border border-brand-ebony/10 shadow-[0_8px_32px_rgba(0,0,0,0.06)] rounded-[2.5rem] py-5 px-4 overflow-hidden"
                >
                    {/* Portals Section */}
                    <div className="mb-6">
                        <p className="px-5 text-[10px] font-black text-brand-ebony/30 uppercase tracking-[0.2em] mb-2">Portals</p>
                        <button
                            onClick={() => setIsMarketplaceOpen(true)}
                            className="relative w-full flex items-center p-2.5 rounded-2xl text-brand-ebony/60 hover:text-brand-ebony hover:bg-brand-parchment dark:hover:bg-white/10 transition-all"
                        >
                            <div className="w-8 h-8 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0">
                                <Store className="w-4 h-4 text-indigo-500" />
                            </div>
                            <div className="flex flex-col items-start ml-3 overflow-hidden">
                                <span className="text-sm font-bold truncate">Marketplace</span>
                                <span className="text-[9px] text-indigo-500/60 font-black tracking-wider uppercase">In Dev</span>
                            </div>
                        </button>
                        <Link
                            href="/lobby"
                            className="relative w-full flex items-center p-2.5 rounded-2xl text-brand-ebony/60 hover:text-brand-ebony hover:bg-brand-parchment dark:hover:bg-white/10 transition-all"
                        >
                            <div className="w-8 h-8 bg-violet-500/10 rounded-xl flex items-center justify-center shrink-0">
                                <Globe2 className="w-4 h-4 text-violet-500" />
                            </div>
                            <div className="flex flex-col items-start ml-3 overflow-hidden">
                                <span className="text-sm font-bold truncate">Institute Lobby</span>
                                <span className="text-[9px] text-violet-500/70 font-black tracking-wider uppercase">Public</span>
                            </div>
                        </Link>
                    </div>



                    {/* Bottom Governance Section */}
                    <div className="space-y-4 pt-4 border-t border-brand-ebony/5">
                        {/* Institute Switcher */}
                        <div>
                            <p className="px-1 text-[10px] font-black text-brand-ebony/30 uppercase tracking-[0.2em] mb-2">Governance</p>
                            <div className="space-y-2">
                                <InstituteSwitcher />
                                {userData.isAdmin && (
                                    <Link 
                                        href="/admin/approvals"
                                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-burgundy/10 hover:bg-brand-burgundy/20 rounded-xl transition-all text-brand-burgundy dark:text-brand-burgundy active:scale-95 text-[10px] font-black uppercase tracking-[0.2em] animate-fade-in"
                                    >
                                        <Shield className="w-3 h-3" />
                                        Control
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Profile Info */}
                        <div className="bg-brand-ebony/5 dark:bg-brand-cream/20 rounded-[2rem] p-3 border border-brand-ebony/5 dark:border-white/5">
                            <div className="flex items-center mb-3">
                                <img
                                    src={userData.profilePic || `https://placehold.co/80x80/4f46e5/ffffff?text=${userData.name.substring(0, 1)}`}
                                    alt={userData.name}
                                    className="w-9 h-9 rounded-xl object-cover shadow-sm bg-white dark:bg-brand-parchment"
                                />
                                <div className="ml-3 overflow-hidden">
                                    <p className="text-xs font-black text-brand-ebony truncate leading-none mb-1">{userData.name}</p>
                                    <p className="text-[9px] text-brand-ebony/60 font-black uppercase tracking-widest">Active</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <Link 
                                    href="/profile"
                                    className="flex items-center justify-center gap-1 py-2 bg-brand-cream/50 dark:bg-brand-parchment rounded-xl border border-brand-ebony/10 dark:border-white/5 text-brand-ebony/60 hover:text-brand-ebony transition-all text-[9px] font-black uppercase tracking-wider"
                                >
                                    Profile
                                </Link>
                                <Link 
                                    href="/settings"
                                    className="flex items-center justify-center gap-1 py-2 bg-brand-ebony/5 rounded-xl text-brand-ebony/60 hover:text-brand-ebony transition-all text-[9px] font-black uppercase tracking-wider"
                                >
                                    Settings
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
